const assert = require('node:assert/strict');
const { test, beforeEach } = require('node:test');
const Module = require('node:module');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const utils = require('../../utils/dist');

function loadWithMocks(relativePath, mocks) {
  const filename = require.resolve(relativePath);
  delete require.cache[filename];
  const originalLoad = Module._load;
  Module._load = function(request, parent, ...args) {
    if (parent?.filename === filename && Object.hasOwn(mocks, request)) return mocks[request];
    if (parent?.filename === filename && request.endsWith('.model')) {
      return { [request.split('/').pop().split('.')[0]]: {} };
    }
    return originalLoad.call(this, request, parent, ...args);
  };
  try { return require(filename); } finally { Module._load = originalLoad; }
}

const state = {};
const identity = { uid: 'firebase-uid', email: 'ada@example.com', name: 'Ada Obi' };
const transaction = { name: 'test-transaction' };
const firebase = { verify: async token => {
  state.verifications.push(token);
  if (state.firebaseError) throw state.firebaseError;
  return identity;
} };
const inTransaction = async callback => {
  state.transactions++;
  try { return await callback(transaction); } catch (error) { state.rollbacks++; throw error; }
};
function expectTransaction(options) { assert.equal(options.transaction, transaction); }
const userModel = {
  sequelize: { transaction: inTransaction },
  findByEmail: async email => { state.lookups.push(email); return state.user; },
  findById: async () => state.user,
  findOne: async () => state.phoneTaken ? { id: 99 } : null,
  create: async (values, options) => {
    expectTransaction(options);
    if (state.duplicate) throw { name: 'SequelizeUniqueConstraintError' };
    state.user = { id: 7, ...values, isActive: true, status: 'active', userTypeData: { permissions: [{ key: 'profile.view' }] } };
    return state.user;
  },
};
const authModel = {
  findByUserId: async () => state.auth,
  encryptPassword: async password => { state.generatedPasswords.push(password); return 'unusable-random-hash'; },
  new: async (values, tx) => { assert.equal(tx, transaction); state.auth = { ...values, save: async () => state.authSaves++ }; },
  validatePassword: async () => true,
};
const { UserAuthService } = loadWithMocks('../../experience_1/dist/modules/user_auth/UserAuth.service', {
  '@medtech/utils': { ...utils, FirebaseGoogleAuth: firebase },
  '../../config': { applicationConfig: {
    tokenSecret: 'test-access-secret', refreshTokenSecret: 'test-refresh-secret', tokenExpirationTime: '15m', refreshTokenExpirationTime: '1d',
  } },
  '../users/User.model': { User: userModel },
  './UserAuth.model': { UserAuth: authModel },
  '../user_token/UserToken.model': { UserToken: { setToken: async (...tokens) => state.userSessions.push(tokens) } },
  '../user_types/UserType.model': { UserType: { findOrCreate: async () => {} } },
  '../user_profile/UserProfile.model': { UserProfile: { createProfile: async (id, values, tx) => { assert.equal(tx, transaction); state.user.userProfile = values; } } },
  '../doctor_profile/DoctorProfile.model': { DoctorProfile: { create: async (values, options) => { expectTransaction(options); state.user.doctorProfile = values; } } },
  '../user_verification/UserVerification.service': { UserVerificationService: {} },
  '../../service/Email/Email.service': { EmailService: {} },
});

