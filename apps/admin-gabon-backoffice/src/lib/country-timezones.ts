/**
 * country-timezones — Mapping pays ISO 3166-1 → timezone IANA principale
 *
 * Utilisé pour pré-remplir le timezone d'une représentation lors de sa création
 * en se basant sur le pays d'accueil. Couvre les pays où le Gabon a généralement
 * des représentations diplomatiques + les principaux pays de la diaspora.
 */

export const COUNTRY_TIMEZONES: Record<string, string> = {
  // Afrique
  GA: "Africa/Libreville", // Gabon
  CM: "Africa/Douala",
  CG: "Africa/Brazzaville",
  CD: "Africa/Kinshasa",
  CF: "Africa/Bangui",
  TD: "Africa/Ndjamena",
  GQ: "Africa/Malabo",
  ST: "Africa/Sao_Tome",
  AO: "Africa/Luanda",
  CI: "Africa/Abidjan",
  SN: "Africa/Dakar",
  ML: "Africa/Bamako",
  BF: "Africa/Ouagadougou",
  NE: "Africa/Niamey",
  BJ: "Africa/Porto-Novo",
  TG: "Africa/Lome",
  GH: "Africa/Accra",
  NG: "Africa/Lagos",
  MA: "Africa/Casablanca",
  DZ: "Africa/Algiers",
  TN: "Africa/Tunis",
  EG: "Africa/Cairo",
  ZA: "Africa/Johannesburg",
  KE: "Africa/Nairobi",
  ET: "Africa/Addis_Ababa",

  // Europe
  FR: "Europe/Paris",
  BE: "Europe/Brussels",
  CH: "Europe/Zurich",
  ES: "Europe/Madrid",
  PT: "Europe/Lisbon",
  IT: "Europe/Rome",
  DE: "Europe/Berlin",
  GB: "Europe/London",
  NL: "Europe/Amsterdam",
  RU: "Europe/Moscow",
  AT: "Europe/Vienna",
  PL: "Europe/Warsaw",
  GR: "Europe/Athens",
  RO: "Europe/Bucharest",
  TR: "Europe/Istanbul",
  UA: "Europe/Kyiv",

  // Amériques
  US: "America/New_York",
  CA: "America/Toronto",
  MX: "America/Mexico_City",
  BR: "America/Sao_Paulo",
  AR: "America/Argentina/Buenos_Aires",
  CL: "America/Santiago",
  CO: "America/Bogota",
  PE: "America/Lima",
  CU: "America/Havana",
  HT: "America/Port-au-Prince",

  // Asie
  CN: "Asia/Shanghai",
  JP: "Asia/Tokyo",
  KR: "Asia/Seoul",
  IN: "Asia/Kolkata",
  PK: "Asia/Karachi",
  BD: "Asia/Dhaka",
  TH: "Asia/Bangkok",
  VN: "Asia/Ho_Chi_Minh",
  ID: "Asia/Jakarta",
  PH: "Asia/Manila",
  MY: "Asia/Kuala_Lumpur",
  SG: "Asia/Singapore",
  AE: "Asia/Dubai",
  SA: "Asia/Riyadh",
  IR: "Asia/Tehran",
  IL: "Asia/Jerusalem",
  IQ: "Asia/Baghdad",
  LB: "Asia/Beirut",
  SY: "Asia/Damascus",
  JO: "Asia/Amman",

  // Océanie
  AU: "Australia/Sydney",
  NZ: "Pacific/Auckland",
  FJ: "Pacific/Fiji",
};

/**
 * Suggère un timezone IANA basé sur le code pays ISO.
 * Retourne null si pas de mapping connu (UI doit alors demander manuellement).
 */
export function suggestTimezoneFromCountry(
  countryCode: string,
): string | null {
  const upper = countryCode.toUpperCase();
  return COUNTRY_TIMEZONES[upper] ?? null;
}
