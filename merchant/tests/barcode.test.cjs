const assert = require('node:assert/strict');
const { test } = require('node:test');
const Module = require('node:module');
const express = require('express');

function loadWithMocks(path, mocks) {
  const filename = require.resolve(path);
  const originalLoad = Module._load;
  Module._load = function(request, parent, ...args) {
    if (parent?.filename === filename && Object.hasOwn(mocks, request)) return mocks[request];
    if (parent?.filename === filename && request.endsWith('.model')) return { [request.split('/').pop().split('.')[0]]: {} };
    return originalLoad.call(this, request, parent, ...args);
  };
  try { return require(filename); } finally { Module._load = originalLoad; }
}
const state = {};
const duplicate = { name: 'SequelizeUniqueConstraintError', parent: { constraint: 'products_merchant_barcode_unique' } };
const products = {
  findOne: async ({ where }) => {
    state.query = where;
    if (where.barcode !== undefined) return state.rows.find(row => row.merchantId === where.merchantId && row.barcode === where.barcode) || null;
    return state.edit;
  },
  create: async values => { if (state.failWrite) throw duplicate; state.created = values; return values; },
};
function reset() {
  state.rows = [
    { id: 'product-a', merchantId: 'pharmacy-a', barcode: '0012345678905', name: 'Test product', price: 1500, vat: 112.5, discountPercentage: 10, inventory: 20, isActive: true, status: 'in_stock', images: [], minQuantity: 1, maxQuantity: 100 },
    { id: 'product-b', merchantId: 'pharmacy-b', barcode: '0012345678905', inventory: 2, isActive: true, status: 'in_stock', price: 2000, images: [] },
  ];
  state.failWrite = false;
  state.created = undefined;
  state.edit = { barcode: 'OLD', deletedAt: null,
    update: async values => { if (state.failWrite) throw duplicate; Object.assign(state.edit, values); },
    restore: async () => { if (state.failWrite) throw duplicate; state.edit.deletedAt = null; },
  };
}
const { InStoreSaleService } = loadWithMocks('../dist/modules/in_store_sales/InStoreSale.service', {
  '../../config': { applicationConfig: {} },
  '../products/Product.model': { Product: products },
  '../../service/Notifications/Notification.service': { NotificationService: {}, smsMoney: String },
});
const { ProductService } = loadWithMocks('../dist/modules/products/Product.service', {
  './Product.model': { Product: products },
  '../merchant_settings/MerchantSettings.model': { MerchantSettings: { findOne: async () => null } },
  '../subscriptions/Subscription.model': { Subscription: { findOne: async () => null } },
  '../categories/ProductCategory.service': { ProductCategoryService: {} },
});
const { createProductSchema, updateProductSchema, barcodeLookupSchema } = require('../dist/modules/products/Product.schema');
const baseProduct = { name: 'Test product', category: 'Medicine', brand: 'Test', price: 1500, vat: 112.5, inventory: 20, images: [{ url: 'https://example.test/image.png', order: 1, isMain: true }] };
const hasStatus = status => error => error.statusCode === status;

test('barcode validation preserves zeroes/case, accepts optional/null, and rejects invalid inputs', () => {
  assert.equal(createProductSchema.validate({ ...baseProduct, barcode: ' 0012345678905\r\n' }).value.barcode, '0012345678905');
  assert.equal(updateProductSchema.validate({ barcode: 'AbC-001' }).value.barcode, 'AbC-001');
  assert.equal(createProductSchema.validate(baseProduct).error, undefined);
  assert.equal(updateProductSchema.validate({ barcode: null }).error, undefined);
  for (const barcode of [12345, '', ' ', '12 34', '12\n34', 'x'.repeat(101), ['123']]) {
    assert.ok(barcodeLookupSchema.validate({ barcode }).error, `must reject ${JSON.stringify(barcode)}`);
  }
});

test('scan lookup is exact, pharmacy-scoped, read-only and returns sale pricing', async () => {
  reset();
  const result = await InStoreSaleService.getProductByBarcode('pharmacy-a', '0012345678905\r\n');
  assert.deepEqual(state.query, { merchantId: 'pharmacy-a', barcode: '0012345678905' });
  assert.equal(result.productId, 'product-a');
  assert.equal(result.barcode, '0012345678905');
  assert.equal(result.totalUnitPrice, 1462.5);
  assert.equal(state.rows[0].inventory, 20);
  await assert.rejects(InStoreSaleService.getProductByBarcode('pharmacy-a', '12345678905'), hasStatus(404));
  await assert.rejects(InStoreSaleService.getProductByBarcode('pharmacy-c', '0012345678905'), hasStatus(404));
  assert.equal((await InStoreSaleService.getProductByBarcode('pharmacy-b', '0012345678905')).productId, 'product-b');
});

