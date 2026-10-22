/**
 * Manual run of the Paystack -> Paga bank code conversion (the same logic runs automatically once after the
 * first deploy on Paga; see service/Payments/BankCodeMigration.ts).
 *
 *   npm run migrate:bank-codes                       dry run: reports what WOULD happen, changes nothing
 *   npm run migrate:bank-codes -- --verify           dry run + re-checks each account with Paga (may be billed per lookup)
 *   npm run migrate:bank-codes -- --apply --verify   performs the conversion
 */
import * as dotenv from "dotenv";
import * as path from "path";
import { Sequelize } from "sequelize-typescript";
import { Dialect } from "sequelize";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { runBankCodeMigration } from "../service/Payments/BankCodeMigration";

const APPLY = process.argv.includes("--apply");
const VERIFY = process.argv.includes("--verify");

const DB_HOST = process.env.DB_HOST || "localhost";
const sequelize = new Sequelize({
  dialect: "postgres" as Dialect,
  host: DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432", 10),
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "merchant_db",
  logging: false,
  dialectOptions:
    DB_HOST.includes("rds.amazonaws.com") || process.env.NODE_ENV === "production"
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : undefined,
});

if (APPLY && !VERIFY) {
  console.error("Refusing to --apply without --verify: conversions must be confirmed with Paga first.");
  process.exit(2);
}

sequelize
  .authenticate()
  .then(() => runBankCodeMigration(sequelize, { apply: APPLY, verify: VERIFY, log: (line) => console.log(line) }))
  .then(() => sequelize.close())
  .catch(async (error): Promise<void> => {
    console.error("Migration failed:", error.message);
    await sequelize.close().catch((): undefined => undefined);
    process.exit(1);
  });
