/**
 * Dynamic fields — organized by print entity.
 *
 * A "print entity" defines what kind of document we're printing.
 * Each entity has its own set of dynamic fields that can be placed
 * on the card template. When the user creates a new template, they
 * pick an entity, and the available fields are filtered accordingly.
 *
 * For now: only "carte-consulaire" (consular card with citizen profile fields).
 * Future: "badge-evenement", "carte-membre-association", etc.
 */

// ─── Types ──────────────────────────────────────────────────────

export interface DynamicField {
  key: string
  label: string
  category: string
  preview: string // Sample text for design preview
  type?: "text" | "image" | "qrCode" | "barcode" // Element type hint for auto-creation
}

export interface PrintEntity {
  id: string
  name: string
  description: string
  icon: "credit-card" | "ticket" | "badge" | "file"
  fields: DynamicField[]
  sampleProfiles: { label: string; data: CitizenProfileData }[]
}

// ─── Carte Consulaire Fields ────────────────────────────────────

const CARTE_CONSULAIRE_FIELDS: DynamicField[] = [
  // Identity
  { key: "citizen.firstName", label: "Prénom", category: "Identité", preview: "Jean-Pierre" },
  { key: "citizen.lastName", label: "Nom", category: "Identité", preview: "MOUSSAVOU" },
  { key: "citizen.fullName", label: "Nom complet", category: "Identité", preview: "Jean-Pierre MOUSSAVOU" },
  { key: "citizen.dateOfBirth", label: "Date de naissance", category: "Identité", preview: "28/04/1967" },
  { key: "citizen.placeOfBirth", label: "Lieu de naissance", category: "Identité", preview: "Libreville" },
  { key: "citizen.nationality", label: "Nationalité", category: "Identité", preview: "Gabonaise" },
  { key: "citizen.sex", label: "Sexe", category: "Identité", preview: "M" },
  { key: "citizen.nip", label: "NIP", category: "Identité", preview: "NIP : 28GA18922" },

  // Document
  { key: "card.number", label: "N° Carte", category: "Document", preview: "FR26280467-00001" },
  { key: "card.issuedAt", label: "Date d'émission", category: "Document", preview: "30/03/2026" },
  { key: "card.expiresAt", label: "Date d'expiration", category: "Document", preview: "30/03/2031" },
  { key: "card.qrCode", label: "QR Code vérification", category: "Document", preview: "https://consulat.ga/verify/FR26280467-00001", type: "qrCode" },

  // Consulate
  { key: "consulate.name", label: "Nom du consulat", category: "Consulat", preview: "Consulat du Gabon à Paris" },
  { key: "consulate.city", label: "Ville", category: "Consulat", preview: "Paris" },
  { key: "consulate.country", label: "Pays", category: "Consulat", preview: "France" },

  // Photo
  { key: "citizen.photo", label: "Photo d'identité", category: "Photo", preview: "", type: "image" },
]

const CARTE_CONSULAIRE_SAMPLES: { label: string; data: CitizenProfileData }[] = [
  {
    label: "Jean-Pierre MOUSSAVOU",
    data: {
      firstName: "Jean-Pierre",
      lastName: "MOUSSAVOU",
      dateOfBirth: "28/04/1967",
      placeOfBirth: "Libreville",
      nationality: "Gabonaise",
      sex: "M",
      nip: "28GA18922",
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
      nip: "15GA19852",
      cardNumber: "FR26150985-00042",
      cardIssuedAt: "15/01/2026",
      cardExpiresAt: "15/01/2031",
      consulateName: "Consulat du Gabon à Marseille",
      consulateCity: "Marseille",
      consulateCountry: "France",
    },
  },
]

// ─── Entity Registry ────────────────────────────────────────────

export const PRINT_ENTITIES: PrintEntity[] = [
  {
    id: "carte-consulaire",
    name: "Carte Consulaire",
    description: "Carte d'inscription consulaire avec données du profil citoyen",
    icon: "credit-card",
    fields: CARTE_CONSULAIRE_FIELDS,
    sampleProfiles: CARTE_CONSULAIRE_SAMPLES,
  },
  // Future entities:
  // { id: "badge-evenement", name: "Badge Événement", ... },
  // { id: "carte-membre", name: "Carte Membre Association", ... },
]

export function getEntityById(id: string): PrintEntity | undefined {
  return PRINT_ENTITIES.find((e) => e.id === id)
}

// ─── Compatibility: flat list of all fields (for existing code) ─

export const DYNAMIC_FIELDS: DynamicField[] = CARTE_CONSULAIRE_FIELDS

export function getFieldByKey(key: string, entityId?: string): DynamicField | undefined {
  if (entityId) {
    const entity = getEntityById(entityId)
    return entity?.fields.find((f) => f.key === key)
  }
  return DYNAMIC_FIELDS.find((f) => f.key === key)
}

export function getFieldsByCategory(entityId?: string): Record<string, DynamicField[]> {
  const fields = entityId ? (getEntityById(entityId)?.fields ?? DYNAMIC_FIELDS) : DYNAMIC_FIELDS
  const groups: Record<string, DynamicField[]> = {}
  for (const field of fields) {
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
  nip?: string
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
    "citizen.nip": profile.nip ? `NIP : ${profile.nip}` : undefined,
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
// Sample profiles for preview mode — sourced from entity definitions
// --------------------------------------------------------------------------

export const SAMPLE_PROFILES = CARTE_CONSULAIRE_SAMPLES

/** Get sample profiles for a specific entity (or default) */
export function getSampleProfiles(entityId?: string): { label: string; data: CitizenProfileData }[] {
  if (entityId) {
    const entity = getEntityById(entityId)
    if (entity) return entity.sampleProfiles
  }
  return SAMPLE_PROFILES
}