const merchantModel = {
  sequelize: { transaction: inTransaction },
  findAll: async () => { state.merchantQueries++; return state.owner ? [state.owner] : []; },
  findOne: async () => state.owner,
  create: async (values, options) => {
    expectTransaction(options);
    if (state.duplicate) throw { name: 'SequelizeUniqueConstraintError' };
    state.owner = { id: 'owner-id', ...values, fullName: `${values.firstName} ${values.lastName}`, onboardingCompleted: false, onboardingStep: 1 };
    return state.owner;
  },
};
const createRelated = key => ({ create: async (values, options) => { expectTransaction(options); state.createdRelated.push(key); return values; } });
const mockTeam = {
  sessionForVerifiedStaff: async (staff, code) => {
    state.staffSignIns.push({ staff, code });
    if (state.staffError) throw state.staffError;
    return state.staffSession;
  },
  loginWithPharmacyCode: async (principal, code) => {
    state.ownerPharmacySelection = { principal, code };
    if (state.staffError) throw state.staffError;
    return state.staffSession;
  },
};
const { MerchantAuthService } = loadWithMocks('../../merchant/dist/modules/merchant_auth/MerchantAuth.service', {
  '@medtech/utils': {
    ...utils, FirebaseGoogleAuth: firebase,
    hashPassword: async password => { state.generatedPasswords.push(password); return 'unusable-random-hash'; },
    verifyPassword: async () => { state.passwordChecks++; return state.passwordValid; },
    generateToken: claims => { state.merchantClaims = claims; return 'merchant-access-token'; },
  },
  '../merchant/Merchant.model': { Merchant: merchantModel },
  '../store_details/StoreDetails.model': { StoreDetails: { ...createRelated('store'), create: async (values, options) => {
    expectTransaction(options); state.createdRelated.push('store'); state.owner.storeDetails = values;
  } } },
  '../payment_details/PaymentDetails.model': { PaymentDetails: createRelated('payment') },
  '../merchant_settings/MerchantSettings.model': { MerchantSettings: createRelated('settings') },
  '../wallet/Wallet.model': { Wallet: createRelated('wallet') },
  '../subscriptions/Subscription.model': { Subscription: createRelated('subscription') },
  '../subscriptions/Plan.model': { Plan: { findOne: async options => { expectTransaction(options); return { id: 'free-plan' }; } } },
  '../refresh_tokens/RefreshToken.service': { RefreshTokenService: { createRefreshToken: async () => { state.merchantSessions++; return { refreshToken: 'merchant-refresh-token' }; } } },
  '../team/TeamAuth.service': { TeamAuthService: mockTeam },
  '../team/Access.service': { AccessService: { listPharmacies: async () => [{ pharmacyId: 'owner-id', access: 'owner' }] } },
  '../team/StaffAccount.model': { StaffAccount: { findOne: async () => state.staff } },
  '../merchant/phone.util': { isPhoneNumberTaken: async () => state.phoneTaken, PHONE_TAKEN_MESSAGE: 'Phone number has already been registered' },
  '../merchant_verification/MerchantVerification.service': { MerchantVerificationService: {} },
  '../../service/Email/Email.service': { EmailService: {} },
});

const { TeamAuthService } = loadWithMocks('../../merchant/dist/modules/team/TeamAuth.service', {
  '@medtech/utils': { ...utils, verifyPassword: async () => { state.passwordChecks++; return state.passwordValid; } },
  './StaffAccount.model': { StaffAccount: { findOne: async () => state.staff } },
  './Access.service': { AccessService: { listPharmacies: async () => state.staffPharmacies } },
  './Team.service': { hashInviteToken: () => '' },
  './Audit.service': { AuditService: {} },
  './PharmacyCode.service': { PharmacyCodeService: {}, normalizePharmacyCode: code => code.trim().toUpperCase() },
  '../refresh_tokens/RefreshToken.service': { RefreshTokenService: {} },
});

beforeEach(() => Object.assign(state, {
  verifications: [], lookups: [], firebaseError: null, user: null, owner: null, staff: null,
  auth: { password: 'existing-password-hash', save: async () => state.authSaves++ }, authSaves: 0,
  transactions: 0, rollbacks: 0, duplicate: false, generatedPasswords: [], userSessions: [],
  merchantSessions: 0, merchantQueries: 0, createdRelated: [], phoneTaken: false,
  passwordChecks: 0, passwordValid: true, staffSignIns: [], staffError: null,
  staffSession: { requiresPharmacySelection: true, selectionToken: 'selection-token', pharmacies: [] }, staffPharmacies: [],
}));

const user = overrides => ({ id: 7, email: identity.email, userType: 'consumer', isActive: true, status: 'active', userTypeData: { permissions: [{ key: 'profile.view' }] }, ...overrides });
const owner = overrides => ({ id: 'owner-id', email: identity.email, isActive: true, isVerified: true, password: 'existing-password-hash', storeDetails: { businessName: 'Existing Pharmacy' }, ...overrides });
const registration = { firstName: 'Ada', lastName: 'Obi', phoneNumber: '+2348012345678' };
const pharmacyRegistration = { businessName: 'Example Pharmacy', phoneNumber: '08012345678', phoneCountryCode: '+234' };

