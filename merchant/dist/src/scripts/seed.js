"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const sequelize_typescript_1 = require("sequelize-typescript");
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
const Merchant_model_1 = require("../modules/merchant/Merchant.model");
const StoreDetails_model_1 = require("../modules/store_details/StoreDetails.model");
const PaymentDetails_model_1 = require("../modules/payment_details/PaymentDetails.model");
const MerchantSettings_model_1 = require("../modules/merchant_settings/MerchantSettings.model");
const Category_model_1 = require("../modules/categories/Category.model");
const Product_model_1 = require("../modules/products/Product.model");
const Discount_model_1 = require("../modules/discounts/Discount.model");
const RefreshToken_model_1 = require("../modules/refresh_tokens/RefreshToken.model");
const utils_1 = require("@medtech/utils");
const enums_1 = require("../constants/enums");
const associations_1 = require("../modules/associations");
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = parseInt(process.env.DB_PORT || "5432", 10);
const DB_USERNAME = process.env.DB_USERNAME || "postgres";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "merchant_db";
function createDatabaseIfNotExists() {
    return __awaiter(this, void 0, void 0, function* () {
        const adminSequelize = new sequelize_typescript_1.Sequelize({
            dialect: "postgres",
            host: DB_HOST,
            port: DB_PORT,
            username: DB_USERNAME,
            password: DB_PASSWORD,
            database: "postgres",
            logging: false,
            dialectOptions: {
                ssl: {
                    require: true,
                    rejectUnauthorized: false,
                },
            },
        });
        try {
            yield adminSequelize.authenticate();
            const [results] = yield adminSequelize.query(`SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'`);
            if (Array.isArray(results) && results.length === 0) {
                yield adminSequelize.query(`CREATE DATABASE "${DB_NAME}"`);
            }
            yield adminSequelize.close();
        }
        catch (error) {
            yield adminSequelize.close();
            throw error;
        }
    });
}
const sequelize = new sequelize_typescript_1.Sequelize({
    dialect: "postgres",
    host: DB_HOST,
    port: DB_PORT,
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_NAME,
    logging: false,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false,
        },
    },
    define: {
        underscored: true,
    },
    models: [
        Merchant_model_1.Merchant,
        StoreDetails_model_1.StoreDetails,
        PaymentDetails_model_1.PaymentDetails,
        MerchantSettings_model_1.MerchantSettings,
        Category_model_1.Category,
        Product_model_1.Product,
        Discount_model_1.Discount,
        RefreshToken_model_1.RefreshToken,
    ],
});
function seedDatabase() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield createDatabaseIfNotExists();
            yield sequelize.authenticate();
            (0, associations_1.setupAssociations)();
            yield sequelize.sync({ alter: true });
            const hashedPassword = yield (0, utils_1.hashPassword)("Admin@123");
            const existingMerchant = yield Merchant_model_1.Merchant.findOne({
                where: { email: "admin@meditech.com" },
            });
            let merchant;
            if (existingMerchant) {
                merchant = existingMerchant;
            }
            else {
                merchant = yield Merchant_model_1.Merchant.create({
                    email: "admin@meditech.com",
                    firstName: "Admin",
                    lastName: "User",
                    phoneNumber: "08012345678",
                    phoneCountryCode: "+234",
                    password: hashedPassword,
                    isVerified: true,
                    isActive: true,
                    termsAccepted: true,
                    onboardingCompleted: true,
                    onboardingStep: 5,
                    onboardingCompletedAt: new Date(),
                });
            }
            const storeDetails = yield StoreDetails_model_1.StoreDetails.findOne({
                where: { merchantId: merchant.id },
            });
            if (!storeDetails) {
                yield StoreDetails_model_1.StoreDetails.create({
                    merchantId: merchant.id,
                    businessName: "MediTech Health Pharmacy",
                    businessUrl: "https://meditechhealth.ng",
                    businessAddress: "14 Haruna Ishola Street, Lagos. Nigeria",
                    city: "Lagos",
                    state: "Lagos",
                    landmark: "Near Ikeja City Mall",
                    storeDescription: "Your trusted healthcare partner providing quality medications and health services.",
                    openHour: "08:00",
                    closeHour: "20:00",
                    vacation: false,
                });
            }
            const paymentDetails = yield PaymentDetails_model_1.PaymentDetails.findOne({
                where: { merchantId: merchant.id },
            });
            if (!paymentDetails) {
                yield PaymentDetails_model_1.PaymentDetails.create({
                    merchantId: merchant.id,
                    bankName: "Access Bank",
                    bankCode: "044",
                    bankAccountNumber: "1234567890",
                    bankAccountName: "MediTech Health Pharmacy",
                    bankVerified: false,
                });
            }
            const merchantSettings = yield MerchantSettings_model_1.MerchantSettings.findOne({
                where: { merchantId: merchant.id },
            });
            if (!merchantSettings) {
                yield MerchantSettings_model_1.MerchantSettings.create({
                    merchantId: merchant.id,
                    pushNotificationsEnabled: true,
                    emailNotificationsEnabled: true,
                    notificationPreferences: {
                        orderPlaced: { email: true, sms: false, desktop: true },
                        lowStock: { email: true, sms: false, desktop: true },
                        payoutAlert: { email: true, sms: false, desktop: true },
                        supportTicket: { email: true, sms: false, desktop: true },
                    },
                    storePreferences: {
                        acceptOrdersAutomatically: true,
                        requireManualApprovalForPrescriptions: false,
                        allowOutOfStockAlternatives: false,
                        autoHideOutOfStock: false,
                        enablePharmacyPickup: true,
                        enableInHouseDelivery: true,
                        deliveryRadius: 10,
                        deliveryFeeType: "flat",
                        deliveryFlatFee: 500,
                        deliveryPricePerKm: null,
                        deliveryStartTime: "09:00",
                        deliveryEndTime: "18:00",
                        lowStockThreshold: 5,
                        showLowStockLabel: true,
                    },
                });
            }
            yield Category_model_1.Category.seedDefaultCategories(merchant.id);
            const categories = yield Category_model_1.Category.findAll({
                where: { merchantId: merchant.id, isActive: true },
            });
            if (categories.length > 0) {
                const categoryName = categories[0].name;
                const existingProduct = yield Product_model_1.Product.findOne({
                    where: { merchantId: merchant.id, name: "Paracetamol 500mg" },
                });
                if (!existingProduct) {
                    yield Product_model_1.Product.create({
                        merchantId: merchant.id,
                        name: "Paracetamol 500mg",
                        description: "Pain relief and fever reducer. Take 1-2 tablets every 4-6 hours as needed.",
                        category: categoryName,
                        brand: "GSK",
                        sku: "PRC-500-001",
                        price: 500.00,
                        vat: 37.50,
                        discountPercentage: 0,
                        minQuantity: 1,
                        maxQuantity: 10,
                        inventory: 100,
                        status: enums_1.ProductStatus.IN_STOCK,
                        images: [
                            {
                                url: "https://via.placeholder.com/400x400?text=Paracetamol",
                                order: 1,
                                isMain: true,
                            },
                        ],
                        isActive: true,
                    });
                }
                const existingDiscount = yield Discount_model_1.Discount.findOne({
                    where: { merchantId: merchant.id, code: "WELCOME10" },
                });
                if (!existingDiscount) {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const nextMonth = new Date();
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    yield Discount_model_1.Discount.create({
                        merchantId: merchant.id,
                        code: "WELCOME10",
                        type: enums_1.DiscountType.PERCENTAGE,
                        amount: 10,
                        applyToAllProducts: true,
                        applicableProducts: null,
                        applicableCategories: null,
                        minOrderAmount: 1000,
                        status: enums_1.DiscountStatus.ACTIVE,
                        startDate: tomorrow,
                        endDate: nextMonth,
                        usageLimit: 100,
                        usageCount: 0,
                        perUserLimit: 1,
                    });
                }
            }
            yield sequelize.close();
            process.exit(0);
        }
        catch (error) {
            yield sequelize.close();
            process.exit(1);
        }
    });
}
seedDatabase();
