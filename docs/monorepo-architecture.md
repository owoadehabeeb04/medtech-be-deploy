# Meditech Monorepo Architecture

This document captures the current state of the repository as implemented in code.

## 1. Root Folder Structure

```text
meditech-be-github/
├── README.md
├── docs/
│   ├── README.md
│   ├── monorepo-architecture.md
│   └── postman/
│       ├── experience_1/
│       │   ├── experience1-auth-postman-checklist.md
│       │   ├── experience1-auth-profile.openapi.yaml
│       │   ├── experience1-auth-profile.postman_collection.json
│       │   └── experience1-auth-profile.postman_environment.json
│       └── merchant/
│           └── Meditech_Merchant_Subscription.postman_collection.json
├── package.json
├── package-lock.json
├── tsconfig.base.json
├── merchant/
│   ├── package.json
│   ├── tsconfig.json
│   ├── nodemon.json
│   ├── src/
│   │   ├── app.ts
│   │   ├── config/
│   │   ├── constants/
│   │   ├── core/
│   │   ├── middlewares/
│   │   ├── modules/
│   │   ├── observers/
│   │   ├── scripts/
│   │   ├── service/
│   │   └── view/
│   └── dist/
├── experience_1/
│   ├── package.json
│   ├── tsconfig.json
│   ├── asset/
│   └── src/
│       ├── app.ts
│       ├── constants/
│       ├── core/
│       ├── middlewares/
│       ├── modules/
│       ├── observers/
│       ├── service/
│       ├── utils/
│       └── view/
├── utils/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   └── dist/
└── node_modules/
```

## 2. What Each App/Folder Does

### Root

- `package.json`
  - Defines npm workspaces for `merchant`, `experience_1`, and `utils`.
  - Root build scripts only build `utils` and `merchant`.
- `README.md`
  - Basic setup instructions, but partially outdated.
- `docs/`
  - Central repository for architecture notes and Postman/OpenAPI artifacts.
- `tsconfig.base.json`
  - Shared TypeScript base config used by workspaces.

### `merchant/`

Dedicated merchant backend service.

- Main responsibilities:
  - merchant authentication
  - onboarding
  - settings/profile management
  - products
  - categories
  - discounts
  - subscriptions
  - wallet
  - support messaging
  - uploads
  - health checks
  - Swagger docs
- API base path: `/api/v1/merchant`

Important folders:

- `merchant/src/core`
  - app startup, DB bootstrap, request context, route registration, response/error handling, startup migrations
- `merchant/src/modules`
  - business modules grouped by domain
- `merchant/src/service`
  - cross-module integrations like Brevo email and Paystack
- `merchant/src/view/emails`
  - email templates
- `merchant/src/scripts`
  - seeding script for dev/demo data

### `experience_1/`

Separate backend service for general users.

- Main responsibilities:
  - customer and medic auth
  - user profile completion
  - specialities
  - permissions
  - user types
  - appointments
  - health checks
- API base path: `/api/v1/main`

Important folders:

- `experience_1/src/core`
  - startup, DB bootstrap, request context, route registration, response/error handling
- `experience_1/src/modules`
  - domain modules for users, auth, roles, permissions, appointments
- `experience_1/src/utils`
  - local utility layer for this app, including Redis init, encryption, custom error helpers, uploads
- `experience_1/src/observers`
  - in-process event handling for OTP email notifications
- `experience_1/src/service/Email`
  - email sending service

### `utils/`

Shared internal package published in the workspace as `@medtech/utils`.

- Shared responsibilities:
  - JWT helpers
  - generic email sender
  - S3 upload helper
  - shared DTOs
  - hashing helpers
  - formatting and utility functions

## 3. Backend Architecture Summary

### Common patterns across both backends

- Express-based API services
- TypeScript codebase
- PostgreSQL via Sequelize + `sequelize-typescript`
- Request-level `req.context`
- Module layout generally follows:
  - route
  - controller
  - service
  - model
