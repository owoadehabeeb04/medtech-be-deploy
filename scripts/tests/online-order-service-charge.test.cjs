const assert = require('node:assert/strict');
const { test } = require('node:test');
const Module = require('node:module');
const { calculateOnlineOrderServiceCharge } = require('../../utils/dist/online-order-pricing');

// Load the real service logic while isolating databases, payments and notifications.
function loadService(path, mocks) {
  const filename = require.resolve(path);
  const originalLoad = Module._load;
  Module._load = function (request, parent, ...args) {
    if (parent?.filename === filename && Object.hasOwn(mocks, request)) return mocks[request];
    if (parent?.filename === filename && request.endsWith('.model')) {
      return { [request.split('/').pop().split('.')[0]]: {} };
    }
    return originalLoad.call(this, request, parent, ...args);
  };
  try { return require(filename); } finally { Module._load = originalLoad; }
}

const state = {};
const transaction = () => ({
  commit: async function () { this.finished = 'commit'; },
  rollback: async function () { this.finished = 'rollback'; },
});
const orders = {
  sequelize: { transaction: async () => transaction() },
  create: async values => {
    state.order = { id: 'order-id', ...values, update: async values => Object.assign(state.order, values) };
    return state.order;
  },
  findByPk: async () => state.order,
  findOne: async () => state.order,
};
const carts = {
  findOne: async () => state.cart,
  findAll: async () => [state.cart],
  update: async values => state.cart.update(values),
};
const paystack = {
  initializeTransaction: async (...args) => {
    state.payment = { method: 'initialize', amountKobo: args[1] };
    return { reference: args[2], authorizationUrl: 'https://payment.test/checkout', accessCode: 'test' };
  },
  chargeAuthorization: async (...args) => { state.payment = { method: 'saved-card', amountKobo: args[1] }; },
  verifyTransaction: async reference => ({ status: 'success', amount: state.verifiedAmount ?? Math.round(state.order.totalAmount * 100), reference, metadata: {} }),
};
const { DrugstoreService } = loadService('../../experience_1/dist/modules/drugstore/Drugstore.service', {
  '../../config': { applicationConfig: {} },
  './DrugstoreMerchantClient': { DrugstoreMerchantClient: { post: async () => ({ discountAmount: 1000, code: 'TEST', discountId: 'discount-id' }) } },
  './DrugstorePaystack.service': { DrugstorePaystackService: paystack },
  './DrugstoreWallet.service': { DrugstoreWalletService: { debitForOrder: async (_userId, amountKobo) => { state.payment = { method: 'wallet', amountKobo }; return { success: true }; } } },
  './DrugstoreSavedCard.service': { DrugstoreSavedCardService: { getDecryptedAuthorizationCode: async () => 'test-authorization' } },
  './DrugstoreCart.model': { DrugstoreCart: carts },
  './DrugstoreCartItem.model': { DrugstoreCartItem: { findAll: async () => [{ merchantProductId: 'product-id', quantity: 1 }] } },
  './DrugstoreOrder.model': { DrugstoreOrder: orders },
  './DrugstoreOrderItem.model': { DrugstoreOrderItem: { create: async () => ({}) } },
  '../users/User.model': { User: { findByPk: async () => ({ email: 'customer@example.test' }) } },
});
DrugstoreService.getMerchantProduct = async () => ({ id: 'product-id', price: state.subtotal, vat: 750, discountPercentage: 0, inventory: 10, minQuantity: 1, maxQuantity: 10 });
DrugstoreService.generateUniqueOrderCode = async () => 'TEST12';
DrugstoreService.resolveDeliveryAddress = async () => ({ id: 'address-id' });
DrugstoreService.calculateDeliveryFee = async () => 700;
DrugstoreService.createStatusHistory = async () => {};
DrugstoreService.enqueueSyncEvent = async () => {};
DrugstoreService.processPendingSyncEvents = async () => {};

function reset(subtotal = 10000) {
  for (const key of Object.keys(state)) delete state[key];
  state.subtotal = subtotal;
  state.cart = {
    id: 'cart-id', merchantId: 'merchant-id', subtotal, grandTotal: subtotal + 750, items: [],
    update: async values => Object.assign(state.cart, values),
    toJSON: () => ({ id: 'cart-id', subtotal, grandTotal: subtotal + 750 }),
  };
}

