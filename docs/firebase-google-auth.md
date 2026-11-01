# Google sign-in with Firebase (Experience 1 and Merchant)

The frontend signs in with the Firebase client SDK, then exchanges its Firebase
ID token for the backend's normal access/refresh tokens. Both backends verify the
token with Firebase Admin, including revocation/disabled-user checks. Only a
Google sign-in (`google.com`) with a verified email from the configured Firebase
project is accepted. Google OAuth access tokens and authorization codes do not work.

## Firebase and Render configuration

1. In your Firebase project, open Authentication → Sign-in method and enable Google.
2. Add your frontend domains under Authentication → Settings → Authorized domains.
3. Configure the frontend app with the public Firebase web configuration from
   Project settings → Your apps. The frontend and backend must use the same project.
4. On **each** Render backend, set `FIREBASE_PROJECT_ID` and configure Firebase Admin
   using either `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_CLIENT_EMAIL` plus
   `FIREBASE_PRIVATE_KEY`. Application Default Credentials are also supported.
   An escaped `\n` in a private key is converted into a newline by the backend.
   The service account needs permission to read Firebase Authentication users
   because sign-in checks revoked tokens and disabled users.
5. Redeploy both services after changing their environment variables.

Service-account credentials are server secrets: never include them in frontend
code, source control, screenshots, or API requests. The older `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET` and `GOOGLE_REDIRECT_URI` variables are not used by these
Firebase endpoints. `FIREBASE_AUTH_EMULATOR_HOST` must be unset; the exchange
endpoints reject emulator mode so unsigned emulator tokens cannot be accepted.
No database migration is required for this feature.

## Frontend sign-in

Install `firebase` in the **frontend** project and initialize it once with your
Firebase web configuration. Example for a browser app:

```ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const app = initializeApp(firebaseWebConfig);
const auth = getAuth(app);
const result = await signInWithPopup(auth, new GoogleAuthProvider());
const idToken = await result.user.getIdToken();

const response = await fetch(`${experienceBaseUrl}/api/v1/main/auth/google`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ idToken, role: "consumer" }),
});
```

Use the frontend's normal response handling/decoding, as for password login.
On mobile use Firebase's platform-appropriate Google sign-in and send the same
Firebase ID token. Do not send `GoogleAuthProvider.credentialFromResult(...).accessToken`.

After an exchange succeeds, use the returned **backend** access token for API
Authorization headers and its refresh token with the existing refresh endpoint.
Firebase tokens are accepted only by the `/auth/google` exchange endpoints.

## Experience 1

`POST /api/v1/main/auth/google`

```json
{ "idToken": "<Firebase ID token>", "role": "consumer" }
```

Roles are `consumer`/`customer` or `doctor`/`medic`, using the existing aliases.
An existing account must match the requested role; sign-in cannot change its role.
An active existing account receives the normal login data: `accessToken`,
`refreshToken`, `user`, `profileStatus` and `profileSummary`.

For an unknown email, the response is HTTP 200 with no application tokens:

```json
{
  "requiresRegistration": true,
  "email": "person@example.com",
  "role": "consumer"
}
```

This object is in the normal response's `data` field. Collect the missing signup
fields, get a fresh Firebase ID token, and call the same endpoint:

```json
{
  "idToken": "<Firebase ID token>",
  "role": "consumer",
  "registration": {
    "firstName": "Ada",
    "lastName": "Obi",
    "phoneNumber": "+2348012345678"
  }
}
```

New doctors must also send `registration.medicalLicenseNumber` (3–100 characters).
The account, auth record and corresponding consumer/doctor profile are created
together in a transaction. HTTP 201 returns the normal login data. Continue the
existing onboarding using `profileStatus`; Google verifies email, not a medical
license or professional credentials.

## Merchant

`POST /api/v1/merchant/auth/google`

```json
{ "idToken": "<Firebase ID token>" }
```

Existing owners receive the normal `token`, `refreshToken`, `actor`, `permissions`,
`pharmacies`, `merchant` and `onboarding` data. Existing staff retain their pharmacy
memberships and permissions. They may send `pharmacyCode` just as with password
login; multiple memberships can return `requiresPharmacySelection`, followed by
the existing `POST /auth/select-pharmacy` step. Removed or suspended access still
fails. Accepting a staff invitation continues to use the existing invitation flow.

For an unknown email, HTTP 200 returns `data.requiresRegistration: true` and the
verified email, without tokens. To open a **new pharmacy**, collect the required
business details and repeat the request:

```json
{
  "idToken": "<Firebase ID token>",
  "registration": {
    "businessName": "Example Pharmacy",
    "phoneNumber": "08012345678",
    "phoneCountryCode": "+234"
  }
}
```

`licenseUrl` is optional. HTTP 201 returns an owner session with incomplete
onboarding. The merchant, store, payment settings, preferences, wallet and available
Free plan subscription are created together in a transaction. Continue the normal
onboarding, including identity, bank and address checks. Supplying `registration`
when already registered as staff does not create an owner or elevate permissions.

## Existing accounts, passwords and errors

Both backends match accounts by the verified Google email. This deliberately lets
an existing password user sign in with Google for the same address without
creating a second account. The body cannot override email, account IDs or
permissions. A different Google email is treated as a different account; use the
existing account/support flow to resolve an email change rather than creating
another account accidentally.

New Google accounts do not need to choose a password. To keep the existing database
schema compatible, their local password is an unpredictable generated value,
stored only as a hash. Use the normal forgot-password flow to establish a local
password later. Existing users' passwords are preserved. Firebase revocation is
checked at exchange time; issued backend tokens follow the existing backend
session/logout/refresh lifecycle.

| Status | Frontend action |
| --- | --- |
| 200 + `requiresRegistration` | Show registration fields; do not treat this as a logged-in session. |
| 200 + session / 201 | Store backend tokens, then continue pharmacy selection or onboarding as indicated. |
| 400 | Correct invalid or missing signup fields. |
| 401 | Restart Google sign-in; check the selected Experience 1 role. |
| 403 | Explain inactive account or denied pharmacy access. |
| 409 | Check duplicate account/phone details and offer existing-account sign-in. |
| 429 | Wait before retrying. Each Google endpoint allows 30 requests per IP per 15 minutes. |
| 503 | Backend Firebase configuration or connectivity needs attention; allow retry. |

Run `npm run test:google-auth` for mocked token-verification, signup, account-status
and session tests. These do not contact Firebase or a live database. After setting
real credentials, verify the full frontend Google flow against both deployed
services, including new signup, existing login, onboarding and staff pharmacy selection.

References: [Firebase Google sign-in](https://firebase.google.com/docs/auth/web/google-signin),
[server ID-token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens),
[revocation checks](https://firebase.google.com/docs/auth/admin/manage-sessions).
