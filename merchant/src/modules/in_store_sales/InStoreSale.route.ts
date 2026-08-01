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

router.get("/products", listInStoreSaleProducts);

router.get("/export.csv", exportInStoreSalesCsv);

router.get("/", listInStoreSales);

router.post("/", createInStoreSale);

router.post("/:orderId/cancel", cancelInStoreSale);

router.post("/:orderId/return", returnInStoreSale);

router.post("/:orderId/refund", refundInStoreSale);

router.get("/:orderId", getInStoreSaleById);

export default router;
