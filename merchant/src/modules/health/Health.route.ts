import express from "express";
import * as HealthController from "./Health.controller";

const router: express.Router = express.Router();

router.get("/", HealthController.healthCheck);

export default router;
