import crypto from "crypto";
import { Transaction } from "sequelize";
import { RESPONSE_MESSAGES } from "../../constants/response";
import { ApiResponse } from "../../utils/common.dto";
import { DrugstoreWallet } from "./DrugstoreWallet.model";
import { DrugstoreWalletTransaction } from "./DrugstoreWalletTransaction.model";
import { DrugstorePaystackService } from "./DrugstorePaystack.service";

const toNumber = (value: unknown): number => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
};

const serializeWallet = (wallet: DrugstoreWallet) => ({
	balanceKobo: wallet.balance,
	balanceNgn: wallet.balance / 100,
	currency: wallet.currency,
});

export class DrugstoreWalletService {
	private static async getOrCreateWallet(userId: number, transaction?: Transaction): Promise<DrugstoreWallet> {
		const [wallet] = await DrugstoreWallet.findOrCreate({
			where: { userId },
			defaults: { userId, balance: 0, currency: "NGN" },
			transaction,
		});
		return wallet;
	}

	static async getWallet(userId: number): Promise<ApiResponse> {
		const wallet = await this.getOrCreateWallet(userId);
		return { status: true, code: 200, message: RESPONSE_MESSAGES.SUCCESSS, data: serializeWallet(wallet) };
	}

	static async initiateFunding(userId: number, amountNgn: number, userEmail: string): Promise<ApiResponse> {
		await this.getOrCreateWallet(userId);
		const reference = `wlt_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;

		const payment = await DrugstorePaystackService.initializeTransaction(userEmail, Math.round(amountNgn * 100), reference, {
			type: "wallet_funding",
			userId,
		});

		return {
			status: true,
			code: 200,
			message: "Wallet funding initialized successfully",
			data: {
				reference: payment.reference,
				authorizationUrl: payment.authorizationUrl,
				accessCode: payment.accessCode,
				amount: amountNgn,
				currency: "NGN",
			},
		};
	}

	static async confirmFunding(userId: number, reference: string): Promise<ApiResponse> {
		const existingTransaction = await DrugstoreWalletTransaction.findOne({ where: { reference } });
		if (existingTransaction) {
			const wallet = await DrugstoreWallet.findByPk(existingTransaction.walletId);
			return { status: true, code: 200, message: "Wallet funding already confirmed", data: serializeWallet(wallet!) };
		}

		const verification = await DrugstorePaystackService.verifyTransaction(reference);
		if (verification.status !== "success") {
			return { status: false, code: 400, message: "Wallet funding payment was not successful" };
		}

		const sequelize = DrugstoreWallet.sequelize;
		if (!sequelize) throw new Error("Database not initialized");

		const wallet = await sequelize.transaction(async (transaction) => {
			const [currentWallet] = await DrugstoreWallet.findOrCreate({
				where: { userId },
				defaults: { userId, balance: 0, currency: "NGN" },
				transaction,
				lock: true,
			});
			const newBalance = currentWallet.balance + toNumber(verification.amount);

			await currentWallet.update({ balance: newBalance }, { transaction });
			await DrugstoreWalletTransaction.create(
				{
					walletId: currentWallet.id,
					type: "credit",
					amount: toNumber(verification.amount),
					balanceAfter: newBalance,
					reference,
					description: "Wallet top-up via Paystack",
					orderId: null,
				},
				{ transaction }
			);

			return currentWallet;
		});

		return { status: true, code: 200, message: "Wallet funded successfully", data: serializeWallet(wallet) };
	}

	/**
	 * Debits the wallet for a drugstore order payment. Must be called within the same
	 * transaction that creates the order, so a failed order creation rolls the debit back too.
	 */
	static async debitForOrder(
		userId: number,
		amountKobo: number,
		orderId: string,
		reference: string,
		transaction: Transaction
	): Promise<{ success: boolean; message?: string }> {
		const [wallet] = await DrugstoreWallet.findOrCreate({
			where: { userId },
			defaults: { userId, balance: 0, currency: "NGN" },
			transaction,
			lock: true,
		});

		if (wallet.balance < amountKobo) {
			return { success: false, message: "Insufficient wallet balance" };
		}

		const newBalance = wallet.balance - amountKobo;
		await wallet.update({ balance: newBalance }, { transaction });
		await DrugstoreWalletTransaction.create(
			{
				walletId: wallet.id,
				type: "debit",
				amount: amountKobo,
				balanceAfter: newBalance,
				reference,
				description: "Drugstore order payment",
				orderId,
			},
			{ transaction }
		);

		return { success: true };
	}

	/**
	 * Credits back a wallet payment for an order that can never be fulfilled (e.g. the merchant
	 * sync permanently failed because the item went out of stock after payment succeeded). Keyed
	 * on a deterministic reference derived from the order's payment reference so a retry of this
	 * same refund (defense in depth — the caller should only invoke this once) can't double-credit.
	 */
	static async refundForFailedOrder(userId: number, amountKobo: number, orderId: string, reference: string): Promise<{ refunded: boolean }> {
		const existing = await DrugstoreWalletTransaction.findOne({ where: { reference } });
		if (existing) return { refunded: false };

		const sequelize = DrugstoreWallet.sequelize;
		if (!sequelize) throw new Error("Database not initialized");

		try {
			await sequelize.transaction(async (transaction) => {
				const [wallet] = await DrugstoreWallet.findOrCreate({
					where: { userId },
					defaults: { userId, balance: 0, currency: "NGN" },
					transaction,
					lock: true,
				});

				const newBalance = wallet.balance + amountKobo;
				await wallet.update({ balance: newBalance }, { transaction });
				await DrugstoreWalletTransaction.create(
					{
						walletId: wallet.id,
						type: "credit",
						amount: amountKobo,
						balanceAfter: newBalance,
						reference,
						description: "Refund: order could not be fulfilled (merchant sync failed permanently)",
						orderId,
					},
					{ transaction }
				);
			});
			return { refunded: true };
		} catch (error: any) {
			if (error?.name === "SequelizeUniqueConstraintError") return { refunded: false };
			throw error;
		}
	}

	static async listTransactions(userId: number, page: number, limit: number): Promise<ApiResponse> {
		const wallet = await this.getOrCreateWallet(userId);
		const { rows, count } = await DrugstoreWalletTransaction.findAndCountAll({
			where: { walletId: wallet.id },
			order: [["createdAt", "DESC"]],
			limit,
			offset: (page - 1) * limit,
		});

		return {
			status: true,
			code: 200,
			message: RESPONSE_MESSAGES.SUCCESSS,
			data: { items: rows, pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) } },
		};
	}
}
