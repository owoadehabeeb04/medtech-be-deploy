# Frontend handoff: USB barcode scanning at the pharmacy counter

The backend supports product registration and read-only barcode lookup for the
existing in-store-sales flow. The frontend captures scanner input and maintains
the cashier's sale basket. A USB scanner in HID/keyboard mode types the barcode
into the focused field; configure the scanner to append Enter.

## 1. Register the barcode when creating/editing a product

Use the existing endpoints, with an optional `barcode` string:

- `POST /api/v1/merchant/products` — include all existing required product fields.
- `PATCH /api/v1/merchant/products/{productId}` — send changed fields only.
- Both require the existing `products.manage` permission.

Example field added to the create/edit payload:

```json
{ "barcode": "0012345678905" }
```

This is a field example, not a complete create-product payload. On the product
form, focus a text barcode field and scan the packaging. Prevent Enter from
submitting the form accidentally, then save the product normally.

- Keep barcodes as strings: do not parse them as numbers or remove leading zeroes.
- Matching is exact and case-sensitive. Surrounding whitespace is trimmed.
- Accepted values contain 1–100 printable ASCII characters without spaces or
  internal control characters. UPC/EAN-style numeric codes and text barcodes are
  supported; the API does not impose a particular barcode format/checksum.
- Omit `barcode` for products without one. On edit, omission keeps its old value;
  send `null` to clear it. An empty string is invalid.
- Product responses and in-store product options now include `barcode` (nullable).
- A code identifies one non-deleted product within the pharmacy. Different
  pharmacies may register the same packaging barcode. Deleted products release
  the code; restoring one returns 409 if another product has since claimed it.
- Handle HTTP 409 by showing: “This barcode is already assigned to another
  product in your pharmacy.” Do not silently overwrite another product's code.

## 2. Scan at checkout

For each completed scan, call:

```http
GET /api/v1/merchant/in-store-sales/products/by-barcode?barcode=0012345678905
Authorization: Bearer <merchant-or-staff-token>
```

Build query strings with URLSearchParams or your HTTP client's query option so
characters such as `+`, `#`, `&`, and `%` are correctly encoded. Do not send a
merchantId: the pharmacy is taken from the authenticated token. The user needs
`sales.create` permission; `products.view` alone is insufficient.

Successful response:

```json
{
  "status": 200,
  "message": "Barcode product retrieved successfully",
  "data": {
    "id": "<product-uuid>",
    "productId": "<same-product-uuid>",
    "name": "Example medicine",
    "barcode": "0012345678905",
    "unitPrice": 1500,
    "vat": 112.5,
    "discountPercentage": 10,
    "totalUnitPrice": 1462.5,
    "inventory": 20,
    "minQuantity": 1,
    "maxQuantity": 100,
    "requiresPrescription": false,
    "imageUrl": null
  }
}
```

The response also includes `sku`, `brand`, and `category`, as in the existing
product picker. Prices are in naira. `totalUnitPrice` already includes the
product discount and VAT: do not apply those to it again.

Handle lookup errors without adding a line:

| HTTP status | Action |
| --- | --- |
| 400 | Show invalid/missing barcode input. |
| 401 | Restore the user's login session. |
| 403 | Explain that the user cannot create in-store sales. |
| 404 | Show “Barcode not found in this pharmacy”; offer manual product search. A manager can link a barcode through product edit. |
| 409 | Show that the matching product is inactive or out of stock. |
| Network/5xx | Keep the basket and allow retry. |

## 3. Keep the sale basket in the frontend

- On Enter in the scan field, prevent normal form submission, capture the
  complete code, and clear the field ready for the next scan.
- Add the returned `productId` with quantity 1. If it is already in the basket,
  increment its quantity instead of creating another line.
- Preserve every scan: do not debounce or deduplicate identical scans. Queue
  requests or use safe state updates so fast scans cannot overwrite quantities.
- Keep the scanner field ready for the next item, while allowing deliberate
  editing of customer details and quantities. Do not intercept typing in other
  form fields or confirm payment on the scanner's Enter key.
- Check the selected quantity against available inventory, show any applicable
  order limits, and allow removing/editing basket lines.
- Scanning changes no stock and creates no sale on the backend.

Manual product search remains available through:
`GET /api/v1/merchant/in-store-sales/products?search=...`.
It supports product name, brand, SKU, and exact barcode matching. Use the dedicated
barcode endpoint for a scan, since general search can return multiple matches.

## 4. Complete the existing in-store sale

After the cashier confirms payment, submit the basket to the existing endpoint:

```http
POST /api/v1/merchant/in-store-sales
Authorization: Bearer <token>
Content-Type: application/json
Idempotency-Key: <unique-id-for-this-sale>
```

```json
{
  "items": [
    { "productId": "<product-uuid>", "quantity": 2 }
  ],
  "customerName": "Walk-in Customer",
  "paymentStatus": "paid",
  "deliveryStatus": "delivered"
}
```

Use product IDs, not barcode values, in this request. Reuse the same idempotency
key only when retrying that same sale. The backend rechecks current prices,
product ownership, availability, and stock when recording the sale. Handle a
stock conflict without losing the basket. This records the cashier's payment
status; it does not charge a bank card or POS terminal.

Stock is deducted through this existing sale-creation flow, never by lookup.
Direct in-store sales have no online platform service charge. Show the saved
sale's returned total and earnings breakdown on the receipt/details view.

## Backend rollout and verification

Restart the merchant service after deployment to add the nullable barcode column
and the unique pharmacy/barcode index. No catalogue backfill is required. A fresh
development database also receives the column/index through model sync.

Run `npm run test:barcode --workspace=merchant` for local tests. These use mocked
data and a local HTTP server; no live database, payments, or physical scanner is
used. The frontend must also verify real scanner focus, Enter handling, rapid
repeated scans, and the full cashier workflow on the intended hardware.
