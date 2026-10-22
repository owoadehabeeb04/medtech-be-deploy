/**
 * Bank-name matching used when converting saved Paystack bank codes to Paga bank ids.
 * Nigerian banks are named inconsistently between providers ("Guaranty Trust Bank" / "GTBank"), so names are
 * reduced to a short key first. Anything that still doesn't match is reported for a human, never guessed.
 */
const NOISE = /\b(plc|ltd|limited|nigeria|nig|of|the|bank|mfb|microfinance|for|and)\b/g;

// key after noise removal -> canonical key. Only add an alias when two providers really use two names for one bank.
const ALIASES: { [key: string]: string } = {
  guarantytrust: "gt",
  gtb: "gt",
  gtbank: "gt",
  unitedafrica: "uba",
  firstcitymonument: "fcmb",
  stanbic: "stanbicibtc",
  stanbicibtc: "stanbicibtc",
  diamond: "access",
  accessdiamond: "access",
  ecobank: "eco",
  eco: "eco",
};

export const bankNameKey = (name: string): string => {
  const reduced = String(name || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(NOISE, " ")
    .replace(/[^a-z0-9]/g, "");
  return ALIASES[reduced] || reduced;
};

export interface BankRef {
  name: string;
  uuid: string;
  sortCode?: string | null;
}

export type BankMatch =
  | { kind: "matched"; bank: BankRef; by: "sortCode" | "name" }
  | { kind: "ambiguous"; candidates: BankRef[] }
  | { kind: "none" };

/** Find the Paga bank that corresponds to a saved Paystack bank (its code and display name). */
export const matchBank = (paystackCode: string, paystackName: string, pagaBanks: BankRef[]): BankMatch => {
  // 1. Paystack's Nigerian bank codes are CBN sort codes; Paga lists a sort code for some banks.
  const code = String(paystackCode || "").trim();
  if (code) {
    const bySort = pagaBanks.filter((bank) => bank.sortCode && String(bank.sortCode).trim() === code);
    if (bySort.length === 1) return { kind: "matched", bank: bySort[0], by: "sortCode" };
    if (bySort.length > 1) return { kind: "ambiguous", candidates: bySort };
  }

  // 2. Cleaned-up name
  const key = bankNameKey(paystackName);
  if (!key) return { kind: "none" };
  const byName = pagaBanks.filter((bank) => bankNameKey(bank.name) === key);
  if (byName.length === 1) return { kind: "matched", bank: byName[0], by: "name" };
  if (byName.length > 1) return { kind: "ambiguous", candidates: byName };
  return { kind: "none" };
};
