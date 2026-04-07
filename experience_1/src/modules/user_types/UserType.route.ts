import express from "express";
import { createUserType, deleteUserType, getAllUserTypes, getUserTypeById, updateUserType } from "./UserType.controller";
import Auth from "../../middlewares/Auth.Middleware";
import PermissionMiddleware from "../../middlewares/permission.middleware";
const verifyToken = Auth.verifyToken();
const hasPermission = PermissionMiddleware.hasPermission;

const router = express.Router();

router.use(verifyToken);
router.post("/create", createUserType);
router.get("/all", getAllUserTypes);
router.get("/id/:userTypeId", getUserTypeById);
router.post("/update", updateUserType);
router.delete("/delete/:userTypeId", deleteUserType);

export default router;
