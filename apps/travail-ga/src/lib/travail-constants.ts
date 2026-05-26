/**
 * Constantes métier TRAVAIL.GA — provinces, contrats, types d'émetteur.
 * Source : design Claude `data.js`. Typages stricts pour les composants.
 */

export const PROVINCES = [
  { code: "ESTUAIRE", label: "Estuaire" },
  { code: "HAUT_OGOOUE", label: "Haut-Ogooué" },
  { code: "MOYEN_OGOOUE", label: "Moyen-Ogooué" },
  { code: "NGOUNIE", label: "Ngounié" },
  { code: "NYANGA", label: "Nyanga" },
  { code: "OGOOUE_IVINDO", label: "Ogooué-Ivindo" },
  { code: "OGOOUE_LOLO", label: "Ogooué-Lolo" },
  { code: "OGOOUE_MARITIME", label: "Ogooué-Maritime" },
  { code: "WOLEU_NTEM", label: "Woleu-Ntem" },
] as const;

export const CONTRATS = {
  CDI: "CDI",
  CDD: "CDD",
  STAGE: "Stage",
  ALTERNANCE: "Alternance",
  INTERIM: "Intérim",
  INSERTION: "Insertion",
  INDEPENDANT: "Indépendant",
} as const;

export const TYPE_EMETTEUR = {
  ENTREPRISE: { label: "Entreprise", tone: "blue" },
  ADMINISTRATION: { label: "Administration", tone: "emerald" },
  PARTICULIER: { label: "Particulier", tone: "ember" },
} as const;

export type ProvinceCode = (typeof PROVINCES)[number]["code"];
export type ContratCode = keyof typeof CONTRATS;
export type EmetteurCode = keyof typeof TYPE_EMETTEUR;
