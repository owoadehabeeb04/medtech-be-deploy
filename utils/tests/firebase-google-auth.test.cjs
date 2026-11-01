const assert = require('node:assert/strict');
const { test } = require('node:test');
const Module = require('node:module');

const envKeys = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_SERVICE_ACCOUNT_JSON', 'FIREBASE_AUTH_EMULATOR_HOST'];
async function withVerifier(options, run) {
  const previous = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  for (const key of envKeys) delete process.env[key];
  Object.assign(process.env, { FIREBASE_PROJECT_ID: 'test-project', ...options.env });
  const calls = {};
  const filename = require.resolve('../dist/FirebaseGoogleAuth');
  delete require.cache[filename];
  const originalLoad = Module._load;
  Module._load = function(request, parent, ...args) {
    if (parent?.filename === filename && request === 'firebase-admin/app') return {
      getApps: () => options.existingApps || [],
      applicationDefault: () => ({ kind: 'adc' }),
      cert: values => { calls.cert = values; return { kind: 'cert' }; },
      initializeApp: (config, name) => { calls.app = { config, name }; return { name, options: config }; },
    };
    if (parent?.filename === filename && request === 'firebase-admin/auth') return {
      getAuth: app => ({ verifyIdToken: async (token, checkRevoked) => {
        calls.verify = { app, token, checkRevoked };
        if (options.error) throw options.error;
        return { uid: 'firebase-uid', email: 'Ada@Example.com', email_verified: true, firebase: { sign_in_provider: 'google.com' }, ...options.claims };
      } }),
    };
    return originalLoad.call(this, request, parent, ...args);
  };
  let verifier;
  try { verifier = require(filename); } finally { Module._load = originalLoad; }
  try { await run(verifier, calls); } finally {
    delete require.cache[filename];
    for (const key of envKeys) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
  }
}

test('Firebase Admin verifies the configured project, checks revocation and normalizes verified Google email', async () => {
  await withVerifier({}, async ({ FirebaseGoogleAuth }, calls) => {
    const result = await FirebaseGoogleAuth.verify('firebase-id-token');
    assert.equal(result.email, 'ada@example.com');
    assert.equal(result.uid, 'firebase-uid');
    assert.equal(calls.verify.checkRevoked, true);
    assert.equal(calls.app.config.projectId, 'test-project');
    assert.equal(calls.app.name, 'medtech-google-auth-test-project');
  });
});

test('non-Google sessions, unverified emails and missing emails are rejected', async () => {
  for (const claims of [{ firebase: { sign_in_provider: 'password' } }, { firebase: { sign_in_provider: 'google.com', tenant: 'another-tenant' } }, { email_verified: false }, { email: undefined }]) {
    await withVerifier({ claims }, async ({ FirebaseGoogleAuth }) => {
      await assert.rejects(FirebaseGoogleAuth.verify('token'), error => error.statusCode === 401);
    });
  }
});

test('expired, revoked, disabled, malformed and wrong-project tokens are unauthorized', async () => {
  for (const code of ['auth/id-token-expired', 'auth/id-token-revoked', 'auth/user-disabled', 'auth/argument-error', 'auth/invalid-id-token']) {
    await withVerifier({ error: { code } }, async ({ FirebaseGoogleAuth }) => {
      await assert.rejects(FirebaseGoogleAuth.verify('token'), error => error.statusCode === 401 && !error.message.includes(code));
    });
  }
});

test('configuration and credential failures return 503; emulator mode fails closed', async () => {
  for (const env of [{ FIREBASE_PROJECT_ID: '' }, { FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099' }, { FIREBASE_CLIENT_EMAIL: 'partial@example.com' }, { FIREBASE_SERVICE_ACCOUNT_JSON: '{bad-json' }, { FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({ project_id: 'wrong-project' }) }]) {
    await withVerifier({ env }, async ({ FirebaseGoogleAuth }, calls) => {
      await assert.rejects(FirebaseGoogleAuth.verify('token'), error => error.statusCode === 503);
      assert.equal(calls.verify, undefined);
    });
  }
  await withVerifier({ error: { code: 'app/invalid-credential', message: 'SECRET_PRIVATE_KEY' } }, async ({ FirebaseGoogleAuth }) => {
    await assert.rejects(FirebaseGoogleAuth.verify('token'), error => error.statusCode === 503 && !error.message.includes('SECRET'));
  });
});

test('service-account credentials normalize private-key newlines without using an FCM default app', async () => {
  await withVerifier({
    existingApps: [{ name: '[DEFAULT]', options: { projectId: 'other-push-project' } }],
    env: { FIREBASE_CLIENT_EMAIL: 'service@test-project.iam.gserviceaccount.com', FIREBASE_PRIVATE_KEY: 'line1\\nline2' },
  }, async ({ FirebaseGoogleAuth }, calls) => {
    await FirebaseGoogleAuth.verify('token');
    assert.equal(calls.cert.privateKey, 'line1\nline2');
    assert.equal(calls.app.config.projectId, 'test-project');
  });
});

test('empty and oversized token input fails before Firebase Admin is used', async () => {
  await withVerifier({}, async ({ FirebaseGoogleAuth }, calls) => {
    for (const token of ['', '  ', 'x'.repeat(16385)]) {
      await assert.rejects(FirebaseGoogleAuth.verify(token), error => error.statusCode === 400);
    }
    assert.equal(calls.verify, undefined);
  });
});
