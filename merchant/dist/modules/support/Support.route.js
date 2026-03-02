"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ContactSupport_controller_1 = __importDefault(require("./controllers/ContactSupport.controller"));
const supportRouter = (0, express_1.Router)();
supportRouter.post("/contact", ContactSupport_controller_1.default);
exports.default = supportRouter;
