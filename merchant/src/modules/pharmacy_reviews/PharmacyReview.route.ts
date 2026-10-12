import { Router } from "express";
import { listMyReviews, replyToReview } from "./PharmacyReview.controller";

const router: Router = Router();

router.get("/", listMyReviews);
router.post("/:reviewId/reply", replyToReview);

export default router;
