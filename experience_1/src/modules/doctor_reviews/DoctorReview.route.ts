import express from "express";
import Auth from "../../middlewares/Auth.Middleware";
import { AUTH_ROLE } from "../../constants/constant";
import { requireRole } from "../../middlewares/role.middleware";
import { createDoctorReviewReply, getDoctorReviews, getDoctorReviewSummary } from "./DoctorReview.controller";

const router = express.Router();
const verifyToken = Auth.verifyToken();

router.use(verifyToken, requireRole(AUTH_ROLE.DOCTOR));
router.get("/reviews", getDoctorReviews);
router.get("/reviews/summary", getDoctorReviewSummary);
router.post("/reviews/:reviewId/reply", createDoctorReviewReply);

export default router;