- Error and response wrapping via shared helpers/middleware

### Merchant backend architecture

- Entry point: `merchant/src/app.ts`
- Startup flow:
  - `startServer()` from `merchant/src/core/index.ts`
  - bootstraps request context
  - connects to DB
  - applies rate limiting and security middleware
  - registers routes
  - mounts Swagger
  - applies response, error, and not-found middleware
- Database bootstrap:
  - `merchant/src/core/db.ts`
  - authenticates Sequelize
  - registers models
  - optionally `sync({ alter: true })` in development
  - runs manual startup migrations from `merchant/src/core/migrations.ts`
  - seeds subscription plans
- Routing:
  - all merchant APIs are mounted under `/api/v1/merchant`

### `experience_1` backend architecture

- Entry point: `experience_1/src/app.ts`
- Startup flow:
  - `startServer()` from `experience_1/src/core/index.ts`
  - bootstraps request context
  - connects to DB
  - initializes Redis
  - applies middleware
  - registers routes
  - applies response, error, and not-found middleware
- Database bootstrap:
  - `experience_1/src/core/db.ts`
  - authenticates Sequelize
  - registers models
  - does not run migrations
  - has `sequelize.sync({ alter: true })` commented out
- Routing:
  - all APIs are grouped under `/api/v1/main`

### Architectural differences

- `merchant` is more complete and consistent.
- `experience_1` is more mixed:
  - some modules are complete
  - some are partial scaffolding
  - some patterns are inconsistent with the rest of the repo
- `merchant` centralizes more shared behavior into `@medtech/utils`.
- `experience_1` duplicates some utility behavior inside its own `src/utils`.

## 4. Existing Modules/Services Already Implemented

### Merchant modules

Located in `merchant/src/modules`.

- `categories`
  - files:
    - `Category.model.ts`
    - `Category.route.ts`
    - `Category.service.ts`
    - `Category.schema.ts`
    - `Category.dto.ts`
    - controller set for create/get/list/update/delete/restore
  - functionality:
    - create category
    - list categories
    - get single category
    - update category
    - soft delete category
    - restore category
    - default category seeding

- `discounts`
  - files:
    - `Discount.model.ts`
    - `Discount.route.ts`
    - `Discount.service.ts`
    - `Discount.schema.ts`
    - `Discount.dto.ts`
    - controller set for CRUD, stats, validate, restore
  - functionality:
    - create/list/get/update/delete/restore discount
    - validate discount code
    - compute discount stats

- `health`
  - functionality:
    - app/db health check

- `merchant`
  - contains `Merchant.model.ts`

- `merchant_auth`
  - files:
    - `MerchantAuth.route.ts`
    - `MerchantAuth.service.ts`
    - `MerchantAuth.schema.ts`
    - `MerchantAuth.dto.ts`
    - auth controllers
  - functionality:
    - signup
    - OTP verification
    - complete signup
    - login
    - forgot password
    - reset password
    - refresh token

- `merchant_onboarding`
  - functionality:
    - onboarding status
    - valid ID upload URL submission
    - profile picture upload URL submission
    - bank verification
    - bank list retrieval

- `merchant_settings`
  - functionality:
    - get all settings
    - update all settings
    - update profile
    - update payment details
    - update store
    - change password
    - update notifications
    - update preferences

- `merchant_verification`
  - functionality:
    - OTP session persistence
    - hashed OTP storage
    - session validation and expiry tracking

- `payment_details`
  - contains merchant bank/payment model

- `products`
  - functionality:
    - create/list/get/update/delete/restore products
    - update stock
    - low stock products
    - product stats

- `refresh_tokens`
  - functionality:
    - merchant refresh token persistence and rotation support

- `store_details`
  - contains merchant store profile model

- `subscriptions`
  - functionality:
    - get plans
    - get current subscription
    - subscribe
    - confirm payment
    - upgrade
    - downgrade
    - cancel downgrade
    - cancel subscription
    - toggle auto renew
    - Paystack webhook handling
    - plan seeding