test('both apps reject failed Firebase verification before looking up or creating an account', async () => {
  for (const code of [401, 503]) {
    state.firebaseError = new utils.FirebaseGoogleAuthError(code, 'Google sign-in unavailable');
    assert.equal((await UserAuthService.googleLogin({ idToken: 'bad', role: 'consumer' })).code, code);
    assert.equal((await MerchantAuthService.googleLogin({ idToken: 'bad' })).code, code);
  }
  assert.equal(state.lookups.length, 0);
  assert.equal(state.merchantQueries, 0);
  assert.equal(state.transactions, 0);
});

test('unknown Google identities require signup details and receive no app tokens', async () => {
  const consumer = await UserAuthService.googleLogin({ idToken: 'good', role: 'customer' });
  const merchant = await MerchantAuthService.googleLogin({ idToken: 'good' });
  assert.deepEqual(consumer.data, { requiresRegistration: true, email: identity.email, role: 'consumer' });
  assert.deepEqual(merchant.data, { requiresRegistration: true, email: identity.email });
  assert.equal(state.transactions, 0);
  assert.equal(state.userSessions.length + state.merchantSessions, 0);
});

test('existing Experience 1 users get normal JWT sessions; password and stored permissions are preserved', async () => {
  state.user = user();
  const result = await UserAuthService.googleLogin({ idToken: 'good', role: 'customer' });
  assert.equal(result.code, 200);
  const claims = jwt.verify(result.data.accessToken, 'test-access-secret');
  assert.equal(claims.id, 7);
  assert.equal(claims.role, 'consumer');
  assert.deepEqual(claims.permissions, ['profile.view']);
  assert.equal(jwt.verify(result.data.refreshToken, 'test-refresh-secret').type, 'refresh');
  assert.equal(state.auth.password, 'existing-password-hash');
  assert.equal(state.userSessions.length, 1);
  assert.equal(result.data.profileStatus.onboardingCompleted, false);
});

test('wrong roles, inactive and suspended Experience 1 accounts never get a session', async () => {
  for (const [values, code] of [[{ userType: 'doctor' }, 401], [{ isActive: false }, 403], [{ status: 'suspended' }, 403]]) {
    state.user = user(values);
    assert.equal((await UserAuthService.googleLogin({ idToken: 'good', role: 'consumer', registration })).code, code);
  }
  assert.equal(state.userSessions.length, 0);
  assert.equal(state.transactions, 0);
});

test('Google consumer registration creates account/auth/profile in one transaction and uses token email', async () => {
  const result = await UserAuthService.googleLogin({ idToken: 'good', role: 'consumer', registration });
  assert.equal(result.code, 201);
  assert.equal(state.user.email, identity.email);
  assert.equal(state.auth.identifier, identity.email);
  assert.equal(state.auth.emailVerified, true);
  assert.equal(state.transactions, 1);
  assert.ok(state.generatedPasswords[0].length >= 48);
  assert.equal(state.user.userProfile.onboardingSkipped, false);
  assert.equal(result.data.profileStatus.profileCompleted, false);
});

test('new Google doctors must supply a license and start with incomplete onboarding', async () => {
  assert.equal((await UserAuthService.googleLogin({ idToken: 'good', role: 'medic', registration })).code, 400);
  assert.equal(state.transactions, 0);
  const result = await UserAuthService.googleLogin({ idToken: 'good', role: 'medic', registration: { ...registration, medicalLicenseNumber: 'MDCN-123' } });
  assert.equal(result.code, 201);
  assert.equal(state.user.userType, 'doctor');
  assert.equal(state.user.doctorProfile.medicalLicenseNumber, 'MDCN-123');
  assert.equal(result.data.profileStatus.onboardingCompleted, false);
});

test('existing pharmacy owners receive the normal owner session and keep their password', async () => {
  state.owner = owner();
  const result = await MerchantAuthService.googleLogin({ idToken: 'good' });
  assert.equal(result.code, 200);
  assert.equal(result.data.actor, 'owner');
  assert.equal(result.data.token, 'merchant-access-token');
  assert.equal(result.data.refreshToken, 'merchant-refresh-token');
  assert.equal(state.merchantClaims.id, 'owner-id');
  assert.equal(state.owner.password, 'existing-password-hash');
  assert.equal(state.passwordChecks, 0);
});

