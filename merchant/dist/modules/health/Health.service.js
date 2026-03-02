"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthService = void 0;
const http_status_1 = require("http-status");
const response_1 = require("../../constants/response");
const db_1 = __importDefault(require("../../core/db"));
class HealthService {
    static checkApp() {
        return __awaiter(this, void 0, void 0, function* () {
            return { status: "up" };
        });
    }
    static checkDb() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const sequelize = yield (0, db_1.default)();
                yield sequelize.authenticate();
                return { status: "up" };
            }
            catch (err) {
                const message = err instanceof Error ? err.message : "Unknown error";
                return { status: "down", error: message };
            }
        });
    }
    static checkAll() {
        return __awaiter(this, void 0, void 0, function* () {
            const [app, db] = yield Promise.all([this.checkApp(), this.checkDb()]);
            const isHealthy = app.status === "up" && db.status === "up";
            return {
                status: isHealthy,
                code: isHealthy ? http_status_1.OK : http_status_1.SERVICE_UNAVAILABLE,
                message: isHealthy ? response_1.RESPONSE_MESSAGES.HEALTH_CHECK_PASSED : "One or more services are down",
                data: { app, db },
            };
        });
    }
}
exports.HealthService = HealthService;
