import { Request } from "express";
import { Op, col, fn, where as sqlWhere } from "sequelize";
import { HttpException, generateToken, hashPassword, verifyPassword, verifyToken } from "@medtech/utils";
import { applicationConfig } from "../../config";
import { ALL_PERMISSIONS, expandPermissions } from "../../constants/permissions";
import { Merchant } from "../merchant/Merchant.model";
import { StoreDetails } from "../store_details/StoreDetails.model";
import { RefreshTokenService } from "../refresh_tokens/RefreshToken.service";
import { StaffAccount } from "./StaffAccount.model";
import { MerchantRole } from "./MerchantRole.model";
import { MerchantMember } from "./MerchantMember.model";
import { MerchantInvitation } from "./MerchantInvitation.model";
import { AccessService, PharmacyAccess } from "./Access.service";
import { AuditService } from "./Audit.service";
import { hashInviteToken } from "./Team.service";
import { PharmacyCodeService, normalizePharmacyCode } from "./PharmacyCode.service";

const { jwt, otpExpiration } = applicationConfig;

const SELECTION_PURPOSE = "pharmacy-selection";
const SELECTION_TTL = "10m";

type Principal = { kind: "staff" | "owner"; id: string };

const lowerEmail = (email: string) => email.trim().toLowerCase();

const signAccessToken = (pharmacyId: string, email: string, memberId?: string | null, expiresIn = jwt.expiresIn) =>
  generateToken(
    { id: pharmacyId, email, type: "merchant", ...(memberId ? { memberId } : {}) } as any,
    { secret: jwt.secret, expiresIn, otpExpiration }
  );

const clientInfo = (req?: Request) => ({
  deviceInfo: (req as any)?.headers?.["user-agent"] || "Unknown",
  ipAddress: (req as any)?.ip || (req as any)?.connection?.remoteAddress || "Unknown",
});

export class TeamAuthService {
  /** Open a session at one pharmacy: as its owner (no memberId) or as a team member. */
  private static async openSession(
    pharmacy: Merchant,
    person: { email: string; name: string; kind: "staff" | "owner"; id: string },
    member: { id: string; role: MerchantRole } | null,
    req?: Request
  ) {
    const token = signAccessToken(pharmacy.id, person.email, member?.id);
    const { deviceInfo, ipAddress } = clientInfo(req);
    const { refreshToken } = await RefreshTokenService.createRefreshToken(pharmacy.id, deviceInfo, ipAddress, member?.id);

    const pharmacies = await AccessService.listPharmacies({ kind: person.kind, id: person.id });
    const businessName = pharmacy.storeDetails?.businessName;

    return {
      token,
      refreshToken,
      actor: member ? "member" : "owner",
      permissions: member ? expandPermissions(member.role.permissions) : [...ALL_PERMISSIONS],
      role: member ? { id: member.role.id, name: member.role.name } : null,
      pharmacy: { id: pharmacy.id, businessName, pharmacyCode: pharmacy.pharmacyCode },
      pharmacies,
      // Same shape the owner login returns, so existing clients keep working
      merchant: {
        id: pharmacy.id,
        email: person.email,
        fullName: person.name,
        businessName,
        phoneNumber: pharmacy.phoneNumber,
        isVerified: pharmacy.isVerified,
      },
      onboarding: { completed: pharmacy.onboardingCompleted },
    };
  }

  private static async loadPharmacy(pharmacyId: string) {
    const pharmacy = await Merchant.findOne({
      where: { id: pharmacyId, isActive: true },
      include: [{ model: StoreDetails, as: "storeDetails" }],
    });
    if (!pharmacy) throw new HttpException(404, "Pharmacy not found or inactive");
    return pharmacy;
  }

  private static async sessionForMembership(memberId: string, req?: Request) {
    const membership = await MerchantMember.findByPk(memberId);
    const loaded = membership ? await AccessService.loadActiveMember(memberId, membership.merchantId) : null;
    if (!membership || !loaded) {
      throw new HttpException(403, "Your access to this pharmacy has been removed or suspended");
    }
    const pharmacy = await this.loadPharmacy(membership.merchantId);
    return this.openSession(pharmacy, loaded.person, { id: loaded.id, role: loaded.role }, req);
  }

