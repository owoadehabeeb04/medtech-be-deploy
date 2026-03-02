"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_typescript_1 = require("sequelize-typescript");
const config_1 = require("../config");
const Merchant_model_1 = require("../modules/merchant/Merchant.model");
const MerchantVerification_model_1 = require("../modules/merchant_verification/MerchantVerification.model");
const StoreDetails_model_1 = require("../modules/store_details/StoreDetails.model");
const PaymentDetails_model_1 = require("../modules/payment_details/PaymentDetails.model");
const MerchantSettings_model_1 = require("../modules/merchant_settings/MerchantSettings.model");
const Product_model_1 = require("../modules/products/Product.model");
const Discount_model_1 = require("../modules/discounts/Discount.model");
const Category_model_1 = require("../modules/categories/Category.model");
const RefreshToken_model_1 = require("../modules/refresh_tokens/RefreshToken.model");
const associations_1 = require("../modules/associations");
const { postgres } = config_1.applicationConfig;
const connection = () => __awaiter(void 0, void 0, void 0, function* () {
    const sequelize = new sequelize_typescript_1.Sequelize({
        dialect: "postgres",
        host: postgres.host,
        port: postgres.port,
        username: postgres.username,
        password: postgres.password,
        database: postgres.database,
        logging: postgres.logging ? console.log : false,
        dialectOptions: {
            ssl: config_1.applicationConfig.nodeEnv === "production" ? {
                require: true,
                rejectUnauthorized: false,
            } : false,
        },
        define: {
            underscored: true,
        },
        models: [
            Merchant_model_1.Merchant,
            MerchantVerification_model_1.MerchantVerification,
            StoreDetails_model_1.StoreDetails,
            PaymentDetails_model_1.PaymentDetails,
            MerchantSettings_model_1.MerchantSettings,
            Product_model_1.Product,
            Discount_model_1.Discount,
            Category_model_1.Category,
            RefreshToken_model_1.RefreshToken,
        ],
    });
    try {
        yield sequelize.authenticate();
        console.log("PostgreSQL connection established successfully.");
        // Setup model associations
        (0, associations_1.setupAssociations)();
        // Sync database tables in development mode
        if (config_1.applicationConfig.nodeEnv === "development") {
            yield sequelize.sync({ alter: true });
            console.log("Database tables synchronized.");
        }
    }
    catch (error) {
        console.error("Unable to connect to PostgreSQL:", error);
        console.error("Please check your database configuration in .env file");
        console.error("DB_HOST:", postgres.host);
        console.error("DB_NAME:", postgres.database);
        console.error("\nMake sure PostgreSQL is running locally and the database exists.");
        console.error("You can create the database with: createdb merchant_db");
        console.error("\nServer will continue but database operations will fail.");
        // Don't exit - allow server to start for development
        // process.exit(1);
    }
    return sequelize;
});
exports.default = connection;
