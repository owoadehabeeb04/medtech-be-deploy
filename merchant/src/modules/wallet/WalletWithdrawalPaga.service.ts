import { v4 as uuidv4 } from "uuid";
import { HttpException } from "@medtech/utils";
import { applicationConfig } from "../../config";
import { Transaction } from "../transactions/Transaction.model";
import { PaymentDetails } from "../payment_details/PaymentDetails.model";
import { Merchant } from "../merchant/Merchant.model";
import { TransactionStatus, TransactionType, PaymentMethod } from "../../constants/enums";
import { getPagaBusinessClient } from "../../service/Payments/PagaClients";
import { loadPagaBanks } from "../../service/Payments/BankCodeMigration";
import { matchBank } from "../../service/Payments/bankNames";
import { compareNames } from "../../service/Payments/nameMatch";
import { alertOps } from "../../service/Payments/OpsAlert";
import { NotificationService, smsMoney } from "../../service/Notifications/Notification.service";
import { Wallet } from "./Wallet.model";
import { PAGA_PROVIDER, toUnavailable } from "./WalletFundingPaga.service";

export const PAYOUT_WEBHOOK_PATH = "/api/v1/merchant/payments/paga/payout-webhook";

const naira = (kobo: number) => "₦" + (kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: kobo % 100 === 0 ? 0 : 2 });

export interface WithdrawalQuote {
  amountKobo: number;
  feeKobo: number;
  vatKobo: number;
  totalKobo: number;
  bankName: string;
  accountLast4: string;
  accountName: string;
  destination: { bankUuid: string; accountNumber: string; accountName: string };
}

export type PayoutState = "success" | "pending" | "failed";

export class WalletWithdrawalPaga {
  static newReference(): string {
    return `MER-WD-${uuidv4().replace(/-/g, "").substring(0, 20)}`;
  }

  /**
   * A merchant whose saved bank still carries a Paystack code is converted when they first withdraw, using the
   * same rule as the bulk conversion: only Paga's definite answer changes anything.
   */
  private static async ensurePagaBank(details: PaymentDetails): Promise<string> {
    if (details.bankCodeProvider === "paga") return details.bankCode;

    const reverify = new HttpException(400, "Please verify your payout bank account again in settings before withdrawing.");
    let banks;
    try {
      banks = await loadPagaBanks(() => undefined);
    } catch (error) {
      throw toUnavailable(error);
    }

    const match = matchBank(details.bankCode, details.bankName, banks);
    if (match.kind !== "matched") throw reverify;
    const bank = match.bank;

    let check;
    try {
      check = await getPagaBusinessClient().validateDepositToBank({
        referenceNumber: "MB-" + uuidv4().replace(/-/g, ""),
        amountKobo: applicationConfig.paga.nameLookupAmountKobo,
        destinationBankUUID: bank.uuid,
        destinationBankAccountNumber: details.bankAccountNumber,
      });
    } catch (error) {
      throw toUnavailable(error);
    }

    if (check.outcome === "success" && check.accountHolderName && compareNames(details.bankAccountName, check.accountHolderName)) {
      await PaymentDetails.sequelize!.query(
        "UPDATE payment_details SET previous_bank_code = bank_code, bank_code = :code, bank_code_provider = 'paga', bank_name = :name WHERE id = :id",
        { replacements: { code: bank.uuid, name: bank.name, id: details.id } }
      );
      return bank.uuid;
    }
    if (check.outcome === "invalid_account" || (check.outcome === "success" && check.accountHolderName)) {
      await details.update({ bankVerified: false });
      throw reverify;
    }
    throw new HttpException(503, "We couldn't check your bank account right now. Please try again shortly.");
  }

