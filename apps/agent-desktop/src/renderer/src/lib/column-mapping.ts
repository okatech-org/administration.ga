/**
 * Column mapping for CSV → card template dynamic fields.
 * Ported from Agent macOS DataSourceManager concepts.
 */

export interface ColumnMapping {
  csvColumn: string
  templateField: string | null
}

/**
 * Auto-map CSV headers to template fields by name similarity.
 * Matches exact (case-insensitive) or common aliases.
 */
export function autoMap(
  csvHeaders: string[],
  templateFields: string[],
): ColumnMapping[] {
  const fieldLower = templateFields.map((f) => f.toLowerCase())

  const aliases: Record<string, string[]> = {
    firstname: ["prenom", "prénom", "first_name", "first name", "givenname"],
    lastname: ["nom", "last_name", "last name", "surname", "familyname"],
    nip: ["nip", "id", "identifiant", "identifier"],
    cardnumber: ["card_number", "card number", "numero_carte", "numéro carte"],
    photourl: ["photo", "photo_url", "image", "picture"],
    birthdate: ["date_naissance", "date naissance", "dob", "birthday"],
    nationality: ["nationalite", "nationalité", "nation"],
    passport: ["passeport", "passport_number", "passport number"],
  }

  return csvHeaders.map((header) => {
    const headerLow = header.toLowerCase().trim()

    // Exact match
    const exactIdx = fieldLower.indexOf(headerLow)
    if (exactIdx !== -1) {
      return { csvColumn: header, templateField: templateFields[exactIdx] }
    }

    // Alias match
    for (const [field, aliasList] of Object.entries(aliases)) {
      if (aliasList.includes(headerLow) || headerLow === field) {
        const fieldIdx = fieldLower.indexOf(field)
        if (fieldIdx !== -1) {
          return { csvColumn: header, templateField: templateFields[fieldIdx] }
        }
      }
    }

    return { csvColumn: header, templateField: null }
  })
}

/**
 * Apply column mappings to a CSV record, producing a field values object
 * suitable for card rendering.
 */
export function applyMappings(
  record: Record<string, string>,
  mappings: ColumnMapping[],
): Record<string, string> {
  const result: Record<string, string> = {}

  for (const mapping of mappings) {
    if (mapping.templateField && mapping.csvColumn in record) {
      result[mapping.templateField] = record[mapping.csvColumn]
    }
  }

  return result
}
