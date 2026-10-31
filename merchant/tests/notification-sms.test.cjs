const assert = require('node:assert/strict');
const { test } = require('node:test');
const Module = require('node:module');

test('merchant SMS respects preferences and isolates channel failures', async t => {
  const calls = { sms: [], email: [], push: [], warnings: [], errors: [] };
  let configured = true;
  let rejectSms = false;
  let preference = { sms: true, email: true };
  const mocks = {
    '@medtech/utils': { SendSms: class {
      isConfigured() { return configured; }
      async send(...args) { calls.sms.push(args); if (rejectSms) throw new Error('Twilio unavailable'); }
    } },
    '../../config': { applicationConfig: { twilio: {}, team: { merchantAppUrl: 'https://example.test' } } },
    '../../modules/merchant/Merchant.model': { Merchant: { findByPk: async () => ({ phoneCountryCode: '234', phoneNumber: '8031234567', email: 'owner@example.test' }) } },
    '../../modules/merchant/phone.util': { normalizePhone: () => ({ countryCode: '234', national: '8031234567' }) },
    '../../modules/merchant_settings/MerchantSettings.model': { MerchantSettings: { findOne: async () => ({ notificationPreferences: { orderPlaced: preference } }) } },
    '../Email/Email.service': { EmailService: { sendNotificationEmail: async (...args) => calls.email.push(args) } },
    '../Firebase/FirebaseMessaging.service': { FirebaseMessagingService: { sendEvent: async (...args) => calls.push.push(args) } },
  };
  const originalLoad = Module._load;
  Module._load = function(request, ...args) {
    return Object.hasOwn(mocks, request) ? mocks[request] : originalLoad.call(this, request, ...args);
  };
  let NotificationService;
  try {
    ({ NotificationService } = require('../dist/src/service/Notifications/Notification.service'));
  } finally {
    Module._load = originalLoad;
  }
  t.mock.method(console, 'warn', (...args) => calls.warnings.push(args));
  t.mock.method(console, 'error', (...args) => calls.errors.push(args));
  const input = { merchantId: 'merchant-test', event: 'orderPlaced', title: 'Order received', body: 'New order', smsText: 'New online order', data: {} };

  await NotificationService.notify(input);
  assert.deepEqual(calls.sms, [['+2348031234567', 'New online order']]);
  assert.equal(calls.email.length, 1);
  assert.equal(calls.push.length, 1);

  preference = { sms: false, email: true };
  await NotificationService.notify(input);
  assert.equal(calls.sms.length, 1, 'SMS disabled: no new send');
  assert.equal(calls.email.length, 2);

  preference = undefined;
  await NotificationService.notify(input);
  assert.equal(calls.sms.length, 1, 'missing preference: no new send');

  preference = { sms: true, email: true };
  configured = false;
  await NotificationService.notify(input);
  assert.equal(calls.sms.length, 1, 'missing configuration: no new send');
  assert.equal(calls.warnings.length, 1);

  configured = true;
  rejectSms = true;
  await assert.doesNotReject(NotificationService.notify(input));
  assert.equal(calls.sms.length, 2);
  assert.equal(calls.email.length, 4, 'email still sent when SMS fails');
  assert.equal(calls.push.length, 5, 'push still attempted for every event');
  assert.match(calls.errors[0].join(' '), /Twilio unavailable/);
});
