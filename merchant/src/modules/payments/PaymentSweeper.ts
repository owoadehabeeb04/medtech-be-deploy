import { Op } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { applicationConfig } from "../../config";
import { Transaction } from "../transactions/Transaction.model";
import { TransactionStatus, TransactionType } from "../../constants/enums";
import { WalletService } from "../wallet/Wallet.service";
import { WalletFundingPaga, PAGA_PROVIDER } from "../wallet/WalletFundingPaga.service";
import { isPagaCheckoutConfigured, getPagaBusinessClient } from "../../service/Payments/PagaClients";
import { WalletWithdrawalPaga } from "../wallet/WalletWithdrawalPaga.service";
import { alertOps } from "../../service/Payments/OpsAlert";

// One number shared by every instance, so only one of them sweeps at a time
const SWEEPER_LOCK_ID = 7340112;
const BATCH = 50;

export interface SweepSummary {
  checked: number;
  credited: number;
  expired: number;
  errors: number;
}

/**
 * Safety net for payments whose webhook never arrived or whose customer never came back: asks Paga about
 * every funding still pending, credits those that were paid, and expires the ones nobody paid.
 * An expired funding stays eligible for the late-success window, so a payment made after we gave up is still credited.
 */
export const sweepWalletFundings = async (now: Date = new Date()): Promise<SweepSummary> => {
  const cfg = applicationConfig.payments;
  const summary: SweepSummary = { checked: 0, credited: 0, expired: 0, errors: 0 };
  const olderThan = new Date(now.getTime() - cfg.sweeperMinAgeMs);
  const expireBefore = new Date(now.getTime() - cfg.pendingExpiryHours * 3600 * 1000);
  const lateCutoff = new Date(expireBefore.getTime() - cfg.lateSuccessWindowDays * 24 * 3600 * 1000);

  const candidates = await Transaction.findAll({
    where: {
      type: TransactionType.WALLET_FUNDING,
      paymentProvider: PAGA_PROVIDER,
      createdAt: { [Op.lt]: olderThan, [Op.gt]: lateCutoff },
      [Op.or]: [
        { status: TransactionStatus.PENDING },
        // given up on, but within the window in which a late payment is still credited
        { status: TransactionStatus.FAILED, createdAt: { [Op.lt]: olderThan, [Op.gt]: lateCutoff }, metadata: { expiredBySweeper: true } },
      ],
    } as any,
    order: [["createdAt", "ASC"]],
    limit: BATCH,
  });

  for (const transaction of candidates) {
    summary.checked += 1;
    const reference = transaction.providerReference as string;
    try {
      const outcome = await WalletFundingPaga.check(transaction);
      if (outcome.state === "paid") {
        const result = await WalletService.settleFundingTransaction(reference, { source: "sweeper", expectedAmount: outcome.paidKobo });
        WalletService.queueWalletFundingNotification(reference, result);
        summary.credited += 1;
      } else if (transaction.status === TransactionStatus.PENDING && transaction.createdAt < expireBefore) {
        await transaction.update({
          status: TransactionStatus.FAILED,
          metadata: { ...(transaction.metadata || {}), expiredBySweeper: true, expiredAt: now.toISOString() },
        });
        summary.expired += 1;
      }
    } catch (error) {
      summary.errors += 1;
      console.error(`[Sweeper] ${reference}:`, (error as Error).message);
    }
  }

  return summary;
};

export interface WithdrawalSweepSummary {
  checked: number;
  sent: number;
  completed: number;
  refunded: number;
  stuck: number;
  errors: number;
}

/**
 * Payouts that are still pending: send the ones we reserved but never sent, ask Paga about the ones whose
 * outcome we don't know, and raise an alert for any that stay unresolved too long.
 */
