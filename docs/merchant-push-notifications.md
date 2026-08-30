# Merchant web push notifications

The merchant API sends Firebase Cloud Messaging (FCM) web notifications for:

- a new online order reflected into the merchant database;
- a wallet funding transaction that is successfully settled; and
- a newly recorded offline sale.

Push delivery is best-effort. The order, wallet transaction, or sale is committed
before the push is attempted, and an FCM failure must not fail the business action.
Idempotent retries do not send a second notification.

## Backend configuration

Add the Firebase Admin credentials to the merchant backend environment. Use either:

```env
FIREBASE_PROJECT_ID=quickmedic-2e4d5
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@quickmedic-2e4d5.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

or a complete service-account JSON value in `FIREBASE_SERVICE_ACCOUNT_JSON`.
Google Application Default Credentials are also supported through
`GOOGLE_APPLICATION_CREDENTIALS` in environments that provide them.

Never commit or send the service-account private key to the frontend.

## Frontend registration contract

After the merchant grants browser notification permission and obtains an FCM token,
the frontend calls the authenticated endpoint:

```http
POST /api/v1/merchant/settings/device-token
Authorization: Bearer <merchant-access-token>
Content-Type: application/json
```

```json
{
  "deviceId": "stable-browser-id",
  "token": "fcm-registration-token",
  "platform": "web",
  "browser": "Chrome",
  "userAgent": "optional user-agent string"
}
```

The frontend can deactivate the browser registration on logout or when the user
disables notifications:

```http
DELETE /api/v1/merchant/settings/device-tokens/:deviceId
Authorization: Bearer <merchant-access-token>
```

The merchant must also enable the global push setting through the existing endpoint:

```http
PATCH /api/v1/merchant/settings/notifications
Authorization: Bearer <merchant-access-token>
Content-Type: application/json
```

```json
{
  "pushNotificationsEnabled": true
}
```

## Testing

The authenticated status endpoint confirms whether Firebase credentials, push
preferences, and device registrations are available:

```http
GET /api/v1/merchant/settings/notifications/push-status
Authorization: Bearer <merchant-access-token>
```

After a browser token has been registered and push has been enabled, send a test
notification without creating a payment or order:

```http
POST /api/v1/merchant/settings/notifications/test
Authorization: Bearer <merchant-access-token>
```

The response reports how many devices were attempted, sent, failed, or disabled.

Without a frontend browser token, TypeScript checks can verify the backend code but
no real browser notification can be delivered. For an end-to-end test, use the
frontend developer's browser after the service worker has registered and permission
has been granted.
