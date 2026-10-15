import * as crypto from "crypto";
import { Op, QueryTypes, fn, col, where as sqlWhere } from "sequelize";
import { HttpException } from "@medtech/utils";
import { applicationConfig } from "../../config";
import { Merchant } from "../merchant/Merchant.model";
import { StoreDetails } from "../store_details/StoreDetails.model";
import { MerchantDeviceToken } from "../merchant_settings/MerchantDeviceToken.model";
import { RefreshTokenService } from "../refresh_tokens/RefreshToken.service";
import { EmailService } from "../../service/Email/Email.service";
import {
  OWNER_ONLY_TO_GRANT,
  PermissionKey,
  expandPermissions,
  isPermissionKey,
} from "../../constants/permissions";
import { StaffAccount } from "./StaffAccount.model";
import { MerchantRole } from "./MerchantRole.model";
import { MerchantMember } from "./MerchantMember.model";
import { MerchantInvitation } from "./MerchantInvitation.model";
import { MerchantAuditLog } from "./MerchantAuditLog.model";
import { AuditService } from "./Audit.service";
import { PharmacyCodeService } from "./PharmacyCode.service";

const { team, isProduction } = applicationConfig;

/** The signed-in person making the request (from req.context.user). */
export interface TeamActor {
  id: string; // the pharmacy (merchant) id
  actor: "owner" | "member";
  memberId?: string;
  name?: string;
  permissions: string[];
}

const isOwner = (actor: TeamActor) => actor.actor === "owner";

export const hashInviteToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

const auditOf = (actor: TeamActor) => ({
  merchantId: actor.id,
  actorType: actor.actor,
  actorId: String(actor.memberId || actor.id),
  actorName: actor.name || null,
});

/** Validate a permission list from a request body and drop duplicates. */
export const parsePermissions = (value: unknown): PermissionKey[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpException(400, "Choose at least one permission");
  }
  const invalid = value.filter((entry) => !isPermissionKey(entry));
  if (invalid.length > 0) {
    throw new HttpException(400, `Unknown permission(s): ${invalid.join(", ")}`);
  }
  return [...new Set(value as PermissionKey[])];
};

/**
 * You can only hand out what you hold yourself, and only the owner can hand out the keys to the
 * team itself (staff.manage / roles.manage). The owner is not restricted.
 */
const assertCanGrant = (actor: TeamActor, permissions: string[]) => {
  if (isOwner(actor)) return;

  if (permissions.some((permission) => OWNER_ONLY_TO_GRANT.includes(permission as PermissionKey))) {
    throw new HttpException(403, "Only the pharmacy owner can grant team or role management");
  }

  const mine = new Set(actor.permissions);
  const missing = expandPermissions(permissions).filter((permission) => !mine.has(permission));
  if (missing.length > 0) {
    throw new HttpException(403, `You can only grant permissions you have yourself (missing: ${missing.join(", ")})`);
  }
};

/** Whether the actor outranks a role, i.e. holds everything it grants. */
const assertCanManageRole = (actor: TeamActor, role: MerchantRole) => {
  if (isOwner(actor)) return;
  const mine = new Set(actor.permissions);
  const outranks = expandPermissions(role.permissions).every((permission) => mine.has(permission));
  const touchesOwnerKeys = role.permissions.some((permission) => OWNER_ONLY_TO_GRANT.includes(permission as PermissionKey));
  if (!outranks || touchesOwnerKeys) {
    throw new HttpException(403, "You can't change someone whose access is higher than yours");
  }
};

const serializeRole = (role: MerchantRole, memberCount = 0, pendingInvites = 0) => ({
  id: role.id,
  name: role.name,
  description: role.description,
  permissions: role.permissions,
  effectivePermissions: expandPermissions(role.permissions),
  memberCount,
  pendingInvitations: pendingInvites,
  createdAt: role.createdAt,
  updatedAt: role.updatedAt,
});

const uniqueRoleNameClash = async (merchantId: string, name: string, exceptId?: string) => {
  const clash = await MerchantRole.findOne({
    where: {
      merchantId,
      [Op.and]: [sqlWhere(fn("lower", col("name")), name.toLowerCase())],
      ...(exceptId ? { id: { [Op.ne]: exceptId } } : {}),
    },
  });
  if (clash) throw new HttpException(409, `A role named "${name}" already exists`);
};

const getRoleOrThrow = async (merchantId: string, roleId: string) => {
  const role = await MerchantRole.findOne({ where: { id: roleId, merchantId } });
  if (!role) throw new HttpException(404, "Role not found");
  return role;
};

export class TeamService {
  // ---------------------------------------------------------------- roles

