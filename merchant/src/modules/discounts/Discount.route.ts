import { Router } from "express";
import { requirePermission, requireAnyPermission } from "../../middlewares/permission.middleware";
import { audit } from "../team/Audit.service";
import GetDiscountsController from "./controllers/GetDiscounts.controller";
import GetDiscountController from "./controllers/GetDiscount.controller";
import CreateDiscountController from "./controllers/CreateDiscount.controller";
import UpdateDiscountController from "./controllers/UpdateDiscount.controller";
import DeleteDiscountController from "./controllers/DeleteDiscount.controller";
import ValidateDiscountController from "./controllers/ValidateDiscount.controller";
import GetDiscountStatsController from "./controllers/GetDiscountStats.controller";
import RestoreDiscountController from "./controllers/RestoreDiscount.controller";

const discountRouter: Router = Router();

// Static routes FIRST
discountRouter.get("/", requirePermission("discounts.view"), GetDiscountsController);
discountRouter.get("/stats", requirePermission("discounts.view"), GetDiscountStatsController);
discountRouter.post("/validate", requireAnyPermission("discounts.view", "sales.create"), ValidateDiscountController);

// UUID-only dynamic routes
const UUID =
  ":discountId([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})";

discountRouter.get(`/${UUID}`, requirePermission("discounts.view"), GetDiscountController);
discountRouter.post("/", requirePermission("discounts.manage"), audit("discount.created"), CreateDiscountController);
discountRouter.patch(`/${UUID}`, requirePermission("discounts.manage"), audit("discount.updated"), UpdateDiscountController);
discountRouter.delete(`/${UUID}`, requirePermission("discounts.manage"), audit("discount.deleted"), DeleteDiscountController);
discountRouter.post(`/${UUID}/restore`, requirePermission("discounts.manage"), audit("discount.restored"), RestoreDiscountController);

export default discountRouter;
