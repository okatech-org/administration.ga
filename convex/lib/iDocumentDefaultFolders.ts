/**
 * Dossiers utilisateurs créés par défaut lors du premier mount d'iDocument
 * pour une org. Le set varie selon `org.type` :
 *
 * - Postes diplomatiques (Embassy, GeneralConsulate, HighCommission,
 *   HighRepresentation, PermanentMission + legacy consulate/honorary_consulate)
 *   reçoivent le set consulaire (Visas, Passeports, État Civil, …).
 *
 * - Administration centrale (Ministry, IntelligenceAgency, ThirdParty + legacy
 *   "other") reçoivent un set adapté à la supervision / pilotage.
 *
 * Les 3 dossiers Système (Mes Documents, Brouillons, Poubelle) sont créés
 * inconditionnellement par `ensureSystemFolders` indépendamment du type d'org.
 */

import { OrganizationType } from "./constants";

export interface IDocumentDefaultFolder {
  name: string;
  tags: string[];
}

export const DIPLOMATIC_DEFAULT_FOLDERS: ReadonlyArray<IDocumentDefaultFolder> = [
  { name: "Visas & Laissez-passer", tags: ["consulaire", "visa"] },
  { name: "Passeports", tags: ["consulaire", "identité"] },
  { name: "État Civil", tags: ["état-civil", "actes"] },
  { name: "Coopération Internationale", tags: ["diplomatie", "accords"] },
  { name: "Contentieux Diplomatique", tags: ["juridique", "contentieux"] },
  { name: "Finances & Budget", tags: ["fiscal", "budget"] },
];

export const CENTRAL_ADMIN_DEFAULT_FOLDERS: ReadonlyArray<IDocumentDefaultFolder> = [
  { name: "Notes & Circulaires", tags: ["communication", "interne"] },
  { name: "Directives ministérielles", tags: ["directive", "politique"] },
  { name: "Audit & Conformité", tags: ["audit", "conformité"] },
  { name: "Politiques de sécurité", tags: ["sécurité", "politique"] },
  { name: "Conventions & Accords", tags: ["juridique", "accords"] },
  { name: "Modèles & Templates", tags: ["modèle", "gabarit"] },
];

const DIPLOMATIC_TYPES: ReadonlySet<string> = new Set([
  OrganizationType.Embassy,
  OrganizationType.HighRepresentation,
  OrganizationType.GeneralConsulate,
  OrganizationType.HighCommission,
  OrganizationType.PermanentMission,
  "consulate",
  "honorary_consulate",
]);

export function getDefaultFoldersForOrgType(
  type: string | undefined | null,
): ReadonlyArray<IDocumentDefaultFolder> {
  if (type && DIPLOMATIC_TYPES.has(type)) return DIPLOMATIC_DEFAULT_FOLDERS;
  return CENTRAL_ADMIN_DEFAULT_FOLDERS;
}
