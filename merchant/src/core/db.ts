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
import { setupAssociations } from "../modules/associations";

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
		models: [Merchant, MerchantVerification, StoreDetails, PaymentDetails, MerchantSettings, Product, Discount, Category, RefreshToken],
	});

	try {
		await sequelize.authenticate();

		// Setup model associations
		setupAssociations();

		// Sync database tables in development mode
		if (applicationConfig.nodeEnv === "development") {
			await sequelize.sync({ alter: true });
		}
	} catch (error) {
		console.log("Database connection error: ", error);
		process.exit(1);
	}

	return sequelize;
};

export default connection;