  // ------------------------------------------------------- staff sign-in

  /**
   * Called by the login endpoint when the email is not a pharmacy owner. Returns null when it is not
   * a staff account either, so the caller can give its usual "email not found" answer.
   */
  static async staffLogin(email: string, password: string, pharmacyCode: string | undefined, req?: Request) {
    const staff = await StaffAccount.findOne({ where: sqlWhere(fn("lower", col("email")), lowerEmail(email)) });
    if (!staff) return null;

    if (!staff.isActive) {
      throw new HttpException(403, "Your account has been deactivated. Please contact your pharmacy.");
    }
    if (!(await verifyPassword(password, staff.password))) {
      throw new HttpException(401, "Invalid password. Please check your password and try again.");
    }

    const pharmacies = await AccessService.listPharmacies({ kind: "staff", id: staff.id });
    if (pharmacies.length === 0) {
      throw new HttpException(403, "You haven't been added to any pharmacy yet, or your access was removed.");
    }

    // The pharmacy code says which pharmacy they mean
    if (pharmacyCode && pharmacyCode.trim()) {
      return (await this.loginWithPharmacyCode({ kind: "staff", id: staff.id }, pharmacyCode, req))!;
    }

    if (pharmacies.length === 1) {
      return this.sessionForMembership(pharmacies[0].memberId!, req);
    }

    return {
      requiresPharmacySelection: true,
      selectionToken: generateToken(
        { id: staff.id, email: staff.email, type: "merchant", purpose: SELECTION_PURPOSE } as any,
        { secret: jwt.secret, expiresIn: SELECTION_TTL, otpExpiration }
      ),
      staff: { id: staff.id, name: staff.fullName, email: staff.email },
      pharmacies,
    };
  }

  /**
   * Sign in to the pharmacy that owns `rawCode`. Returns null when the code is the person's OWN
   * pharmacy (the caller then continues with the normal owner login).
   */
  static async loginWithPharmacyCode(principal: Principal, rawCode: string, req?: Request) {
    const code = normalizePharmacyCode(rawCode);
    const match = (await AccessService.listPharmacies(principal)).find(
      (entry) => (entry.pharmacyCode || "").toUpperCase() === code
    );
    if (!match) {
      throw new HttpException(403, "That pharmacy code isn't one of yours. Check it with the pharmacy owner.");
    }
    if (match.access === "owner") return null;
    return this.sessionForMembership(match.memberId!, req);
  }

  /** Second step of a staff login that has several pharmacies. */
  static async selectPharmacy(selectionToken: string, memberId: string, req?: Request) {
    const decoded: any = verifyToken(selectionToken, { secret: jwt.secret, expiresIn: SELECTION_TTL });
    if (!decoded || decoded.purpose !== SELECTION_PURPOSE) {
      throw new HttpException(401, "Your sign-in expired. Please log in again.");
    }

    const member = await MerchantMember.findOne({ where: { id: memberId, staffAccountId: decoded.id, status: "active" } });
    if (!member) throw new HttpException(403, "You don't have access to that pharmacy");

    return this.sessionForMembership(member.id, req);
  }

  // -------------------------------------------------- switching pharmacy

  private static principalOf(user: any): Principal {
    return user.actor === "owner" ? { kind: "owner", id: user.id } : user.principal;
  }

  /** `GET /me/pharmacies` — everywhere this login can work. */
  static async myPharmacies(user: any): Promise<PharmacyAccess[]> {
    return AccessService.listPharmacies(this.principalOf(user));
  }

