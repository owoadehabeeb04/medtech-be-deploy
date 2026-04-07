# `experience_1` Current State

This document summarizes what is already implemented inside `experience_1` so it can be shared with ChatGPT for planning the next phase.

Current app base path: `/api/v1/main`

## Short Summary You Can Paste Into ChatGPT

We already have a separate TypeScript/Express backend app in `experience_1` with PostgreSQL via Sequelize and API routes under `/api/v1/main`.

What is already implemented:

- JWT auth with access token + refresh token flow
- OTP-based signup and password reset flow
- Brevo email integration with a Handlebars OTP email template
- Consumer onboarding flow
- Doctor onboarding flow
- Speciality management
- User type and permission management
- Appointment booking and doctor appointment listing
- AWS S3 image upload for profile photos
- Redis initialization
- Common backend middleware like rate limiting, Helmet, CORS, cookie parser, request context, centralized response formatting, and error handling

Active route groups already mounted:

- `/auth`
- `/health`
- `/specialities`
- `/user-types`
- `/permissions`
- `/appointments`
- `/consumer`
- `/doctor`

Auth and account flows already built:

- Consumer signup starts with OTP request, OTP verify, OTP resend, then signup completion with password
- Doctor signup is a direct registration flow with password and medical license number
- Login supports role-aware auth
- Refresh token endpoint exists
- Forgot-password flow supports request OTP, verify OTP, resend OTP, and reset password
- Logout exists
- `/auth/me` returns the user plus profile status/next step summary

Consumer profile/onboarding already built:

- Create/update/get consumer profile
- Upload consumer profile image
- Skip current onboarding step
- Tracks onboarding status with `onboardingCompleted`, `profileCompleted`, and `nextStep`
- Consumer onboarding steps currently cover username, phone, date of birth, location, and profile image

Doctor profile/onboarding already built:

- Basic profile create/update
- Profile image upload
- Address update
- Education create/update/delete
- Work history create/update/delete
- Specialties assignment/update
- Complete onboarding endpoint
- Doctor profile fetch endpoint
- Onboarding completion is calculated from required steps, not just a manual flag

Appointments already built:

- Authenticated users can book appointments
- Doctors can fetch their own appointments
- Doctor appointment listing supports pagination plus optional status/date filters
- Doctor appointment listing is blocked until onboarding is complete

Admin/reference data already built:

- Specialities CRUD + bulk create
- User types CRUD
- Permissions create/list/assign/remove/get by user type
- Bulk permission creation
- Bulk permission assignment with a transaction

Important partial/in-progress pieces:

- `consultation_type` exists as a model, but its service is commented out and there is no active route yet
- Google OAuth strategy files exist, but there are no mounted auth routes using them yet
- Legacy `modules/users` profile routes still exist in source, but they are not mounted in the main router
- Appointment booking has a TODO for sending a notification to the doctor
- Permission and user-type routes import auth/permission middleware, but the current route file does not actually enforce those guards yet

## What Is Implemented

### 1. App foundation

- Express app bootstrapped through `src/core/index.ts`
- PostgreSQL connection through `sequelize-typescript`
- Registered models include:
  - users
  - auth records
  - refresh/access token storage
  - OTP verification sessions
  - consumer profiles
  - doctor profiles
  - education history
  - work history
  - specialities
  - user-speciality links
  - appointments
  - user types
  - permissions
  - user-type-permission links
  - consultation types
- Development startup auto-syncs the schema with `sequelize.sync({ alter: true })`
- Startup also initializes Redis
- Rate limiting is enabled globally
- Security middleware includes `helmet`, `cors`, `cookie-parser`, JSON parsing, and URL-encoded parsing
- Static assets are served from `asset/`
- Request timezone is set to `Africa/Lagos`
- A request context is attached to every request and provides:
  - DB access
  - schema validation
  - body sanitization
  - async error helpers
  - optional response encryption

### 2. Authentication and session management

- Access tokens are signed with JWT
- Refresh tokens are signed separately and rotated through a stored session record
- Access tokens are not trusted by signature alone:
  - the app also checks the token against the `user_tokens` table
- Login is role-aware and normalizes old/new role names:
  - `customer` maps to `consumer`
  - `medic` maps to `doctor`
- Logout can revoke by refresh token, access token, or all sessions for a user
- Passwords are hashed with bcrypt
- `/auth/me` returns:
  - basic user identity
  - normalized role
  - current profile status
  - a role-specific profile summary

### 3. OTP verification and email delivery

- OTP sessions are stored in `user_verifications`
- OTP values are hashed before storage
- Sessions are purpose-based:
  - email verification
  - password reset
- Sessions track:
  - `sessionId`
  - email
  - role/user type
  - payload for deferred signup completion
  - expiry
  - validation state
  - active/inactive state
- Requesting a new OTP deactivates older active OTP sessions for the same email/purpose
- OTP emails are sent through Brevo using a Handlebars template in `src/view/emails/otp.handlebars`
- In non-production, OTP delivery failures fall back to returning the OTP in the API response

### 4. Consumer onboarding

Consumer routes are protected with auth plus `consumer` role enforcement.

Implemented endpoints:

