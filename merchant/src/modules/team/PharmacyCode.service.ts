import { Op, col, fn, where as sqlWhere } from "sequelize";
import { HttpException } from "@medtech/utils";
import { Merchant } from "../merchant/Merchant.model";
import { AuditService, AuditActor } from "./Audit.service";

// No 0/O/1/I so a code read aloud or from a screen can't be mistyped
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PREFIX = "QM-";
const CUSTOM_CODE = /^[A-Z0-9][A-Z0-9-]{3,17}[A-Z0-9]$/;

export const normalizePharmacyCode = (value: string) => value.trim().toUpperCase();

const randomCode = () => {
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `${PREFIX}${suffix}`;
};

const codeTaken = async (code: string, exceptMerchantId?: string) => {
  const clash = await Merchant.findOne({
    where: {
      [Op.and]: [
        sqlWhere(fn("upper", col("pharmacy_code")), code),
        ...(exceptMerchantId ? [{ id: { [Op.ne]: exceptMerchantId } }] : []),
      ],
    },
    attributes: ["id"],
  });
  return !!clash;
};

export class PharmacyCodeService {
  /** The pharmacy's code, creating one the first time it is needed. */
  static async ensure(merchantId: string): Promise<string> {
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new HttpException(404, "Pharmacy not found");
    if (merchant.pharmacyCode) return merchant.pharmacyCode;
    return this.generate(merchantId);
  }

  /** Make (or replace) the code with a fresh random one. Staff already signed in are unaffected. */
  static async generate(merchantId: string, actor?: AuditActor): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = randomCode();
      if (await codeTaken(code)) continue;
      await Merchant.update({ pharmacyCode: code }, { where: { id: merchantId } });
      if (actor) AuditService.record(actor, "pharmacy_code.generated", merchantId, { code });
      return code;
    }
    throw new HttpException(500, "Could not generate a unique pharmacy code. Please try again.");
  }

  /** Let the owner pick their own memorable code, e.g. GRACE-PHARMA. */
  static async set(merchantId: string, rawCode: string, actor?: AuditActor): Promise<string> {
    const code = normalizePharmacyCode(rawCode);
    if (!CUSTOM_CODE.test(code)) {
      throw new HttpException(400, "Use 5-20 letters, numbers or hyphens (e.g. GRACE-PHARMA)");
    }
    if (await codeTaken(code, merchantId)) {
      throw new HttpException(409, "That code is already used by another pharmacy. Try a different one.");
    }
    await Merchant.update({ pharmacyCode: code }, { where: { id: merchantId } });
    if (actor) AuditService.record(actor, "pharmacy_code.changed", merchantId, { code });
    return code;
  }
}