  /** What a withdrawal of this amount would cost, and whether the saved account is still good. */
  static async quote(merchantId: string, amountNaira: number): Promise<WithdrawalQuote> {
    const min = applicationConfig.withdrawals.minNaira;
    if (amountNaira < min) throw new HttpException(400, `Minimum withdrawal amount is ₦${min.toLocaleString()}.`);

    const details = await PaymentDetails.findOne({ where: { merchantId } });
    if (!details || !details.bankVerified) {
      throw new HttpException(400, "Please add and verify your payout bank account in merchant settings before withdrawing.");
    }
    if (!details.bankCode || !details.bankAccountNumber || !details.bankAccountName) {
      throw new HttpException(400, "Your payout bank details are incomplete. Please update your payment settings and try again.");
    }

    const bankUuid = await this.ensurePagaBank(details);
    const amountKobo = amountNaira * 100;

    let check;
    try {
      check = await getPagaBusinessClient().validateDepositToBank({
        referenceNumber: "MER-WQ-" + uuidv4().replace(/-/g, "").substring(0, 20),
        amountKobo,
        destinationBankUUID: bankUuid,
        destinationBankAccountNumber: details.bankAccountNumber,
      });
    } catch (error) {
      throw toUnavailable(error);
    }

    if (check.outcome === "invalid_account") {
      throw new HttpException(400, "Your bank account could not be found. Please verify your payout bank account again in settings.");
    }
    if (check.outcome !== "success" || !check.accountHolderName || check.feeKobo === null) {
      console.error("[Withdrawal] Unusable name-check answer from Paga, code", check.responseCode);
      throw new HttpException(503, "Withdrawals are temporarily unavailable. Please try again shortly.");
    }
    if (!compareNames(details.bankAccountName, check.accountHolderName)) {
      await details.update({ bankVerified: false });
      throw new HttpException(400, "The name on your bank account no longer matches. Please verify your payout bank account again in settings.");
    }

    const feeKobo = check.feeKobo;
    const vatKobo = check.vatKobo ?? 0;
    return {
      amountKobo,
      feeKobo,
      vatKobo,
      totalKobo: amountKobo + feeKobo + vatKobo,
      bankName: details.bankName,
      accountLast4: details.bankAccountNumber.slice(-4),
      accountName: details.bankAccountName,
      destination: { bankUuid, accountNumber: details.bankAccountNumber, accountName: details.bankAccountName },
    };
  }

  static describeQuote(quote: WithdrawalQuote) {
    return {
      amount: quote.amountKobo,
      fee: quote.feeKobo + quote.vatKobo,
      total: quote.totalKobo,
      amountInNaira: quote.amountKobo / 100,
      feeInNaira: (quote.feeKobo + quote.vatKobo) / 100,
      totalInNaira: quote.totalKobo / 100,
      bankName: quote.bankName,
      accountLast4: quote.accountLast4,
      accountName: quote.accountName,
    };
  }

