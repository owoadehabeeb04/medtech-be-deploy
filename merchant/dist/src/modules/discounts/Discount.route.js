"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const GetDiscounts_controller_1 = __importDefault(require("./controllers/GetDiscounts.controller"));
const GetDiscount_controller_1 = __importDefault(require("./controllers/GetDiscount.controller"));
const CreateDiscount_controller_1 = __importDefault(require("./controllers/CreateDiscount.controller"));
const UpdateDiscount_controller_1 = __importDefault(require("./controllers/UpdateDiscount.controller"));
const DeleteDiscount_controller_1 = __importDefault(require("./controllers/DeleteDiscount.controller"));
const ValidateDiscount_controller_1 = __importDefault(require("./controllers/ValidateDiscount.controller"));
const GetDiscountStats_controller_1 = __importDefault(require("./controllers/GetDiscountStats.controller"));
const RestoreDiscount_controller_1 = __importDefault(require("./controllers/RestoreDiscount.controller"));
const discountRouter = (0, express_1.Router)();
// Static routes FIRST
discountRouter.get("/", GetDiscounts_controller_1.default);
discountRouter.get("/stats", GetDiscountStats_controller_1.default);
discountRouter.post("/validate", ValidateDiscount_controller_1.default);
// UUID-only dynamic routes
const UUID = ":discountId([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})";
discountRouter.get(`/${UUID}`, GetDiscount_controller_1.default);
discountRouter.post("/", CreateDiscount_controller_1.default);
discountRouter.patch(`/${UUID}`, UpdateDiscount_controller_1.default);
discountRouter.delete(`/${UUID}`, DeleteDiscount_controller_1.default);
discountRouter.post(`/${UUID}/restore`, RestoreDiscount_controller_1.default);
exports.default = discountRouter;
