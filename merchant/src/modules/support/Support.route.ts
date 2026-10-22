import { Router } from "express";
import { anyMember } from "../../middlewares/permission.middleware";
import ContactSupportController from "./controllers/ContactSupport.controller";

const supportRouter: Router = Router();

supportRouter.post("/contact", anyMember(), ContactSupportController);

export default supportRouter;