  /**
   * Withdraw: reserve first (wallet debited + pending record, one database transaction), then ask Paga.
   * The fee is charged on top: the bank receives exactly `amount`, the wallet pays `amount + fee + VAT`.
   */
  static async withdraw(merchantId: string, amountNaira: number, reason?: string, acceptedTotalNaira?: number) {
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new HttpException(404, "Merchant account not found.");

    const quote = await this.quote(merchantId, amountNaira);

    if (acceptedTotalNaira !== undefined && Math.round(acceptedTotalNaira * 100) !== quote.totalKobo) {
      throw new HttpException(409, `The withdrawal cost has changed. The new total is ${naira(quote.totalKobo)} (fee ${naira(quote.feeKobo + quote.vatKobo)}). Please confirm again.`);
    }

    const reference = this.newReference();
    const description = reason?.trim() || `Wallet withdrawal to ${quote.bankName || "bank account"}`;
    const sequelize = Wallet.sequelize;
    if (!sequelize) throw new HttpException(500, "Database not initialized");

    const transaction = await sequelize.transaction(async (dbTransaction) => {
      // Locking the wallet row lines up concurrent withdrawals, so the checks below cannot race
      const wallet = await Wallet.findOne({ where: { merchantId }, transaction: dbTransaction, lock: true });
      if (!wallet) throw new HttpException(404, "Wallet not found. Please contact support.");

      const inFlight = await Transaction.findOne({
        where: { merchantId, type: TransactionType.WALLET_DEBIT, status: TransactionStatus.PENDING, paymentProvider: PAGA_PROVIDER },
        transaction: dbTransaction,
      });
      if (inFlight) {
        throw new HttpException(409, "You already have a withdrawal being processed. Please wait for it to finish before starting another.");
      }

      if (wallet.balance < quote.totalKobo) {
        const shortfall = quote.totalKobo - wallet.balance;
        throw new HttpException(400, `Insufficient wallet balance. The withdrawal and its fee come to ${naira(quote.totalKobo)}; you need ${naira(shortfall)} more.`);
      }

      await wallet.update({ balance: wallet.balance - quote.totalKobo }, { transaction: dbTransaction });

      return Transaction.create(
        {
          merchantId,
          walletId: wallet.id,
          type: TransactionType.WALLET_DEBIT,
          // What left the wallet (payout + fee + VAT): a refund puts back exactly this
          amount: quote.totalKobo,
          status: TransactionStatus.PENDING,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          paystackReference: null,
          paymentProvider: PAGA_PROVIDER,
          providerReference: reference,
          description,
          metadata: {
            type: "wallet_withdrawal",
            provider: PAGA_PROVIDER,
            payoutAmountKobo: quote.amountKobo,
            quotedFeeKobo: quote.feeKobo,
            quotedVatKobo: quote.vatKobo,
            recipientBankName: quote.bankName,
            recipientAccountNumber: quote.accountLast4,
            // Kept so a payout that was reserved but never sent can be sent later, even if the merchant changes bank
            destination: quote.destination,
          },
        } as any,
        { transaction: dbTransaction }
      );
    });

    const state = await this.submit(transaction);
    const payout = naira(quote.amountKobo);
    const wallet = await Wallet.findOne({ where: { merchantId } });
    return {
      message: state === "success" ? `${payout} withdrawal completed successfully.` : `${payout} withdrawal has been queued for processing.`,
      reference,
      status: state === "success" ? TransactionStatus.SUCCESS : TransactionStatus.PENDING,
      provider: PAGA_PROVIDER,
      transferCode: null as string | null,
      destination: { bankName: quote.bankName, accountName: quote.accountName, accountNumberLast4: quote.accountLast4 },
      wallet: { balance: wallet?.balance ?? 0, balanceInNaira: (wallet?.balance ?? 0) / 100 },
      ...this.describeQuote(quote),
    };
  }

