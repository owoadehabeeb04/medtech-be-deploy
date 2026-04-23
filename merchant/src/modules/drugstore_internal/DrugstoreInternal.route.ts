import { Router } from "express";
import {
  getPharmacyProfile,
  getPharmacyReviews,
  getProduct,
  listCategories,
  listNearbyPharmacies,
  listProducts,
  reflectOrder,
  validateDiscount,
} from "./DrugstoreInternal.controller";

const router = Router();

router.get("/products", listProducts);
router.get("/products/:productId", getProduct);
router.get("/categories", listCategories);
router.get("/pharmacies/nearby", listNearbyPharmacies);
router.get("/pharmacies/:merchantId", getPharmacyProfile);
router.get("/pharmacies/:merchantId/reviews", getPharmacyReviews);
router.post("/discounts/validate", validateDiscount);
router.post("/orders/reflect", reflectOrder);

export default router;