- `support`
  - functionality:
    - contact support
    - support email request + confirmation flow

- `transactions`
  - contains transaction model used by wallet and subscriptions

- `upload`
  - functionality:
    - single S3 upload
    - bulk S3 upload

- `wallet`
  - functionality:
    - get wallet
    - fund wallet
    - confirm funding
    - list transaction history

### Merchant service layer

Located mainly in `merchant/src/service`.

- `service/Email/Email.service.ts`
  - signup OTP emails
  - reset password OTP emails
  - support request emails
  - support confirmation emails

- `service/Paystack/Paystack.service.ts`
  - bank account verification
  - bank listing
  - transaction initialization
  - transaction verification
  - customer creation
  - subscription/payment helpers

### `experience_1` modules

Located in `experience_1/src/modules`.

- `appointment`
  - book appointment
  - get medic appointments

- `consultation_type`
  - model exists
  - service file is commented out
  - no mounted routes found

- `educational_history`
  - model only

- `health`
  - app/db/redis health

- `permission`
  - create permission
  - bulk create permissions
  - assign permissions to user type
  - bulk assign permissions
  - remove permissions from user type
  - get user type permissions
  - list all permissions

- `speciality`
  - create speciality
  - bulk create specialities
  - list active specialities
  - get by id
  - update
  - delete

- `user_auth`
  - signup
  - login
  - request OTP
  - verify OTP
  - reset password
  - set password
  - auth strategies for different user types
  - OAuth strategy scaffolding

- `user_profile`
  - model exists
  - route file exists but is empty and not mounted

- `user_specialities`
  - model and query helper for medics by speciality

- `user_token`
  - access/refresh token persistence helpers

- `user_type_permission`
  - join model for user types and permissions

- `user_types`
  - create/list/get/update/delete user types

- `user_verification`
  - OTP session persistence and validation

- `users`
  - create customer username
  - complete customer profile
  - complete medic profile
  - get medics by speciality

- `work_history`
  - model only

### `experience_1` service layer

- `service/Email/Email.service.ts`
  - OTP email send wrapper

### Strategy-based auth in `experience_1`

- `user_auth/strategy/Auth.context.ts`
  - picks auth flow by `userType`
- `user_auth/strategy/UserAuthStrategy.strategy.ts`
  - customer flow
- `user_auth/strategy/MedicAuth.strategy.ts`
  - medic flow
- `user_auth/oauth_strategy`
  - Google OAuth implementation exists
  - no mounted routes found for it

## 5. Database Models / Schemas Already Present

### Merchant models

- `Merchant`
  - merchant account core data
  - includes onboarding flags and profile image/valid ID URLs
- `MerchantVerification`
  - OTP/session records for signup and password reset
- `StoreDetails`
  - business/store profile data
- `PaymentDetails`
  - merchant bank information
- `MerchantSettings`
  - notification preferences and store preferences JSON
- `Product`
  - merchant product catalogue item
- `Discount`
  - discount codes and campaign rules
- `Category`
  - merchant-specific product categories
- `RefreshToken`
  - persisted merchant refresh tokens
- `Plan`
  - subscription plan definitions
- `Subscription`
  - merchant subscription state
- `ScheduledPlanChange`
  - delayed upgrade/downgrade record
- `Wallet`
  - merchant wallet balance
- `Transaction`
  - wallet and subscription payment transactions

### Merchant schema characteristics

- UUID IDs on major business entities
- soft delete enabled on:
  - `Product`
  - `Discount`
  - `Category`
- JSONB fields used for:
  - product images
  - discount product/category applicability
  - merchant notification preferences
  - merchant store preferences
  - plan features
  - transaction metadata

### Merchant relationships

- `Merchant` has one:
  - `StoreDetails`
  - `PaymentDetails`
  - `MerchantSettings`
  - `Subscription`
  - `Wallet`