  static async listRoles(merchantId: string) {
    const roles = await MerchantRole.findAll({ where: { merchantId }, order: [["name", "ASC"]] });

    const counts = await MerchantMember.sequelize!.query<{ role_id: string; members: number }>(
      `SELECT role_id, COUNT(*)::int AS members FROM merchant_members WHERE merchant_id = :merchantId AND status <> 'removed' GROUP BY role_id`,
      { replacements: { merchantId }, type: QueryTypes.SELECT }
    );
    const invites = await MerchantInvitation.sequelize!.query<{ role_id: string; pending: number }>(
      `SELECT role_id, COUNT(*)::int AS pending FROM merchant_invitations
       WHERE merchant_id = :merchantId AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now()
       GROUP BY role_id`,
      { replacements: { merchantId }, type: QueryTypes.SELECT }
    );
    const memberCount = new Map(counts.map((row) => [row.role_id, row.members]));
    const pending = new Map(invites.map((row) => [row.role_id, row.pending]));

    return roles.map((role) => serializeRole(role, memberCount.get(role.id) || 0, pending.get(role.id) || 0));
  }

  static async createRole(actor: TeamActor, input: { name: string; description?: string | null; permissions: unknown }) {
    const permissions = parsePermissions(input.permissions);
    assertCanGrant(actor, permissions);
    await uniqueRoleNameClash(actor.id, input.name);

    const role = await MerchantRole.create({
      merchantId: actor.id,
      name: input.name,
      description: input.description || null,
      permissions,
    });

    AuditService.record(auditOf(actor), "role.created", role.id, { name: role.name, permissions });
    return serializeRole(role);
  }

  static async updateRole(
    actor: TeamActor,
    roleId: string,
    input: { name?: string; description?: string | null; permissions?: unknown }
  ) {
    const role = await getRoleOrThrow(actor.id, roleId);

    if (!isOwner(actor) && actor.memberId && (await MerchantMember.count({ where: { id: actor.memberId, roleId } })) > 0) {
      throw new HttpException(403, "You can't edit your own role");
    }
    assertCanManageRole(actor, role);

    if (input.permissions !== undefined) {
      const permissions = parsePermissions(input.permissions);
      assertCanGrant(actor, permissions);
      role.permissions = permissions;
    }
    if (input.name !== undefined && input.name !== role.name) {
      await uniqueRoleNameClash(actor.id, input.name, role.id);
      role.name = input.name;
    }
    if (input.description !== undefined) role.description = input.description || null;

    await role.save();
    AuditService.record(auditOf(actor), "role.updated", role.id, { name: role.name, permissions: role.permissions });

    const [members, pending] = await Promise.all([
      MerchantMember.count({ where: { roleId, status: { [Op.ne]: "removed" } } }),
      MerchantInvitation.count({ where: { roleId, acceptedAt: null, revokedAt: null, expiresAt: { [Op.gt]: new Date() } } }),
    ]);
    return serializeRole(role, members, pending);
  }

  static async deleteRole(actor: TeamActor, roleId: string) {
    const role = await getRoleOrThrow(actor.id, roleId);
    assertCanManageRole(actor, role);

    const [members, pending] = await Promise.all([
      MerchantMember.count({ where: { roleId, status: { [Op.ne]: "removed" } } }),
      MerchantInvitation.count({ where: { roleId, acceptedAt: null, revokedAt: null, expiresAt: { [Op.gt]: new Date() } } }),
    ]);
    if (members > 0 || pending > 0) {
      throw new HttpException(
        409,
        `This role is still in use by ${members} member(s) and ${pending} pending invitation(s). Move them to another role first.`
      );
    }

    // Removed members keep their history but no longer point at a role that is going away
    await MerchantMember.update({ roleId: null }, { where: { roleId, status: "removed" } });
    await MerchantInvitation.destroy({ where: { roleId } });
    await role.destroy();
    AuditService.record(auditOf(actor), "role.deleted", roleId, { name: role.name });
    return { id: roleId };
  }

  // -------------------------------------------------------------- members

  private static serializeMember(member: MerchantMember) {
    const person = member.staffAccount || member.ownerMerchant;
    const isStaff = !!member.staffAccount;
    return {
      id: member.id,
      name: person ? (isStaff ? (person as StaffAccount).fullName : (person as Merchant).fullName) : "Unknown",
      email: person?.email || null,
      phoneNumber: person ? (person as any).phoneNumber || null : null,
      accountType: isStaff ? "staff" : "owner_of_another_pharmacy",
      status: member.status,
      role: member.role ? { id: member.role.id, name: member.role.name } : null,
      joinedAt: member.joinedAt,
      removedAt: member.removedAt,
      invitedBy: member.invitedBy,
    };
  }

