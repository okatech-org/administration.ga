/**
 * Dynamic fields that can be substituted with profile data at print time.
 */

export interface DynamicField {
  key: string
  label: string
  category: string
  preview: string // Sample text for design preview
}

export const DYNAMIC_FIELDS: DynamicField[] = [
  // Identity
  { key: "citizen.firstName", label: "Prénom", category: "Identité", preview: "Jean-Pierre" },
  { key: "citizen.lastName", label: "Nom", category: "Identité", preview: "MOUSSAVOU" },
  { key: "citizen.fullName", label: "Nom complet", category: "Identité", preview: "Jean-Pierre MOUSSAVOU" },
  { key: "citizen.dateOfBirth", label: "Date de naissance", category: "Identité", preview: "28/04/1967" },
  { key: "citizen.placeOfBirth", label: "Lieu de naissance", category: "Identité", preview: "Libreville" },
  { key: "citizen.nationality", label: "Nationalité", category: "Identité", preview: "Gabonaise" },
  { key: "citizen.sex", label: "Sexe", category: "Identité", preview: "M" },

  // Document
  { key: "card.number", label: "N° Carte", category: "Document", preview: "FR26280467-00001" },
  { key: "card.issuedAt", label: "Date d'émission", category: "Document", preview: "30/03/2026" },
  { key: "card.expiresAt", label: "Date d'expiration", category: "Document", preview: "30/03/2031" },
  { key: "card.qrCode", label: "QR Code vérification", category: "Document", preview: "https://consulat.ga/verify/FR26280467-00001" },

  // Consulate
  { key: "consulate.name", label: "Nom du consulat", category: "Consulat", preview: "Consulat du Gabon à Paris" },
  { key: "consulate.city", label: "Ville", category: "Consulat", preview: "Paris" },
  { key: "consulate.country", label: "Pays", category: "Consulat", preview: "France" },

  // Photo
  { key: "citizen.photo", label: "Photo d'identité", category: "Photo", preview: "" },
]

export function getFieldByKey(key: string): DynamicField | undefined {
  return DYNAMIC_FIELDS.find((f) => f.key === key)
}

export function getFieldsByCategory(): Record<string, DynamicField[]> {
  const groups: Record<string, DynamicField[]> = {}
  for (const field of DYNAMIC_FIELDS) {
    if (!groups[field.category]) groups[field.category] = []
    groups[field.category].push(field)
  }
  return groups
}

// --------------------------------------------------------------------------
// Profile data resolution — maps a citizen profile to dynamic field values
// --------------------------------------------------------------------------

export interface CitizenProfileData {
  firstName?: string
  lastName?: string
  dateOfBirth?: string
  placeOfBirth?: string
  nationality?: string
  sex?: string
  photoUrl?: string | null
  // Card
  cardNumber?: string
  cardIssuedAt?: string
  cardExpiresAt?: string
  // Consulate
  consulateName?: string
  consulateCity?: string
  consulateCountry?: string
}

/**
 * Resolves a dynamic field key against a profile.
 * Returns the resolved text, or the field's preview text as fallback.
 */
export function resolveFieldValue(
  fieldKey: string,
  profile: CitizenProfileData | null
): string {
  const field = getFieldByKey(fieldKey)
  if (!field) return `{${fieldKey}}`

  // If no profile provided, fall back to preview text
  if (!profile) return field.preview

  const map: Record<string, string | undefined> = {
    "citizen.firstName": profile.firstName,
    "citizen.lastName": profile.lastName,
    "citizen.fullName":
      profile.firstName && profile.lastName
        ? `${profile.firstName} ${profile.lastName}`
        : undefined,
    "citizen.dateOfBirth": profile.dateOfBirth,
    "citizen.placeOfBirth": profile.placeOfBirth,
    "citizen.nationality": profile.nationality,
    "citizen.sex": profile.sex,
    "citizen.photo": profile.photoUrl ?? undefined,
    "card.number": profile.cardNumber,
    "card.issuedAt": profile.cardIssuedAt,
    "card.expiresAt": profile.cardExpiresAt,
    "card.qrCode": profile.cardNumber
      ? `https://consulat.ga/verify/${profile.cardNumber}`
      : undefined,
    "consulate.name": profile.consulateName,
    "consulate.city": profile.consulateCity,
    "consulate.country": profile.consulateCountry,
  }

  return map[fieldKey] ?? field.preview
}

// --------------------------------------------------------------------------
// Sample profiles for preview mode
// --------------------------------------------------------------------------

export const SAMPLE_PROFILES: { label: string; data: CitizenProfileData }[] = [
  {
    label: "Jean-Pierre MOUSSAVOU",
    data: {
      firstName: "Jean-Pierre",
      lastName: "MOUSSAVOU",
      dateOfBirth: "28/04/1967",
      placeOfBirth: "Libreville",
      nationality: "Gabonaise",
      sex: "M",
      cardNumber: "FR26280467-00001",
      cardIssuedAt: "30/03/2026",
      cardExpiresAt: "30/03/2031",
      consulateName: "Consulat du Gabon à Paris",
      consulateCity: "Paris",
      consulateCountry: "France",
    },
  },
  {
    label: "Marie-Claire ONDO NGUEMA",
    data: {
      firstName: "Marie-Claire",
      lastName: "ONDO NGUEMA",
      dateOfBirth: "15/09/1985",
      placeOfBirth: "Franceville",
      nationality: "Gabonaise",
      sex: "F",
      cardNumber: "FR26150985-00042",
      cardIssuedAt: "15/01/2026",
      cardExpiresAt: "15/01/2031",
      consulateName: "Consulat du Gabon à Marseille",
      consulateCity: "Marseille",
      consulateCountry: "France",
    },
  },
  {
    label: "Patrick NZAMBA",
    data: {
      firstName: "Patrick",
      lastName: "NZAMBA",
      dateOfBirth: "03/12/1992",
      placeOfBirth: "Port-Gentil",
      nationality: "Gabonaise",
      sex: "M",
      cardNumber: "BE26031292-00107",
      cardIssuedAt: "01/06/2026",
      cardExpiresAt: "01/06/2031",
      consulateName: "Ambassade du Gabon à Bruxelles",
      consulateCity: "Bruxelles",
      consulateCountry: "Belgique",
    },
  },
]
