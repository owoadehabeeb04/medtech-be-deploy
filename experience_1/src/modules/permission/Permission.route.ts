import express from "express";
import { createPermission } from "./controllers/CreatePermission.controller";
import { getAllPermissions } from "./controllers/GetAllPermission.controller";
import { assignPermissionsToUserType } from "./controllers/AssignPermissionsToUserType.controller";
import { getUserTypePermissions } from "./controllers/GetUserTypePermissions.controller";
import { bulkCreatePermission } from "./controllers/BulkCreatePermission.controller";
import { removePermissionsFromUserType } from "./controllers/RemovePermissionsFromUserType.controller";
import { bulkAssignPermission } from "./controllers/BulkAssignPermission.controller";
import Auth from "../../middlewares/Auth.Middleware";
import PermissionMiddleware from "../../middlewares/permission.middleware";
const verifyToken = Auth.verifyToken();
const hasPermission = PermissionMiddleware.hasPermission;

const router = express.Router();

router.use(verifyToken);
router.post("/create", createPermission);
router.post("/bulk-create", bulkCreatePermission);
router.get("/all", getAllPermissions);
router.post("/assign", assignPermissionsToUserType);
router.post("/bulk-assign", bulkAssignPermission);
router.post("/remove", removePermissionsFromUserType);
router.get("/user-type/:userTypeId", getUserTypePermissions);

export default router;
