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

The frontend should use this sequence, after the merchant clicks an explicit
"Enable notifications" action:

1. Request browser notification permission.
2. Register the root `firebase-messaging-sw.js` service worker and call Firebase
   `getToken()` with the public VAPID key.
3. Generate and persist one random `deviceId` per browser profile (for example, a
   UUID in `localStorage`). It identifies the browser profile; it is **not** the
   FCM token.
4. Enable the merchant's global push setting and the three MVP event preferences.
5. Register the current FCM token with the backend. Register again on later app
   starts whenever Firebase returns a new token.

The registration call is authenticated:

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

The response intentionally does not return the FCM token. It returns the safe
browser registration instead:

```json
{
  "status": 200,
  "message": "Notification device registered successfully",
  "data": {
    "id": "1c17dca0-645d-4fd9-b0bc-0bc1f23c1a38",
    "deviceId": "stable-browser-id",
    "platform": "web",
    "browser": "Chrome",
    "isActive": true,
    "lastSeenAt": "2026-08-30T13:55:00.000Z"
  }
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
  "pushNotificationsEnabled": true,
  "notificationPreferences": {
    "orderPlaced": { "desktop": true },
    "walletFunded": { "desktop": true },
    "offlineSaleRecorded": { "desktop": true }
  }
}
```

This endpoint deep-merges the submitted settings, so the frontend can later turn
off a single event without changing the other events:

```json
{
  "notificationPreferences": {
    "walletFunded": { "desktop": false }
  }
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
When `data.skipped` is present, use it to explain why no message was sent:
`push_disabled`, `no_active_devices`, or `firebase_not_configured`.

## Web-push payloads

The root service worker receives a Firebase notification title/body plus string
data fields. The frontend can use `data.type` to choose where notification clicks
navigate:

| Event | `data.type` | Other useful data |
| --- | --- | --- |
| New online order | `new_order` | `orderId`, `sourceOrderId`, `paymentReference`, `totalAmount`, `currency`, `fulfillmentMethod` |
| Wallet funded | `wallet_funded` | `reference`, `amountKobo`, `balanceKobo`, `currency` |
| Offline sale recorded | `offline_sale_recorded` | `orderId`, `displayOrderId`, `totalAmount`, `currency` |
| Test notification | `notification_test` | no additional business ID |

All FCM `data` values are strings. The service worker should safely parse only the
fields it needs and choose a merchant-dashboard URL for each known `data.type`.

Without a frontend browser token, TypeScript checks can verify the backend code but
no real browser notification can be delivered. For an end-to-end test, use the
frontend developer's browser after the service worker has registered and permission
has been granted.
