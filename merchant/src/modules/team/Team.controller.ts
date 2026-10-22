import { NextFunction, Request, Response } from "express";
import Joi from "joi";
import { HttpException } from "@medtech/utils";
import { IMPLIED_PERMISSIONS, PERMISSION_GROUPS } from "../../constants/permissions";
import { TeamActor, TeamService } from "./Team.service";
import { TeamAuthService } from "./TeamAuth.service";
import { PharmacyCodeService } from "./PharmacyCode.service";
import { AuditService } from "./Audit.service";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const validate = <T>(schema: Joi.ObjectSchema, body: unknown): T => {
  const { error, value } = schema.validate(body || {}, { abortEarly: false, stripUnknown: true });
  if (error) throw new HttpException(400, error.details.map((detail) => detail.message).join(", "));
  return value as T;
};

const actorOf = (req: Request): TeamActor => {
  const user = req.context.user;
  if (!user) throw new HttpException(401, "Authentication required");
  return user as unknown as TeamActor;
};

const idParam = (req: Request, name: string, notFound: string) => {
  const value = String(req.params[name] || "");
  if (!UUID_PATTERN.test(value)) throw new HttpException(404, notFound);
  return value;
};

/** Wrap a handler: run it, send `{ message, data }`, and forward errors (HttpException keeps its status). */
const handle =
  (fn: (req: Request) => Promise<{ message: string; data?: unknown; status?: number }>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await fn(req);
      const statusCode = result.status || 200;
      res.status(statusCode);
      res.response = { statusCode, message: result.message, data: result.data };
      return next();
    } catch (error) {
      return next(error);
    }
  };

const roleBody = {
  name: Joi.string().trim().min(2).max(80),
  description: Joi.string().trim().max(255).allow("", null),
  permissions: Joi.array().items(Joi.string()).min(1),
};
const createRoleSchema = Joi.object({ ...roleBody, name: roleBody.name.required(), permissions: roleBody.permissions.required() });
const updateRoleSchema = Joi.object(roleBody).min(1);
const inviteSchema = Joi.object({ email: Joi.string().trim().email().required(), roleId: Joi.string().guid().required() });
const memberUpdateSchema = Joi.object({
  roleId: Joi.string().guid(),
  status: Joi.string().valid("active", "suspended"),
}).min(1);
const codeSchema = Joi.object({ code: Joi.string().trim().required() });
const switchSchema = Joi.object({ pharmacyId: Joi.string().guid().required() });
const profileSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(80),
  lastName: Joi.string().trim().min(1).max(80),
  phoneNumber: Joi.string().trim().min(7).max(20).allow("", null),
}).min(1);
const passwordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});
const selectSchema = Joi.object({ selectionToken: Joi.string().required(), memberId: Joi.string().guid().required() });
const acceptSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().trim().min(1).max(80),
  lastName: Joi.string().trim().min(1).max(80),
  phoneNumber: Joi.string().trim().min(7).max(20).allow("", null),
});

/**
 * @swagger
 * /api/v1/merchant/team/permissions:
 *   get:
 *     summary: "List the permission catalog"
 *     description: "Every permission a role can contain, grouped by area, for the role editor. The list is fixed in code; each pharmacy decides which roles exist and which of these they hold. `implies` shows permissions that come along automatically (e.g. products.manage includes products.view)."
 *     tags: ["Team"]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: "Permission catalog" }
 *       403: { description: "Needs staff.view, staff.manage or roles.manage" }
 */
export const getPermissionCatalog = handle(async () => ({
  message: "Permissions retrieved successfully",
  data: { groups: PERMISSION_GROUPS, implies: IMPLIED_PERMISSIONS },
}));

