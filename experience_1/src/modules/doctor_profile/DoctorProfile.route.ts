import express, { RequestHandler } from "express";
import multer from "multer";
import Auth from "../../middlewares/Auth.Middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { AUTH_ROLE } from "../../constants/constant";
import { ERR_USER } from "../../constants/error-codes";
import {
	completeDoctorOnboarding,
	createDoctorBasicProfile,
	createDoctorEducation,
	createDoctorSpecialties,
	createDoctorWorkHistory,
	deleteDoctorEducation,
	deleteDoctorWorkHistory,
	getDoctorProfile,
	getDoctorProfileMe,
	listDoctorEducationHistory,
	listDoctorWorkHistory,
	updateDoctorAccount,
	updateDoctorAddress,
	updateDoctorBasicProfile,
	updateDoctorEducation,
	updateDoctorImage,
	updateDoctorSpecialties,
	updateDoctorWorkHistory,
} from "./DoctorProfile.controller";

const router = express.Router();
const verifyToken = Auth.verifyToken();
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (_req, file, callback) => {
		const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
		if (!allowedTypes.includes(file.mimetype)) {
			return callback(new Error("Only jpeg, jpg, png, and webp images are allowed"));
		}
		callback(null, true);
	},
});
const uploadDoctorProfileImageFile: RequestHandler = (req, res, next) => {
	upload.single("file")(req, res, (err: any) => {
		if (!err) return next();
		const { manageApplicationErrors, errorCode } = req.context;
		return next(
			manageApplicationErrors({
				message: err.message || "Profile image upload failed",
				statusCode: 400,
				errorCode: errorCode(ERR_USER, "504A"),
			})
		);
	});
};

router.use(verifyToken, requireRole(AUTH_ROLE.DOCTOR));
router.get("/profile/me", getDoctorProfileMe);
router.patch("/profile/account", updateDoctorAccount);
router.post("/profile/basic", createDoctorBasicProfile);
router.patch("/profile/basic", updateDoctorBasicProfile);
router.post("/profile/image", uploadDoctorProfileImageFile, updateDoctorImage);
router.post("/profile/address", updateDoctorAddress);
router.patch("/profile/address", updateDoctorAddress);
router.get("/profile/education", listDoctorEducationHistory);
router.post("/profile/education", createDoctorEducation);
router.patch("/profile/education/:educationId", updateDoctorEducation);
router.delete("/profile/education/:educationId", deleteDoctorEducation);
router.get("/profile/work-history", listDoctorWorkHistory);
router.post("/profile/work-history", createDoctorWorkHistory);
router.patch("/profile/work-history/:workId", updateDoctorWorkHistory);
router.delete("/profile/work-history/:workId", deleteDoctorWorkHistory);
router.post("/profile/specialties", createDoctorSpecialties);
router.patch("/profile/specialties", updateDoctorSpecialties);
router.post("/profile/complete-onboarding", completeDoctorOnboarding);
router.get("/profile", getDoctorProfile);

export default router;