- `Merchant` has many:
  - `Product`
  - `Discount`
  - `Category`
  - `RefreshToken`
  - `Transaction`
- `Subscription` belongs to `Plan`
- `ScheduledPlanChange` links `Merchant`, `Subscription`, and `Plan`
- `Transaction` belongs to `Merchant` and optionally `Wallet`

### `experience_1` models

- `User`
  - main user entity for customers and medics
- `UserAuth`
  - authentication data
- `UserType`
  - logical role/type record
- `UserToken`
  - token persistence
- `UserVerification`
  - OTP/session state
- `UserProfile`
  - address profile
- `EducationalHistory`
  - medic education records
- `WorkHistory`
  - medic work records
- `Permission`
  - permission catalog
- `UserTypePermission`
  - join table for `UserType` and `Permission`
- `Speciality`
  - medical speciality catalog
- `UserSpeciality`
  - user to speciality mapping
- `Appointment`
  - appointment booking data
- `ConsultationType`
  - consultation type catalog

### `experience_1` schema characteristics

- `User.userType` references `UserType.key`, not numeric ID
- permissions are many-to-many via `UserTypePermission`
- `Appointment` stores both booker and medic references to `User`
- OTPs are stored in `user_verifications`

## 6. API Routes / Endpoints Already Present

### Merchant API base

All mounted under `/api/v1/merchant`.

#### Health

- `GET /health`

#### Auth