/**
 * @swagger
 * /api/v1/merchant/team/roles:
 *   get:
 *     summary: "List roles"
 *     description: "The pharmacy's own roles with how many members and pending invitations use each. Roles are not predefined; the owner creates them."
 *     tags: ["Team"]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: "Roles" }
 *       403: { description: "Needs staff.view" }
 *   post:
 *     summary: "Create a role"
 *     description: "Creates a role with any combination of catalog permissions. You can only grant permissions you hold yourself, and only the owner can include staff.manage or roles.manage."
 *     tags: ["Team"]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, permissions]
 *             properties:
 *               name: { type: string, example: "Sales attendant" }
 *               description: { type: string }
 *               permissions: { type: array, items: { type: string }, example: ["products.view", "sales.create", "sales.view_own"] }
 *     responses:
 *       201: { description: "Role created" }
 *       400: { description: "Unknown permission or invalid name" }
 *       403: { description: "Needs roles.manage, or you tried to grant more than you hold" }
 *       409: { description: "A role with that name already exists" }
 */
export const listRoles = handle(async (req) => ({
  message: "Roles retrieved successfully",
  data: await TeamService.listRoles(actorOf(req).id),
}));

export const createRole = handle(async (req) => ({
  status: 201,
  message: "Role created successfully",
  data: await TeamService.createRole(actorOf(req), validate(createRoleSchema, req.body)),
}));

/**
 * @swagger
 * /api/v1/merchant/team/roles/{roleId}:
 *   patch:
 *     summary: "Edit a role"
 *     description: "Rename a role or change its permissions. Takes effect for everyone holding the role on their next request. You can't edit your own role."
 *     tags: ["Team"]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: roleId, required: true, schema: { type: string, format: uuid } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               permissions: { type: array, items: { type: string } }
 *     responses:
 *       200: { description: "Role updated" }
 *       403: { description: "Needs roles.manage, or the change exceeds your own access" }
 *       404: { description: "Role not found" }
 *       409: { description: "Name already used" }
 *   delete:
 *     summary: "Delete a role"
 *     description: "Only roles nobody holds and no pending invitation uses can be deleted."
 *     tags: ["Team"]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: roleId, required: true, schema: { type: string, format: uuid } }]
 *     responses:
 *       200: { description: "Role deleted" }
 *       404: { description: "Role not found" }
 *       409: { description: "Role is still in use" }
 */
export const updateRole = handle(async (req) => ({
  message: "Role updated successfully",
  data: await TeamService.updateRole(actorOf(req), idParam(req, "roleId", "Role not found"), validate(updateRoleSchema, req.body)),
}));

export const deleteRole = handle(async (req) => ({
  message: "Role deleted successfully",
  data: await TeamService.deleteRole(actorOf(req), idParam(req, "roleId", "Role not found")),
}));

/**
 * @swagger
 * /api/v1/merchant/team/members:
 *   get:
 *     summary: "List team members"
 *     description: "Everyone who works at this pharmacy besides the owner, with their role and status (active or suspended). Removed members are hidden unless includeRemoved=true, which also shows `removedAt`."
 *     tags: ["Team"]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: includeRemoved, schema: { type: boolean, default: false }, description: "Include removed members (history view)" }
 *     responses:
 *       200: { description: "Members" }
 *       403: { description: "Needs staff.view" }
 */
export const listMembers = handle(async (req) => ({
  message: "Team members retrieved successfully",
  data: await TeamService.listMembers(actorOf(req).id, String(req.query.includeRemoved || "") === "true"),
}));

/**
 * @swagger
 * /api/v1/merchant/team/members/{memberId}:
 *   patch:
 *     summary: "Change a member's role or suspend them"
 *     description: "Change the role (`roleId`) or set `status` to suspended/active. Suspending cuts off their sessions and notifications immediately. You can't change yourself, or someone with more access than you."
 *     tags: ["Team"]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: memberId, required: true, schema: { type: string, format: uuid } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roleId: { type: string, format: uuid }
 *               status: { type: string, enum: [active, suspended] }
 *     responses:
 *       200: { description: "Member updated" }
 *       403: { description: "Needs staff.manage, or you can't change this member" }
 *       404: { description: "Member or role not found" }
 *   delete:
 *     summary: "Remove a member"
 *     description: "Soft delete. Ends the person's access to this pharmacy at once (sessions and notification devices) and hides them from the team list, but keeps their membership so past activity (e.g. the sales they recorded) stays attributed to them. Their login and their other pharmacies are untouched. Inviting them again restores the same membership with their history."
 *     tags: ["Team"]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: memberId, required: true, schema: { type: string, format: uuid } }]
 *     responses:
 *       200: { description: "Member removed (status: removed)" }
 *       403: { description: "Needs staff.manage, or you can't remove this member" }
 *       404: { description: "Member not found, or already removed" }
 */
