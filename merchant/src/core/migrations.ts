import { Sequelize } from "sequelize-typescript";
import { DataTypes } from "sequelize";

export async function runMigrations(sequelize: Sequelize): Promise<void> {
  const queryInterface = sequelize.getQueryInterface();

  await ensureProductCategoriesTable(queryInterface);
  await addProductCategoryIdColumn(queryInterface);
  await addProductCategoryReviewColumn(queryInterface);
  await addDiscountCategoryIdsColumn(queryInterface);
  await removeTermsAcceptedColumn(queryInterface);
  await addDrugstoreOrderFlowColumns(queryInterface);
  await addInStoreSalesFlag(queryInterface);
  await addMerchantDeviceTokensTable(queryInterface);
  await addMerchantPushPreferenceDefaults(queryInterface);
  await shiftOnboardingSteps(sequelize);
}

async function ensureProductCategoriesTable(queryInterface: any): Promise<void> {
  const tableName = "product_categories";

  try {
    const tableExists = await queryInterface.tableExists(tableName);

    if (!tableExists) {
      await queryInterface.createTable(tableName, {
        id: {
          type: DataTypes.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: DataTypes.UUIDV4,
        },
        category_key: {
          type: DataTypes.STRING(180),
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(150),
          allowNull: false,
        },
        parent_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: tableName, key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        sort_order: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        is_active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        is_selectable: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
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
      `CREATE UNIQUE INDEX IF NOT EXISTS product_categories_key_unique ON ${tableName} (category_key)`
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS product_categories_parent_sort_idx ON ${tableName} (parent_id, sort_order)`
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS product_categories_name_idx ON ${tableName} (name)`
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS product_categories_active_idx ON ${tableName} (is_active)`
    );
  } catch (error: any) {
    if (error.message?.includes("does not exist")) return;
    console.error(`[Migration] Error creating ${tableName} table:`, error.message);
    throw error;
  }
}

async function addProductCategoryIdColumn(queryInterface: any): Promise<void> {
  const tableName = "products";

  try {
    const tableDescription = await queryInterface.describeTable(tableName);
    if (!tableDescription.category_id) {
      await queryInterface.addColumn(tableName, "category_id", {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "product_categories", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      });
      console.log(`[Migration] Added category_id column to ${tableName}`);
    }

    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS products_category_id_idx ON ${tableName} (category_id)`
    );
  } catch (error: any) {
    if (error.message?.includes("does not exist")) return;
    console.error(`[Migration] Error adding category_id to ${tableName}:`, error.message);
    throw error;
  }
}

async function addProductCategoryReviewColumn(queryInterface: any): Promise<void> {
  const tableName = "products";

  try {
    const tableDescription = await queryInterface.describeTable(tableName);
    if (!tableDescription.category_review_required) {
      await queryInterface.addColumn(tableName, "category_review_required", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      console.log(`[Migration] Added category_review_required column to ${tableName}`);
    }

    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS products_category_review_required_idx ON ${tableName} (category_review_required)`
    );
  } catch (error: any) {
    if (error.message?.includes("does not exist")) return;
    console.error(`[Migration] Error adding category_review_required to ${tableName}:`, error.message);
    throw error;
  }
}

async function addDiscountCategoryIdsColumn(queryInterface: any): Promise<void> {
  const tableName = "discounts";

  try {
    const tableDescription = await queryInterface.describeTable(tableName);
    if (!tableDescription.applicable_category_ids) {
      await queryInterface.addColumn(tableName, "applicable_category_ids", {
        type: DataTypes.JSONB,
        allowNull: true,
      });
      console.log(`[Migration] Added applicable_category_ids column to ${tableName}`);
    }
  } catch (error: any) {
    if (error.message?.includes("does not exist")) return;
    console.error(`[Migration] Error adding applicable_category_ids to ${tableName}:`, error.message);
    throw error;
  }
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
    throw error;
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
    throw error;
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
    throw error;
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
    throw error;
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
    throw error;
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
    if (/does not exist|relation .* does not exist/i.test(error?.message || "")) return;
    console.error("[Migration] Error shifting onboarding steps:", error.message);
    throw error;
  }
}
