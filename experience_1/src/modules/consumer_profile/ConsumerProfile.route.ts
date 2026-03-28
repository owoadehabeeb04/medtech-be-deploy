import express, { RequestHandler } from "express";
import multer from "multer";
import Auth from "../../middlewares/Auth.Middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { AUTH_ROLE } from "../../constants/constant";
import { ERR_USER } from "../../constants/error-codes";
import {
	createConsumerProfile,
	getConsumerProfile,
	skipConsumerProfile,
	uploadConsumerProfileImage,
	updateConsumerProfile,
} from "./ConsumerProfile.controller";

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
const uploadConsumerProfileImageFile: RequestHandler = (req, res, next) => {
	upload.single("file")(req, res, (err: any) => {
		if (!err) return next();
		const { manageApplicationErrors, errorCode } = req.context;
		return next(
			manageApplicationErrors({
				message: err.message || "Profile image upload failed",
				statusCode: 400,
				errorCode: errorCode(ERR_USER, "405A"),
			})
		);
	});
};

router.use(verifyToken, requireRole(AUTH_ROLE.CONSUMER));
router.post("/profile", createConsumerProfile);
router.patch("/profile", updateConsumerProfile);
router.get("/profile", getConsumerProfile);
router.post("/profile/image/upload", uploadConsumerProfileImageFile, uploadConsumerProfileImage);
router.post("/profile/skip", skipConsumerProfile);

export default router;