export const updateMember = handle(async (req) => ({
  message: "Team member updated successfully",
  data: await TeamService.updateMember(actorOf(req), idParam(req, "memberId", "Team member not found"), validate(memberUpdateSchema, req.body)),
}));

export const removeMember = handle(async (req) => ({
  message: "Team member removed successfully",
  data: await TeamService.removeMember(actorOf(req), idParam(req, "memberId", "Team member not found")),
}));

/**
 * @swagger
 * /api/v1/merchant/team/invitations:
 *   get:
 *     summary: "List pending invitations"
 *     tags: ["Team"]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: "Pending invitations" }
 *       403: { description: "Needs staff.view" }
 *   post:
 *     summary: "Invite someone"
 *     description: "Emails an invitation link (valid 7 days) for the chosen role, along with the pharmacy code they will use to sign in. The person can be brand new, an existing team member of another pharmacy, or the owner of another pharmacy. Someone who was removed earlier can be invited again: accepting restores their old membership and history with the new role. Outside production the response also contains `inviteLink`."
 *     tags: ["Team"]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, roleId]
 *             properties:
 *               email: { type: string, format: email }
 *               roleId: { type: string, format: uuid }
 *     responses:
 *       201: { description: "Invitation sent" }
 *       400: { description: "Invalid input, or the email is this pharmacy's owner" }
 *       403: { description: "Needs staff.manage, or the role exceeds your own access" }
 *       409: { description: "Already on the team" }
 */
export const listInvitations = handle(async (req) => ({
  message: "Invitations retrieved successfully",
  data: await TeamService.listInvitations(actorOf(req).id),
}));

export const createInvitation = handle(async (req) => ({
  status: 201,
  message: "Invitation sent successfully",
  data: await TeamService.createInvitation(actorOf(req), validate(inviteSchema, req.body)),
}));

/**
 * @swagger
 * /api/v1/merchant/team/invitations/{invitationId}:
 *   delete:
 *     summary: "Revoke an invitation"
 *     tags: ["Team"]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: invitationId, required: true, schema: { type: string, format: uuid } }]
 *     responses:
 *       200: { description: "Invitation revoked" }
 *       404: { description: "Invitation not found" }
 * /api/v1/merchant/team/invitations/{invitationId}/resend:
 *   post:
 *     summary: "Resend an invitation"
 *     description: "Issues a new link (the old one stops working) and extends the expiry."
 *     tags: ["Team"]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: invitationId, required: true, schema: { type: string, format: uuid } }]
 *     responses:
 *       200: { description: "Invitation resent" }
 *       404: { description: "Invitation not found" }
 */
export const revokeInvitation = handle(async (req) => ({
  message: "Invitation revoked successfully",
  data: await TeamService.revokeInvitation(actorOf(req), idParam(req, "invitationId", "Invitation not found")),
}));

export const resendInvitation = handle(async (req) => ({
  message: "Invitation resent successfully",
  data: await TeamService.resendInvitation(actorOf(req), idParam(req, "invitationId", "Invitation not found")),
}));

/**
 * @swagger
 * /api/v1/merchant/team/audit-logs:
 *   get:
 *     summary: "Activity log"
 *     description: "Who did what at this pharmacy (sales, orders, products, discounts, wallet, settings and team changes), newest first."
 *     tags: ["Team"]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 25, maximum: 100 } }
 *       - { in: query, name: actorId, schema: { type: string }, description: "Filter to one member (or the owner's merchant id)" }
 *       - { in: query, name: action, schema: { type: string }, description: "Filter by action prefix, e.g. product." }
 *     responses:
 *       200: { description: "Log entries" }
 *       403: { description: "Needs audit.view" }
 */
