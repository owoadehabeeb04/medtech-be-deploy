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
  await addStoreDetailsLocationColumns(queryInterface);
  await addPharmacyReviewsTable(queryInterface);
  await addTeamAccessTables(queryInterface);
  await addMemberTrackingColumns(queryInterface);
  await addPharmacyCodeColumn(queryInterface);
  await addMemberSoftDeleteColumns(queryInterface);
}

async function ensureProductCategoriesTable(queryInterface: any): Promise<void> {
  const tableName = "product_categories";

  try {
    let tableExists = true;
    try {
      await queryInterface.describeTable(tableName);
    } catch (error: any) {
      if (!/does not exist|relation .* does not exist/i.test(error?.message || "")) throw error;
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

async function addStoreDetailsLocationColumns(queryInterface: any): Promise<void> {
  const tableName = "store_details";

  try {
    const tableDescription = await queryInterface.describeTable(tableName);
    const columns: Record<string, any> = {
      latitude: { type: DataTypes.DOUBLE, allowNull: true },
      longitude: { type: DataTypes.DOUBLE, allowNull: true },
      formatted_address: { type: DataTypes.STRING(500), allowNull: true },
      place_id: { type: DataTypes.STRING, allowNull: true },
    };

    for (const [name, definition] of Object.entries(columns)) {
      if (!tableDescription[name]) {
        await queryInterface.addColumn(tableName, name, definition);
        console.log(`[Migration] Added ${name} column to ${tableName}`);
      }
    }
  } catch (error: any) {
    if (/does not exist|No description found/i.test(error?.message || "")) return;
    console.error("[Migration] Error adding store location columns:", error.message);
    throw error;
  }
}

async function addPharmacyReviewsTable(queryInterface: any): Promise<void> {
  const tableName = "pharmacy_reviews";

  try {
    try {
      await queryInterface.describeTable(tableName);
      return;
    } catch (error: any) {
      if (!/does not exist|No description found/i.test(error?.message || "")) throw error;
    }

    await queryInterface.createTable(tableName, {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      merchant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "merchants", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      order_id: { type: DataTypes.STRING(64), allowNull: false },
      consumer_id: { type: DataTypes.STRING(64), allowNull: false },
      consumer_name: { type: DataTypes.STRING(120), allowNull: false },
      rating: { type: DataTypes.INTEGER, allowNull: false },
      comment: { type: DataTypes.TEXT, allowNull: true },
      reply: { type: DataTypes.TEXT, allowNull: true },
      replied_at: { type: DataTypes.DATE, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await queryInterface.addIndex(tableName, ["order_id"], { unique: true, name: "pharmacy_reviews_order_id_unique" });
    await queryInterface.addIndex(tableName, ["merchant_id", "created_at"], { name: "pharmacy_reviews_merchant_created" });
    console.log(`[Migration] Created ${tableName} table`);
  } catch (error: any) {
    if (/relation "merchants" does not exist|No description found/i.test(error?.message || "")) return;
    console.error("[Migration] Error creating pharmacy_reviews table:", error.message);
    throw error;
  }
}

const isMissingTable = (error: any) => /does not exist|No description found/i.test(error?.message || "");

async function tableExists(queryInterface: any, tableName: string): Promise<boolean> {
  try {
    await queryInterface.describeTable(tableName);
    return true;
  } catch (error: any) {
    if (!isMissingTable(error)) throw error;
    return false;
  }
}

const idColumn = { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: DataTypes.UUIDV4 };
const timestamps = {
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
};
const merchantRef = (allowNull: boolean) => ({
  type: DataTypes.UUID,
  allowNull,
  references: { model: "merchants", key: "id" },
  onUpdate: "CASCADE",
  onDelete: "CASCADE",
});

// Team access: staff logins, per-pharmacy roles, memberships, invitations and the activity log.
async function addTeamAccessTables(queryInterface: any): Promise<void> {
  try {
    if (!(await tableExists(queryInterface, "merchants"))) return;

    if (!(await tableExists(queryInterface, "staff_accounts"))) {
      await queryInterface.createTable("staff_accounts", {
        id: idColumn,
        email: { type: DataTypes.STRING, allowNull: false },
        password: { type: DataTypes.STRING, allowNull: false },
        first_name: { type: DataTypes.STRING, allowNull: false },
        last_name: { type: DataTypes.STRING, allowNull: false },
        phone_number: { type: DataTypes.STRING, allowNull: true },
        is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps,
      });
      console.log("[Migration] Created staff_accounts table");
    }

    if (!(await tableExists(queryInterface, "merchant_roles"))) {
      await queryInterface.createTable("merchant_roles", {
        id: idColumn,
        merchant_id: merchantRef(false),
        name: { type: DataTypes.STRING(80), allowNull: false },
        description: { type: DataTypes.STRING(255), allowNull: true },
        permissions: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
        ...timestamps,
      });
      console.log("[Migration] Created merchant_roles table");
    }

    if (!(await tableExists(queryInterface, "merchant_members"))) {
      await queryInterface.createTable("merchant_members", {
        id: idColumn,
        merchant_id: merchantRef(false),
        staff_account_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: "staff_accounts", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        owner_merchant_id: merchantRef(true),
        role_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: "merchant_roles", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "active" },
        invited_by: { type: DataTypes.STRING, allowNull: true },
        joined_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        removed_at: { type: DataTypes.DATE, allowNull: true },
        ...timestamps,
      });
      console.log("[Migration] Created merchant_members table");
    }

    if (!(await tableExists(queryInterface, "merchant_invitations"))) {
      await queryInterface.createTable("merchant_invitations", {
        id: idColumn,
        merchant_id: merchantRef(false),
        email: { type: DataTypes.STRING, allowNull: false },
        role_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "merchant_roles", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        token_hash: { type: DataTypes.STRING(64), allowNull: false },
        expires_at: { type: DataTypes.DATE, allowNull: false },
        accepted_at: { type: DataTypes.DATE, allowNull: true },
        revoked_at: { type: DataTypes.DATE, allowNull: true },
        invited_by: { type: DataTypes.STRING, allowNull: true },
        ...timestamps,
      });
      console.log("[Migration] Created merchant_invitations table");
    }

    if (!(await tableExists(queryInterface, "merchant_audit_logs"))) {
      await queryInterface.createTable("merchant_audit_logs", {
        id: idColumn,
        merchant_id: { type: DataTypes.UUID, allowNull: false },
        actor_type: { type: DataTypes.STRING(20), allowNull: false },
        actor_id: { type: DataTypes.STRING(64), allowNull: false },
        actor_name: { type: DataTypes.STRING, allowNull: true },
        action: { type: DataTypes.STRING(120), allowNull: false },
        entity_id: { type: DataTypes.STRING(64), allowNull: true },
        metadata: { type: DataTypes.JSONB, allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      });
      console.log("[Migration] Created merchant_audit_logs table");
    }

    const sql = queryInterface.sequelize;
    await sql.query(`CREATE UNIQUE INDEX IF NOT EXISTS staff_accounts_email_unique ON staff_accounts (lower(email))`);
    await sql.query(`CREATE UNIQUE INDEX IF NOT EXISTS merchant_roles_name_unique ON merchant_roles (merchant_id, lower(name))`);
    await sql.query(`CREATE UNIQUE INDEX IF NOT EXISTS merchant_members_staff_unique ON merchant_members (merchant_id, staff_account_id) WHERE staff_account_id IS NOT NULL`);
    await sql.query(`CREATE UNIQUE INDEX IF NOT EXISTS merchant_members_owner_unique ON merchant_members (merchant_id, owner_merchant_id) WHERE owner_merchant_id IS NOT NULL`);
    await sql.query(`CREATE INDEX IF NOT EXISTS merchant_members_staff_lookup ON merchant_members (staff_account_id)`);
    await sql.query(`CREATE INDEX IF NOT EXISTS merchant_members_owner_lookup ON merchant_members (owner_merchant_id)`);
    await sql.query(`CREATE INDEX IF NOT EXISTS merchant_invitations_lookup ON merchant_invitations (token_hash)`);
    await sql.query(`CREATE INDEX IF NOT EXISTS merchant_invitations_merchant ON merchant_invitations (merchant_id, email)`);
    await sql.query(`CREATE INDEX IF NOT EXISTS merchant_audit_logs_merchant_created ON merchant_audit_logs (merchant_id, created_at DESC)`);
    await sql.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'merchant_members_one_identity') THEN
          ALTER TABLE merchant_members ADD CONSTRAINT merchant_members_one_identity
            CHECK ((staff_account_id IS NOT NULL) <> (owner_merchant_id IS NOT NULL));
        END IF;
      END $$;
    `);
  } catch (error: any) {
    console.error("[Migration] Error creating team access tables:", error.message);
    throw error;
  }
}

// Which team member did what: push-notification routing, session revocation and "own sales" scope.
async function addMemberTrackingColumns(queryInterface: any): Promise<void> {
  const columns: Array<[string, string]> = [
    ["merchant_device_tokens", "member_id"],
    ["refresh_tokens", "member_id"],
    ["merchant_drugstore_orders", "created_by_member_id"],
  ];

  for (const [tableName, column] of columns) {
    try {
      const description = await queryInterface.describeTable(tableName);
      if (!description[column]) {
        await queryInterface.addColumn(tableName, column, { type: DataTypes.UUID, allowNull: true });
        console.log(`[Migration] Added ${column} column to ${tableName}`);
      }
    } catch (error: any) {
      if (isMissingTable(error)) continue;
      console.error(`[Migration] Error adding ${column} to ${tableName}:`, error.message);
      throw error;
    }
  }
}

// Staff pick their pharmacy at login with a short code the owner controls.
async function addPharmacyCodeColumn(queryInterface: any): Promise<void> {
  try {
    const description = await queryInterface.describeTable("merchants");
    if (!description.pharmacy_code) {
      await queryInterface.addColumn("merchants", "pharmacy_code", { type: DataTypes.STRING(20), allowNull: true });
      console.log("[Migration] Added pharmacy_code column to merchants");
    }
    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS merchants_pharmacy_code_unique ON merchants (upper(pharmacy_code)) WHERE pharmacy_code IS NOT NULL`
    );
  } catch (error: any) {
    if (isMissingTable(error)) return;
    console.error("[Migration] Error adding pharmacy_code:", error.message);
    throw error;
  }
}

// Removing a team member is a soft delete: the row stays (history, own-sales scope) with status "removed".
async function addMemberSoftDeleteColumns(queryInterface: any): Promise<void> {
  try {
    const description = await queryInterface.describeTable("merchant_members");
    if (!description.removed_at) {
      await queryInterface.addColumn("merchant_members", "removed_at", { type: DataTypes.DATE, allowNull: true });
      console.log("[Migration] Added removed_at column to merchant_members");
    }
    // A removed member whose role is deleted later keeps their row with no role
    await queryInterface.sequelize.query(`ALTER TABLE merchant_members ALTER COLUMN role_id DROP NOT NULL`);
  } catch (error: any) {
    if (isMissingTable(error)) return;
    console.error("[Migration] Error preparing merchant_members for soft delete:", error.message);
    throw error;
  }
}
