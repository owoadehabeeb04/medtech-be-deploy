import { Merchant } from "../merchant/Merchant.model";
import { StaffAccount } from "./StaffAccount.model";
import { MerchantRole } from "./MerchantRole.model";
import { MerchantMember } from "./MerchantMember.model";
import { StoreDetails } from "../store_details/StoreDetails.model";

export interface MemberPerson {
  kind: "staff" | "owner";
  id: string;
  name: string;
  email: string;
}

export interface ActiveMember {
  id: string;
  role: MerchantRole;
  person: MemberPerson;
}

export interface PharmacyAccess {
  pharmacyId: string;
  pharmacyCode: string | null;
  businessName: string;
  access: "owner" | "member";
  memberId: string | null;
  roleName: string | null;
}

const personOf = (member: MerchantMember): MemberPerson | null => {
  if (member.staffAccount) {
    return {
      kind: "staff",
      id: member.staffAccount.id,
      name: member.staffAccount.fullName,
      email: member.staffAccount.email,
    };
  }
  if (member.ownerMerchant) {
    return {
      kind: "owner",
      id: member.ownerMerchant.id,
      name: member.ownerMerchant.fullName,
      email: member.ownerMerchant.email,
    };
  }
  return null;
};

export class AccessService {
  /**
   * The membership behind a member token, or null when it no longer grants access: the member is
   * suspended/removed, the person's login is deactivated, or the pharmacy itself is inactive.
   */
  static async loadActiveMember(memberId: string, pharmacyId: string): Promise<ActiveMember | null> {
    const member = await MerchantMember.findOne({
      where: { id: memberId, merchantId: pharmacyId, status: "active" },
      include: [
        { model: MerchantRole, as: "role" },
        { model: StaffAccount, as: "staffAccount" },
        { model: Merchant, as: "ownerMerchant" },
      ],
    });
    if (!member || !member.role) return null;

    const person = personOf(member);
    if (!person) return null;
    if (member.staffAccount && !member.staffAccount.isActive) return null;
    if (member.ownerMerchant && !member.ownerMerchant.isActive) return null;

    return { id: member.id, role: member.role, person };
  }

  /**
   * Every pharmacy a login can work in: the owner's own pharmacy (when they have one) plus each
   * pharmacy that invited them. This is what the app shows in its pharmacy switcher.
   */
  static async listPharmacies(principal: { kind: "staff" | "owner"; id: string }): Promise<PharmacyAccess[]> {
    const result: PharmacyAccess[] = [];

    if (principal.kind === "owner") {
      const own = await Merchant.findOne({
        where: { id: principal.id, isActive: true },
        include: [{ model: StoreDetails, as: "storeDetails" }],
      });
      if (own) {
        result.push({
          pharmacyId: own.id,
          pharmacyCode: own.pharmacyCode,
          businessName: own.storeDetails?.businessName || own.fullName,
          access: "owner",
          memberId: null,
          roleName: null,
        });
      }
    }

    const memberships = await MerchantMember.findAll({
      where:
        principal.kind === "staff"
          ? { staffAccountId: principal.id, status: "active" }
          : { ownerMerchantId: principal.id, status: "active" },
      include: [
        { model: MerchantRole, as: "role" },
        { model: Merchant, as: "pharmacy", include: [{ model: StoreDetails, as: "storeDetails" }] },
      ],
      order: [["joinedAt", "ASC"]],
    });

    for (const membership of memberships) {
      if (!membership.pharmacy?.isActive) continue;
      result.push({
        pharmacyId: membership.merchantId,
        pharmacyCode: membership.pharmacy.pharmacyCode,
        businessName: membership.pharmacy.storeDetails?.businessName || membership.pharmacy.fullName,
        access: "member",
        memberId: membership.id,
        roleName: membership.role?.name || null,
      });
    }

    return result;
  }
}
