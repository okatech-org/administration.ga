import { countryDialCodes, CountryCode } from "./constants";
import type { LocalizedString } from "./validators";

/**
 * Get dial code for a country
 */
export function getCountryDialCode(countryCode: CountryCode) {
  return countryDialCodes.find((code) => code.code === countryCode)?.dial_code;
}

/**
 * Get country code from phone number
 */
export function getCountryCodeFromPhoneNumber(phoneNumber: string) {
  return countryDialCodes.find((code) =>
    phoneNumber.startsWith(`+${code.dial_code}`),
  )?.code;
}

/**
 * Helper pour filtrer les documents soft-deleted
 */
export function notDeleted<T extends { deletedAt?: number }>(docs: T[]): T[] {
  return docs.filter((d) => !d.deletedAt);
}

/**
 * Generate a unique reference number (legacy, pour brouillons uniquement)
 * @deprecated Utiliser generateRequestReference() de referenceHelpers.ts pour les demandes soumises
 */
export function generateReferenceNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomUUID().replace(/-/g, "").substring(0, 4).toUpperCase();
  return `REQ-${timestamp}-${random}`;
}

/**
 * Per-type profile field requirements.
 *
 * long_stay        → Full form: residence, homeland, family
 * short_stay       → Minimal: no address, no family
 * visa_long_stay   → Residence required, no homeland, no family
 * visa_tourism     → Minimal: no address, no family
 * visa_business    → Minimal: no address, no family
 * admin_services   → Minimal: no address, no family
 */
const PROFILE_REQUIREMENTS: Record<
  string,
  { residence: boolean; homeland: boolean; family: boolean }
> = {
  long_stay: { residence: true, homeland: true, family: true },
  short_stay: { residence: false, homeland: false, family: false },
  visa_long_stay: { residence: true, homeland: false, family: false },
  visa_tourism: { residence: false, homeland: false, family: false },
  visa_business: { residence: false, homeland: false, family: false },
  admin_services: { residence: false, homeland: false, family: false },
};

const DEFAULT_REQUIREMENTS = { residence: true, homeland: true, family: true };

/**
 * Calculate profile completion score.
 * Adapts checked fields based on userType so each profile type
 * is only measured against its relevant fields.
 */
export function calculateCompletionScore(
  profile: {
    identity: {
      firstName?: string;
      lastName?: string;
      birthDate?: number;
      birthPlace?: string;
      gender?: string;
      nationality?: string;
    };
    passportInfo?: { number?: string };
    addresses?: {
      residence?: object;
      homeland?: object;
    };
    contacts?: {
      phone?: string;
      email?: string;
      emergencyContacts?: unknown[];
      emergencyResidence?: object;
      emergencyHomeland?: object;
    };
    family?: {
      maritalStatus?: string;
    };
    userType?: string;
  },
  userType?: string,
): number {
  let filled = 0;
  let total = 0;

  const type = userType ?? profile.userType ?? "long_stay";
  const reqs = PROFILE_REQUIREMENTS[type] ?? DEFAULT_REQUIREMENTS;

  // Identity (core fields — always required)
  total += 6;
  if (profile.identity.firstName) filled++;
  if (profile.identity.lastName) filled++;
  if (profile.identity.birthDate) filled++;
  if (profile.identity.birthPlace) filled++;
  if (profile.identity.gender) filled++;
  if (profile.identity.nationality) filled++;

  // Passport (always counted)
  total += 1;
  if (profile.passportInfo?.number) filled++;

  // Residence address
  if (reqs.residence) {
    total += 1;
    if (profile.addresses?.residence) filled++;
  }

  // Homeland address
  if (reqs.homeland) {
    total += 1;
    if (profile.addresses?.homeland) filled++;
  }

  // Contacts (phone + email — always required)
  total += 2;
  if (profile.contacts?.phone) filled++;
  if (profile.contacts?.email) filled++;

  // Emergency contact (always counted)
  total += 1;
  if (
    (profile.contacts?.emergencyContacts &&
      profile.contacts.emergencyContacts.length > 0) ||
    profile.contacts?.emergencyResidence ||
    profile.contacts?.emergencyHomeland
  )
    filled++;

  // Family
  if (reqs.family) {
    total += 1;
    if (profile.family?.maritalStatus) filled++;
  }

  return Math.round((filled / total) * 100);
}

export function getLocalized(
  fieldValue?: LocalizedString,
  lang?: string,
): string {
  if (!fieldValue) return "";
  // Try the requested locale, then its base ("en-US" -> "en"),
  // then "fr" as the project default, then the first non-empty value.
  if (lang) {
    if (fieldValue[lang]) return fieldValue[lang];
    const base = lang.split("-")[0];
    if (base !== lang && fieldValue[base]) return fieldValue[base];
  }
  if (fieldValue.fr) return fieldValue.fr;
  for (const v of Object.values(fieldValue)) {
    if (v) return v;
  }
  return "";
}

/**
 * Résout le nom d'une organisation pour la langue demandée.
 *
 * Préfère `org.nameI18n[lang]` (objet multilingue) puis tombe sur `org.name`
 * (string canonique). Toujours non-vide tant que l'org a un nom plat.
 */
export function getOrgName(
  org: { name: string; nameI18n?: LocalizedString },
  lang?: string,
): string {
  if (org.nameI18n) {
    const localized = getLocalized(org.nameI18n, lang);
    if (localized) return localized;
  }
  return org.name ?? "";
}
