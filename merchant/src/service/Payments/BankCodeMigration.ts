import * as crypto from "crypto";
import { QueryTypes } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { PagaCollectClient, PagaError } from "@medtech/utils";
import { applicationConfig } from "../../config";
import { getPagaBusinessClient, PagaNotConfiguredError } from "./PagaClients";
import { compareNames } from "./nameMatch";
import { BankRef, matchBank } from "./bankNames";

/**
 * Converts merchants' saved Paystack bank codes to Paga bank ids.
 *
 * The rule that makes this safe to run automatically: only a DEFINITE answer changes a merchant.
 *   - converted   Paga confirmed the saved account number still resolves to the saved holder name
 *   - unverified  we could not match the bank, Paga says the account does not exist, or the name differs
 *   - inconclusive  Paga could not be reached / gave an unexpected answer: the merchant is left UNTOUCHED
 *                   and the run is not considered complete, so it is retried later.
 */
export interface BankMigrationReport {
  eligible: number;
  converted: number;
  unverified: number;
  inconclusive: number;
  lines: string[];
}

interface Row {
  id: string;
  merchant_id: string;
  bank_name: string | null;
  bank_code: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
}

const mask = (value: string | null) => (value && value.length > 4 ? "******" + value.slice(-4) : "****");
const ref = () => "MB-" + crypto.randomUUID().replace(/-/g, "");

/** Paga's bank list (names + UUIDs), plus CBN sort codes from the Collect list when those keys are set. Throws if Paga is unreachable. */
export const loadPagaBanks = async (log: (line: string) => void): Promise<BankRef[]> => {
  const business = await getPagaBusinessClient().getBanks(ref());
  if (business.responseCode !== 0 || business.banks.length === 0) throw new Error("Paga returned no banks");
  const banks: BankRef[] = business.banks.map((bank): BankRef => ({ name: bank.name, uuid: bank.uuid, sortCode: null }));

  const { paga } = applicationConfig;
  if (paga.publicKey && paga.secretKey && paga.hashKey) {
    try {
      const collect = new PagaCollectClient({ env: paga.env, publicKey: paga.publicKey, secretKey: paga.secretKey, hashKey: paga.hashKey });
      const withCodes = await collect.banks(ref());
      const sortByUuid = new Map<string, string | null>();
      withCodes.banks.forEach((bank: { uuid: string; sortCode: string | null }) => sortByUuid.set(bank.uuid, bank.sortCode));
      banks.forEach((bank) => {
        bank.sortCode = sortByUuid.get(bank.uuid) || null;
      });
      log("Collect bank list loaded: sort codes available for " + banks.filter((bank) => bank.sortCode).length + " banks");
    } catch (error: any) {
      log("Collect bank list unavailable (" + error.message + "); matching by bank name only");
    }
  } else {
    log("Collect keys not set; matching by bank name only");
  }
  return banks;
};

type Decision =
  | { kind: "convert"; bank: BankRef; by: string }
  | { kind: "unverify"; reason: string; bank?: BankRef }
  | { kind: "inconclusive"; reason: string; bank?: BankRef };

