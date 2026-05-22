import { v4 as uuidv4 } from "uuid";
import { Wallet } from "./Wallet.model";
import { Transaction } from "../transactions/Transaction.model";
import { Merchant } from "../merchant/Merchant.model";
import { PaymentDetails } from "../payment_details/PaymentDetails.model";
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
   * Withdraw money from wallet to the merchant's verified bank account
   * @param amountInNaira in Naira — will be converted to kobo
   */
  static async withdrawWallet(
    merchantId: string,
    amountInNaira: number,
    reason?: string
  ) {
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      throw new HttpException(404, "Merchant account not found.");
    }

    const paymentDetails = await PaymentDetails.findOne({ where: { merchantId } });
    if (!paymentDetails || !paymentDetails.bankVerified) {
      throw new HttpException(
        400,
        "Please add and verify your payout bank account in merchant settings before withdrawing."
      );
    }

    if (!paymentDetails.bankCode || !paymentDetails.bankAccountNumber || !paymentDetails.bankAccountName) {
      throw new HttpException(
        400,
        "Your payout bank details are incomplete. Please update your payment settings and try again."
      );
    }

    const amountInKobo = amountInNaira * 100;
    const reference = `wd_${uuidv4().replace(/-/g, "").substring(0, 20)}`;
    const description =
      reason?.trim() || `Wallet withdrawal to ${paymentDetails.bankName || "bank account"}`;

    const recipient = await PaystackService.createTransferRecipient({
      name: paymentDetails.bankAccountName,
      accountNumber: paymentDetails.bankAccountNumber,
      bankCode: paymentDetails.bankCode,
      description: `Merchant wallet withdrawal for ${merchant.email}`,
    });

    const sequelize = Wallet.sequelize;
    if (!sequelize) {
      throw new HttpException(500, "Database not initialized");
    }

    const result = await sequelize.transaction(async (dbTransaction) => {
      const wallet = await Wallet.findOne({
        where: { merchantId },
        transaction: dbTransaction,
        lock: true,
      });

      if (!wallet) {
        throw new HttpException(404, "Wallet not found. Please contact support.");
      }

      if (wallet.balance < amountInKobo) {
        const shortfall = (amountInKobo - wallet.balance) / 100;
        throw new HttpException(
          400,
          `Insufficient wallet balance. You need ₦${shortfall.toLocaleString()} more to complete this withdrawal.`
        );
      }

      const nextBalance = wallet.balance - amountInKobo;
      await wallet.update({ balance: nextBalance }, { transaction: dbTransaction });

      const transaction = await Transaction.create(
        {
          merchantId,
          walletId: wallet.id,
          type: TransactionType.WALLET_DEBIT,
          amount: amountInKobo,
          status: TransactionStatus.PENDING,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          paystackReference: reference,
          description,
          metadata: {
            type: "wallet_withdrawal",
            recipientCode: recipient.recipientCode,
            recipientBankName: recipient.details.bankName || paymentDetails.bankName || null,
            recipientAccountNumber: paymentDetails.bankAccountNumber.slice(-4),
          },
        },
        { transaction: dbTransaction }
      );

      return {
        transaction,
        wallet,
      };
    });

    let transfer;
    try {
      transfer = await PaystackService.initiateTransfer({
        recipientCode: recipient.recipientCode,
        amount: amountInKobo,
        reference,
        reason: description,
      });
    } catch (error: any) {
      await this.failWithdrawalAndRefund(
        reference,
        error.message || "Transfer initiation failed"
      );
      throw error;
    }

    if (transfer.status === "otp") {
      await this.failWithdrawalAndRefund(
        reference,
        "Transfer requires OTP confirmation"
      );
      throw new HttpException(
        503,
        "Withdrawal could not be completed because Paystack transfers currently require OTP confirmation. Disable transfer OTP on your Paystack business account or contact support."
      );
    }

    if (!["pending", "success"].includes(transfer.status)) {
      await this.failWithdrawalAndRefund(
        reference,
        `Unexpected transfer status: ${transfer.status}`
      );
      throw new HttpException(
        400,
        "Withdrawal could not be queued for processing at the moment. Please try again shortly."
      );
    }

    await result.transaction.update({
      status:
        transfer.status === "success"
          ? TransactionStatus.SUCCESS
          : TransactionStatus.PENDING,
      metadata: {
        ...result.transaction.metadata,
        transferCode: transfer.transferCode,
        transferEvent:
          transfer.status === "success" ? "transfer.success" : "transfer.pending",
      },
    });

    return {
      message:
        transfer.status === "success"
          ? `₦${amountInNaira.toLocaleString()} withdrawal completed successfully.`
          : `₦${amountInNaira.toLocaleString()} withdrawal has been queued for processing.`,
      reference: transfer.reference,
      transferCode: transfer.transferCode,
      status: result.transaction.status,
      amount: amountInKobo,
      amountInNaira,
      destination: {
        bankName: recipient.details.bankName || paymentDetails.bankName,
        accountName: paymentDetails.bankAccountName,
        accountNumberLast4: paymentDetails.bankAccountNumber.slice(-4),
      },
      wallet: {
        balance: result.wallet.balance,
        balanceInNaira: result.wallet.balance / 100,
      },
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

  private static async failWithdrawalAndRefund(reference: string, failureReason: string) {
    const sequelize = Wallet.sequelize;
    if (!sequelize) {
      throw new HttpException(500, "Database not initialized");
    }

    await sequelize.transaction(async (dbTransaction) => {
      const transaction = await Transaction.findOne({
        where: {
          paystackReference: reference,
          type: TransactionType.WALLET_DEBIT,
        },
        transaction: dbTransaction,
        lock: true,
      });

      if (!transaction || transaction.metadata?.walletRefunded) {
        return;
      }

      const wallet = transaction.walletId
        ? await Wallet.findByPk(transaction.walletId, {
            transaction: dbTransaction,
            lock: true,
          })
        : null;

      if (wallet) {
        await wallet.update(
          { balance: wallet.balance + transaction.amount },
          { transaction: dbTransaction }
        );
      }

      await transaction.update(
        {
          status: TransactionStatus.FAILED,
          metadata: {
            ...transaction.metadata,
            walletRefunded: Boolean(wallet),
            failureReason,
          },
        },
        { transaction: dbTransaction }
      );
    });
  }

  /**
   * Reconcile Paystack transfer webhooks for wallet withdrawals
   */
  static async handleTransferWebhook(event: string, data: any) {
    const reference = String(data?.reference || "").trim();
    if (!reference) return;

    const existingTransaction = await Transaction.findOne({
      where: {
        paystackReference: reference,
        type: TransactionType.WALLET_DEBIT,
      },
    });

    if (!existingTransaction || existingTransaction.metadata?.type !== "wallet_withdrawal") {
      return;
    }

    if (event === "transfer.success") {
      if (existingTransaction.metadata?.walletRefunded) {
        return;
      }

      if (existingTransaction.status !== TransactionStatus.SUCCESS) {
        await existingTransaction.update({
          status: TransactionStatus.SUCCESS,
          metadata: {
            ...existingTransaction.metadata,
            transferEvent: event,
            transferredAt: data?.transferred_at || data?.updatedAt || null,
          },
        });
      }
      return;
    }

    if (!["transfer.failed", "transfer.reversed"].includes(event)) {
      return;
    }

    const sequelize = Wallet.sequelize;
    if (!sequelize) {
      throw new HttpException(500, "Database not initialized");
    }

    await sequelize.transaction(async (dbTransaction) => {
      const transaction = await Transaction.findByPk(existingTransaction.id, {
        transaction: dbTransaction,
        lock: true,
      });

      if (!transaction || transaction.metadata?.walletRefunded) {
        return;
      }

      const wallet = transaction.walletId
        ? await Wallet.findByPk(transaction.walletId, {
            transaction: dbTransaction,
            lock: true,
          })
        : null;

      if (wallet) {
        await wallet.update(
          { balance: wallet.balance + transaction.amount },
          { transaction: dbTransaction }
        );
      }

      await transaction.update(
        {
          status: TransactionStatus.FAILED,
          metadata: {
            ...transaction.metadata,
            walletRefunded: Boolean(wallet),
            transferEvent: event,
            failureReason: data?.failures || data?.reason || data?.message || null,
          },
        },
        { transaction: dbTransaction }
      );
    });
  }
}
