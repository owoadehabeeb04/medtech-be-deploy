"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const GetCategories_controller_1 = __importDefault(require("./controllers/GetCategories.controller"));
const GetCategory_controller_1 = __importDefault(require("./controllers/GetCategory.controller"));
const CreateCategory_controller_1 = __importDefault(require("./controllers/CreateCategory.controller"));
const UpdateCategory_controller_1 = __importDefault(require("./controllers/UpdateCategory.controller"));
const DeleteCategory_controller_1 = __importDefault(require("./controllers/DeleteCategory.controller"));
const RestoreCategory_controller_1 = __importDefault(require("./controllers/RestoreCategory.controller"));
const categoryRouter = (0, express_1.Router)();
// Static routes FIRST
categoryRouter.get("/", GetCategories_controller_1.default);
categoryRouter.post("/", CreateCategory_controller_1.default);
// UUID-only dynamic routes
const UUID = ":categoryId([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})";
categoryRouter.get(`/${UUID}`, GetCategory_controller_1.default);
categoryRouter.patch(`/${UUID}`, UpdateCategory_controller_1.default);
categoryRouter.delete(`/${UUID}`, DeleteCategory_controller_1.default);
categoryRouter.post(`/${UUID}/restore`, RestoreCategory_controller_1.default);
exports.default = categoryRouter;