export const runBankCodeMigration = async (
  sequelize: Sequelize,
  options: { apply: boolean; verify: boolean; log?: (line: string) => void }
): Promise<BankMigrationReport> => {
  const log = options.log || (() => undefined);
  const lines: string[] = [];
  const say = (line: string) => {
    lines.push(line);
    log(line);
  };

  if (options.apply && !options.verify) {
    throw new Error("Refusing to --apply without --verify: conversions must be confirmed with Paga first.");
  }

  say(options.apply ? "MODE: APPLY (database will be changed)" : "MODE: dry run (nothing will be changed)");
  say("Account re-check with Paga: " + (options.verify ? "on" : "off"));

  const rows = await sequelize.query<Row>(
    `SELECT id, merchant_id, bank_name, bank_code, bank_account_number, bank_account_name
     FROM payment_details
     WHERE bank_verified = true AND bank_code_provider = 'paystack' AND bank_code IS NOT NULL`,
    { type: QueryTypes.SELECT }
  );
  say(`\n${rows.length} verified merchant bank account(s) still on Paystack codes`);
  const report: BankMigrationReport = { eligible: rows.length, converted: 0, unverified: 0, inconclusive: 0, lines };
  if (rows.length === 0) return report;

  const pagaBanks = await loadPagaBanks(say);
  const business = getPagaBusinessClient();
  const decisions: Array<{ row: Row; decision: Decision }> = [];

  for (const row of rows) {
    const match = matchBank(row.bank_code || "", row.bank_name || "", pagaBanks);
    if (match.kind === "none") {
      decisions.push({ row, decision: { kind: "unverify", reason: "no Paga bank matches '" + row.bank_name + "' (" + row.bank_code + ")" } });
      continue;
    }
    if (match.kind === "ambiguous") {
      decisions.push({ row, decision: { kind: "unverify", reason: "several Paga banks match: " + match.candidates.map((bank) => bank.name).join(", ") } });
      continue;
    }

    if (!options.verify) {
      decisions.push({ row, decision: { kind: "convert", bank: match.bank, by: match.by } });
      continue;
    }

    try {
      const check = await business.validateDepositToBank({
        referenceNumber: ref(),
        amountKobo: applicationConfig.paga.nameLookupAmountKobo,
        destinationBankUUID: match.bank.uuid,
        destinationBankAccountNumber: row.bank_account_number || "",
      });

      if (check.outcome === "success" && check.accountHolderName) {
        decisions.push({
          row,
          decision: compareNames(row.bank_account_name || "", check.accountHolderName)
            ? { kind: "convert", bank: match.bank, by: match.by }
            : { kind: "unverify", bank: match.bank, reason: "name differs: saved '" + row.bank_account_name + "', bank says '" + check.accountHolderName + "'" },
        });
      } else if (check.outcome === "invalid_account") {
        decisions.push({ row, decision: { kind: "unverify", bank: match.bank, reason: "Paga could not resolve the account (code " + check.responseCode + ")" } });
      } else {
        // success without a name, insufficient balance on our side, duplicate reference, unknown code...
        decisions.push({ row, decision: { kind: "inconclusive", bank: match.bank, reason: "Paga gave an unusable answer (code " + check.responseCode + ")" } });
      }
    } catch (error: any) {
      const unreachable = error instanceof PagaError || error instanceof PagaNotConfiguredError;
      decisions.push({ row, decision: { kind: "inconclusive", bank: match.bank, reason: (unreachable ? "Paga unreachable: " : "lookup error: ") + error.message } });
    }
  }

  if (options.apply) {
    for (const { row, decision } of decisions) {
      if (decision.kind === "convert") {
        await sequelize.query(
          `UPDATE payment_details SET previous_bank_code = bank_code, bank_code = :code, bank_code_provider = 'paga', bank_name = :name WHERE id = :id`,
          { replacements: { code: decision.bank.uuid, name: decision.bank.name, id: row.id } }
        );
      } else if (decision.kind === "unverify") {
        await sequelize.query(`UPDATE payment_details SET bank_verified = false WHERE id = :id`, { replacements: { id: row.id } });
      }
      // inconclusive: deliberately untouched
    }
  }

  say("\nResult per merchant:");
  for (const { row, decision } of decisions) {
    const who = `merchant ${row.merchant_id} · ${row.bank_name} · ${mask(row.bank_account_number)}`;
    if (decision.kind === "convert") {
      report.converted++;
      say(`  ${options.apply ? "CONVERTED   " : "WOULD CONVERT"} ${who} -> ${decision.bank.name} (matched by ${decision.by})`);
    } else if (decision.kind === "unverify") {
      report.unverified++;
      say(`  ${options.apply ? "UNVERIFIED  " : "WOULD UNVERIFY"} ${who}${decision.bank ? " -> " + decision.bank.name : ""}: ${decision.reason}`);
    } else {
      report.inconclusive++;
      say(`  LEFT AS IS    ${who}${decision.bank ? " -> " + decision.bank.name : ""}: ${decision.reason}`);
    }
  }

  say(
    `\nSummary: ${report.converted} ${options.apply ? "converted" : "convertible"}, ` +
      `${report.unverified} need the merchant to verify again, ` +
      `${report.inconclusive} could not be checked right now (left untouched), ${rows.length} total`
  );
  if (!options.apply) say("Nothing was changed. Re-run with --apply --verify to perform the conversion.");
  return report;
};