  /** Move to another pharmacy this login can work at (own pharmacy or one that invited them). */
  static async switchPharmacy(user: any, pharmacyId: string, req?: Request) {
    const principal = this.principalOf(user);
    const target = (await AccessService.listPharmacies(principal)).find((entry) => entry.pharmacyId === pharmacyId);
    if (!target) throw new HttpException(403, "You don't have access to that pharmacy");

    if (target.access === "owner") {
      const pharmacy = await this.loadPharmacy(pharmacyId);
      return this.openSession(pharmacy, { email: pharmacy.email, name: pharmacy.fullName, kind: "owner", id: pharmacy.id }, null, req);
    }
    return this.sessionForMembership(target.memberId!, req);
  }

  // ------------------------------------------------------------------ me

  static async me(user: any) {
    const pharmacy = await this.loadPharmacy(user.id);
    const principal = user.actor === "owner" ? { kind: "owner", id: user.id } : user.principal;
    return {
      actor: user.actor,
      principal,
      name: user.name,
      email: user.email,
      pharmacy: {
        id: pharmacy.id,
        businessName: pharmacy.storeDetails?.businessName || pharmacy.fullName,
        pharmacyCode: pharmacy.pharmacyCode,
      },
      role: user.actor === "member" ? { id: user.roleId, name: user.roleName } : null,
      permissions: user.permissions,
      pharmacies: await AccessService.listPharmacies(principal),
    };
  }

  static async updateMyProfile(user: any, input: { firstName?: string; lastName?: string; phoneNumber?: string | null }) {
    if (user.actor !== "member" || user.principal?.kind !== "staff") {
      throw new HttpException(400, "Pharmacy owners update their profile in Settings");
    }
    const staff = await StaffAccount.findByPk(user.principal.id);
    if (!staff) throw new HttpException(404, "Account not found");

    if (input.firstName !== undefined) staff.firstName = input.firstName;
    if (input.lastName !== undefined) staff.lastName = input.lastName;
    if (input.phoneNumber !== undefined) staff.phoneNumber = input.phoneNumber || null;
    await staff.save();
    return { id: staff.id, firstName: staff.firstName, lastName: staff.lastName, email: staff.email, phoneNumber: staff.phoneNumber };
  }

  static async changeMyPassword(user: any, input: { currentPassword: string; newPassword: string }) {
    if (user.actor !== "member" || user.principal?.kind !== "staff") {
      throw new HttpException(400, "Pharmacy owners change their password in Settings");
    }
    const staff = await StaffAccount.findByPk(user.principal.id);
    if (!staff) throw new HttpException(404, "Account not found");
    if (!(await verifyPassword(input.currentPassword, staff.password))) {
      throw new HttpException(400, "Current password is incorrect");
    }
    staff.password = await hashPassword(input.newPassword);
    await staff.save();
    return { changed: true };
  }

  // --------------------------------------------------------- invitations

  private static async findOpenInvitation(token: string) {
    const invitation = await MerchantInvitation.findOne({
      where: { tokenHash: hashInviteToken(token), acceptedAt: null, revokedAt: null },
      include: [{ model: MerchantRole, as: "role" }],
    });
    if (!invitation) throw new HttpException(404, "This invitation is no longer valid");
    if (invitation.expiresAt.getTime() < Date.now()) {
      throw new HttpException(410, "This invitation has expired. Ask the pharmacy to send a new one.");
    }
    return invitation;
  }

  private static async identityFor(email: string) {
    const [owner, staff] = await Promise.all([
      Merchant.findOne({ where: { [Op.and]: [sqlWhere(fn("lower", col("email")), email), { isActive: true }] } }),
      StaffAccount.findOne({ where: sqlWhere(fn("lower", col("email")), email) }),
    ]);
    return { owner, staff };
  }

  /** What the accept-invite screen shows before the person commits. */
  static async previewInvitation(token: string) {
    const invitation = await this.findOpenInvitation(token);
    const pharmacy = await this.loadPharmacy(invitation.merchantId);
    const { owner, staff } = await this.identityFor(invitation.email);

    return {
      email: invitation.email,
      pharmacyName: pharmacy.storeDetails?.businessName || pharmacy.fullName,
      pharmacyCode: pharmacy.pharmacyCode,
      roleName: invitation.role.name,
      invitedBy: invitation.invitedBy,
      expiresAt: invitation.expiresAt,
      // Existing logins confirm with their password; new people are asked to create an account
      accountExists: !!(owner || staff),
      accountType: owner ? "owner" : staff ? "staff" : null,
    };
  }

