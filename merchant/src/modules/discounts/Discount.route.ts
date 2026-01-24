import { Router } from "express";
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
discountRouter.get("/", GetDiscountsController);
discountRouter.get("/stats", GetDiscountStatsController);
discountRouter.post("/validate", ValidateDiscountController);

// UUID-only dynamic routes
const UUID =
  ":discountId([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})";

discountRouter.get(`/${UUID}`, GetDiscountController);
discountRouter.post("/", CreateDiscountController);
discountRouter.patch(`/${UUID}`, UpdateDiscountController);
discountRouter.delete(`/${UUID}`, DeleteDiscountController);
discountRouter.post(`/${UUID}/restore`, RestoreDiscountController);

export default discountRouter;