  /**
   * Send a reserved payout to Paga. Never refunds on an unknown outcome: a timeout or server error leaves the
   * withdrawal pending, and the sweeper asks Paga what happened.
   */
  static async submit(transaction: Transaction): Promise<PayoutState> {
    const reference = transaction.providerReference as string;
    const meta = transaction.metadata || {};
    const destination = meta.destination;
    if (!destination) {
      await alertOps(`wd-nodest-${reference}`, "Withdrawal has no destination", `Withdrawal ${reference} cannot be sent: no destination was saved.`);
      return "pending";
    }

    // Written BEFORE the call: if we crash mid-call we know it may have gone through and ask Paga instead of resending
    await transaction.update({ metadata: { ...meta, submitStartedAt: new Date().toISOString() } });

    let result;
    try {
      result = await getPagaBusinessClient().depositToBank({
        referenceNumber: reference,
        amountKobo: Number(meta.payoutAmountKobo),
        destinationBankUUID: destination.bankUuid,
        destinationBankAccountNumber: destination.accountNumber,
        recipientName: destination.accountName,
        remarks: (transaction.description || "Wallet withdrawal").slice(0, 100),
        statusCallbackUrl: applicationConfig.payments.publicBaseUrl + PAYOUT_WEBHOOK_PATH,
      });
    } catch (error) {
      // Unknown outcome (timeout, 5xx, unreadable answer): the money may or may not have moved
      console.error(`[Withdrawal] ${reference}: outcome unknown (${(error as Error).message}); will check with Paga`);
      return "pending";
    }

    switch (result.outcome) {
      case "success":
        await this.markSuccess(reference, { transactionId: result.transactionId, sessionId: result.sessionId, feeKobo: result.feeKobo, vatKobo: result.vatKobo });
        return "success";
      case "pending":
        await this.mergeMeta(transaction.id, { transactionId: result.transactionId, sessionId: result.sessionId });
        return "pending";
      case "duplicate_reference":
        return this.resolve(transaction);
      case "invalid_account":
        await this.failAndRefund(reference, `Paga rejected the bank account (code ${result.responseCode})`);
        throw new HttpException(400, "Your bank account was rejected. Please verify your payout bank account again in settings. Your wallet has not been charged.");
      case "insufficient_balance":
        await this.failAndRefund(reference, "Payout balance too low (code 139)");
        await alertOps("paga-balance-139", "Paga balance too low for payouts", `A payout was refused for insufficient Paga balance (reference ${reference}, ${naira(Number(meta.payoutAmountKobo))}). Top up the Paga business account.`);
        throw new HttpException(503, "Withdrawals are temporarily unavailable. Your wallet has not been charged. Please try again later.");
      default:
        // A code we don't recognise is not proof of failure: keep it pending for a status check
        await this.mergeMeta(transaction.id, { lastResponseCode: result.responseCode, needsReview: true });
        await alertOps(`wd-code-${reference}`, "Unrecognised payout response", `Paga answered code ${result.responseCode} for ${reference}. It stays pending until checked.`);
        return "pending";
    }
  }

  /**
   * Ask Paga what happened to a payout and apply it. Refunds only on a clear failure.
   * UNCONFIRMED: the exact transactionStatus wording is not documented; unknown wording leaves it pending.
   */
  static async resolve(transaction: Transaction): Promise<PayoutState> {
    const reference = transaction.providerReference as string;
    const status = await getPagaBusinessClient().getOperationStatus(reference);
    const text = String(status.transactionStatus || "").toLowerCase();

    const failed = /fail|declin|revers|reject|cancel/.test(text);
    const succeeded = !failed && /succe|complet|paid|settled/.test(text);

    if (status.outcome === "success" && succeeded) {
      await this.markSuccess(reference, { transactionId: status.transactionId });
      return "success";
    }
    if (failed) {
      await this.failAndRefund(reference, `Paga reports the payout as ${text}`, true);
      return "failed";
    }
    return "pending";
  }

  private static async mergeMeta(id: string, extra: Record<string, unknown>) {
    const row = await Transaction.findByPk(id);
    if (row) await row.update({ metadata: { ...(row.metadata || {}), ...extra } });
  }