test('service charge examples, cap, kobo rounding and invalid amounts', () => {
  for (const [subtotal, fee] of [[0, 0], [0.99, 0], [1, 0.01], [100, 0.5], [999.99, 5], [10000, 50], [40000, 200], [49999, 250], [50000, 250], [100000, 250]]) {
    assert.equal(calculateOnlineOrderServiceCharge(subtotal), fee, `subtotal ${subtotal}`);
  }
  for (const invalid of [-1, NaN, Infinity]) assert.throws(() => calculateOnlineOrderServiceCharge(invalid), RangeError);
});

test('online checkout charges and snapshots the fee for every payment method', async t => {
  for (const subtotal of [10000, 50000, 100000]) {
    for (const method of ['card', 'saved-card', 'bank_transfer', 'wallet', 'pay_in_store']) {
      await t.test(`${method}, subtotal ${subtotal}`, async () => {
        reset(subtotal);
        const payload = {
          merchantId: 'merchant-id', paymentMethod: method === 'saved-card' ? 'card' : method,
          savedCardId: method === 'saved-card' ? 'saved-card-id' : undefined,
          couponCode: 'TEST', fulfillmentMethod: 'delivery',
          serviceCharge: 0, totalAmount: 1, // Client-supplied amounts cannot override server pricing.
        };
        const response = await DrugstoreService.createOrder(1, 'consumer', payload);
        assert.equal(response.status, true);
        const fee = subtotal === 10000 ? 50 : 250;
        const expected = subtotal + 750 - 1000 + 700 + fee;
        assert.equal(state.order.serviceCharge, fee);
        assert.equal(state.order.totalAmount, expected);
        if (method !== 'pay_in_store') assert.equal(state.payment.amountKobo, expected * 100);
        if (response.data.payment.amount !== undefined) assert.equal(response.data.payment.amount, expected);
        const sync = DrugstoreService.buildSyncPayload(state.order, []);
        assert.equal(sync.amounts.serviceCharge, fee);
        assert.equal(sync.amounts.totalAmount, expected);
      });
    }
  }
});

test('pickup online orders include the fee, without a delivery fee', async () => {
  reset();
  const response = await DrugstoreService.createOrder(1, 'consumer', { merchantId: 'merchant-id', fulfillmentMethod: 'pickup', paymentMethod: 'pay_in_store' });
  assert.equal(response.status, true);
  assert.equal(state.order.serviceCharge, 50);
  assert.equal(state.order.deliveryFee, 0);
  assert.equal(state.order.totalAmount, 10800);
});

test('cart responses preview the charge once without mutating stored item totals', async () => {
  reset();
  const first = await DrugstoreService.getCart(1, 'merchant-id');
  const second = await DrugstoreService.getCart(1, 'merchant-id');
  assert.equal(first.data.serviceCharge, 50);
  assert.equal(first.data.grandTotal, 10800);
  assert.equal(second.data.grandTotal, 10800);
  assert.equal(state.cart.grandTotal, 10750);
  const all = await DrugstoreService.getCart(1);
  assert.equal(all.data[0].grandTotal, 10800);
});

test('verification rejects payments that omit the service charge and preserves legacy totals', async () => {
  reset();
  await DrugstoreService.createOrder(1, 'consumer', { merchantId: 'merchant-id', fulfillmentMethod: 'pickup', paymentMethod: 'card' });
  state.verifiedAmount = (state.order.totalAmount - state.order.serviceCharge) * 100;
  const rejected = await DrugstoreService.confirmOrderPayment(1, state.order.id, { paymentReference: state.order.paymentReference });
  assert.equal(rejected.status, false);
  assert.match(rejected.message, /does not match the order total/);
  state.verifiedAmount = state.order.totalAmount * 100;
  const confirmed = await DrugstoreService.confirmOrderPayment(1, state.order.id, { paymentReference: state.order.paymentReference });
  assert.equal(confirmed.status, true);
  state.order.paymentStatus = 'pending';
  state.order.serviceCharge = 0;
  state.order.totalAmount = 10750;
  state.verifiedAmount = 1075000;
  const legacy = await DrugstoreService.confirmOrderPayment(1, state.order.id, { paymentReference: state.order.paymentReference });
  assert.equal(legacy.status, true);
  assert.equal(DrugstoreService.buildSyncPayload(state.order, []).amounts.serviceCharge, 0);
});

