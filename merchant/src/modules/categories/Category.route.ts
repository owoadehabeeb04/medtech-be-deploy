import { Router } from "express";
import { requireAnyPermission } from "../../middlewares/permission.middleware";
import GetCategoriesController from "./controllers/GetCategories.controller";
import GetCategoryController from "./controllers/GetCategory.controller";
import SearchCategoriesController from "./controllers/SearchCategories.controller";

const categoryRouter: Router = Router();

// Static routes FIRST
categoryRouter.get("/", requireAnyPermission("products.view", "discounts.manage"), GetCategoriesController);
categoryRouter.get("/search", requireAnyPermission("products.view", "discounts.manage"), SearchCategoriesController);

// UUID-only dynamic routes
const UUID =
  ":categoryId([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})";

categoryRouter.get(`/${UUID}`, requireAnyPermission("products.view", "discounts.manage"), GetCategoryController);

export default categoryRouter;