test('inactive and unverified pharmacy owners cannot sign in or re-register', async () => {
  for (const values of [{ isActive: false }, { isVerified: false }]) {
    state.owner = owner(values);
    assert.equal((await MerchantAuthService.googleLogin({ idToken: 'good', registration: pharmacyRegistration })).code, 403);
  }
  assert.equal(state.transactions + state.merchantSessions, 0);
});

test('Google staff sign-in preserves pharmacy selection and never registers staff as owners', async () => {
  state.staff = { id: 'staff-id', email: identity.email, isActive: true };
  const result = await MerchantAuthService.googleLogin({ idToken: 'good', pharmacyCode: 'QM-EXAMPLE', registration: pharmacyRegistration });
  assert.equal(result.data.requiresPharmacySelection, true);
  assert.deepEqual(state.staffSignIns, [{ staff: state.staff, code: 'QM-EXAMPLE' }]);
  assert.equal(state.transactions + state.merchantSessions, 0);
  state.staffError = new utils.HttpException(403, 'Access removed');
  assert.equal((await MerchantAuthService.googleLogin({ idToken: 'good' })).code, 403);
});

test('real verified-staff session logic denies deactivated staff and removed memberships', async () => {
  await assert.rejects(TeamAuthService.sessionForVerifiedStaff({ id: 'staff-id', isActive: false }), error => error.statusCode === 403);
  await assert.rejects(TeamAuthService.sessionForVerifiedStaff({ id: 'staff-id', isActive: true }), error => error.statusCode === 403);
});

test('staff with several pharmacies receive a restricted selection token rather than owner access', async () => {
  state.staffPharmacies = [{ pharmacyId: 'pharmacy-a', memberId: 'member-a' }, { pharmacyId: 'pharmacy-b', memberId: 'member-b' }];
  const result = await TeamAuthService.sessionForVerifiedStaff({ id: 'staff-id', email: identity.email, isActive: true, fullName: 'Ada Obi' });
  assert.equal(result.requiresPharmacySelection, true);
  const claims = jwt.decode(result.selectionToken);
  assert.equal(claims.id, 'staff-id');
  assert.equal(claims.purpose, 'pharmacy-selection');
  assert.equal(result.token, undefined);
  assert.equal(result.permissions, undefined);
});

test('password-based staff login still checks the password before opening a pharmacy selection session', async () => {
  state.staff = { id: 'staff-id', email: identity.email, isActive: true, fullName: 'Ada Obi', password: 'hash' };
  state.staffPharmacies = [{ pharmacyId: 'pharmacy-a' }, { pharmacyId: 'pharmacy-b' }];
  state.passwordValid = false;
  await assert.rejects(TeamAuthService.staffLogin(identity.email, 'wrong'), error => error.statusCode === 401);
  assert.equal(state.passwordChecks, 1);
  state.passwordValid = true;
  assert.equal((await TeamAuthService.staffLogin(identity.email, 'correct')).requiresPharmacySelection, true);
});

test('Google owners can use their invited pharmacy session without receiving owner access there', async () => {
  state.owner = owner();
  state.staffSession = { actor: 'member', permissions: ['sales.create'], token: 'member-token' };
  const result = await MerchantAuthService.googleLogin({ idToken: 'good', pharmacyCode: 'OTHER-PHARMACY' });
  assert.equal(result.data.actor, 'member');
  assert.deepEqual(result.data.permissions, ['sales.create']);
  assert.deepEqual(state.ownerPharmacySelection, { principal: { kind: 'owner', id: 'owner-id' }, code: 'OTHER-PHARMACY' });
  assert.equal(state.merchantSessions, 0);
});

test('Google pharmacy registration creates all default records transactionally with incomplete onboarding', async () => {
  const result = await MerchantAuthService.googleLogin({ idToken: 'good', registration: pharmacyRegistration });
  assert.equal(result.code, 201);
  assert.equal(result.data.actor, 'owner');
  assert.equal(result.data.onboarding.completed, false);
  assert.equal(state.owner.email, identity.email);
  assert.equal(state.owner.firstName, 'Ada');
  assert.equal(state.owner.password, 'unusable-random-hash');
  assert.equal(state.transactions, 1);
  assert.deepEqual(state.createdRelated, ['store', 'payment', 'settings', 'wallet', 'subscription']);
});

