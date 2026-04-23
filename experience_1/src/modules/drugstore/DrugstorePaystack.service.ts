import axios from "axios";
import { applicationConfig } from "../../config";

type InitializeTransactionResult = {
	authorizationUrl: string;
	accessCode: string;
	reference: string;
};

type VerifyTransactionResult = {
	status: string;
	reference: string;
	amount: number;
	currency: string;
	channel: string;
	paidAt: string;
	metadata: Record<string, any>;
};

export class DrugstorePaystackService {
	private static readonly BASE_URL = "https://api.paystack.co";

	private static getHeaders() {
		const secretKey = applicationConfig.paystack?.secretKey || "";
		if (!secretKey) {
			throw new Error("Paystack secret key is not configured.");
		}

		return {
			Authorization: `Bearer ${secretKey}`,
			"Content-Type": "application/json",
		};
	}

	static async initializeTransaction(
		email: string,
		amount: number,
		reference: string,
		metadata: Record<string, any> = {},
		channels?: string[]
	): Promise<InitializeTransactionResult> {
		try {
			const payload: any = {
				email,
				amount,
				reference,
				metadata,
			};

			const callbackUrl = applicationConfig.paystack?.callbackUrl || "";
			if (callbackUrl) {
				payload.callback_url = callbackUrl;
			}

			if (channels && channels.length > 0) {
				payload.channels = channels;
			}

			const response = await axios.post(`${this.BASE_URL}/transaction/initialize`, payload, {
				headers: this.getHeaders(),
			});

			if (response.data.status && response.data.data) {
				return {
					authorizationUrl: response.data.data.authorization_url,
					accessCode: response.data.data.access_code,
					reference: response.data.data.reference,
				};
			}

			throw new Error("Failed to initialize transaction");
		} catch (error: any) {
			const msg = error.response?.data?.message || error.message || "Failed to initialize payment";
			throw new Error(msg);
		}
	}

	static async verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
		try {
			const response = await axios.get(`${this.BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
				headers: this.getHeaders(),
			});

			if (response.data.status && response.data.data) {
				const data = response.data.data;
				return {
					status: data.status,
					reference: data.reference,
					amount: data.amount,
					currency: data.currency,
					channel: data.channel,
					paidAt: data.paid_at,
					metadata: data.metadata || {},
				};
			}

			throw new Error("Transaction verification failed");
		} catch (error: any) {
			const msg = error.response?.data?.message || error.message || "Transaction verification failed";
			throw new Error(msg);
		}
	}
}
