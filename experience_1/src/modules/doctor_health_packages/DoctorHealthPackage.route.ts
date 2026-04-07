import express, { RequestHandler } from "express";
import multer from "multer";
import Auth from "../../middlewares/Auth.Middleware";
import { AUTH_ROLE } from "../../constants/constant";
import { ERR_USER } from "../../constants/error-codes";
import { requireRole } from "../../middlewares/role.middleware";
import {
	createDoctorHealthPackage,
	deleteDoctorHealthPackage,
	getDoctorHealthPackageDetails,
	listDoctorHealthPackages,
	updateDoctorHealthPackage,
} from "./DoctorHealthPackage.controller";

const router = express.Router();
const verifyToken = Auth.verifyToken();
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (_req, file, callback) => {
		const coverImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
		const attachmentTypes = [
			"application/pdf",
			"application/msword",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		];
		const allowedTypes = file.fieldname === "coverImage" ? coverImageTypes : attachmentTypes;
		if (!allowedTypes.includes(file.mimetype)) {
			return callback(
				new Error(
					file.fieldname === "coverImage"
						? "Cover image must be jpg, jpeg, png, or webp"
						: "Attachment must be pdf, doc, or docx"
				)
			);
		}
		callback(null, true);
	},
});

const uploadDoctorHealthPackageFiles: RequestHandler = (req, res, next) => {
	upload.fields([
		{ name: "coverImage", maxCount: 1 },
		{ name: "attachment", maxCount: 1 },
	])(req, res, (err: any) => {
		if (!err) return next();
		const { manageApplicationErrors, errorCode } = req.context;
		return next(
			manageApplicationErrors({
				message: err.message || "Health package upload failed",
				statusCode: 400,
				errorCode: errorCode(ERR_USER, "626A"),
			})
		);
	});
};

router.use(verifyToken, requireRole(AUTH_ROLE.DOCTOR));
router.get("/health-packages", listDoctorHealthPackages);
router.post("/health-packages", uploadDoctorHealthPackageFiles, createDoctorHealthPackage);
router.get("/health-packages/:packageId", getDoctorHealthPackageDetails);
router.patch("/health-packages/:packageId", uploadDoctorHealthPackageFiles, updateDoctorHealthPackage);
router.delete("/health-packages/:packageId", deleteDoctorHealthPackage);

export default router;
