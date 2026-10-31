# Merchant SMS notifications (Twilio)

Merchant alerts use Twilio Programmable Messaging. SMS is sent only when the
owner enables `sms` for the event in notification settings. The recipient is the
pharmacy owner's normalized phone number; staff do not receive these messages.
Brevo email and Firebase push continue to use their existing configuration.

## Account setup

In `merchant/.env`, add the following values from your Twilio Console:

```dotenv
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_SMS_FROM=
TWILIO_MESSAGING_SERVICE_SID=
```

Set both credentials and choose one sender option:

- `TWILIO_SMS_FROM`: a sender available to your Twilio account, such as an
  approved alphanumeric sender ID or SMS-capable Twilio number.
- `TWILIO_MESSAGING_SERVICE_SID`: a Messaging Service with a configured sender
  pool. When set, this takes precedence over `TWILIO_SMS_FROM`.

Keep credentials in the backend environment. Do not commit them or provide them
to the frontend. Restart the merchant backend after setting them. Missing
credentials or sender configuration causes SMS to be skipped with a warning.
`BREVO_SMS_SENDER` is no longer used. Retain Brevo's email configuration.

## Testing and launch

1. Create your account and check its trial eligibility and restrictions.
2. Enable the destination country in Twilio's Messaging Geographic Permissions.
3. Confirm that your sender supports the destination. For Nigeria, arrange a
   registered alphanumeric sender ID: Twilio warns that numeric international
   senders fail on MTN, Airtel, and 9 Mobile. A Messaging Service also needs a
   suitable sender in its pool.
4. Enable SMS for a notification event on a test merchant with a valid phone
   number. Trigger that event and inspect Twilio Messaging Logs for delivery.
5. Disable that event's SMS switch and confirm subsequent events send no SMS.

Trial accounts have recipient, content, and expiry restrictions. The app sends
its existing custom alert text; a restricted trial may reject it until account
upgrade. Code configuration alone does not remove account or carrier restrictions.

API acceptance does not establish handset delivery. Provider errors are logged
and do not fail the order, sale, or wallet action. There are no automatic retries
or new delivery webhooks in this migration.

## Local verification (no SMS sent)

```sh
npm run build --workspace=utils
npm run build --workspace=merchant
node --test utils/tests/send-sms.test.cjs merchant/tests/notification-sms.test.cjs
```

Tests use a local mock HTTP server with fake credentials and mocked notification
dependencies. They cover preference switches and channel failure isolation, request
encoding, authentication, both sender options, missing configuration, invalid
recipients, provider errors, and timeouts.

References:

- [Twilio Messages API](https://www.twilio.com/docs/messaging/api/message-resource)
- [Trial account restrictions](https://www.twilio.com/docs/usage/trials)
- [Nigeria SMS guidelines](https://www.twilio.com/en-us/guidelines/ng/sms)
- [Nigeria SMS pricing](https://www.twilio.com/en-us/sms/pricing/ng)
