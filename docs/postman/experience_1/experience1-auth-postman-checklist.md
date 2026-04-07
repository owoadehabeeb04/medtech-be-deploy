# `experience_1` Endpoint Verification Guide

Use these artifacts for the mounted `experience_1` API under `/api/v1/main`.

## Primary Verification Paths

Native live smoke runner:

- `cd experience_1`
- `npm run verify:endpoints`

This is the CI-style path that was used to verify the live API against the local server, PostgreSQL, Redis, and the current upload flow.

Optional Newman wrapper:

- `cd experience_1`
- `npm run verify:endpoints:newman`

If Newman is not installed globally, rerun with:

- `NEWMAN_USE_NPX=true npm run verify:endpoints:newman`

## Postman Files

Import these files into Postman:

- `docs/postman/experience_1/experience1-auth-profile.postman_collection.json`
- `docs/postman/experience_1/experience1-auth-profile.postman_environment.json`

Supporting local upload fixtures:

- `docs/postman/experience_1/fixtures/profile-and-package-image.png`
- `docs/postman/experience_1/fixtures/package-attachment.pdf`

Machine-readable API definition:

- `docs/postman/experience_1/experience1-auth-profile.openapi.yaml`

## What The Collection Covers

- `Health`
- `Auth`
- `Forgot Password`
- `Consumer Profile`
- `Doctor Onboarding`
- `Doctor Settings`
- `Doctor Rates`
- `Doctor Health Packages`
- `Appointments`
- `Specialities`
- `User Types`
- `Permissions`

The collection persists shared values like:

- `token`
- `refreshToken`
- `signup_session_id`
- `forgot_session_id`
- `otp_code`
- `education_id`
- `work_id`
- `speciality_id_1`
- `speciality_id_2`
- `speciality_id_3`
- `package_id`
- `userTypeId`
- `userTypeId2`
- `permissionId`
- `permissionId2`
- `permissionId3`

## Regenerating The Postman Assets

The collection and environment are generated from the repo source script:

- `cd experience_1`
- `npm run postman:generate`

That command refreshes:

- `docs/postman/experience_1/experience1-auth-profile.postman_collection.json`
- `docs/postman/experience_1/experience1-auth-profile.postman_environment.json`

## Practical Notes

- The smoke runner is the authoritative end-to-end verifier.
- The Postman collection is grouped by route domain and is best used for manual inspection or selective reruns.
- Upload routes use the fixture files above.
- In local development, uploads now fall back to the app `asset/uploads/...` directory if S3 is unreachable.
- Doctor-only routes should reject consumer or unauthenticated access.
- Appointment booking now self-heals missing consultation-type reference data in non-production so local verification can run end-to-end.
