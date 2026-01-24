import { Router } from "express";
import GetCategoriesController from "./controllers/GetCategories.controller";
import GetCategoryController from "./controllers/GetCategory.controller";
import CreateCategoryController from "./controllers/CreateCategory.controller";
import UpdateCategoryController from "./controllers/UpdateCategory.controller";
import DeleteCategoryController from "./controllers/DeleteCategory.controller";
import RestoreCategoryController from "./controllers/RestoreCategory.controller";

const categoryRouter: Router = Router();

// Static routes FIRST
categoryRouter.get("/", GetCategoriesController);
categoryRouter.post("/", CreateCategoryController);

// UUID-only dynamic routes
const UUID =
  ":categoryId([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})";

categoryRouter.get(`/${UUID}`, GetCategoryController);
categoryRouter.patch(`/${UUID}`, UpdateCategoryController);
categoryRouter.delete(`/${UUID}`, DeleteCategoryController);
categoryRouter.post(`/${UUID}/restore`, RestoreCategoryController);

export default categoryRouter;