test('scan lookup rejects unavailable stock, inactive products and invalid barcodes', async () => {
  for (const overrides of [{ inventory: 0 }, { isActive: false }, { status: 'out_of_stock' }]) {
    reset(); Object.assign(state.rows[0], overrides);
    await assert.rejects(InStoreSaleService.getProductByBarcode('pharmacy-a', '0012345678905'), hasStatus(409));
  }
  await assert.rejects(InStoreSaleService.getProductByBarcode('pharmacy-a', null), hasStatus(400));
});

test('product writes store barcode text, allow clearing, preserve omitted values and translate duplicate races', async () => {
  reset();
  await ProductService.createProduct('pharmacy-a', { ...baseProduct, barcode: ' 0012345678905 ' });
  assert.equal(state.created.barcode, '0012345678905');
  await ProductService.updateProduct('pharmacy-a', 'id', { name: 'New name' });
  assert.equal(state.edit.barcode, 'OLD');
  await ProductService.updateProduct('pharmacy-a', 'id', { barcode: null });
  assert.equal(state.edit.barcode, null);
  state.failWrite = true;
  await assert.rejects(ProductService.createProduct('pharmacy-a', { ...baseProduct, barcode: '0012345678905' }), hasStatus(409));
  await assert.rejects(ProductService.updateProduct('pharmacy-a', 'id', { barcode: '0012345678905' }), hasStatus(409));
  state.edit.deletedAt = new Date();
  await assert.rejects(ProductService.restoreProduct('pharmacy-a', 'id'), hasStatus(409));
});

test('barcode schema upgrade uses a scoped unique index excluding deleted products', async () => {
  const { ensureProductBarcode } = require('../dist/core/migrations');
  const sql = [];
  await ensureProductBarcode({ getQueryInterface: () => ({ describeTable: async () => ({}) }), query: async text => sql.push(text) });
  assert.match(sql[0], /ADD COLUMN IF NOT EXISTS "barcode" VARCHAR\(100\)/);
  assert.match(sql[1], /UNIQUE INDEX IF NOT EXISTS.*\("merchant_id", "barcode"\) WHERE "deleted_at" IS NULL/);
  await ensureProductBarcode({ getQueryInterface: () => ({ describeTable: async () => { throw new Error('No description found'); } }) });
});

test('HTTP barcode endpoint requires sales permission and returns the standard response', async t => {
  reset();
  const router = loadWithMocks('../dist/modules/in_store_sales/InStoreSale.route', {
    '../team/Audit.service': { audit: () => (_req, _res, next) => next() },
  }).default;
  const app = express();
  app.use((req, _res, next) => { req.context = { user: { id: 'pharmacy-a', permissions: req.headers['x-allowed'] ? ['sales.create'] : [] } }; next(); });
  app.use('/api/v1/merchant/in-store-sales', router);
  app.use((_req, res, next) => { if (!res.response) return next(); res.json({ status: res.response.statusCode, message: res.response.message, data: res.response.data }); });
  app.use((err, _req, res, _next) => res.status(err.statusCode || 500).json({ message: err.message }));
  const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}/api/v1/merchant/in-store-sales/products/by-barcode`;
  assert.equal((await fetch(base + '?barcode=0012345678905')).status, 403);
  const response = await fetch(base + '?barcode=0012345678905', { headers: { 'x-allowed': 'yes' } });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.data.productId, 'product-a');
  assert.equal(body.data.barcode, '0012345678905');
  assert.equal((await fetch(base + '?barcode=unknown', { headers: { 'x-allowed': 'yes' } })).status, 404);
  assert.equal((await fetch(base + '?barcode=0012345678905&merchantId=pharmacy-b', { headers: { 'x-allowed': 'yes' } })).status, 400);
  assert.equal((await fetch(base + '?barcode=123&barcode=456', { headers: { 'x-allowed': 'yes' } })).status, 400);
});