- `POST /auth/signup`
- `POST /auth/verify-otp`
- `POST /auth/complete-signup`
- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/verify-reset-otp`
- `POST /auth/reset-password`
- `POST /auth/refresh-token`

#### Upload

- `POST /upload/single`
- `POST /upload/bulk`

#### Onboarding

- `GET /onboarding/status`
- `GET /onboarding/banks`
- `POST /onboarding/upload-valid-id`
- `POST /onboarding/upload-profile-picture`
- `POST /onboarding/verify-bank`

#### Settings

- `GET /settings`
- `PATCH /settings/all`
- `PATCH /settings/profile`
- `PATCH /settings/payment`
- `PATCH /settings/store`
- `POST /settings/password`
- `PATCH /settings/notifications`
- `PATCH /settings/preferences`

#### Products

- `GET /products/stats`
- `GET /products/low-stock`
- `GET /products`
- `GET /products/:productId`
- `POST /products`
- `PATCH /products/:productId`
- `PATCH /products/:productId/stock`
- `DELETE /products/:productId`
- `POST /products/:productId/restore`

#### Discounts

- `GET /discounts`
- `GET /discounts/stats`
- `POST /discounts/validate`
- `GET /discounts/:discountId`
- `POST /discounts`
- `PATCH /discounts/:discountId`
- `DELETE /discounts/:discountId`
- `POST /discounts/:discountId/restore`

#### Categories

- `GET /categories`
- `POST /categories`
- `GET /categories/:categoryId`
- `PATCH /categories/:categoryId`
- `DELETE /categories/:categoryId`
- `POST /categories/:categoryId/restore`

#### Support

- `POST /support/contact`

#### Subscriptions

- `GET /subscriptions/plans`
- `POST /subscriptions/webhook`
- `GET /subscriptions`
- `POST /subscriptions/subscribe`
- `POST /subscriptions/confirm-payment`
- `POST /subscriptions/upgrade`
- `POST /subscriptions/downgrade`
- `POST /subscriptions/cancel-downgrade`
- `POST /subscriptions/cancel`
- `PATCH /subscriptions/auto-renew`

#### Wallet

- `GET /wallet`
- `POST /wallet/fund`
- `POST /wallet/confirm-funding`
- `GET /wallet/transactions`

#### Swagger

- `GET /api-docs`
- `GET /api-docs.json`

### `experience_1` API base

All mounted under `/api/v1/main`.

#### Auth

- `POST /auth/:userType/signup`
- `POST /auth/:userType/login`
- `POST /auth/request-otp`
- `POST /auth/verify-otp`
- `POST /auth/reset-password`
- `POST /auth/set-password`

#### User

- `POST /user/customer/username`
- `POST /user/customer/profile`
- `POST /user/medic/complete-profile`
- `GET /user/medics/speciality/:specialityId`

#### Health

- `GET /health`

#### Specialities

- `POST /specialities/create`
- `POST /specialities/bulk-create`
- `GET /specialities/all`
- `GET /specialities/id/:id`
- `DELETE /specialities/id/:id`
- `PUT /specialities/id/:id`

#### User Types

- `POST /user-types/create`
- `GET /user-types/all`
- `GET /user-types/id/:userTypeId`
- `POST /user-types/update`
- `DELETE /user-types/delete/:userTypeId`

#### Permissions

- `POST /permissions/create`
- `POST /permissions/bulk-create`
- `GET /permissions/all`
- `POST /permissions/assign`
- `POST /permissions/bulk-assign`
- `POST /permissions/remove`
- `GET /permissions/user-type/:userTypeId`

#### Appointments

- `GET /appointments`
- `POST /appointments/book`

## 7. Auth and Role System Currently Implemented

### Merchant auth

- Bearer token authentication via `merchant/src/middlewares/Auth.Middleware.ts`
- Uses shared JWT helpers from `@medtech/utils`
- Validates merchant existence and `isActive`
- Injects merchant info into `req.context.user`
- Refresh token support exists via:
  - `merchant/src/modules/refresh_tokens/RefreshToken.model.ts`
  - `merchant/src/modules/refresh_tokens/RefreshToken.service.ts`

### Merchant role system

- No real merchant roles/permissions are implemented yet.
- `merchant/src/middlewares/permission.middleware.ts` is still a placeholder.

### `experience_1` auth

- Bearer token authentication via `experience_1/src/middlewares/Auth.Middleware.ts`
- JWT payload includes:
  - `id`
  - `userType`
  - `permissions`
- User is loaded from DB and attached to `req.context.user`

### `experience_1` role/permission system

- `UserType` defines logical user type
- `Permission` defines permission records
- `UserTypePermission` is the join table
- `PermissionMiddleware` implements:
  - `hasPermission(requiredPermission)`
  - `hasAnyPermission(...permissions)`

### Current practical limitation

- Permission middleware exists in `experience_1`, but most routes do not actually apply it.
- So the role/permission model exists, but enforcement is only partially wired in.

## 8. How Merchant, Consumer, and Doctor Apps Are Separated

### Merchant

- Completely separate backend workspace: `merchant/`
- Separate routing namespace: `/api/v1/merchant`
- Separate model family and database bootstrap
- Separate authentication flow
- Separate business domains like product, discount, subscription, wallet

### Consumer and doctor

- There is no separate `consumer` workspace or separate `doctor` workspace.
- Both live inside `experience_1`.
- Separation is logical, not physical.

### Consumer separation in `experience_1`

- Represented by `userType = customer`
- Customer flow uses `UserAuthStrategy`
- Customer-specific routes include:
  - `/user/customer/username`
  - `/user/customer/profile`

### Doctor separation in `experience_1`

- Represented by `userType = medic`
- Medic flow uses `MedicAuthStrategy`
- Medic-specific routes include:
  - `/user/medic/complete-profile`
  - `/user/medics/speciality/:specialityId`
  - `/appointments`

## 9. Shared Packages / Libs Used Across the Monorepo

### Internal shared package

- `utils/` published internally as `@medtech/utils`

### Shared files in `utils/src`

- `index.ts`
  - generic utility functions
- `jwt.ts`
  - access token, OTP flow token, refresh token helpers
- `SendEmail.ts`
  - generic Brevo email sender
- `aws.s3.ts`
  - S3 upload helper
- `common.dto.ts`
  - shared DTO types like `ApiResponse`

### Notable external libraries used

- Express
- Sequelize
- `sequelize-typescript`
- PostgreSQL driver `pg`
- `joi`
- `helmet`
- `cors`
- `cookie-parser`
- `express-rate-limit`
- `multer`
- `axios`
- `jsonwebtoken`
- `bcryptjs`
- `redis`
- `swagger-jsdoc`
- `swagger-ui-express`
- `google-auth-library`
- `firebase-admin` is installed in `experience_1` but no active usage was found in the reviewed flow

## 10. Microservice / Event-Driven / Queue Setup Present

### Microservices

- No true microservice architecture was found in this repo.
- The repo contains multiple services/workspaces, but they are not wired as independent communicating backend microservices.

### Event-driven setup

- Both apps define in-process event emitters:
  - `merchant/src/observers/eventEmitter.ts`
  - `experience_1/src/observers/eventEmitter.ts`
- `experience_1/src/observers/user.observer.ts` listens for OTP request events and sends email.

### Queue / broker setup

- No message queue or broker found:
  - no Bull/BullMQ
  - no RabbitMQ
  - no Kafka
  - no SQS worker setup

### Redis usage

- Redis exists only in `experience_1`
- Current visible roles:
  - startup initialization
  - health check ping
  - helper methods for auth session storage
- But request-context Redis bindings are commented out, so integration is partial.

## 11. What Looks Incomplete or Missing

- No dedicated `consumer` app folder
- No dedicated `doctor` app folder
- No tests found across the repo
- No CI workflow/config found in the inspected top-level files
- No real queue/background job processing layer found
- No migration framework in `experience_1`
- `experience_1/src/modules/user_profile/User.route.ts` is empty
- OAuth strategy files exist in `experience_1`, but no OAuth routes are mounted
- `consultation_type` has a model and a commented-out service, but no mounted API
- Merchant onboarding routes configure multer but the actual route handlers currently accept URLs in JSON rather than file uploads
- Merchant permission system is not implemented
- `experience_1` event listener bootstrap is commented out in startup, so OTP event-based emails may never run

## 12. Risks, Inconsistencies, and Technical Debt

### Security risks

- `merchant/.env` contains committed secrets, including:
  - Brevo credentials
  - AWS credentials
  - Cloudinary credentials
  - Paystack keys
- This is a serious secret-management risk.

### Documentation/config drift

- `README.md` says shared package is `@monorepo/utils`, but code imports `@medtech/utils`.
- Root README is therefore out of sync with the actual implementation.

### Logging and operational concerns

- `merchant/src/core/db.ts` logs the full PostgreSQL config object on startup.
- There are many direct `console.log` calls across both apps.

### Merchant-specific technical debt

- Permission middleware is only a placeholder.
- Associations bootstrap function exists but is currently empty because associations are decorator-driven.
- Startup migrations are manual and limited in scope.

### `experience_1` technical debt and correctness risks

- `UserAuth.findById()` queries the auth row by `id`, but the calling code appears to treat it like `userId`.
- `UserService.createUser()` creates a `UserAuth` record without clearly linking `userId`.
- `UserService.medicCompleteProfile()` writes `institution`, but `EducationalHistory.model.ts` defines `institute`.
- Appointment date filtering uses `$between`, which is outdated for Sequelize and should use `Op.between`.
- OTPs in `experience_1` are stored unhashed, unlike the merchant implementation which hashes them.
- Auth, config, and utility conventions differ noticeably from `merchant`, which increases maintenance cost.

### Architectural inconsistency

- `merchant` and `experience_1` use different conventions for:
  - config names
  - utility placement
  - email abstraction
  - auth implementation details
  - maturity of module design
- The monorepo is therefore shared at the workspace level, but not yet strongly standardized at the architecture level.

## Notes

- “doctor app” currently maps to the `medic` user type inside `experience_1`.
- “consumer app” currently maps to the `customer` user type inside `experience_1`.
- This document reflects the code currently present in the repository and does not assume any undocumented deployed services.