export const listAuditLogs = handle(async (req) => ({
  message: "Activity log retrieved successfully",
  data: await TeamService.listAuditLogs(actorOf(req).id, {
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 25),
    actorId: req.query.actorId ? String(req.query.actorId) : undefined,
    action: req.query.action ? String(req.query.action) : undefined,
  }),
}));

/**
 * @swagger
 * /api/v1/merchant/team/pharmacy-code:
 *   get:
 *     summary: "Get the pharmacy code"
 *     description: "The short code (e.g. QM-7K3PXA) staff enter at login to say which pharmacy they work at. Created automatically the first time it is requested."
 *     tags: ["Team"]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: "The code" }
 *       403: { description: "Needs staff.manage" }
 *   put:
 *     summary: "Choose your own pharmacy code"
 *     description: "Owner only. 5-20 letters, numbers or hyphens, unique across all pharmacies (e.g. GRACE-PHARMA). Staff already signed in stay signed in; the new code applies to future sign-ins."
 *     tags: ["Team"]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string, example: "GRACE-PHARMA" }
 *     responses:
 *       200: { description: "Code saved" }
 *       400: { description: "Invalid format" }
 *       403: { description: "Owner only" }
 *       409: { description: "Code already used by another pharmacy" }
 * /api/v1/merchant/team/pharmacy-code/regenerate:
 *   post:
 *     summary: "Generate a new random pharmacy code"
 *     description: "Owner only. Replaces the current code, e.g. if it was shared too widely."
 *     tags: ["Team"]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: "New code" }
 *       403: { description: "Owner only" }
 */
export const getPharmacyCode = handle(async (req) => ({
  message: "Pharmacy code retrieved successfully",
  data: { code: await PharmacyCodeService.ensure(actorOf(req).id) },
}));

export const setPharmacyCode = handle(async (req) => {
  const { code } = validate<{ code: string }>(codeSchema, req.body);
  return {
    message: "Pharmacy code updated successfully",
    data: { code: await PharmacyCodeService.set(actorOf(req).id, code, AuditService.actorFromRequest(req) || undefined) },
  };
});

export const regeneratePharmacyCode = handle(async (req) => ({
  message: "New pharmacy code generated",
  data: { code: await PharmacyCodeService.generate(actorOf(req).id, AuditService.actorFromRequest(req) || undefined) },
}));

// ------------------------------------------------------------------ /me

/**
 * @swagger
 * /api/v1/merchant/me:
 *   get:
 *     summary: "Who am I here?"
 *     description: "The signed-in person's access at the current pharmacy: `actor` (owner or member), their role, the full list of effective `permissions` (use it to show or hide screens; the server enforces regardless), and every pharmacy they can switch to."
 *     tags: ["Team"]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: "Current access" }
 *       401: { description: "Not signed in, or access removed" }
 * /api/v1/merchant/me/pharmacies:
 *   get:
 *     summary: "Pharmacies I can work at"
 *     description: "The owner's own pharmacy plus every pharmacy that invited this login, each with its pharmacy code."
 *     tags: ["Team"]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: "Pharmacies" }
 */
export const getMe = handle(async (req) => ({ message: "Profile retrieved successfully", data: await TeamAuthService.me(actorOf(req)) }));

export const getMyPharmacies = handle(async (req) => ({
  message: "Pharmacies retrieved successfully",
  data: await TeamAuthService.myPharmacies(actorOf(req)),
}));

/**
 * @swagger
 * /api/v1/merchant/me/switch-pharmacy:
 *   post:
 *     summary: "Switch pharmacy"
 *     description: "Moves the signed-in person to another pharmacy they can work at, without signing in again. Returns a new token and refresh token for that pharmacy; use them from then on."
 *     tags: ["Team"]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pharmacyId]
 *             properties:
 *               pharmacyId: { type: string, format: uuid }
 *     responses:
 *       200: { description: "New session for that pharmacy" }
 *       403: { description: "No access to that pharmacy" }
 * /api/v1/merchant/me/profile:
 *   patch:
 *     summary: "Update my profile (team members)"
 *     description: "Team members with their own login update their name and phone here. Owners use Settings."
 *     tags: ["Team"]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               phoneNumber: { type: string }
 *     responses:
 *       200: { description: "Profile updated" }
 *       400: { description: "Owners must use Settings" }
 * /api/v1/merchant/me/password:
 *   post:
 *     summary: "Change my password (team members)"
 *     tags: ["Team"]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string, minLength: 6 }
 *     responses:
 *       200: { description: "Password changed" }
 *       400: { description: "Wrong current password, or owner (use Settings)" }
 */