const merchantState = {};
const { DrugstoreInternalService } = loadService('../../merchant/dist/modules/drugstore_internal/DrugstoreInternal.service', {
  '../../config': { applicationConfig: {} },
  '../categories/ProductCategory.service': { ProductCategoryService: {} },
  '../discounts/Discount.service': { DiscountService: {} },
  '../pharmacy_reviews/PharmacyReview.service': { PharmacyReviewService: {} },
  '../../service/Notifications/Notification.service': { NotificationService: { notify: async () => {} }, smsMoney: amount => String(amount) },
  '../drugstore_orders/DrugstoreOrder.model': { DrugstoreOrder: {
    findOne: async () => merchantState.order || null,
    sequelize: { transaction: async callback => callback({}) },
    create: async values => (merchantState.order = { id: 'merchant-order-id', ...values }),
  } },
  '../drugstore_orders/DrugstoreOrderItem.model': { DrugstoreOrderItem: { create: async () => ({}) } },
});
DrugstoreInternalService.decrementStock = async () => {};
DrugstoreInternalService.incrementDiscountUsage = async () => {};

test('merchant sync stores the fee snapshot, remains idempotent and accepts old zero-fee orders', async () => {
  for (const fee of [50, undefined]) {
    delete merchantState.order;
    const payload = {
      sourceOrderId: 'source-id', sourceSyncKey: 'sync-key', paymentReference: 'payment-ref', merchantId: 'merchant-id',
      user: { id: 1, role: 'consumer' }, amounts: { subtotal: 10000, vatTotal: 750, discountTotal: 0, deliveryFee: 0, serviceCharge: fee, totalAmount: 10750 + (fee || 0), currency: 'NGN' },
      items: [{ merchantProductId: 'product-id', quantity: 1 }], delivery: {},
    };
    await DrugstoreInternalService.reflectPaidOrder(payload);
    assert.equal(merchantState.order.serviceCharge, fee || 0);
    assert.equal(merchantState.order.totalAmount, payload.amounts.totalAmount);
    const retry = await DrugstoreInternalService.reflectPaidOrder(payload);
    assert.equal(retry.idempotent, true);
    assert.equal(merchantState.order.totalAmount, payload.amounts.totalAmount);
  }
});

const { ensureOrderServiceChargeColumn } = require('../../experience_1/dist/core/migrations');
const { addOrderServiceChargeColumn } = require('../../merchant/dist/core/migrations');
for (const [table, migrate] of [
  ['drugstore_orders', queryInterface => ensureOrderServiceChargeColumn({ getQueryInterface: () => queryInterface })],
  ['merchant_drugstore_orders', addOrderServiceChargeColumn],
]) {
  test(`${table} schema upgrade defaults old orders to zero and is safe to repeat`, async () => {
    const columns = {};
    const calls = [];
    const queryInterface = {
      describeTable: async () => columns,
      addColumn: async (...args) => { calls.push(args); columns.service_charge = {}; },
    };
    await migrate(queryInterface);
    await migrate(queryInterface);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].slice(0, 2), [table, 'service_charge']);
    assert.equal(calls[0][2].defaultValue, 0);
    assert.equal(calls[0][2].allowNull, false);
  });

  test(`${table} migration skips a new database but propagates unexpected failures`, async () => {
    await migrate({ describeTable: async () => { throw new Error('No description found'); } });
    await assert.rejects(migrate({ describeTable: async () => { throw new Error('permission denied'); } }), /permission denied/);
  });
}

// Earnings must reconcile with the customer payment while excluding platform/tax money.
const { calculateMerchantOrderEarnings } = require('../../merchant/dist/modules/drugstore_orders/merchant-earnings');
test('merchant earnings include delivery and discounts but exclude VAT and service charges', () => {
  assert.equal(calculateMerchantOrderEarnings({ totalAmount: '10550.00', vatTotal: '750.00', serviceCharge: '50.00' }), 9750);
  assert.equal(calculateMerchantOrderEarnings({ totalAmount: '10750.00', vatTotal: '750.00' }), 10000);
  assert.equal(calculateMerchantOrderEarnings({ totalAmount: '0.30', vatTotal: '0.10', serviceCharge: 0 }), 0.2);
});

