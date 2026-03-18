import { Sequelize } from "sequelize-typescript";

export async function runMigrations(sequelize: Sequelize): Promise<void> {
  const queryInterface = sequelize.getQueryInterface();

  await removeTermsAcceptedColumn(queryInterface);
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
