import { RESPONSE_MESSAGES } from "../../constants/response";
import { ApiResponse } from "../../utils/common.dto";
import { DrugstoreSavedCard } from "./DrugstoreSavedCard.model";
import { decryptAuthorizationCode, encryptAuthorizationCode } from "./DrugstoreCardCipher";
import { PaystackAuthorization } from "./DrugstorePaystack.service";

const serializeCard = (card: DrugstoreSavedCard) => ({
	id: card.id,
	last4: card.last4,
	cardType: card.cardType,
	bank: card.bank,
	expMonth: card.expMonth,
	expYear: card.expYear,
	isDefault: card.isDefault,
});

export class DrugstoreSavedCardService {
	static async listSavedCards(userId: number): Promise<ApiResponse> {
		const cards = await DrugstoreSavedCard.findAll({
			where: { userId },
			order: [
				["isDefault", "DESC"],
				["createdAt", "DESC"],
			],
		});

		return { status: true, code: 200, message: RESPONSE_MESSAGES.SUCCESSS, data: cards.map(serializeCard) };
	}

	static async deleteSavedCard(userId: number, cardId: string): Promise<ApiResponse> {
		const card = await DrugstoreSavedCard.findOne({ where: { id: cardId, userId } });
		if (!card) return { status: false, code: 404, message: "Saved card not found" };

		await card.destroy();
		return { status: true, code: 200, message: "Saved card removed successfully", data: { id: cardId } };
	}

	/**
	 * Persists a reusable Paystack authorization as a saved card. No-ops silently if the
	 * authorization isn't reusable or the same card (by last4+expiry) is already saved.
	 */
	static async saveCardFromAuthorization(userId: number, authorization: PaystackAuthorization | null): Promise<void> {
		if (!authorization?.reusable || !authorization.authorizationCode) return;

		const existing = await DrugstoreSavedCard.findOne({
			where: { userId, last4: authorization.last4, expMonth: authorization.expMonth, expYear: authorization.expYear },
		});
		if (existing) return;

		const existingCount = await DrugstoreSavedCard.count({ where: { userId } });

		try {
			await DrugstoreSavedCard.create({
				userId,
				authorizationCodeCipher: encryptAuthorizationCode(authorization.authorizationCode),
				last4: authorization.last4,
				cardType: authorization.cardType,
				bank: authorization.bank,
				expMonth: authorization.expMonth,
				expYear: authorization.expYear,
				isDefault: existingCount === 0,
			});
		} catch (error: any) {
			// (userId, last4, expMonth, expYear) is unique — a concurrent duplicate call (two
			// confirmOrderPayment requests racing for the same card payment) can lose this exact
			// race. That's fine: the other call already saved the card, so there's nothing to do.
			if (error?.name === "SequelizeUniqueConstraintError") return;
			throw error;
		}
	}

	static async getDecryptedAuthorizationCode(userId: number, cardId: string): Promise<string | null> {
		const card = await DrugstoreSavedCard.findOne({ where: { id: cardId, userId } });
		if (!card) return null;
		return decryptAuthorizationCode(card.authorizationCodeCipher);
	}
}
