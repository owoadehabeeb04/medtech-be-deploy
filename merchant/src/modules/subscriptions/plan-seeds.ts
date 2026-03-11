import { Plan } from "./Plan.model";
import {
  PlanTier,
  PayoutFrequency,
  SupportTier,
  PerformanceSummaryLevel,
} from "../../constants/enums";

const PLAN_DEFINITIONS = [
  {
    name: PlanTier.FREE,
    displayName: "Free",
    description: "Get started with basic access to the platform.",
    price: 0,
    maxProductListings: 10,
    payoutFrequency: PayoutFrequency.NONE,
    supportTier: SupportTier.STANDARD,
    hasPrescriptionMatching: false,
    hasHigherProductVisibility: false,
    performanceSummaryLevel: PerformanceSummaryLevel.NONE,
    hasEarlyAccess: false,
    isPopular: false,
    sortOrder: 0,
    features: [
      "Maximum of 10 product listings",
      "Standard support",
    ],
  },
  {
    name: PlanTier.BRONZE,
    displayName: "Bronze",
    description: "Designed for smaller pharmacies. One or two fulfilled orders can cover this plan.",
    price: 250000, // ₦2,500 in kobo
    maxProductListings: 30,
    payoutFrequency: PayoutFrequency.WEEKLY,
    supportTier: SupportTier.STANDARD,
    hasPrescriptionMatching: true,
    hasHigherProductVisibility: false,
    performanceSummaryLevel: PerformanceSummaryLevel.NONE,
    hasEarlyAccess: false,
    isPopular: false,
    sortOrder: 1,
    features: [
      "Receive prescriptions from licensed doctors",
      "Maximum of 30 product listings",
      "Weekly payout",
      "Standard support",
    ],
  },
  {
    name: PlanTier.SILVER,
    displayName: "Silver",
    description: "Designed for pharmacies that want steady daily orders.",
    price: 500000, // ₦5,000 in kobo
    maxProductListings: 80,
    payoutFrequency: PayoutFrequency.DAILY,
    supportTier: SupportTier.STANDARD,
    hasPrescriptionMatching: true,
    hasHigherProductVisibility: true,
    performanceSummaryLevel: PerformanceSummaryLevel.BASIC,
    hasEarlyAccess: false,
    isPopular: true,
    sortOrder: 2,
    features: [
      "Receive prescriptions from licensed doctors",
      "Maximum of 80 product listings",
      "Daily payout",
      "Standard support",
      "Faster prescription matching",
      "Higher product visibility",
      "Basic performance summary",
    ],
  },
  {
    name: PlanTier.GOLD,
    displayName: "Gold",
    description: "Built for pharmacies focused on scale and reliability.",
    price: 1000000, // ₦10,000 in kobo
    maxProductListings: null, // unlimited
    payoutFrequency: PayoutFrequency.SAME_DAY,
    supportTier: SupportTier.DEDICATED,
    hasPrescriptionMatching: true,
    hasHigherProductVisibility: true,
    performanceSummaryLevel: PerformanceSummaryLevel.MONTHLY,
    hasEarlyAccess: true,
    isPopular: false,
    sortOrder: 3,
    features: [
      "Receive prescriptions from licensed doctors",
      "Unlimited product listings",
      "Same day payout",
      "Dedicated support line",
      "Faster prescription matching",
      "Higher product visibility",
      "Basic performance summary",
      "Monthly performance and payout summary",
      "Early access to new operational features",
    ],
  },
];

/**
 * Seeds or updates the subscription plans on startup.
 * Uses findOrCreate to avoid duplicates, then updates fields if plan already exists.
 */
export async function seedPlans(): Promise<void> {
  for (const planData of PLAN_DEFINITIONS) {
    const [plan, created] = await Plan.findOrCreate({
      where: { name: planData.name },
      defaults: planData,
    });

    if (!created) {
      await plan.update(planData);
    }
  }

  console.log(`Subscription plans seeded: ${PLAN_DEFINITIONS.length} plans`);
}
