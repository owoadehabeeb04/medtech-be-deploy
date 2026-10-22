import { Router } from "express";
import { requirePermission } from "../../middlewares/permission.middleware";
import { audit } from "../team/Audit.service";
import { listMyReviews, replyToReview } from "./PharmacyReview.controller";

const router: Router = Router();

router.get("/", requirePermission("reviews.view"), listMyReviews);
router.post("/:reviewId/reply", requirePermission("reviews.reply"), audit("review.replied"), replyToReview);

export default router;
