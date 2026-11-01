import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export class FirebaseGoogleAuthError extends Error {
	constructor(public readonly statusCode: number, message: string) {
		super(message);
		this.name = "FirebaseGoogleAuthError";
	}
}

export interface FirebaseGoogleIdentity {
	uid: string;
	email: string;
	name?: string;
	picture?: string;
}

/** Firebase client ID tokens only; Google access tokens and OAuth codes are not accepted. */
export class FirebaseGoogleAuth {
	static async verify(idToken: string): Promise<FirebaseGoogleIdentity> {
		if (typeof idToken !== "string" || !idToken.trim() || idToken.length > 16384) {
			throw new FirebaseGoogleAuthError(400, "A Firebase ID token is required");
		}
		// Never accept unsigned Firebase emulator tokens in a deployed service.
		if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
			throw new FirebaseGoogleAuthError(503, "Google sign-in is not configured for this environment");
		}
		let auth;
		try {
			const account = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
				? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
				: undefined;
			const projectId = process.env.FIREBASE_PROJECT_ID || account?.project_id;
			if (!projectId || (account?.project_id && account.project_id !== projectId)) {
				throw new Error("Firebase project configuration is missing or inconsistent");
			}
			const clientEmail = account?.client_email || process.env.FIREBASE_CLIENT_EMAIL;
			const privateKey = account?.private_key || process.env.FIREBASE_PRIVATE_KEY;
			if ((account && (!account.client_email || !account.private_key)) || (Boolean(clientEmail) !== Boolean(privateKey))) {
				throw new Error("Firebase service-account credentials are incomplete");
			}
			const appName = `medtech-google-auth-${projectId}`;
			let app = getApps().find((candidate) => candidate.name === appName);
			if (!app) {
				const credential = clientEmail && privateKey
					? cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, "\n") })
					: applicationDefault();
				app = initializeApp({ projectId, credential }, appName);
			}
			auth = getAuth(app);
		} catch {
			throw new FirebaseGoogleAuthError(503, "Google sign-in is not configured. Please contact support.");
		}
		try {
			// Revocation checking also rejects disabled Firebase accounts.
			const decoded = await auth.verifyIdToken(idToken, true);
			if (decoded.firebase?.sign_in_provider !== "google.com" || decoded.firebase?.tenant || decoded.email_verified !== true || !decoded.email) {
				throw new FirebaseGoogleAuthError(401, "Sign in with a verified Google account to continue");
			}
			return { uid: decoded.uid, email: decoded.email.trim().toLowerCase(), name: decoded.name, picture: decoded.picture };
		} catch (error: any) {
			if (error instanceof FirebaseGoogleAuthError) throw error;
			if (["auth/invalid-credential", "app/invalid-credential", "auth/internal-error", "app/network-error", "auth/network-request-failed", "auth/insufficient-permission"].includes(error?.code)) {
				throw new FirebaseGoogleAuthError(503, "Google sign-in is temporarily unavailable");
			}
			throw new FirebaseGoogleAuthError(401, "Invalid or expired Google sign-in. Please sign in again.");
		}
	}
}