let analyticsCall = 0;
const analyticsRows = [
  { placedAt: '2026-01-15T12:00:00Z', paymentStatus: 'paid', subtotal: '10000.00', discountTotal: '1000.00', deliveryFee: '700.00', vatTotal: '750.00', serviceCharge: '50.00', totalAmount: '10500.00', isInstoreSales: false, sourceUserId: 1, deliveryStatus: 'delivered' },
  { placedAt: '2026-01-15T12:00:00Z', paymentStatus: 'paid', subtotal: '5000.00', discountTotal: '500.00', deliveryFee: '0.00', vatTotal: '375.00', serviceCharge: '0.00', totalAmount: '4875.00', isInstoreSales: true, sourceUserId: 0, deliveryStatus: 'delivered' },
  { placedAt: '2026-01-15T12:00:00Z', paymentStatus: 'pending', subtotal: '10000.00', discountTotal: '0.00', deliveryFee: '700.00', vatTotal: '750.00', serviceCharge: '50.00', totalAmount: '11500.00', isInstoreSales: false, sourceUserId: 2, deliveryStatus: 'pending' },
];
const previousAnalyticsRows = [
  { ...analyticsRows[0], placedAt: '2026-01-14T12:00:00Z', discountTotal: '0.00', deliveryFee: '0.00', totalAmount: '10750.00', vatTotal: '750.00', serviceCharge: undefined },
];
const { DrugstoreOrderService } = loadService('../../merchant/dist/modules/drugstore_orders/DrugstoreOrder.service', {
  '../../config': { applicationConfig: { drugstoreAnalytics: { commissionRate: 0.1 } } },
  '../drugstore_internal/ExperienceOneInternalClient': { ExperienceOneInternalClient: {} },
  './DrugstoreOrder.model': { DrugstoreOrder: { findAll: async query => {
    for (const field of ['totalAmount', 'vatTotal', 'serviceCharge', 'subtotal', 'discountTotal', 'deliveryFee']) {
      assert.ok(query.attributes.includes(field), `${field} must be selected for analytics`);
    }
    return analyticsCall++ === 0 ? analyticsRows : previousAnalyticsRows;
  } } },
  '../products/Product.model': { Product: { count: async () => 1 } },
});
const analyticsFilters = { startDate: '2026-01-15', endDate: '2026-01-15' };

test('KPIs and the paid-order breakdown exclude VAT/service charges for online and in-store orders', async () => {
  analyticsCall = 0;
  const result = await DrugstoreOrderService.getAnalyticsKpis('merchant-id', analyticsFilters);
  assert.equal(result.metrics.totalEarned.value, 14200);
  assert.equal(result.metrics.totalEarned.growthPercentage, 42);
  assert.equal(result.metrics.totalCommission.value, 1420);
  assert.deepEqual(result.earningsBreakdown, {
    subtotal: 15000, discountTotal: 1500, deliveryFee: 700,
    vatTotal: 1125, serviceCharge: 50, totalAmount: 15375, merchantEarnings: 14200,
  });
});

test('sales trend uses the same earnings amount as the KPI', async () => {
  analyticsCall = 0;
  const result = await DrugstoreOrderService.getAnalyticsSalesSeries('merchant-id', analyticsFilters);
  assert.equal(result.totals.salesAmount, 14200);
  assert.equal(result.series.reduce((sum, bucket) => sum + bucket.salesAmount, 0), 14200);
});

test('merchant order JSON exposes earnings alongside the original customer total', () => {
  const { Sequelize } = require('sequelize-typescript');
  const { DrugstoreOrder } = require('../../merchant/dist/modules/drugstore_orders/DrugstoreOrder.model');
  const { DrugstoreOrderItem } = require('../../merchant/dist/modules/drugstore_orders/DrugstoreOrderItem.model');
  // Model registration only: no database connection is opened.
  const sequelize = new Sequelize({ dialect: 'postgres', models: [DrugstoreOrder, DrugstoreOrderItem], logging: false });
  const order = DrugstoreOrder.build({ totalAmount: 10500, vatTotal: 750, serviceCharge: 50 });
  assert.equal(order.toJSON().merchantEarnings, 9700);
  assert.equal(order.toJSON().totalAmount, 10500);
});
