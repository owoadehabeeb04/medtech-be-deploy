import { Router } from "express";
import {
  createInvitation,
  createRole,
  deleteRole,
  getPermissionCatalog,
  getPharmacyCode,
  listAuditLogs,
  listInvitations,
  listMembers,
  listRoles,
  regeneratePharmacyCode,
  removeMember,
  resendInvitation,
  revokeInvitation,
  setPharmacyCode,
  updateMember,
  updateRole,
} from "./Team.controller";
import { ownerOnly, requireAnyPermission, requirePermission } from "../../middlewares/permission.middleware";

const router: Router = Router();

router.get("/permissions", requireAnyPermission("staff.view", "staff.manage", "roles.manage"), getPermissionCatalog);

router.get("/roles", requirePermission("staff.view"), listRoles);
router.post("/roles", requirePermission("roles.manage"), createRole);
router.patch("/roles/:roleId", requirePermission("roles.manage"), updateRole);
router.delete("/roles/:roleId", requirePermission("roles.manage"), deleteRole);

router.get("/members", requirePermission("staff.view"), listMembers);
router.patch("/members/:memberId", requirePermission("staff.manage"), updateMember);
router.delete("/members/:memberId", requirePermission("staff.manage"), removeMember);

router.get("/invitations", requirePermission("staff.view"), listInvitations);
router.post("/invitations", requirePermission("staff.manage"), createInvitation);
router.delete("/invitations/:invitationId", requirePermission("staff.manage"), revokeInvitation);
router.post("/invitations/:invitationId/resend", requirePermission("staff.manage"), resendInvitation);

router.get("/audit-logs", requirePermission("audit.view"), listAuditLogs);

router.get("/pharmacy-code", requirePermission("staff.manage"), getPharmacyCode);
router.put("/pharmacy-code", ownerOnly(), setPharmacyCode);
router.post("/pharmacy-code/regenerate", ownerOnly(), regeneratePharmacyCode);

export default router;
