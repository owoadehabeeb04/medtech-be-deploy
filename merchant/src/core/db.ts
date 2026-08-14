import { Dialect } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { applicationConfig } from "../config";
import { Merchant } from "../modules/merchant/Merchant.model";
import { MerchantVerification } from "../modules/merchant_verification/MerchantVerification.model";
import { StoreDetails } from "../modules/store_details/StoreDetails.model";
import { PaymentDetails } from "../modules/payment_details/PaymentDetails.model";
import { MerchantSettings } from "../modules/merchant_settings/MerchantSettings.model";
import { Product } from "../modules/products/Product.model";
import { Discount } from "../modules/discounts/Discount.model";
import { Category } from "../modules/categories/Category.model";
import { RefreshToken } from "../modules/refresh_tokens/RefreshToken.model";
import { Plan } from "../modules/subscriptions/Plan.model";
import { Subscription } from "../modules/subscriptions/Subscription.model";
import { ScheduledPlanChange } from "../modules/subscriptions/ScheduledPlanChange.model";
import { Wallet } from "../modules/wallet/Wallet.model";
import { Transaction } from "../modules/transactions/Transaction.model";
import { DrugstoreOrder } from "../modules/drugstore_orders/DrugstoreOrder.model";
import { DrugstoreOrderItem } from "../modules/drugstore_orders/DrugstoreOrderItem.model";
import { setupAssociations } from "../modules/associations";
import { seedPlans } from "../modules/subscriptions/plan-seeds";
import { runMigrations } from "./migrations";

const { postgres } = applicationConfig;

const connection = async (): Promise<Sequelize> => {
  console.log("Connecting to database...");
  console.log(postgres);
	const sequelize = new Sequelize({
		dialect: "postgres" as Dialect,
		host: postgres.host,
		port: postgres.port,
		username: postgres.username,
		password: postgres.password,
		database: postgres.database,
		logging: false,
		dialectOptions: {
			ssl:
				postgres.host.includes("rds.amazonaws.com") || applicationConfig.nodeEnv === "production"
					? {
							require: true,
							rejectUnauthorized: false,
						}
					: false,
		},
		define: {
			underscored: true,
		},
		models: [Merchant, MerchantVerification, StoreDetails, PaymentDetails, MerchantSettings, Product, Discount, Category, RefreshToken, Plan, Subscription, ScheduledPlanChange, Wallet, Transaction, DrugstoreOrder, DrugstoreOrderItem],
	});

	try {
		await sequelize.authenticate();

		// Setup model associations
		setupAssociations();

		// Keep development startup safe by default. Sequelize's alter mode can
		// attempt to drop a foreign-key constraint that has already been removed
		// or renamed in a local database, which crashes the whole service.
		if (applicationConfig.nodeEnv === "development") {
			const alterSchema = process.env.DB_SYNC_ALTER === "true";
			await sequelize.sync(alterSchema ? { alter: true } : undefined);
		}

		// Run one-time migrations (idempotent, safe for all environments)
		await runMigrations(sequelize);

		// Seed subscription plans
		await seedPlans();
	} catch (error) {
		console.log("Database connection error: ", error);
		process.exit(1);
	}

	return sequelize;
};

export default connection;