export const switchPharmacy = handle(async (req) => {
  const { pharmacyId } = validate<{ pharmacyId: string }>(switchSchema, req.body);
  return { message: "Switched pharmacy successfully", data: await TeamAuthService.switchPharmacy(actorOf(req), pharmacyId, req) };
});

export const updateMyProfile = handle(async (req) => ({
  message: "Profile updated successfully",
  data: await TeamAuthService.updateMyProfile(actorOf(req), validate(profileSchema, req.body)),
}));

export const changeMyPassword = handle(async (req) => ({
  message: "Password changed successfully",
  data: await TeamAuthService.changeMyPassword(actorOf(req), validate(passwordSchema, req.body)),
}));

// ---------------------------------------------- public sign-in endpoints

/**
 * @swagger
 * /api/v1/merchant/auth/select-pharmacy:
 *   post:
 *     summary: "Choose a pharmacy after login"
 *     description: "A team member who works at several pharmacies and signed in without a pharmacy code gets `requiresPharmacySelection: true`, a `selectionToken` (valid 10 minutes) and the list of pharmacies. Send the chosen `memberId` here to receive the session. (Signing in with `pharmacyCode` skips this step.)"
 *     tags: ["Authentication"]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [selectionToken, memberId]
 *             properties:
 *               selectionToken: { type: string }
 *               memberId: { type: string, format: uuid }
 *     responses:
 *       200: { description: "Session for the chosen pharmacy" }
 *       401: { description: "Selection token expired" }
 *       403: { description: "No access to that pharmacy" }
 */
export const selectPharmacy = handle(async (req) => {
  const { selectionToken, memberId } = validate<{ selectionToken: string; memberId: string }>(selectSchema, req.body);
  return { message: "Login successful", data: await TeamAuthService.selectPharmacy(selectionToken, memberId, req) };
});

/**
 * @swagger
 * /api/v1/merchant/auth/invitations/{token}:
 *   get:
 *     summary: "Preview an invitation"
 *     description: "What the accept-invite screen shows: pharmacy, role, invited email and whether that email already has a login (`accountExists`). Existing logins confirm with their password; new people create an account."
 *     tags: ["Authentication"]
 *     security: []
 *     parameters: [{ in: path, name: token, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: "Invitation details" }
 *       404: { description: "Invalid, used or revoked" }
 *       410: { description: "Expired" }
 */
export const previewInvitation = handle(async (req) => ({
  message: "Invitation retrieved successfully",
  data: await TeamAuthService.previewInvitation(String(req.params.token || "")),
}));

/**
 * @swagger
 * /api/v1/merchant/auth/invitations/accept:
 *   post:
 *     summary: "Accept an invitation"
 *     description: "New people send `firstName`, `lastName`, `password` (and optionally `phoneNumber`) to create their login. Someone who already has a login (team member elsewhere, or a pharmacy owner) sends their existing `password` to confirm. Returns a signed-in session at the pharmacy, including the pharmacy code to use for future sign-ins."
 *     tags: ["Authentication"]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string }
 *               password: { type: string, minLength: 6 }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               phoneNumber: { type: string }
 *     responses:
 *       200: { description: "Joined; session returned" }
 *       400: { description: "Missing name for a new account, or you own this pharmacy" }
 *       401: { description: "Wrong password for the existing account" }
 *       404: { description: "Invalid invitation" }
 *       409: { description: "Already on the team" }
 *       410: { description: "Expired" }
 */
export const acceptInvitation = handle(async (req) => ({
  message: "Welcome to the team",
  data: await TeamAuthService.acceptInvitation(validate(acceptSchema, req.body), req),
}));
