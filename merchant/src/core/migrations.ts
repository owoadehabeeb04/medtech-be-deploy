import { Sequelize } from "sequelize-typescript";
import { DataTypes } from "sequelize";

export async function runMigrations(sequelize: Sequelize): Promise<void> {
  const queryInterface = sequelize.getQueryInterface();

  await removeTermsAcceptedColumn(queryInterface);
  await addDrugstoreOrderFlowColumns(queryInterface);
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
