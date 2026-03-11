import { v4 as uuidv4 } from "uuid";
import { Op } from "sequelize";
import { Wallet } from "./Wallet.model";
import { Transaction } from "../transactions/Transaction.model";
import { Merchant } from "../merchant/Merchant.model";
import { PaystackService } from "../../service/Paystack/Paystack.service";
import {
  TransactionType,
  TransactionStatus,
  PaymentMethod,
} from "../../constants/enums";
import { HttpException } from "@medtech/utils";

export class WalletService {
  /**
   * Get wallet for a merchant
   */
  static async getWallet(merchantId: string) {
    const wallet = await Wallet.findOne({ where: { merchantId } });
    if (!wallet) {
      throw new HttpException(404, "Wallet not found. Please contact support if this is unexpected.");
    }

    return {
      id: wallet.id,
      balance: wallet.balance,
      balanceInNaira: wallet.balance / 100,
      currency: wallet.currency,
    };
  }

  /**
   * Initialize wallet funding via Paystack
   * @param amount in Naira — will be converted to kobo
   */
  static async fundWallet(merchantId: string, amountInNaira: number) {
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      throw new HttpException(404, "Merchant account not found.");
    }

    const wallet = await Wallet.findOne({ where: { merchantId } });
    if (!wallet) {
      throw new HttpException(404, "Wallet not found. Please contact support.");
    }

    const amountInKobo = amountInNaira * 100;
    const reference = `wf_${uuidv4().replace(/-/g, "").substring(0, 20)}`;

    // Create pending transaction
    await Transaction.create({
      merchantId,
      walletId: wallet.id,
      type: TransactionType.WALLET_FUNDING,
      amount: amountInKobo,
      status: TransactionStatus.PENDING,
      paymentMethod: PaymentMethod.CARD,
      paystackReference: reference,
      description: `Wallet funding — ₦${amountInNaira.toLocaleString()}`,
      metadata: { type: "wallet_funding" },
    });

    const result = await PaystackService.initializeTransaction(
      merchant.email,
      amountInKobo,
      reference,
      {
        merchantId,
        walletId: wallet.id,
        type: "wallet_funding",
      },
      ["card", "bank_transfer"]
    );

    return {
      authorizationUrl: result.authorizationUrl,
      accessCode: result.accessCode,
      reference: result.reference,
      amount: amountInKobo,
      amountInNaira,
    };
  }

  /**
   * Confirm wallet funding after Paystack callback
   */
  static async confirmFunding(merchantId: string, reference: string) {
    const transaction = await Transaction.findOne({
      where: {
        paystackReference: reference,
        merchantId,
        type: TransactionType.WALLET_FUNDING,
      },
    });
    if (!transaction) {
      throw new HttpException(404, "Funding transaction not found. Please ensure the payment reference is correct.");
    }

    if (transaction.status === TransactionStatus.SUCCESS) {
      throw new HttpException(400, "This funding has already been confirmed and credited to your wallet.");
    }

    // Verify with Paystack
    const verification = await PaystackService.verifyTransaction(reference);

    if (verification.status !== "success") {
      await transaction.update({ status: TransactionStatus.FAILED });
      throw new HttpException(
        400,
        "Payment was not successful. Please try again or use a different payment method."
      );
    }

    // Credit wallet
    const wallet = await Wallet.findOne({ where: { merchantId } });
    if (!wallet) {
      throw new HttpException(500, "Wallet not found. Please contact support.");
    }

    await wallet.update({ balance: wallet.balance + transaction.amount });
    await transaction.update({ status: TransactionStatus.SUCCESS });

    return {
      message: `₦${(transaction.amount / 100).toLocaleString()} has been added to your wallet.`,
      wallet: {
        balance: wallet.balance,
        balanceInNaira: wallet.balance / 100,
      },
    };
  }

  /**
   * Get paginated transaction history
   */
  static async getTransactions(
    merchantId: string,
    options: {
      page?: number;
      limit?: number;
      type?: string;
      status?: string;
    } = {}
  ) {
    const { page = 1, limit = 20, type, status } = options;
    const offset = (page - 1) * limit;

    const where: any = { merchantId };
    if (type) where.type = type;
    if (status) where.status = status;

    const { rows: transactions, count: total } =
      await Transaction.findAndCountAll({
        where,
        limit,
        offset,
        order: [["createdAt", "DESC"]],
      });

    return {
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        amountInNaira: t.amount / 100,
        currency: t.currency,
        status: t.status,
        paymentMethod: t.paymentMethod,
        description: t.description,
        reference: t.paystackReference,
        createdAt: t.createdAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