test('registration respects phone conflicts and handles concurrent duplicate email creation', async () => {
  state.phoneTaken = true;
  assert.equal((await MerchantAuthService.googleLogin({ idToken: 'good', registration: pharmacyRegistration })).code, 409);
  assert.equal((await UserAuthService.googleLogin({ idToken: 'good', role: 'consumer', registration })).code, 409);
  state.phoneTaken = false;
  state.duplicate = true;
  assert.equal((await MerchantAuthService.googleLogin({ idToken: 'good', registration: pharmacyRegistration })).code, 409);
  assert.equal((await UserAuthService.googleLogin({ idToken: 'good', role: 'consumer', registration })).code, 409);
  assert.equal(state.rollbacks, 2);
  assert.equal(state.merchantSessions + state.userSessions.length, 0);
});

test('the password login still requires password verification after session reuse refactor', async () => {
  state.owner = owner();
  state.passwordValid = false;
  assert.equal((await MerchantAuthService.login({ email: identity.email, password: 'wrong' })).code, 401);
  assert.equal(state.passwordChecks, 1);
  assert.equal(state.merchantSessions, 0);
  state.passwordValid = true;
  assert.equal((await MerchantAuthService.login({ email: identity.email, password: 'correct' })).data.actor, 'owner');
});

test('Google request schemas reject email/identity overrides, admin roles and incomplete signup details', () => {
  const experience = require('../../experience_1/dist/modules/user_auth/UserAuth.schema').GoogleLoginSchema;
  const merchant = require('../../merchant/dist/modules/merchant_auth/MerchantAuth.schema').GoogleLoginSchema;
  for (const body of [{ idToken: 'token', role: 'consumer', email: 'victim@example.com' }, { idToken: 'token', role: 'admin' }, { idToken: 'token', role: 'consumer', registration: {} }]) {
    assert.ok(experience.validate(body).error);
  }
  for (const body of [{ idToken: 'token', email: 'victim@example.com' }, { idToken: 'token', permissions: ['*'] }, { idToken: 'token', registration: {} }]) {
    assert.ok(merchant.validate(body).error);
  }
  assert.equal(experience.validate({ idToken: 'token', role: 'consumer', registration }).error, undefined);
  assert.equal(merchant.validate({ idToken: 'token', registration: pharmacyRegistration }).error, undefined);
});

test('both Google endpoints are published in Swagger with public token-exchange request schemas', () => {
  const swagger = require('swagger-jsdoc')({
    definition: { openapi: '3.0.0', info: { title: 'Google auth test', version: '1' } },
    apis: [path.resolve('merchant/src/modules/merchant_auth/controllers/GoogleLogin.controller.ts'), path.resolve('experience_1/src/modules/user_auth/controllers/Auth.controller.ts')],
    failOnErrors: true,
  });
  for (const endpoint of ['/api/v1/main/auth/google', '/api/v1/merchant/auth/google']) {
    const operation = swagger.paths[endpoint].post;
    assert.deepEqual(operation.security, []);
    assert.ok(operation.requestBody.content['application/json'].schema.required.includes('idToken'));
    assert.ok(operation.responses[201]);
    assert.ok(operation.responses[503]);
  }
});

test('the old Google strategy delegates to Firebase instead of exchanging authorization codes', async () => {
  let payload;
  const { GoogleOauth } = loadWithMocks('../../experience_1/dist/modules/user_auth/oauth_strategy/Google.oauth', {
    '../UserAuth.service': { UserAuthService: { googleLogin: async value => { payload = value; return { status: true, code: 200 }; } } },
  });
  const strategy = new GoogleOauth();
  assert.equal((await strategy.authenticate('firebase-id-token', 'consumer')).code, 200);
  assert.deepEqual(payload, { idToken: 'firebase-id-token', role: 'consumer' });
  assert.throws(() => strategy.generateAuthUrl(), /Firebase client SDK/);
});
