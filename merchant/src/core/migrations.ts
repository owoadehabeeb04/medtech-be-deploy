import { Sequelize } from "sequelize-typescript";
import { DataTypes } from "sequelize";

export async function runMigrations(sequelize: Sequelize): Promise<void> {
  const queryInterface = sequelize.getQueryInterface();

  await removeTermsAcceptedColumn(queryInterface);
  await addDrugstoreOrderFlowColumns(queryInterface);
  await addInStoreSalesFlag(queryInterface);
  await addMerchantDeviceTokensTable(queryInterface);
  await addMerchantPushPreferenceDefaults(queryInterface);
  await shiftOnboardingSteps(sequelize);
}

async function removeTermsAcceptedColumn(queryInterface: any): Promise<void> {
  try {
    const tableDescription = await queryInterface.describeTable("merchants");

    if (tableDescription.terms_accepted) {
      await queryInterface.removeColumn("merchants", "terms_accepted");
      console.log("[Migration] Dropped terms_accepted column from merchants table");
    }
  } catch (error: any) {
    if (error.message?.includes("does not exist")) return;
    console.error("[Migration] Error removing terms_accepted column:", error.message);
  }
}

async function addDrugstoreOrderFlowColumns(queryInterface: any): Promise<void> {
  try {
    const tableName = "merchant_drugstore_orders";
    const tableDescription = await queryInterface.describeTable(tableName);

    if (!tableDescription.payment_status) {
      await queryInterface.addColumn(tableName, "payment_status", {
        type: DataTypes.ENUM("pending", "paid", "failed"),
        allowNull: false,
        defaultValue: "paid",
      });
      console.log("[Migration] Added payment_status column to merchant_drugstore_orders");
    }

    if (!tableDescription.delivery_status) {
      await queryInterface.addColumn(tableName, "delivery_status", {
        type: DataTypes.ENUM("pending", "picked_up", "in_transit", "delivered", "cancelled"),
        allowNull: false,
        defaultValue: "pending",
      });
      console.log("[Migration] Added delivery_status column to merchant_drugstore_orders");
    }

    if (!tableDescription.placed_at) {
      await queryInterface.addColumn(tableName, "placed_at", {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      });
      console.log("[Migration] Added placed_at column to merchant_drugstore_orders");
    }

    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_merchant_drugstore_orders_payment_status ON merchant_drugstore_orders (payment_status)`
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_merchant_drugstore_orders_delivery_status ON merchant_drugstore_orders (delivery_status)`
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_merchant_drugstore_orders_placed_at ON merchant_drugstore_orders (placed_at)`
    );
  } catch (error: any) {
    if (error.message?.includes("does not exist")) return;
    console.error("[Migration] Error adding merchant drugstore order flow columns:", error.message);
  }
}

async function addInStoreSalesFlag(queryInterface: any): Promise<void> {
  try {
    const tableName = "merchant_drugstore_orders";
    const tableDescription = await queryInterface.describeTable(tableName);

    if (!tableDescription.is_instore_sales) {
      await queryInterface.addColumn(tableName, "is_instore_sales", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      console.log("[Migration] Added is_instore_sales column to merchant_drugstore_orders");
    }

    await queryInterface.sequelize.query(
      `UPDATE ${tableName}
       SET is_instore_sales = true
       WHERE is_instore_sales = false
         AND metadata @> '{"origin":"in_store"}'::jsonb`
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_merchant_drugstore_orders_is_instore_sales
       ON ${tableName} (is_instore_sales)`
    );
  } catch (error: any) {
    if (error.message?.includes("does not exist")) return;
    console.error("[Migration] Error adding is_instore_sales column:", error.message);
  }
}

async function addMerchantDeviceTokensTable(queryInterface: any): Promise<void> {
  const tableName = "merchant_device_tokens";

  try {
    let tableExists = true;
    try {
      await queryInterface.describeTable(tableName);
    } catch (error: any) {
      if (!/does not exist|relation .* does not exist/i.test(error?.message || "")) {
        throw error;
      }
      tableExists = false;
    }

    if (!tableExists) {
      await queryInterface.createTable(tableName, {
        id: {
          type: DataTypes.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: DataTypes.UUIDV4,
        },
        merchant_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "merchants", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        device_id: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        token: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        platform: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "web",
        },
        browser: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        user_agent: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        is_active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        last_seen_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        last_error_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        last_error_code: {
          type: DataTypes.STRING(120),
          allowNull: true,
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });
      console.log(`[Migration] Created ${tableName} table`);
    }

    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS merchant_device_tokens_merchant_device_unique
       ON ${tableName} (merchant_id, device_id)`
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS merchant_device_tokens_merchant_active_idx
       ON ${tableName} (merchant_id, is_active)`
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS merchant_device_tokens_token_idx
       ON ${tableName} (token)`
    );
  } catch (error: any) {
    if (error.message?.includes("does not exist")) return;
    console.error(`[Migration] Error creating ${tableName} table:`, error.message);
  }
}

async function addMerchantPushPreferenceDefaults(queryInterface: any): Promise<void> {
  try {
    await queryInterface.sequelize.query(`
      UPDATE merchant_settings
      SET notification_preferences =
        COALESCE(notification_preferences, '{}'::jsonb) || jsonb_build_object(
          'walletFunded', COALESCE(
            notification_preferences->'walletFunded',
            '{"email":false,"sms":false,"desktop":true}'::jsonb
          ),
          'offlineSaleRecorded', COALESCE(
            notification_preferences->'offlineSaleRecorded',
            '{"email":false,"sms":false,"desktop":true}'::jsonb
          )
        )
      WHERE notification_preferences IS NULL
         OR NOT (notification_preferences ? 'walletFunded')
         OR NOT (notification_preferences ? 'offlineSaleRecorded')
    `);
  } catch (error: any) {
    if (error.message?.includes("does not exist")) return;
    console.error("[Migration] Error adding merchant push preference defaults:", error.message);
  }
}

/**
 * Shift onboarding steps down by 1 for merchants who haven't completed onboarding.
 * Old flow: 1=terms, 2=validId, 3=profile, 4=bank
 * New flow: 1=validId, 2=profile, 3=bank
 */
async function shiftOnboardingSteps(sequelize: Sequelize): Promise<void> {
  try {
    const [results] = await sequelize.query(`
      UPDATE merchants
      SET onboarding_step = GREATEST(onboarding_step - 1, 1)
      WHERE onboarding_completed = false
        AND onboarding_step > 1
      RETURNING id
    `);

    if (Array.isArray(results) && results.length > 0) {
      console.log(`[Migration] Shifted onboarding_step for ${results.length} merchant(s)`);
    }
  } catch (error: any) {
    console.error("[Migration] Error shifting onboarding steps:", error.message);
  }
}
