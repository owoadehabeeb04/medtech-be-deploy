import express from "express";
import multer from "multer";
import Auth from "../../middlewares/Auth.Middleware";
import { AUTH_ROLE } from "../../constants/constant";
import { requireRole } from "../../middlewares/role.middleware";
import {
	addCartItem,
	cancelOrder,
	confirmOrderPayment,
	createAddress,
	createOrder,
	deleteAddress,
	getActiveCart,
	getCatalogCategories,
	getCatalogProduct,
	getCatalogProducts,
	getOrderById,
	getPharmacyProfile,
	getPharmacyReviews,
	getPrescriptionById,
	listAddresses,
	listMerchantPrescriptionQueue,
	listNearbyPharmacies,
	listOrders,
	listPrescriptions,
	removeCartItem,
	reviewPrescriptionForMerchant,
	submitPrescription,
	syncMerchantOrderStatus,
	updateAddress,
	updateCartItem,
	uploadPrescription,
	validateCatalogDiscount,
} from "./Drugstore.controller";
import { internalAuthMiddleware } from "../../middlewares/internal-auth.middleware";

const router = express.Router();
const verifyToken = Auth.verifyToken();
const allowConsumerAndDoctor = requireRole(AUTH_ROLE.CONSUMER, AUTH_ROLE.DOCTOR);
const upload = multer({ storage: multer.memoryStorage() });

router.get("/pharmacies/nearby", verifyToken, allowConsumerAndDoctor, listNearbyPharmacies);
router.get("/pharmacies/:merchantId", verifyToken, allowConsumerAndDoctor, getPharmacyProfile);
router.get("/pharmacies/:merchantId/reviews", verifyToken, allowConsumerAndDoctor, getPharmacyReviews);

router.get("/catalog/products", verifyToken, allowConsumerAndDoctor, getCatalogProducts);
router.get("/catalog/products/:productId", verifyToken, allowConsumerAndDoctor, getCatalogProduct);
router.get("/catalog/categories", verifyToken, allowConsumerAndDoctor, getCatalogCategories);
router.post("/catalog/discounts/validate", verifyToken, allowConsumerAndDoctor, validateCatalogDiscount);

router.get("/addresses", verifyToken, allowConsumerAndDoctor, listAddresses);
router.post("/addresses", verifyToken, allowConsumerAndDoctor, createAddress);
router.patch("/addresses/:addressId", verifyToken, allowConsumerAndDoctor, updateAddress);
router.delete("/addresses/:addressId", verifyToken, allowConsumerAndDoctor, deleteAddress);

router.post("/prescriptions/upload", verifyToken, allowConsumerAndDoctor, upload.single("file"), uploadPrescription);
router.post("/prescriptions/:prescriptionId/submit", verifyToken, allowConsumerAndDoctor, submitPrescription);
router.get("/prescriptions", verifyToken, allowConsumerAndDoctor, listPrescriptions);
router.get("/prescriptions/:prescriptionId", verifyToken, allowConsumerAndDoctor, getPrescriptionById);

router.get("/cart", verifyToken, allowConsumerAndDoctor, getActiveCart);
router.post("/cart/items", verifyToken, allowConsumerAndDoctor, addCartItem);
router.patch("/cart/items/:itemId", verifyToken, allowConsumerAndDoctor, updateCartItem);
router.delete("/cart/items/:itemId", verifyToken, allowConsumerAndDoctor, removeCartItem);

router.post("/orders", verifyToken, allowConsumerAndDoctor, createOrder);
router.post("/orders/:orderId/payment/confirm", verifyToken, allowConsumerAndDoctor, confirmOrderPayment);
router.get("/orders", verifyToken, allowConsumerAndDoctor, listOrders);
router.get("/orders/:orderId", verifyToken, allowConsumerAndDoctor, getOrderById);
router.post("/orders/:orderId/cancel", verifyToken, allowConsumerAndDoctor, cancelOrder);

router.get("/internal/prescriptions", internalAuthMiddleware, listMerchantPrescriptionQueue);
router.post("/internal/prescriptions/:prescriptionId/review", internalAuthMiddleware, reviewPrescriptionForMerchant);
router.post("/internal/orders/status-sync", internalAuthMiddleware, syncMerchantOrderStatus);

export default router;