  private static async getMemberOrThrow(merchantId: string, memberId: string) {
    const member = await MerchantMember.findOne({
      where: { id: memberId, merchantId },
      include: [
        { model: MerchantRole, as: "role" },
        { model: StaffAccount, as: "staffAccount" },
        { model: Merchant, as: "ownerMerchant" },
      ],
    });
    if (!member || member.status === "removed") throw new HttpException(404, "Team member not found");
    return member;
  }

  /** Removed members are hidden unless asked for (history view). */
  static async listMembers(merchantId: string, includeRemoved = false) {
    const members = await MerchantMember.findAll({
      where: { merchantId, ...(includeRemoved ? {} : { status: { [Op.ne]: "removed" } }) },
      include: [
        { model: MerchantRole, as: "role" },
        { model: StaffAccount, as: "staffAccount" },
        { model: Merchant, as: "ownerMerchant" },
      ],
      order: [["joinedAt", "ASC"]],
    });
    return members.map((member) => this.serializeMember(member));
  }

  private static async cutOffAccess(memberId: string) {
    await RefreshTokenService.revokeMemberSessions(memberId);
    await MerchantDeviceToken.update(
      { isActive: false, lastErrorAt: new Date(), lastErrorCode: "member_access_removed" },
      { where: { memberId, isActive: true } }
    );
  }

  static async updateMember(actor: TeamActor, memberId: string, input: { roleId?: string; status?: "active" | "suspended" }) {
    const member = await this.getMemberOrThrow(actor.id, memberId);

    if (member.id === actor.memberId) {
      throw new HttpException(403, "You can't change your own access");
    }
    if (member.role) assertCanManageRole(actor, member.role);

    const before = { roleId: member.roleId, status: member.status };

    if (input.roleId && input.roleId !== member.roleId) {
      const role = await getRoleOrThrow(actor.id, input.roleId);
      assertCanGrant(actor, role.permissions);
      member.roleId = role.id;
    }
    if (input.status && input.status !== member.status) {
      member.status = input.status;
    }
    await member.save();

    if (member.status === "suspended") await this.cutOffAccess(member.id);

    AuditService.record(auditOf(actor), "member.updated", member.id, { before, after: { roleId: member.roleId, status: member.status } });
    return this.serializeMember(await this.getMemberOrThrow(actor.id, member.id));
  }

  static async removeMember(actor: TeamActor, memberId: string) {
    const member = await this.getMemberOrThrow(actor.id, memberId);

    if (member.id === actor.memberId) {
      throw new HttpException(403, "You can't remove yourself");
    }
    if (member.role) assertCanManageRole(actor, member.role);

    // Soft delete: access ends now, but the membership (and who made which sale) is kept so that
    // inviting the person again restores their history instead of starting over.
    await this.cutOffAccess(member.id);
    await member.update({ status: "removed", removedAt: new Date() });

    const summary = this.serializeMember(member);
    AuditService.record(auditOf(actor), "member.removed", memberId, { name: summary.name, email: summary.email });
    return { id: memberId, status: "removed" };
  }

  // ---------------------------------------------------------- invitations

  private static buildInviteLink(token: string) {
    return `${team.merchantAppUrl}/accept-invite?token=${token}`;
  }

  private static async sendInvitation(invitation: MerchantInvitation, token: string, role: MerchantRole, actor: TeamActor) {
    const pharmacy = await Merchant.findByPk(invitation.merchantId, {
      include: [{ model: StoreDetails, as: "storeDetails" }],
    });
    const inviteLink = this.buildInviteLink(token);
    // Staff sign in with this code, so every pharmacy that invites someone has one
    const pharmacyCode = await PharmacyCodeService.ensure(invitation.merchantId);

    try {
      await EmailService.sendStaffInvitationEmail(invitation.email, {
        pharmacyName: pharmacy?.storeDetails?.businessName || pharmacy?.fullName || "a pharmacy",
        pharmacyCode,
        roleName: role.name,
        invitedBy: actor.name || "The pharmacy owner",
        inviteLink,
        expiresInDays: team.invitationExpiryDays,
      });
    } catch (error: any) {
      console.error("[Team] Failed to send invitation email:", error?.message);
      if (isProduction) throw new HttpException(502, "We couldn't send the invitation email. Please try again.");
    }

    // Outside production the link is returned so invitations can be tested without email.
    return isProduction ? undefined : inviteLink;
  }

  private static serializeInvitation(invitation: MerchantInvitation, role?: MerchantRole | null) {
    return {
      id: invitation.id,
      email: invitation.email,
      role: role ? { id: role.id, name: role.name } : null,
      expiresAt: invitation.expiresAt,
      expired: invitation.expiresAt.getTime() < Date.now(),
      invitedBy: invitation.invitedBy,
      createdAt: invitation.createdAt,
    };
  }

