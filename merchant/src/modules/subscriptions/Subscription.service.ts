import { Op } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import { Plan } from "./Plan.model";
import { Subscription } from "./Subscription.model";
import { ScheduledPlanChange } from "./ScheduledPlanChange.model";
import { Transaction } from "../transactions/Transaction.model";
import { Wallet } from "../wallet/Wallet.model";
import { Merchant } from "../merchant/Merchant.model";
import { PaystackService } from "../../service/Paystack/Paystack.service";
import { applicationConfig } from "../../config";
import {
  PlanTier,
  SubscriptionStatus,
  TransactionType,
  TransactionStatus,
  PaymentMethod,
  ScheduledChangeStatus,
} from "../../constants/enums";
import { HttpException } from "@medtech/utils";

// Plan tier ordering for upgrade/downgrade validation
const PLAN_ORDER: Record<string, number> = {
  [PlanTier.FREE]: 0,
  [PlanTier.BRONZE]: 1,
  [PlanTier.SILVER]: 2,
  [PlanTier.GOLD]: 3,
};

export class SubscriptionService {
  private static resolvePaymentReturnUrl(
    reference: string,
    flow: "subscribe" | "upgrade",
    requestedReturnUrl?: string
  ) {
    const candidateUrl = (requestedReturnUrl || "").trim();
    if (!candidateUrl) {
      return null;
    }

    let url: URL;
    try {
      url = new URL(candidateUrl);
    } catch {
      throw new HttpException(400, "Invalid payment return URL.");
    }

    const allowedOrigins = applicationConfig.allowedPaymentReturnOrigins || [];
    if (!allowedOrigins.includes(url.origin)) {
      throw new HttpException(400, "Payment return URL origin is not allowed.");
    }

    url.searchParams.set("reference", reference);
    url.searchParams.set("flow", flow);
    return url.toString();
  }