- `POST /consumer/profile`
- `PATCH /consumer/profile`
- `GET /consumer/profile`
- `POST /consumer/profile/image/upload`
- `POST /consumer/profile/skip`

Implemented behavior:

- Profile upsert supports username, phone number, date of birth, address fields, and profile image
- Address pieces are merged into a derived `location`
- Username uniqueness is checked before update
- Onboarding progress is computed with these steps:
  - `consumer_username`
  - `consumer_phone`
  - `consumer_dob`
  - `consumer_location`
  - `consumer_profile_image`
- Users can skip the current onboarding step
- Skipped steps are persisted and excluded from future `nextStep` calculation
- Profile image upload stores the file in S3 and saves the returned public URL

### 5. Doctor onboarding

Doctor routes are protected with auth plus `doctor` role enforcement.

Implemented endpoints:

- `POST /doctor/profile/basic`
- `PATCH /doctor/profile/basic`
- `POST /doctor/profile/image`
- `POST /doctor/profile/address`
- `POST /doctor/profile/education`
- `PATCH /doctor/profile/education/:educationId`
- `DELETE /doctor/profile/education/:educationId`
- `POST /doctor/profile/work-history`
- `PATCH /doctor/profile/work-history/:workId`
- `DELETE /doctor/profile/work-history/:workId`
- `POST /doctor/profile/specialties`
- `PATCH /doctor/profile/specialties`
- `POST /doctor/profile/complete-onboarding`
- `GET /doctor/profile`

Implemented behavior:

- Doctor registration creates an initial `doctor_profile` row immediately
- Basic profile covers phone number, medical license number, years of experience, and bio
- Profile image upload stores the file in S3
- Address is captured separately from basic profile
- Education history is stored as multiple rows per doctor
- Work history is stored as multiple rows per doctor
- Specialty assignment validates that all submitted speciality IDs are active
- Replacing specialties destroys old user-speciality links and recreates the active set
- Onboarding progress is calculated from actual data and returns the next required step:
  - profile image
  - address
  - education
  - work history
  - specialties
- Completing onboarding does a final validation instead of blindly flipping a flag

### 6. Appointments

Implemented endpoints:

- `POST /appointments/book`
- `GET /appointments`

Implemented behavior:

- Booking requires authentication
- If appointment type is `personal`, the patient name is derived from the logged-in user
- Appointment data includes:
  - booked by user
  - patient name
  - gender
  - age
  - doctor/medic ID
  - scheduled date
  - consultation type
  - optional extra info
- Doctor appointment listing:
  - requires auth
  - requires doctor role
  - requires completed doctor onboarding
  - supports `page`, `limit`, `status`, and `date`
- Appointment records currently support statuses such as pending, confirmed, cancelled, checked-in, in-progress, completed, and no-show

### 7. Specialities

Implemented endpoints:

- `POST /specialities/create`
- `POST /specialities/bulk-create`
- `GET /specialities/all`
- `GET /specialities/id/:id`
- `PUT /specialities/id/:id`
- `DELETE /specialities/id/:id`

Implemented behavior:

- Create speciality
- Bulk create specialities
- Fetch all active specialities
- Fetch one speciality by ID
- Update speciality
- Delete speciality
- Prevent duplicate speciality keys

### 8. User types and permissions

Implemented user-type endpoints:

- `POST /user-types/create`
- `GET /user-types/all`
- `GET /user-types/id/:userTypeId`
- `POST /user-types/update`
- `DELETE /user-types/delete/:userTypeId`

Implemented permission endpoints:

- `POST /permissions/create`
- `POST /permissions/bulk-create`
- `GET /permissions/all`
- `POST /permissions/assign`
- `POST /permissions/bulk-assign`
- `POST /permissions/remove`
- `GET /permissions/user-type/:userTypeId`

Implemented behavior:

- Create user types
- Attach permissions to a user type on creation
- Prevent deleting a user type that is still assigned to users
- Create individual permissions
- Bulk create permissions while skipping already-existing keys
- Assign an entire permission set to a user type
- Remove selected permissions from a user type
- Fetch all permissions for a user type
- Bulk assign permissions across multiple user types inside a transaction

### 9. Health and operational support

- `GET /health` exists
- Redis client is initialized on startup
- An event emitter and listener are set up for OTP email dispatch
- Response payloads can be encrypted when encryption is enabled in env config
- Postman/OpenAPI artifacts for part of `experience_1` already exist under `docs/postman/experience_1/`

## Partially Implemented Or Not Yet Wired

- `modules/users` contains older customer/medic profile endpoints and a “get medics by speciality” endpoint, but that router is not mounted in the active route tree
- Google OAuth classes exist, but there are no active routes exposing OAuth login right now
- `consultation_type` has a model, but the service is commented out and there is no route/controller wiring
- Appointment booking includes a placeholder comment for doctor notification, so that side effect is not finished yet
- Auth/permission middleware is imported in some admin route files, but those guards are currently not applied to the endpoints

## Best Way To Describe The Current State

If you want a one-line description for planning:

`experience_1` is already a working user-facing backend with auth, OTP, consumer onboarding, doctor onboarding, appointments, specialties, and RBAC scaffolding; the next phase should mostly focus on hardening, wiring missing pieces, and filling partial modules rather than starting from scratch.
