# `experience_1` Postman Collection Guide

Use the Postman collection as the primary artifact for the `experience_1` auth and profile flows.

## What to Import

Import this file into Postman:

`docs/postman/experience_1/experience1-auth-profile.postman_collection.json`

Optional Postman environment:

`docs/postman/experience_1/experience1-auth-profile.postman_environment.json`

Optional machine-readable API definition:

`docs/postman/experience_1/experience1-auth-profile.openapi.yaml`

Do not paste this Markdown guide into Postman import.

## Collection Style

This collection is intentionally structured like the merchant subscription collection:

- collection-level bearer auth using `{{token}}`
- guided request order with numbered request names
- folder descriptions and request descriptions
- test scripts that auto-save the next variables you need

## Shared Session Behavior

This collection now uses one active auth session:

- `token`
- `refreshToken`

Any successful request that authenticates a user will overwrite those values:

- `Complete Consumer Signup`
- `Register Doctor`
- `Login as Consumer`
- `Login as Doctor`
- `Refresh Token`

That means the most recent successful auth request becomes the active session for all protected requests.

## Recommended Variables

Use the collection variables directly or mirror them in a Postman environment:

| Variable | Example Value |
|---|---|
| `baseUrl` | `http://localhost:6200/api/v1/main` |
| `token` | empty |
| `refreshToken` | empty |
| `consumer_email` | `consumer1@example.com` |
| `consumer_phone` | `+2348012345678` |
| `consumer_password` | `StrongPass1!` |
| `doctor_email` | `doctor1@example.com` |
| `doctor_phone` | `+2348099999999` |
| `doctor_password` | `StrongPass1!` |
| `doctor_license` | `LIC-12345` |
| `signup_session_id` | empty |
| `forgot_session_id` | empty |
| `otp_code` | empty |
| `education_id` | empty |
| `work_id` | empty |
| `speciality_id_1` | `1` |
| `speciality_id_2` | `2` |

## Recommended Request Order

### Consumer Flow

1. `1. Request Consumer Signup OTP`
2. `2. Verify Signup OTP`
3. `4. Complete Consumer Signup`
4. `8. Get Current User`
5. `1. Create Consumer Profile`
6. `4. Upload Consumer Profile Image`
7. `3. Get Consumer Profile`

### Doctor Flow

1. `5. Register Doctor`
2. `8. Get Current User`
3. `1. Create Doctor Basic Profile`
4. `3. Upload Doctor Profile Image`
5. `4. Add Doctor Address`
6. `5. Add Education History`
7. `8. Add Work History`
8. `11. Create Doctor Specialties`
9. `13. Complete Doctor Onboarding`
10. `14. Get Doctor Profile`

## Practical Notes

- Public auth endpoints are marked `noauth`
- Protected endpoints rely on collection-level bearer auth
- Consumer and doctor image uploads use `form-data` with the field name `file`
- Forgot-password is shared for both account types
- Consumer signup is OTP-first
- Doctor signup is direct registration

## Troubleshooting

If requests are failing with auth errors:

- check which login or signup flow ran last
- confirm `token` was updated in collection variables
- confirm `refreshToken` was updated before using `Refresh Token` or `Logout`

If Postman import says the format is invalid:

- import `docs/postman/experience_1/experience1-auth-profile.postman_collection.json`
- or import `docs/postman/experience_1/experience1-auth-profile.openapi.yaml`
- do not paste this Markdown file into the import box