  /**
   * Get all active subscription plans
   */
  static async getPlans() {
    const plans = await Plan.findAll({
      where: { isActive: true },
      order: [["sortOrder", "ASC"]],
    });

    return plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      displayName: plan.displayName,
      description: plan.description,
      price: plan.price,
      priceInNaira: plan.price / 100,
      maxProductListings: plan.maxProductListings,
      payoutFrequency: plan.payoutFrequency,
      supportTier: plan.supportTier,
      hasPrescriptionMatching: plan.hasPrescriptionMatching,
      hasHigherProductVisibility: plan.hasHigherProductVisibility,
      performanceSummaryLevel: plan.performanceSummaryLevel,
      hasEarlyAccess: plan.hasEarlyAccess,
      isPopular: plan.isPopular,
      features: plan.features,
    }));
  }

  /**
   * Get current subscription for a merchant
   */
  static async getSubscription(merchantId: string) {
    const subscription = await Subscription.findOne({
      where: { merchantId },
      include: [{ model: Plan, as: "plan" }],
    });

    if (!subscription) {
      throw new HttpException(404, "No subscription found. Please contact support if this is unexpected.");
    }

    // Check for any pending plan changes
    const scheduledChange = await ScheduledPlanChange.findOne({
      where: {
        merchantId,
        status: ScheduledChangeStatus.PENDING,
      },
      include: [
        { model: Plan, as: "toPlan" },
      ],
    });

    return {
      id: subscription.id,
      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        displayName: subscription.plan.displayName,
        price: subscription.plan.price,
        priceInNaira: subscription.plan.price / 100,
        maxProductListings: subscription.plan.maxProductListings,
        features: subscription.plan.features,
      },
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      autoRenew: subscription.autoRenew,
      cancelledAt: subscription.cancelledAt,
      scheduledChange: scheduledChange
        ? {
            id: scheduledChange.id,
            toPlan: {
              id: scheduledChange.toPlanId,
              displayName: (scheduledChange as any).toPlan?.displayName,
              price: (scheduledChange as any).toPlan?.price,
              priceInNaira: ((scheduledChange as any).toPlan?.price || 0) / 100,
            },
            scheduledDate: scheduledChange.scheduledDate,
            status: scheduledChange.status,
          }
        : null,
    };
  }

  /**
   * Subscribe to a paid plan (from Free)
   */
  static async subscribe(
    merchantId: string,
    planId: string,
    paymentMethod: string,
    requestedReturnUrl?: string
  ) {
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      throw new HttpException(404, "Merchant account not found.");
    }

    const subscription = await Subscription.findOne({
      where: { merchantId },
      include: [{ model: Plan, as: "plan" }],
    });
    if (!subscription) {
      throw new HttpException(404, "No subscription found. Please complete your registration first.");
    }

    // Must be on Free plan to use subscribe
    if (subscription.plan.name !== PlanTier.FREE) {
      throw new HttpException(
        400,
        "You are already on a paid plan. Use the upgrade option to change your plan."
      );
    }

    const newPlan = await Plan.findByPk(planId);
    if (!newPlan || !newPlan.isActive) {
      throw new HttpException(404, "The selected plan is not available. Please choose a different plan.");
    }

    if (newPlan.name === PlanTier.FREE) {
      throw new HttpException(400, "You are already on the Free plan.");
    }

    // Handle wallet payment
    if (paymentMethod === PaymentMethod.WALLET) {
      return this.payWithWallet(merchantId, subscription, newPlan);
    }

    // Initialize Paystack transaction for card / bank_transfer
    const reference = `sub_${uuidv4().replace(/-/g, "").substring(0, 20)}`;
    const channels =
      paymentMethod === PaymentMethod.BANK_TRANSFER
        ? ["bank_transfer"]
        : ["card"];
    const returnUrl = this.resolvePaymentReturnUrl(reference, "subscribe", requestedReturnUrl);

    // Create pending transaction
    const wallet = await Wallet.findOne({ where: { merchantId } });
    await Transaction.create({
      merchantId,
      walletId: wallet?.id || null,
      type: TransactionType.SUBSCRIPTION_PAYMENT,
      amount: newPlan.price,
      status: TransactionStatus.PENDING,
      paymentMethod,
      paystackReference: reference,
      description: `Subscription to ${newPlan.displayName} plan`,
      metadata: { planId: newPlan.id, planName: newPlan.name },
    });

    const result = await PaystackService.initializeTransaction(
      merchant.email,
      newPlan.price,
      reference,
      {
        merchantId,
        planId: newPlan.id,
        planName: newPlan.name,
        type: "subscription",
      },
      channels,
      returnUrl || undefined
    );

    return {
      authorizationUrl: result.authorizationUrl,
      redirectUrl: result.authorizationUrl,
      returnUrl,
      accessCode: result.accessCode,
      reference: result.reference,
      amount: newPlan.price,
      amountInNaira: newPlan.price / 100,
      planName: newPlan.displayName,
    };
  }

  /**
   * Confirm payment after Paystack redirect/callback
   */
  static async confirmPayment(merchantId: string, reference: string) {
    const transaction = await Transaction.findOne({
      where: { paystackReference: reference, merchantId },
    });
    if (!transaction) {
      throw new HttpException(404, "Transaction not found. Please ensure the payment reference is correct.");
    }

    if (transaction.status === TransactionStatus.SUCCESS) {
      throw new HttpException(400, "This payment has already been confirmed and processed.");
    }

    // Verify with Paystack
    const verification = await PaystackService.verifyTransaction(reference);

    if (verification.status !== "success") {
      await transaction.update({ status: TransactionStatus.FAILED });
      throw new HttpException(
        400,
        "Payment was not successful. Please try again or choose a different payment method."
      );
    }

    // Mark transaction successful
    await transaction.update({ status: TransactionStatus.SUCCESS });

    const planId = transaction.metadata?.planId;
    if (!planId) {
      throw new HttpException(500, "Unable to determine the plan for this payment. Please contact support.");
    }

    const newPlan = await Plan.findByPk(planId);
    if (!newPlan) {
      throw new HttpException(500, "Plan associated with this payment no longer exists. Please contact support.");
    }

    // Activate subscription
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30);

    const subscription = await Subscription.findOne({ where: { merchantId } });
    if (!subscription) {
      throw new HttpException(500, "Subscription record not found. Please contact support.");
    }

    await subscription.update({
      planId: newPlan.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      paystackCustomerCode: verification.customerCode || subscription.paystackCustomerCode,
    });

    return {
      message: `You're now on the ${newPlan.displayName} plan! Your subscription is active.`,
      subscription: {
        plan: newPlan.displayName,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    };
  }

  /**
   * Upgrade to a higher plan
   */
  static async upgradePlan(
    merchantId: string,
    planId: string,
    paymentMethod: string,
    requestedReturnUrl?: string
  ) {
    const subscription = await Subscription.findOne({
      where: { merchantId },
      include: [{ model: Plan, as: "plan" }],
    });
    if (!subscription) {
      throw new HttpException(404, "No active subscription found. Please subscribe to a plan first.");
    }

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      throw new HttpException(404, "Merchant account not found.");
    }

    const currentPlan = subscription.plan;
    const newPlan = await Plan.findByPk(planId);
    if (!newPlan || !newPlan.isActive) {
      throw new HttpException(404, "The selected plan is not available. Please choose a different plan.");
    }

    // Validate it's actually an upgrade
    const currentOrder = PLAN_ORDER[currentPlan.name] ?? -1;
    const newOrder = PLAN_ORDER[newPlan.name] ?? -1;

    if (newOrder <= currentOrder) {
      throw new HttpException(
        400,
        `You cannot upgrade to ${newPlan.displayName} — it is the same tier or lower than your current ${currentPlan.displayName} plan. Use the downgrade option instead.`
      );
    }

    // Cancel any pending downgrades
    await ScheduledPlanChange.update(
      { status: ScheduledChangeStatus.CANCELLED },
      { where: { merchantId, status: ScheduledChangeStatus.PENDING } }
    );

    // If on Free, redirect to subscribe flow
    if (currentPlan.name === PlanTier.FREE) {
      return this.subscribe(merchantId, planId, paymentMethod);
    }

    // Handle wallet payment
    if (paymentMethod === PaymentMethod.WALLET) {
      return this.payWithWallet(merchantId, subscription, newPlan);
    }

    // Initialize Paystack payment for the full new plan amount
    const reference = `upg_${uuidv4().replace(/-/g, "").substring(0, 20)}`;
    const channels =
      paymentMethod === PaymentMethod.BANK_TRANSFER
        ? ["bank_transfer"]
        : ["card"];
    const returnUrl = this.resolvePaymentReturnUrl(reference, "upgrade", requestedReturnUrl);

    const wallet = await Wallet.findOne({ where: { merchantId } });
    await Transaction.create({
      merchantId,
      walletId: wallet?.id || null,
      type: TransactionType.SUBSCRIPTION_PAYMENT,
      amount: newPlan.price,
      status: TransactionStatus.PENDING,
      paymentMethod,
      paystackReference: reference,
      description: `Upgrade from ${currentPlan.displayName} to ${newPlan.displayName}`,
      metadata: { planId: newPlan.id, planName: newPlan.name, type: "upgrade" },
    });

    const result = await PaystackService.initializeTransaction(
      merchant.email,
      newPlan.price,
      reference,
      {
        merchantId,
        planId: newPlan.id,
        planName: newPlan.name,
        type: "upgrade",
      },
      channels,
      returnUrl || undefined
    );

    return {
      authorizationUrl: result.authorizationUrl,
      redirectUrl: result.authorizationUrl,
      returnUrl,
      accessCode: result.accessCode,
      reference: result.reference,
      amount: newPlan.price,
      amountInNaira: newPlan.price / 100,
      currentPlan: currentPlan.displayName,
      newPlan: newPlan.displayName,
    };
  }

  /**
   * Downgrade to a lower plan (deferred — takes effect at period end)
   */
  static async downgradePlan(merchantId: string, planId: string) {
    const subscription = await Subscription.findOne({
      where: { merchantId },
      include: [{ model: Plan, as: "plan" }],
    });
    if (!subscription) {
      throw new HttpException(404, "No active subscription found.");
    }

    const currentPlan = subscription.plan;
    const newPlan = await Plan.findByPk(planId);
    if (!newPlan || !newPlan.isActive) {
      throw new HttpException(404, "The selected plan is not available.");
    }

    const currentOrder = PLAN_ORDER[currentPlan.name] ?? -1;
    const newOrder = PLAN_ORDER[newPlan.name] ?? -1;

    if (newOrder >= currentOrder) {
      throw new HttpException(
        400,
        `You cannot downgrade to ${newPlan.displayName} — it is the same tier or higher than your current ${currentPlan.displayName} plan. Use the upgrade option instead.`
      );
    }

    // Check for existing pending downgrade
    const existingChange = await ScheduledPlanChange.findOne({
      where: { merchantId, status: ScheduledChangeStatus.PENDING },
    });
    if (existingChange) {
      throw new HttpException(
        400,
        "You already have a pending plan change. Cancel it first before scheduling a new one."
      );
    }

    if (!subscription.currentPeriodEnd) {
      throw new HttpException(
        400,
        "Cannot schedule a downgrade on the Free plan. You are not currently on a paid billing cycle."
      );
    }

    await ScheduledPlanChange.create({
      merchantId,
      subscriptionId: subscription.id,
      fromPlanId: currentPlan.id,
      toPlanId: newPlan.id,
      scheduledDate: subscription.currentPeriodEnd,
      status: ScheduledChangeStatus.PENDING,
    });

    return {
      message: `Your plan will change to ${newPlan.displayName} on ${subscription.currentPeriodEnd.toISOString().split("T")[0]}. Your current ${currentPlan.displayName} plan remains active until then.`,
      scheduledDate: subscription.currentPeriodEnd,
      currentPlan: currentPlan.displayName,
      newPlan: newPlan.displayName,
    };
  }

  /**
   * Cancel a pending downgrade
   */
  static async cancelDowngrade(merchantId: string) {
    const change = await ScheduledPlanChange.findOne({
      where: { merchantId, status: ScheduledChangeStatus.PENDING },
    });

    if (!change) {
      throw new HttpException(404, "No pending plan change found to cancel.");
    }

    await change.update({ status: ScheduledChangeStatus.CANCELLED });

    return {
      message: "Your scheduled plan change has been cancelled. Your current plan will continue as normal.",
    };
  }

  /**
   * Cancel subscription (revert to Free at period end)
   */
  static async cancelSubscription(merchantId: string) {
    const subscription = await Subscription.findOne({
      where: { merchantId },
      include: [{ model: Plan, as: "plan" }],
    });
    if (!subscription) {
      throw new HttpException(404, "No active subscription found.");
    }

    if (subscription.plan.name === PlanTier.FREE) {
      throw new HttpException(400, "You are already on the Free plan. There is nothing to cancel.");
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new HttpException(400, "Your subscription is already cancelled and will revert to Free at the end of the billing period.");
    }

    const freePlan = await Plan.findOne({ where: { name: PlanTier.FREE } });
    if (!freePlan) {
      throw new HttpException(500, "System error: Free plan not found. Please contact support.");
    }

    // Cancel any existing scheduled changes first
    await ScheduledPlanChange.update(
      { status: ScheduledChangeStatus.CANCELLED },
      { where: { merchantId, status: ScheduledChangeStatus.PENDING } }
    );

    // Schedule downgrade to Free
    if (subscription.currentPeriodEnd) {
      await ScheduledPlanChange.create({
        merchantId,
        subscriptionId: subscription.id,
        fromPlanId: subscription.planId,
        toPlanId: freePlan.id,
        scheduledDate: subscription.currentPeriodEnd,
        status: ScheduledChangeStatus.PENDING,
      });
    }

    await subscription.update({
      status: SubscriptionStatus.CANCELLED,
      cancelledAt: new Date(),
      autoRenew: false,
    });

    // Disable Paystack subscription if exists
    if (subscription.paystackSubscriptionCode && subscription.paystackEmailToken) {
      try {
        await PaystackService.disableSubscription(
          subscription.paystackSubscriptionCode,
          subscription.paystackEmailToken
        );
      } catch {
        // Non-critical — subscription will still expire
      }
    }

    return {
      message: subscription.currentPeriodEnd
        ? `Your subscription has been cancelled. Your ${subscription.plan.displayName} plan will remain active until ${subscription.currentPeriodEnd.toISOString().split("T")[0]}, after which you'll be moved to the Free plan.`
        : "Your subscription has been cancelled. You are now on the Free plan.",
    };
  }

  /**
   * Toggle auto-renewal
   */
  static async toggleAutoRenew(merchantId: string, autoRenew: boolean) {
    const subscription = await Subscription.findOne({
      where: { merchantId },
      include: [{ model: Plan, as: "plan" }],
    });
    if (!subscription) {
      throw new HttpException(404, "No active subscription found.");
    }

    if (subscription.plan.name === PlanTier.FREE) {
      throw new HttpException(400, "Auto-renewal is not applicable on the Free plan.");
    }

    await subscription.update({ autoRenew });

    // Sync with Paystack
    if (subscription.paystackSubscriptionCode && subscription.paystackEmailToken) {
      try {
        if (autoRenew) {
          await PaystackService.enableSubscription(
            subscription.paystackSubscriptionCode,
            subscription.paystackEmailToken
          );
        } else {
          await PaystackService.disableSubscription(
            subscription.paystackSubscriptionCode,
            subscription.paystackEmailToken
          );
        }
      } catch {
        // Non-critical
      }
    }

    return {
      message: autoRenew
        ? "Auto-renewal has been enabled. Your plan will renew automatically at the end of each billing period."
        : "Auto-renewal has been disabled. Your plan will expire at the end of the current billing period.",
      autoRenew,
    };
  }

  /**
   * Handle Paystack webhook events
   */
  static async handleWebhook(event: string, data: any) {
    switch (event) {
      case "charge.success":
        await this.handleChargeSuccess(data);
        break;
      case "subscription.create":
        // Subscription created on Paystack side — informational
        break;
      case "subscription.not_renew":
      case "subscription.disable":
        await this.handleSubscriptionDisabled(data);
        break;
      case "invoice.payment_failed":
        await this.handlePaymentFailed(data);
        break;
      default:
        break;
    }
  }

  /**
   * Apply scheduled plan changes whose date has arrived
   */
  static async applyScheduledChanges() {
    const now = new Date();
    const pendingChanges = await ScheduledPlanChange.findAll({
      where: {
        status: ScheduledChangeStatus.PENDING,
        scheduledDate: { [Op.lte]: now },
      },
    });

    for (const change of pendingChanges) {
      const subscription = await Subscription.findOne({
        where: { merchantId: change.merchantId },
      });
      if (!subscription) continue;

      const toPlan = await Plan.findByPk(change.toPlanId);
      if (!toPlan) continue;

      // If downgrading to Free, clear period
      const isFree = toPlan.name === PlanTier.FREE;

      await subscription.update({
        planId: change.toPlanId,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: isFree ? null : new Date(),
        currentPeriodEnd: isFree ? null : (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d; })(),
        cancelledAt: null,
      });

      await change.update({
        status: ScheduledChangeStatus.APPLIED,
        appliedAt: new Date(),
      });
    }
  }

  // ─────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────

  /**
   * Pay for a plan using wallet balance
   */
  private static async payWithWallet(
    merchantId: string,
    subscription: Subscription,
    newPlan: Plan
  ) {
    const wallet = await Wallet.findOne({ where: { merchantId } });
    if (!wallet) {
      throw new HttpException(404, "Wallet not found. Please contact support.");
    }

    if (wallet.balance < newPlan.price) {
      const shortfall = (newPlan.price - wallet.balance) / 100;
      throw new HttpException(
        400,
        `Insufficient wallet balance. You need ₦${shortfall.toLocaleString()} more to subscribe to the ${newPlan.displayName} plan. Please fund your wallet first.`
      );
    }

    // Debit wallet
    const reference = `wal_${uuidv4().replace(/-/g, "").substring(0, 20)}`;
    await wallet.update({ balance: wallet.balance - newPlan.price });

    await Transaction.create({
      merchantId,
      walletId: wallet.id,
      type: TransactionType.WALLET_DEBIT,
      amount: newPlan.price,
      status: TransactionStatus.SUCCESS,
      paymentMethod: PaymentMethod.WALLET,
      paystackReference: reference,
      description: `Subscription payment for ${newPlan.displayName} plan`,
      metadata: { planId: newPlan.id, planName: newPlan.name },
    });

    // Activate subscription
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30);

    const currentPlanName = subscription.plan?.displayName || "previous";

    await subscription.update({
      planId: newPlan.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelledAt: null,
    });

    return {
      message: `You're now on the ${newPlan.displayName} plan! ₦${(newPlan.price / 100).toLocaleString()} has been deducted from your wallet.`,
      subscription: {
        plan: newPlan.displayName,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      walletBalance: wallet.balance,
      walletBalanceInNaira: wallet.balance / 100,
    };
  }

  /**
   * Handle successful charge from Paystack webhook
   */
  private static async handleChargeSuccess(data: any) {
    const reference = data.reference;
    if (!reference) return;

    const transaction = await Transaction.findOne({
      where: { paystackReference: reference },
    });
    if (!transaction || transaction.status === TransactionStatus.SUCCESS) return;

    await transaction.update({ status: TransactionStatus.SUCCESS });

    // If it's a subscription payment, activate the plan
    if (
      transaction.type === TransactionType.SUBSCRIPTION_PAYMENT &&
      transaction.metadata?.planId
    ) {
      const subscription = await Subscription.findOne({
        where: { merchantId: transaction.merchantId },
      });
      if (!subscription) return;

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + 30);

      await subscription.update({
        planId: transaction.metadata.planId,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        paystackCustomerCode: data.customer?.customer_code || subscription.paystackCustomerCode,
      });
    }

    // If wallet funding, credit wallet
    if (transaction.type === TransactionType.WALLET_FUNDING && transaction.walletId) {
      const wallet = await Wallet.findByPk(transaction.walletId);
      if (wallet) {
        await wallet.update({ balance: wallet.balance + transaction.amount });
      }
    }
  }

  /**
   * Handle subscription disabled from Paystack webhook
   */
  private static async handleSubscriptionDisabled(data: any) {
    const subscriptionCode = data.subscription_code;
    if (!subscriptionCode) return;

    const subscription = await Subscription.findOne({
      where: { paystackSubscriptionCode: subscriptionCode },
    });
    if (!subscription) return;

    await subscription.update({
      autoRenew: false,
    });
  }

  /**
   * Handle failed payment from Paystack webhook
   */
  private static async handlePaymentFailed(data: any) {
    const subscriptionCode = data.subscription?.subscription_code;
    if (!subscriptionCode) return;

    const subscription = await Subscription.findOne({
      where: { paystackSubscriptionCode: subscriptionCode },
    });
    if (!subscription) return;

    await subscription.update({
      status: SubscriptionStatus.PAST_DUE,
    });
  }
}