  static async acceptInvitation(
    input: { token: string; password: string; firstName?: string; lastName?: string; phoneNumber?: string },
    req?: Request
  ) {
    const invitation = await this.findOpenInvitation(input.token);
    const pharmacy = await this.loadPharmacy(invitation.merchantId);
    const { owner, staff } = await this.identityFor(invitation.email);

    if (owner && owner.id === pharmacy.id) {
      throw new HttpException(400, "You own this pharmacy already");
    }

    let person: { email: string; name: string; kind: "staff" | "owner"; id: string };
    const memberFields: { staffAccountId?: string; ownerMerchantId?: string } = {};

    if (owner || staff) {
      // Someone who already has a login proves it is them with their password.
      const hash = (owner || staff)!.password;
      if (!(await verifyPassword(input.password, hash))) {
        throw new HttpException(401, "Incorrect password for this account");
      }
      if (owner) {
        person = { email: owner.email, name: owner.fullName, kind: "owner", id: owner.id };
        memberFields.ownerMerchantId = owner.id;
      } else {
        if (!staff!.isActive) throw new HttpException(403, "This account has been deactivated");
        person = { email: staff!.email, name: staff!.fullName, kind: "staff", id: staff!.id };
        memberFields.staffAccountId = staff!.id;
      }
    } else {
      if (!input.firstName || !input.lastName) {
        throw new HttpException(400, "First name and last name are required to create your account");
      }
      const account = await StaffAccount.create({
        email: invitation.email,
        password: await hashPassword(input.password),
        firstName: input.firstName,
        lastName: input.lastName,
        phoneNumber: input.phoneNumber || null,
      });
      person = { email: account.email, name: account.fullName, kind: "staff", id: account.id };
      memberFields.staffAccountId = account.id;
    }

    // A previously removed member is restored (same membership, so their history comes back)
    const identityWhere = memberFields.staffAccountId
      ? { staffAccountId: memberFields.staffAccountId }
      : { ownerMerchantId: memberFields.ownerMerchantId };
    const previous = await MerchantMember.findOne({ where: { merchantId: pharmacy.id, ...identityWhere } });

    let member: MerchantMember;
    let restored = false;
    if (previous && previous.status !== "removed") {
      throw new HttpException(409, "You are already on this pharmacy's team");
    }
    if (previous) {
      await previous.update({
        status: "active",
        roleId: invitation.roleId,
        removedAt: null,
        invitedBy: invitation.invitedBy,
      });
      member = previous;
      restored = true;
    } else {
      try {
        member = await MerchantMember.create({
          merchantId: pharmacy.id,
          roleId: invitation.roleId,
          status: "active",
          invitedBy: invitation.invitedBy,
          ...memberFields,
        });
      } catch (error: any) {
        if (error?.name === "SequelizeUniqueConstraintError") {
          throw new HttpException(409, "You are already on this pharmacy's team");
        }
        throw error;
      }
    }

    await invitation.update({ acceptedAt: new Date() });
    AuditService.record(
      { merchantId: pharmacy.id, actorType: "member", actorId: member.id, actorName: person.name },
      "invitation.accepted",
      invitation.id,
      { email: invitation.email, role: invitation.role.name, restored }
    );

    return this.openSession(pharmacy, person, { id: member.id, role: invitation.role }, req);
  }

  /**
   * A staff member who later opens their own pharmacy keeps one login: their memberships move onto
   * the new owner account and the separate staff login is retired.
   */
  static async absorbStaffAccountIntoOwner(email: string, ownerMerchantId: string) {
    const staff = await StaffAccount.findOne({ where: sqlWhere(fn("lower", col("email")), lowerEmail(email)) });
    if (!staff) return;

    await MerchantMember.update(
      { ownerMerchantId, staffAccountId: null },
      { where: { staffAccountId: staff.id } }
    );
    await staff.destroy();
  }
}
