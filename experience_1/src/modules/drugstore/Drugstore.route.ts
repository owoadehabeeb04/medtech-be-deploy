import express from "express";
import multer from "multer";
import Auth from "../../middlewares/Auth.Middleware";
import { AUTH_ROLE } from "../../constants/constant";
import { requireRole } from "../../middlewares/role.middleware";
import {
	addCartItem,
	cancelOrder,
	checkProductAvailability,
	confirmOrderPayment,
	createAddress,
	createOrder,
	deleteAddress,
	getActiveCart,
	getCatalogBrands,
	getCatalogCategories,
	getCatalogProduct,
	getCatalogProducts,
	getOrderById,
	getPharmacyProfile,
	getPharmacyReviews,
	getProductOrderLimits,
	getPrescriptionById,
	getTopSellingProducts,
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
import { confirmDrugstoreWalletFunding, fundDrugstoreWallet, getDrugstoreWallet, listDrugstoreWalletTransactions } from "./DrugstoreWallet.controller";
import { deleteSavedCard, listSavedCards } from "./DrugstoreSavedCard.controller";
import { getCategoryGroup, listCategoryGroups } from "./DrugstoreCategoryGroup.controller";
import { setDefaultAddress } from "./DrugstoreAddressDefault.controller";
import { getTimeSlots } from "./DrugstoreTimeSlots.controller";

const router = express.Router();
const verifyToken = Auth.verifyToken();
const allowConsumerAndDoctor = requireRole(AUTH_ROLE.CONSUMER, AUTH_ROLE.DOCTOR);
const upload = multer({ storage: multer.memoryStorage() });

router.get("/pharmacies/nearby", verifyToken, allowConsumerAndDoctor, listNearbyPharmacies);
router.get("/pharmacies/:merchantId", verifyToken, allowConsumerAndDoctor, getPharmacyProfile);
router.get("/pharmacies/:merchantId/reviews", verifyToken, allowConsumerAndDoctor, getPharmacyReviews);

router.get("/categories", verifyToken, allowConsumerAndDoctor, listCategoryGroups);
router.get("/categories/:slug", verifyToken, allowConsumerAndDoctor, getCategoryGroup);

router.get("/catalog/top-selling", verifyToken, allowConsumerAndDoctor, getTopSellingProducts);
router.get("/catalog/brands", verifyToken, allowConsumerAndDoctor, getCatalogBrands);
router.get("/catalog/products", verifyToken, allowConsumerAndDoctor, getCatalogProducts);
router.get("/catalog/products/:productId/availability", verifyToken, allowConsumerAndDoctor, checkProductAvailability);
router.get("/catalog/products/:productId/order-limits", verifyToken, allowConsumerAndDoctor, getProductOrderLimits);
router.get("/catalog/products/:productId", verifyToken, allowConsumerAndDoctor, getCatalogProduct);
router.get("/catalog/categories", verifyToken, allowConsumerAndDoctor, getCatalogCategories);
router.post("/catalog/discounts/validate", verifyToken, allowConsumerAndDoctor, validateCatalogDiscount);

router.get("/time-slots", verifyToken, allowConsumerAndDoctor, getTimeSlots);

router.get("/addresses", verifyToken, allowConsumerAndDoctor, listAddresses);
router.post("/addresses", verifyToken, allowConsumerAndDoctor, createAddress);
router.patch("/addresses/:addressId", verifyToken, allowConsumerAndDoctor, updateAddress);
router.patch("/addresses/:addressId/default", verifyToken, allowConsumerAndDoctor, setDefaultAddress);
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

router.get("/wallet", verifyToken, allowConsumerAndDoctor, getDrugstoreWallet);
router.post("/wallet/fund", verifyToken, allowConsumerAndDoctor, fundDrugstoreWallet);
router.post("/wallet/confirm-funding", verifyToken, allowConsumerAndDoctor, confirmDrugstoreWalletFunding);
router.get("/wallet/transactions", verifyToken, allowConsumerAndDoctor, listDrugstoreWalletTransactions);

router.get("/payment-methods", verifyToken, allowConsumerAndDoctor, listSavedCards);
router.delete("/payment-methods/:cardId", verifyToken, allowConsumerAndDoctor, deleteSavedCard);

router.get("/internal/prescriptions", internalAuthMiddleware, listMerchantPrescriptionQueue);
router.post("/internal/prescriptions/:prescriptionId/review", internalAuthMiddleware, reviewPrescriptionForMerchant);
router.post("/internal/orders/status-sync", internalAuthMiddleware, syncMerchantOrderStatus);

export default router;