export const sweepWithdrawals = async (now: Date = new Date()): Promise<WithdrawalSweepSummary> => {
  const cfg = applicationConfig.payments;
  const summary: WithdrawalSweepSummary = { checked: 0, sent: 0, completed: 0, refunded: 0, stuck: 0, errors: 0 };
  const olderThan = new Date(now.getTime() - cfg.sweeperMinAgeMs);
  const stuckBefore = new Date(now.getTime() - applicationConfig.withdrawals.stuckAlertHours * 3600 * 1000);

  const pending = await Transaction.findAll({
    where: {
      type: TransactionType.WALLET_DEBIT,
      paymentProvider: PAGA_PROVIDER,
      status: TransactionStatus.PENDING,
      createdAt: { [Op.lt]: olderThan },
    } as any,
    order: [["createdAt", "ASC"]],
    limit: BATCH,
  });

  for (const transaction of pending) {
    summary.checked += 1;
    const reference = transaction.providerReference as string;
    try {
      let state;
      if (!transaction.metadata?.submitStartedAt) {
        // Reserved but never sent (e.g. the server stopped in between): sending is safe, Paga rejects a repeated reference
        state = await WalletWithdrawalPaga.submit(transaction);
        summary.sent += 1;
      } else {
        state = await WalletWithdrawalPaga.resolve(transaction);
      }
      if (state === "success") summary.completed += 1;
      else if (state === "failed") summary.refunded += 1;
      else if (transaction.createdAt < stuckBefore) {
        summary.stuck += 1;
        await alertOps(`wd-stuck-${reference}`, "Withdrawal stuck", `Withdrawal ${reference} has been pending for over ${applicationConfig.withdrawals.stuckAlertHours} hours. Check it in the Paga portal.`);
      }
    } catch (error) {
      // A refused request (e.g. "insufficient balance" while resending) already refunded and alerted; anything else is retried next run
      summary.errors += 1;
      console.error(`[Sweeper] withdrawal ${reference}:`, (error as Error).message);
    }
  }
  return summary;
};

let lastBalanceAlertCheck = 0;

/** Warn the team when the Paga balance that payouts are paid from gets low. Checked at most hourly. */
export const checkPayoutBalance = async (): Promise<void> => {
  const threshold = applicationConfig.withdrawals.lowBalanceAlertNaira * 100;
  if (!threshold || Date.now() - lastBalanceAlertCheck < 60 * 60 * 1000) return;
  lastBalanceAlertCheck = Date.now();
  try {
    const balance = await getPagaBusinessClient().accountBalance("BAL-" + Date.now());
    if (balance.availableBalanceKobo < threshold) {
      await alertOps("paga-low-balance", "Paga balance is low", `Available Paga balance is ₦${(balance.availableBalanceKobo / 100).toLocaleString()}, below the alert level of ₦${(threshold / 100).toLocaleString()}. Payouts will fail when it runs out.`);
    }
  } catch (error) {
    console.error("[Sweeper] balance check failed:", (error as Error).message);
  }
};

/** Run one sweep, but only if no other instance is already doing so. */
export const runSweeperOnce = async (sequelize: Sequelize): Promise<SweepSummary | null> => {
  if (!isPagaCheckoutConfigured() && !applicationConfig.paga.businessPrincipal) return null;
  return sequelize.transaction(async (t) => {
    const [rows]: any = await sequelize.query("SELECT pg_try_advisory_xact_lock(:id) AS locked", {
      replacements: { id: SWEEPER_LOCK_ID },
      transaction: t,
    });
    if (!rows?.[0]?.locked) return null;
    const fundings = await sweepWalletFundings();
    await sweepWithdrawals().then((w) => {
      if (w.sent || w.completed || w.refunded || w.stuck || w.errors) console.log("[Sweeper] withdrawals", w);
    });
    await checkPayoutBalance();
    return fundings;
  });
};

export const scheduleSweeper = (sequelize: Sequelize): void => {
  const cfg = applicationConfig.payments;
  if (!cfg.sweeperEnabled) return;
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const summary = await runSweeperOnce(sequelize);
      if (summary && (summary.credited || summary.expired || summary.errors)) console.log("[Sweeper]", summary);
    } catch (error) {
      console.error("[Sweeper] run failed:", (error as Error).message);
    } finally {
      running = false;
    }
  };
  setInterval(tick, cfg.sweeperIntervalMs).unref();
};
