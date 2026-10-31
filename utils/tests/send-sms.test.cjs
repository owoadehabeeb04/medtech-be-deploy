const assert = require('node:assert/strict');
const { test } = require('node:test');
const http = require('node:http');
const SendSms = require('../dist/SendSms').default;

const credentials = { accountSid: 'ACtest', authToken: 'test-token', from: 'QuickMedic' };
async function mockApi(t, handler) {
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

test('sends authenticated form data and preserves message characters', async t => {
  let received;
  const baseUrl = await mockApi(t, (req, res) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      received = { method: req.method, url: req.url, headers: req.headers, body: new URLSearchParams(body) };
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end('{"sid":"SMtest","status":"queued"}');
    });
  });
  await new SendSms({ ...credentials, baseUrl }).send('+2348031234567', 'Order + stock & NGN 2,000');
  assert.equal(received.method, 'POST');
  assert.equal(received.url, '/2010-04-01/Accounts/ACtest/Messages.json');
  assert.equal(received.headers.authorization, 'Basic ' + Buffer.from('ACtest:test-token').toString('base64'));
  assert.equal(received.headers['content-type'], 'application/x-www-form-urlencoded');
  assert.deepEqual(Object.fromEntries(received.body), {
    To: '+2348031234567', Body: 'Order + stock & NGN 2,000', From: 'QuickMedic',
  });
});

test('supports a Messaging Service without a fixed sender', async t => {
  let fields;
  const baseUrl = await mockApi(t, (req, res) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => { fields = new URLSearchParams(body); res.writeHead(201); res.end('{}'); });
  });
  const sms = new SendSms({ ...credentials, from: '', messagingServiceSid: 'MGtest', baseUrl });
  assert.equal(sms.isConfigured(), true);
  await sms.send('+2348031234567', 'Wallet funded');
  assert.equal(fields.get('MessagingServiceSid'), 'MGtest');
  assert.equal(fields.has('From'), false);
});

test('rejects incomplete configuration and malformed phone numbers before sending', async () => {
  for (const missing of [{ accountSid: '' }, { authToken: '' }, { from: '' }]) {
    const sms = new SendSms({ ...credentials, ...missing });
    assert.equal(sms.isConfigured(), false);
    await assert.rejects(sms.send('+2348031234567', 'Test'), /not configured/);
  }
  const sms = new SendSms(credentials);
  for (const recipient of ['08031234567', '+02348031234567', '+234invalid8031234567', '+1234567890123456']) {
    await assert.rejects(sms.send(recipient, 'Test'), /Invalid SMS recipient/);
  }
});

test('surfaces Twilio rejection details', async t => {
  const baseUrl = await mockApi(t, (_req, res) => {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: 21608, message: 'Recipient is not verified' }));
  });
  await assert.rejects(new SendSms({ ...credentials, baseUrl }).send('+2348031234567', 'Test'),
    /Twilio SMS request failed \(400\): Recipient is not verified \(code 21608\)/);
});

test('handles non-JSON provider errors', async t => {
  const baseUrl = await mockApi(t, (_req, res) => { res.writeHead(502); res.end('Bad gateway'); });
  await assert.rejects(new SendSms({ ...credentials, baseUrl }).send('+2348031234567', 'Test'), /Bad gateway/);
});

test('times out stalled requests', async t => {
  const baseUrl = await mockApi(t, () => {});
  await assert.rejects(new SendSms({ ...credentials, baseUrl, timeoutMs: 30 }).send('+2348031234567', 'Test'), /timed out/);
});
