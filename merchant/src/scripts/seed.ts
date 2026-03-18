import * as dotenv from "dotenv";
import * as path from "path";
import { Sequelize } from "sequelize-typescript";
import { Dialect } from "sequelize";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { Merchant } from "../modules/merchant/Merchant.model";
import { StoreDetails } from "../modules/store_details/StoreDetails.model";
import { PaymentDetails } from "../modules/payment_details/PaymentDetails.model";
import { MerchantSettings } from "../modules/merchant_settings/MerchantSettings.model";
import { Category } from "../modules/categories/Category.model";
import { Product } from "../modules/products/Product.model";
import { Discount } from "../modules/discounts/Discount.model";
import { RefreshToken } from "../modules/refresh_tokens/RefreshToken.model";
import { hashPassword } from "@medtech/utils";
import { ProductStatus, DiscountType, DiscountStatus } from "../constants/enums";
import { setupAssociations } from "../modules/associations";

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = parseInt(process.env.DB_PORT || "5432", 10);
const DB_USERNAME = process.env.DB_USERNAME || "postgres";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "merchant_db";

async function createDatabaseIfNotExists() {
  const adminSequelize = new Sequelize({
    dialect: "postgres" as Dialect,
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
    await adminSequelize.authenticate();

    const [results] = await adminSequelize.query(
      `SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'`
    );

    if (Array.isArray(results) && results.length === 0) {
      await adminSequelize.query(`CREATE DATABASE "${DB_NAME}"`);
    }

    await adminSequelize.close();
  } catch (error: any) {
    await adminSequelize.close();
    throw error;
  }
}

const sequelize = new Sequelize({
  dialect: "postgres" as Dialect,
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
    Merchant,
    StoreDetails,
    PaymentDetails,
    MerchantSettings,
    Category,
    Product,
    Discount,
    RefreshToken,
  ],
});

async function seedDatabase() {
  try {
    await createDatabaseIfNotExists();

    await sequelize.authenticate();

    setupAssociations();

    await sequelize.sync({ alter: true });

    const hashedPassword = await hashPassword("Admin@123");

    const existingMerchant = await Merchant.findOne({
      where: { email: "admin@meditech.com" },
    });

    let merchant;
    if (existingMerchant) {
      merchant = existingMerchant;
    } else {
      merchant = await Merchant.create({
        email: "admin@meditech.com",
        firstName: "Admin",
        lastName: "User",
        phoneNumber: "08012345678",
        phoneCountryCode: "+234",
        password: hashedPassword,
        isVerified: true,
        isActive: true,
        onboardingCompleted: true,
        onboardingStep: 4,
        onboardingCompletedAt: new Date(),
      });
    }

    const storeDetails = await StoreDetails.findOne({
      where: { merchantId: merchant.id },
    });

    if (!storeDetails) {
      await StoreDetails.create({
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

    const paymentDetails = await PaymentDetails.findOne({
      where: { merchantId: merchant.id },
    });

    if (!paymentDetails) {
      await PaymentDetails.create({
        merchantId: merchant.id,
        bankName: "Access Bank",
        bankCode: "044",
        bankAccountNumber: "1234567890",
        bankAccountName: "MediTech Health Pharmacy",
        bankVerified: false,
      });
    }

    const merchantSettings = await MerchantSettings.findOne({
      where: { merchantId: merchant.id },
    });

    if (!merchantSettings) {
      await MerchantSettings.create({
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

    await Category.seedDefaultCategories(merchant.id);

    const categories = await Category.findAll({
      where: { merchantId: merchant.id, isActive: true },
    });

    if (categories.length > 0) {
      const categoryName = categories[0].name;

      const existingProduct = await Product.findOne({
        where: { merchantId: merchant.id, name: "Paracetamol 500mg" },
      });

      if (!existingProduct) {
        await Product.create({
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
          status: ProductStatus.IN_STOCK,
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

      const existingDiscount = await Discount.findOne({
        where: { merchantId: merchant.id, code: "WELCOME10" },
      });

      if (!existingDiscount) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        await Discount.create({
          merchantId: merchant.id,
          code: "WELCOME10",
          type: DiscountType.PERCENTAGE,
          amount: 10,
          applyToAllProducts: true,
          applicableProducts: null,
          applicableCategories: null,
          minOrderAmount: 1000,
          status: DiscountStatus.ACTIVE,
          startDate: tomorrow,
          endDate: nextMonth,
          usageLimit: 100,
          usageCount: 0,
          perUserLimit: 1,
        });
      }
    }

    await sequelize.close();
    process.exit(0);
  } catch (error: any) {
    await sequelize.close();
    process.exit(1);
  }
}

seedDatabase();