// ------------------------------------------------------------------------------------------------
// Automatic one-time run after startup
// ------------------------------------------------------------------------------------------------
const MIGRATION_NAME = "bank-codes-paystack-to-paga";
const LOCK_KEY = 7261001; // advisory lock: only one server instance runs it
const RETRY_MS = 30 * 60 * 1000;
const MAX_RETRIES = 24;

const tag = (line: string) => "[BankCodeMigration] " + line;

const attempt = async (sequelize: Sequelize, retriesLeft: number): Promise<void> => {
  const { paga } = applicationConfig;
  const retry = (why: string) => {
    if (retriesLeft <= 0) return console.warn(tag(why + "; giving up until the next restart"));
    console.log(tag(why + "; will retry in " + RETRY_MS / 60000 + " minutes"));
    const timer = setTimeout(() => void attempt(sequelize, retriesLeft - 1), RETRY_MS);
    timer.unref();
  };

  try {
    await sequelize.transaction(async (transaction) => {
      // Held for the duration of this transaction; a second instance skips instead of waiting
      const [lock] = await sequelize.query<{ ok: boolean }>("SELECT pg_try_advisory_xact_lock(:key) AS ok", {
        replacements: { key: LOCK_KEY },
        type: QueryTypes.SELECT,
        transaction,
      });
      if (!lock?.ok) return console.log(tag("another instance is running it; skipping"));

      const done = await sequelize.query("SELECT 1 FROM data_migrations WHERE name = :name", {
        replacements: { name: MIGRATION_NAME },
        type: QueryTypes.SELECT,
        transaction,
      });
      if (done.length > 0) return console.log(tag("already completed on an earlier start; nothing to do"));

      if (!paga.businessPrincipal || !paga.businessCredentials || !paga.hashKey) {
        return retry("Paga is not configured on this server yet");
      }

      let report: BankMigrationReport;
      try {
        report = await runBankCodeMigration(sequelize, { apply: true, verify: true, log: (line) => console.log(tag(line)) });
      } catch (error: any) {
        return retry("could not run (" + error.message + ")");
      }

      if (report.inconclusive > 0) {
        return retry(report.inconclusive + " merchant(s) could not be checked right now (left untouched)");
      }

      await sequelize.query("INSERT INTO data_migrations (name, ran_at, result) VALUES (:name, now(), :result::jsonb) ON CONFLICT (name) DO NOTHING", {
        replacements: {
          name: MIGRATION_NAME,
          result: JSON.stringify({ eligible: report.eligible, converted: report.converted, unverified: report.unverified }),
        },
        transaction,
      });
      console.log(tag("completed and recorded: it will not run again"));
    });
  } catch (error: any) {
    retry("unexpected error: " + error.message);
  }
};

/**
 * Starts the one-time conversion in the background shortly after startup. It never blocks or crashes the server
 * and is skipped when bank checks are not on Paga.
 *
 * OFF BY DEFAULT: it rewrites merchants' saved bank details, so it must be switched on deliberately
 * (AUTO_BANK_CODE_MIGRATION=true) once the Paga sandbox results and a dry-run report have been reviewed.
 */
export const scheduleBankCodeMigration = (sequelize: Sequelize): void => {
  if (process.env.AUTO_BANK_CODE_MIGRATION !== "true") return;
  if (applicationConfig.bankVerification.provider !== "paga") return;

  const delay = Number(process.env.AUTO_BANK_CODE_MIGRATION_DELAY_MS) || 15000;
  const timer = setTimeout(() => void attempt(sequelize, MAX_RETRIES), delay);
  timer.unref();
};
