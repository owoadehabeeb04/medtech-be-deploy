import { Router } from "express";
import {
  getDistinctBrands,
  getPharmacyProfile,
  getPharmacyReviews,
  getProduct,
  getTopSellingProducts,
  listCategories,
  listNearbyPharmacies,
  listProducts,
  reflectOrder,
  validateDiscount,
} from "./DrugstoreInternal.controller";

const router = Router();

// Registered outside /products/* on purpose: a route handler here signals completion by calling
// next() (a later global middleware renders res.response), so Express will keep matching further
// routes on the same path — /products/top-selling would otherwise also match /products/:productId
// (with productId="top-selling") and fall through into getProduct, which fails on a missing merchantId.
router.get("/top-selling-products", getTopSellingProducts);
router.get("/product-brands", getDistinctBrands);
router.get("/products", listProducts);
router.get("/products/:productId", getProduct);
router.get("/categories", listCategories);
// Registered outside /pharmacies/* on purpose — same reason as /top-selling-products above:
// this handler completes via next() rather than ending the response, so /pharmacies/nearby would
// otherwise also match /pharmacies/:merchantId (merchantId="nearby") and clobber the real response.
router.get("/nearby-pharmacies", listNearbyPharmacies);
router.get("/pharmacies/:merchantId", getPharmacyProfile);
router.get("/pharmacies/:merchantId/reviews", getPharmacyReviews);
router.post("/discounts/validate", validateDiscount);
router.post("/orders/reflect", reflectOrder);

export default router;
