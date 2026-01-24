import { Router } from "express";
import ContactSupportController from "./controllers/ContactSupport.controller";

const supportRouter: Router = Router();

supportRouter.post("/contact", ContactSupportController);

export default supportRouter;
