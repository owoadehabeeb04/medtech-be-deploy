import { Op } from "sequelize";
import { Merchant } from "./Merchant.model";

const DEFAULT_COUNTRY_CODE = "+234";

/**
 * Reduce a phone number to country code + national digits so "0803…", "803…", "+234803…" and
 * "234803…" all compare equal.
 */
export const normalizePhone = (countryCode: string | null | undefined, number: string) => {
  const cc = (countryCode || DEFAULT_COUNTRY_CODE).replace(/\D/g, "");
  let digits = (number || "").replace(/\D/g, "");

  if (digits.startsWith("00")) digits = digits.slice(2);
  // A full international number typed into the number field, e.g. 2348031234567
  if (digits.startsWith(cc) && digits.length > 10) digits = digits.slice(cc.length);
  digits = digits.replace(/^0+/, "");

  return { countryCode: cc, national: digits };
};

/**
 * True if another merchant already uses this phone number (in any written form).
 */
export const isPhoneNumberTaken = async (
  countryCode: string | null | undefined,
  number: string,
  excludeMerchantId?: string
): Promise<boolean> => {
  const target = normalizePhone(countryCode, number);
  if (!target.national) return false;

  const where: any = { phoneNumber: { [Op.like]: `%${target.national}` } };
  if (excludeMerchantId) where.id = { [Op.ne]: excludeMerchantId };

  const candidates = await Merchant.findAll({
    where,
    attributes: ["id", "phoneNumber", "phoneCountryCode"],
  });

  return candidates.some((merchant) => {
    const existing = normalizePhone(merchant.phoneCountryCode, merchant.phoneNumber);
    return existing.countryCode === target.countryCode && existing.national === target.national;
  });
};

export const PHONE_TAKEN_MESSAGE = "Phone number has already been registered";
