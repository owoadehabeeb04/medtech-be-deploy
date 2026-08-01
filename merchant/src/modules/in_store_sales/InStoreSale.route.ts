import { Router } from "express";
import {
  createInStoreSale,
  cancelInStoreSale,
  exportInStoreSalesCsv,
  getInStoreSaleById,
  listInStoreSaleProducts,
  listInStoreSales,
  refundInStoreSale,
  returnInStoreSale,
} from "./InStoreSale.controller";

const router = Router();

// Static paths must be registered before /:orderId.

/**
 * @swagger
 * /api/v1/merchant/in-store-sales/products:
 *   get:
 *     summary: List products available for an in-store sale
 *     tags: [In-Store Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Product name, brand, or SKU search text
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *     responses:
 *       200:
 *         description: In-stock active products
 *       400:
 *         description: Invalid search or limit
 *       401:
 *         description: Authentication required
 */
router.get("/products", listInStoreSaleProducts);

/**
 * @swagger
 * /api/v1/merchant/in-store-sales/export.csv:
 *   get:
 *     summary: Export in-store sales as CSV
 *     tags: [In-Store Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [pending, paid, failed]
 *       - in: query
 *         name: deliveryStatus
 *         schema:
 *           type: string
 *           enum: [pending, picked_up, in_transit, delivered, completed, cancelled]
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [date, amount, createdAt]
 *       - in: query
 *         name: sortDirection
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: CSV export generated in database batches
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid filter or sort parameter
 *       401:
 *         description: Authentication required
 */
router.get("/export.csv", exportInStoreSalesCsv);

/**
 * @swagger
 * /api/v1/merchant/in-store-sales:
 *   get:
 *     summary: List in-store sales
 *     tags: [In-Store Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, maximum: 100000, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: paymentStatus
 *         schema: { type: string, enum: [pending, paid, failed] }
 *       - in: query
 *         name: deliveryStatus
 *         schema: { type: string, enum: [pending, picked_up, in_transit, delivered, completed, cancelled] }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [date, amount, createdAt] }
 *       - in: query
 *         name: sortDirection
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: Paginated in-store sales
 *       400:
 *         description: Invalid filter, sort, or pagination value
 *       401:
 *         description: Authentication required
 */
router.get("/", listInStoreSales);

/**
 * @swagger
 * /api/v1/merchant/in-store-sales:
 *   post:
 *     summary: Create an in-store sale
 *     tags: [In-Store Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: false
 *         schema:
 *           type: string
 *           maxLength: 255
 *         description: Reuse this key when retrying the same sale request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 50
 *                 items:
 *                   type: object
 *                   required: [productId, quantity]
 *                   properties:
 *                     productId: { type: string, format: uuid }
 *                     quantity: { type: integer, minimum: 1 }
 *               customerName: { type: string, maxLength: 255 }
 *               customerPhone: { type: string, maxLength: 50 }
 *               paymentStatus: { type: string, enum: [pending, paid, failed], default: paid }
 *               deliveryStatus: { type: string, enum: [pending, picked_up, in_transit, delivered, completed, cancelled], default: delivered }
 *               note: { type: string, maxLength: 2000 }
 *               idempotencyKey: { type: string, maxLength: 255 }
 *     responses:
 *       201:
 *         description: Sale created and inventory decremented
 *       400:
 *         description: Invalid sale payload
 *       401:
 *         description: Authentication required
 *       409:
 *         description: Insufficient stock or Idempotency-Key conflict
 */
router.post("/", createInStoreSale);

/**
 * @swagger
 * /api/v1/merchant/in-store-sales/{orderId}/cancel:
 *   post:
 *     summary: Cancel an in-store sale before completion
 *     description: Cancelling restores the sold quantities to inventory. If the sale was paid, record the resulting refund separately with the refund endpoint.
 *     tags: [In-Store Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *         description: Database UUID or human-facing IS-... sale ID
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema: { type: string, maxLength: 255 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason: { type: string, minLength: 3, maxLength: 500 }
 *               idempotencyKey: { type: string, maxLength: 255 }
 *     responses:
 *       200:
 *         description: Sale cancelled and inventory restored
 *       400:
 *         description: Missing idempotency key or invalid reason
 *       404:
 *         description: Sale not found for this merchant
 *       409:
 *         description: Sale is already cancelled, completed, or the key conflicts with another request
 */
router.post("/:orderId/cancel", cancelInStoreSale);

/**
 * @swagger
 * /api/v1/merchant/in-store-sales/{orderId}/return:
 *   post:
 *     summary: Record a full or partial return for an in-store sale
 *     description: A resalable item is put back into inventory. A damaged item is recorded as returned but is not put back into sellable stock. Paid items create a refundable balance.
 *     tags: [In-Store Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *         description: Database UUID or human-facing IS-... sale ID
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema: { type: string, maxLength: 255 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items, reason]
 *             properties:
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 50
 *                 items:
 *                   type: object
 *                   required: [orderItemId, quantity, condition]
 *                   properties:
 *                     orderItemId: { type: string, format: uuid }
 *                     quantity: { type: integer, minimum: 1 }
 *                     condition: { type: string, enum: [resalable, damaged] }
 *               reason: { type: string, minLength: 3, maxLength: 500 }
 *               idempotencyKey: { type: string, maxLength: 255 }
 *     responses:
 *       200:
 *         description: Return recorded and any resalable inventory restored
 *       400:
 *         description: Invalid return payload
 *       404:
 *         description: Sale or order item not found
 *       409:
 *         description: Sale is not completed, quantity exceeds the remaining returnable quantity, or the key conflicts
 */
router.post("/:orderId/return", returnInStoreSale);

/**
 * @swagger
 * /api/v1/merchant/in-store-sales/{orderId}/refund:
 *   post:
 *     summary: Record a manual refund for an in-store sale
 *     description: Records a cash, POS, bank-transfer, or other manual refund against the refundable balance. This endpoint does not call a payment provider.
 *     tags: [In-Store Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *         description: Database UUID or human-facing IS-... sale ID
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema: { type: string, maxLength: 255 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [method]
 *             properties:
 *               amount: { type: number, format: double, minimum: 0.01, example: 2500.00 }
 *               method: { type: string, enum: [cash, pos, bank_transfer, other] }
 *               reference: { type: string, maxLength: 255, description: Required unless method is cash }
 *               note: { type: string, maxLength: 500 }
 *               idempotencyKey: { type: string, maxLength: 255 }
 *     responses:
 *       200:
 *         description: Refund recorded against the sale
 *       400:
 *         description: Invalid amount, method, reference, or idempotency key
 *       404:
 *         description: Sale not found for this merchant
 *       409:
 *         description: No refundable balance, amount exceeds the balance, unpaid sale, or key conflict
 */
router.post("/:orderId/refund", refundInStoreSale);

/**
 * @swagger
 * /api/v1/merchant/in-store-sales/{orderId}:
 *   get:
 *     summary: Get one in-store sale
 *     tags: [In-Store Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *         description: Database UUID or human-facing IS-... sale ID
 *     responses:
 *       200:
 *         description: Sale details, including cancellation, return, and refund resolution history
 *       404:
 *         description: Sale not found for this merchant
 *       401:
 *         description: Authentication required
 */
router.get("/:orderId", getInStoreSaleById);

export default router;