  private static async markSuccess(
    reference: string,
    paid: { transactionId?: string | null; sessionId?: string | null; feeKobo?: number | null; vatKobo?: number | null }
  ) {
    const sequelize = Wallet.sequelize!;
    const completed = await sequelize.transaction(async (dbTransaction) => {
      const row = await Transaction.findOne({ where: { providerReference: reference, type: TransactionType.WALLET_DEBIT }, transaction: dbTransaction, lock: true });
      if (!row) return null;

      if (row.status === TransactionStatus.FAILED) {
        // We refunded the merchant but the bank was paid after all: needs a human, never auto-fixed
        void alertOps(`wd-paid-after-refund-${reference}`, "Payout succeeded after the wallet was refunded", `Withdrawal ${reference} was refunded but Paga now reports it paid. The merchant has been paid twice; review it.`);
        return null;
      }
      if (row.status === TransactionStatus.SUCCESS) return null;

      const meta = row.metadata || {};
      const paidFee = (paid.feeKobo ?? 0) + (paid.vatKobo ?? 0);
      const quotedFee = Number(meta.quotedFeeKobo || 0) + Number(meta.quotedVatKobo || 0);
      await row.update(
        {
          status: TransactionStatus.SUCCESS,
          metadata: {
            ...meta,
            transactionId: paid.transactionId || meta.transactionId || null,
            sessionId: paid.sessionId || meta.sessionId || null,
            paidFeeKobo: paid.feeKobo ?? null,
            paidVatKobo: paid.vatKobo ?? null,
            feeDifferenceKobo: paid.feeKobo === undefined || paid.feeKobo === null ? null : paidFee - quotedFee,
            settledAt: new Date().toISOString(),
          },
        },
        { transaction: dbTransaction }
      );
      return { merchantId: row.merchantId, payoutKobo: Number(meta.payoutAmountKobo), bank: String(meta.recipientBankName || "your bank"), last4: String(meta.recipientAccountNumber || "") };
    });

    // Only once, when this call is the one that completed it (after the database commit)
    if (completed) {
      const amount = completed.payoutKobo / 100;
      void NotificationService.notify({
        merchantId: completed.merchantId,
        event: "payoutAlert",
        title: "Withdrawal completed",
        body: `${naira(completed.payoutKobo)} has been sent to your bank account.`,
        smsText: `QuickMedic: Your ${smsMoney(amount)} withdrawal has been sent to your bank account.`,
        details: [`Amount sent: ${naira(completed.payoutKobo)}`, `To: ${completed.bank} ending ${completed.last4}`, `Reference: ${reference}`],
        data: { type: "withdrawal_completed", reference, amountKobo: completed.payoutKobo },
      });
    }
  }

  /**
   * Put the money back and mark the withdrawal failed, once. A success is never undone here.
   * `notifyMerchant` is for failures the merchant did not see on screen (found later by the sweeper or a callback).
   */
  static async failAndRefund(reference: string, failureReason: string, notifyMerchant = false) {
    const sequelize = Wallet.sequelize;
    if (!sequelize) throw new HttpException(500, "Database not initialized");

    const refunded = await sequelize.transaction(async (dbTransaction) => {
      const row = await Transaction.findOne({
        where: { providerReference: reference, type: TransactionType.WALLET_DEBIT },
        transaction: dbTransaction,
        lock: true,
      });
      if (!row || row.status !== TransactionStatus.PENDING || row.metadata?.walletRefunded) return null;

      const wallet = row.walletId ? await Wallet.findByPk(row.walletId, { transaction: dbTransaction, lock: true }) : null;
      if (wallet) await wallet.update({ balance: wallet.balance + row.amount }, { transaction: dbTransaction });

      await row.update(
        { status: TransactionStatus.FAILED, metadata: { ...row.metadata, walletRefunded: Boolean(wallet), failureReason } },
        { transaction: dbTransaction }
      );
      return { merchantId: row.merchantId, payoutKobo: Number(row.metadata?.payoutAmountKobo), totalKobo: Number(row.amount) };
    });

    if (refunded && notifyMerchant) {
      void NotificationService.notify({
        merchantId: refunded.merchantId,
        event: "payoutAlert",
        title: "Withdrawal failed",
        body: `Your ${naira(refunded.payoutKobo)} withdrawal could not be completed. ${naira(refunded.totalKobo)} has been returned to your wallet.`,
        smsText: `QuickMedic: Your ${smsMoney(refunded.payoutKobo / 100)} withdrawal failed. ${smsMoney(refunded.totalKobo / 100)} was returned to your wallet.`,
        details: [`Withdrawal: ${naira(refunded.payoutKobo)}`, `Returned to wallet: ${naira(refunded.totalKobo)}`, `Reference: ${reference}`],
        data: { type: "withdrawal_failed", reference, amountKobo: refunded.payoutKobo },
      });
    }
  }
}
