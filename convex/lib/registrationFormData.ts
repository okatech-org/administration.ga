/**
 * Shared, pure-logic helpers for building consular registration formData.
 *
 * This module has NO server-only imports (no Convex server runtime, no DB calls)
 * so it can be safely imported from both Convex functions and the Next.js client.
 */

/**
 * Safely format a timestamp to YYYY-MM-DD string for form display.
 */
export function formatDate(
  ts: number | undefined | null,
): string | undefined {
  if (!ts) return undefined;
  try {
    return new Date(ts).toISOString().split("T")[0];
  } catch {
    return undefined;
  }
}

/**
 * Build formData that maps profile fields to the consular registration
 * form template section/field IDs. This is the data that gets stored
 * with the request so the admin can see all submitted information.
 *
 * Keys follow the pattern: "sectionId.fieldId" matching formTemplates.ts
 * consular-card-registration template.
 */
export function buildRegistrationFormData(
  profile: Record<string, any>,
  duration: string,
): Record<string, unknown> {
  const identity = profile.identity ?? {};
  const passportInfo = profile.passportInfo ?? {};
  const family = profile.family ?? {};
  const addresses = profile.addresses ?? {};
  const contacts = profile.contacts ?? {};
  const profession = profile.profession ?? {};
  const residence = addresses.residence ?? {};
  const homeland = addresses.homeland ?? {};
  // Support both new array format and legacy fields
  const emergencyContacts = contacts.emergencyContacts ?? [];
  const emergencyRes =
    emergencyContacts[0] ?? contacts.emergencyResidence ?? {};
  const emergencyHome =
    emergencyContacts[1] ?? contacts.emergencyHomeland ?? {};

  return {
    // Meta
    type: "registration",
    profileId: profile._id,
    duration,

    // Section: basic_info
    basic_info: {
      last_name: identity.lastName || undefined,
      first_name: identity.firstName || undefined,
      nip: identity.nip || undefined,
      gender: identity.gender || undefined,
      birth_date: formatDate(identity.birthDate),
      birth_place: identity.birthPlace || undefined,
      birth_country: identity.birthCountry || undefined,
      nationality: identity.nationality || undefined,
      nationality_acquisition: identity.nationalityAcquisition || undefined,
    },

    // Section: passport_info
    passport_info: {
      passport_number: passportInfo.number || undefined,
      passport_issue_date: formatDate(passportInfo.issueDate),
      passport_expiry_date: formatDate(passportInfo.expiryDate),
      passport_issuing_authority: passportInfo.issuingAuthority || undefined,
    },

    // Section: family_info
    family_info: {
      marital_status: family.maritalStatus || undefined,
      father_last_name: family.father?.lastName || undefined,
      father_first_name: family.father?.firstName || undefined,
      mother_last_name: family.mother?.lastName || undefined,
      mother_first_name: family.mother?.firstName || undefined,
      spouse_last_name: family.spouse?.lastName || undefined,
      spouse_first_name: family.spouse?.firstName || undefined,
    },

    // Section: contact_info
    contact_info: {
      email: contacts.email || profile.email || undefined,
      phone: contacts.phone || profile.phone || undefined,
    },

    // Section: residence_address
    residence_address: {
      residence_street: residence.street || undefined,
      residence_city: residence.city || undefined,
      residence_postal_code: residence.postalCode || undefined,
      residence_country: residence.country || undefined,
    },

    // Section: homeland_address
    homeland_address: {
      homeland_street: homeland.street || undefined,
      homeland_city: homeland.city || undefined,
      homeland_postal_code: homeland.postalCode || undefined,
      homeland_country: homeland.country || undefined,
    },

    // Section: emergency contacts
    emergency_contacts: emergencyContacts.map((c: any) => ({
      last_name: c.lastName || undefined,
      first_name: c.firstName || undefined,
      phone: c.phone || undefined,
      email: c.email || undefined,
      country: c.country || undefined,
    })),

    // Section: professional_info
    professional_info: {
      work_status: profession.status || undefined,
      profession: profession.title || undefined,
      employer: profession.employer || undefined,
    },
  };
}

/**
 * Check if formData is empty or effectively empty.
 * Returns true if formData is null/undefined, {}, or has only meta keys.
 */
export function isFormDataEmpty(formData: unknown): boolean {
  if (!formData) return true;
  if (typeof formData !== "object") return false;
  const keys = Object.keys(formData as Record<string, unknown>);
  if (keys.length === 0) return true;
  // Check if all section values are empty/undefined (only meta keys present)
  const sectionKeys = keys.filter(
    (k) => !["type", "profileId", "duration"].includes(k),
  );
  return sectionKeys.length === 0;
}
