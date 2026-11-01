# Online order service charge

New online orders add **0.5% of the item subtotal, capped at NGN 250 per order**. The subtotal is before VAT, coupons, and delivery. The charge is rounded to the nearest kobo.

| Subtotal | Service charge |
| --- | --- |
| NGN 10,000 | NGN 50 |
| NGN 40,000 | NGN 200 |
| NGN 50,000 | NGN 250 |
| NGN 100,000 | NGN 250 |

The charge applies to delivery and pickup online orders, including online orders paid in store. Sales recorded directly through the merchant in-store-sales API remain free of this charge.

## API totals

- Cart reads and add/update/remove item responses expose `serviceCharge`. Their `grandTotal` includes this charge, excluding delivery and checkout coupon adjustments. The stored cart `grandTotal` remains the item total, so reading a cart repeatedly never adds the fee twice.
- Checkout recalculates prices and the fee on the server. Order responses expose the persisted `serviceCharge` snapshot.
- `totalAmount = subtotal + vatTotal - discountTotal + deliveryFee + serviceCharge`.
- Wallet debits, new/saved card payments, bank transfers, payment verification and refunds use the stored inclusive order total.
- Merchant reflection carries `amounts.serviceCharge`. Order reads and online-order CSV exports include the same snapshot. Legacy reflection payloads without this field default to zero.

Clients should display `serviceCharge` as a separate line and use the returned inclusive total rather than adding the charge to it again.

## Merchant earnings and breakdown

Merchant earnings exclude VAT and the platform service charge. The pharmacy keeps
its delivery fee, so earnings are `totalAmount - vatTotal - serviceCharge`
(equivalent to `subtotal - discountTotal + deliveryFee`). This applies to paid
online orders and in-store sales, including historical orders with no service charge.

Merchant order responses include a derived `merchantEarnings` alongside the
existing amount fields. Online-order CSV exports include the full amount breakdown.
The `/analytics/kpis` and `/dashboard` responses also expose `earningsBreakdown`
for paid orders in the selected period: subtotal, discounts, delivery, VAT,
service charge, customer total, and merchant earnings. The frontend can display
these as separate lines without treating VAT or service charges as merchant income.

The `totalEarned` KPI and sales trend use merchant earnings. The existing
`totalCommission` metric uses this same earnings base and is reported separately;
it is not subtracted from `totalEarned`. This reporting change does not transfer
funds or apply a new commission deduction to any payment or wallet.

## Schema and rollout

Both services add a non-null `service_charge DECIMAL(12,2) DEFAULT 0` column to their respective order table at startup. Existing orders keep their original totals and receive zero service charge; they are not repriced. New development databases get the column through model sync.

Deploy/restart the merchant service before `experience_1` when deploying them separately, so the merchant can store the fee as soon as checkout begins sending it. These changes do not execute a live database migration during build or tests.

## Verification

Run `npm run test:online-order-service-charge` from the repository root. Tests execute real checkout, cart serialization, payment verification and merchant reflection logic with mocked database/payment/notification boundaries. No live payment, SMS or database calls are made.