  static async createInvitation(actor: TeamActor, input: { email: string; roleId: string }) {
    const email = input.email.trim().toLowerCase();
    const role = await getRoleOrThrow(actor.id, input.roleId);
    assertCanGrant(actor, role.permissions);

    const pharmacy = await Merchant.findByPk(actor.id);
    if (!pharmacy) throw new HttpException(404, "Pharmacy not found");
    if (pharmacy.email.toLowerCase() === email) {
      throw new HttpException(400, "That is the pharmacy owner's email; the owner already has full access");
    }

    // Already on the team under either kind of login?
    const [staff, ownerElsewhere] = await Promise.all([
      StaffAccount.findOne({ where: sqlWhere(fn("lower", col("email")), email) }),
      Merchant.findOne({ where: sqlWhere(fn("lower", col("email")), email) }),
    ]);
    const existingMember = await MerchantMember.findOne({
      where: {
        merchantId: actor.id,
        status: { [Op.ne]: "removed" },
        [Op.or]: [
          ...(staff ? [{ staffAccountId: staff.id }] : []),
          ...(ownerElsewhere ? [{ ownerMerchantId: ownerElsewhere.id }] : []),
        ],
      },
    });
    if ((staff || ownerElsewhere) && existingMember) {
      throw new HttpException(409, "This person is already on your team");
    }

    // A fresh invitation replaces any pending one for the same email
    await MerchantInvitation.update(
      { revokedAt: new Date() },
      { where: { merchantId: actor.id, email, acceptedAt: null, revokedAt: null } }
    );

    const token = crypto.randomBytes(32).toString("hex");
    const invitation = await MerchantInvitation.create({
      merchantId: actor.id,
      email,
      roleId: role.id,
      tokenHash: hashInviteToken(token),
      expiresAt: new Date(Date.now() + team.invitationExpiryDays * 24 * 60 * 60 * 1000),
      invitedBy: actor.name || null,
    });

    const inviteLink = await this.sendInvitation(invitation, token, role, actor);
    AuditService.record(auditOf(actor), "invitation.sent", invitation.id, { email, role: role.name });

    return { ...this.serializeInvitation(invitation, role), ...(inviteLink ? { inviteLink } : {}) };
  }

  static async listInvitations(merchantId: string) {
    const invitations = await MerchantInvitation.findAll({
      where: { merchantId, acceptedAt: null, revokedAt: null },
      include: [{ model: MerchantRole, as: "role" }],
      order: [["createdAt", "DESC"]],
    });
    return invitations.map((invitation) => this.serializeInvitation(invitation, invitation.role));
  }

  private static async getPendingInvitation(merchantId: string, invitationId: string) {
    const invitation = await MerchantInvitation.findOne({
      where: { id: invitationId, merchantId, acceptedAt: null, revokedAt: null },
      include: [{ model: MerchantRole, as: "role" }],
    });
    if (!invitation) throw new HttpException(404, "Invitation not found");
    return invitation;
  }

  static async revokeInvitation(actor: TeamActor, invitationId: string) {
    const invitation = await this.getPendingInvitation(actor.id, invitationId);
    await invitation.update({ revokedAt: new Date() });
    AuditService.record(auditOf(actor), "invitation.revoked", invitation.id, { email: invitation.email });
    return { id: invitation.id };
  }

  static async resendInvitation(actor: TeamActor, invitationId: string) {
    const invitation = await this.getPendingInvitation(actor.id, invitationId);
    assertCanGrant(actor, invitation.role.permissions);

    const token = crypto.randomBytes(32).toString("hex");
    await invitation.update({
      tokenHash: hashInviteToken(token),
      expiresAt: new Date(Date.now() + team.invitationExpiryDays * 24 * 60 * 60 * 1000),
    });

    const inviteLink = await this.sendInvitation(invitation, token, invitation.role, actor);
    AuditService.record(auditOf(actor), "invitation.resent", invitation.id, { email: invitation.email });
    return { ...this.serializeInvitation(invitation, invitation.role), ...(inviteLink ? { inviteLink } : {}) };
  }

  // ------------------------------------------------------------ audit log

  static async listAuditLogs(
    merchantId: string,
    options: { page?: number; limit?: number; actorId?: string; action?: string }
  ) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 25));

    const where: any = { merchantId };
    if (options.actorId) where.actorId = options.actorId;
    if (options.action) where.action = { [Op.iLike]: `${options.action}%` };

    const { rows, count } = await MerchantAuditLog.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit,
      offset: (page - 1) * limit,
    });

    return {
      items: rows.map((row) => ({
        id: row.id,
        action: row.action,
        actor: { type: row.actorType, id: row.actorId, name: row.actorName },
        entityId: row.entityId,
        metadata: row.metadata,
        createdAt: row.createdAt,
      })),
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }
}
