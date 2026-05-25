/**
 * Catalogue client-side des modules metier PNPE.
 *
 * Mirror des codes/labels/routes de `convex/lib/pnpeModules.ts` accessible
 * cote frontend sans dependre du runtime Convex. Doit etre maintenu en
 * synchronisation manuelle (les codes sont source de verite cote backend).
 */
import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  CheckSquare,
  ClipboardCheck,
  Flag,
  GraduationCap,
  Inbox,
  LineChart,
  Lightbulb,
  ListChecks,
  Network,
  PhoneCall,
  ShieldCheck,
  Target,
  Users,
  UsersRound,
} from "lucide-react";

export type PnpeModuleClient = {
  code: string;
  label: string;
  route: string;
  icon: LucideIcon;
  category: string;
};

export const PNPE_MODULES_CLIENT: Record<string, PnpeModuleClient> = {
  validation_de: {
    code: "validation_de",
    label: "File d'attente",
    route: "/conseiller/file-d-attente",
    icon: Inbox,
    category: "demandeurs",
  },
  portefeuille_de: {
    code: "portefeuille_de",
    label: "Mes D.E",
    route: "/conseiller/mes-demandeurs",
    icon: Users,
    category: "demandeurs",
  },
  bilan_competences: {
    code: "bilan_competences",
    label: "Bilans de competences",
    route: "/conseiller/bilans",
    icon: ClipboardCheck,
    category: "demandeurs",
  },
  verification_employeur: {
    code: "verification_employeur",
    label: "Employeurs",
    route: "/conseiller/employeurs",
    icon: Briefcase,
    category: "employeurs",
  },
  prospection_entreprises: {
    code: "prospection_entreprises",
    label: "Prospection",
    route: "/conseiller/prospection",
    icon: PhoneCall,
    category: "employeurs",
  },
  moderation_offres: {
    code: "moderation_offres",
    label: "Offres a valider",
    route: "/conseiller/offres-a-valider",
    icon: ListChecks,
    category: "offres",
  },
  moderation_signalements: {
    code: "moderation_signalements",
    label: "Signalements",
    route: "/conseiller/moderation",
    icon: Flag,
    category: "offres",
  },
  matching_iaste: {
    code: "matching_iaste",
    label: "Matching iAsted",
    route: "/conseiller/matching",
    icon: Target,
    category: "offres",
  },
  sessions_bmc: {
    code: "sessions_bmc",
    label: "Sessions BMC",
    route: "/auto-emploi/formation",
    icon: GraduationCap,
    category: "auto-emploi",
  },
  suivi_porteurs: {
    code: "suivi_porteurs",
    label: "Porteurs de projet",
    route: "/auto-emploi/suivi",
    icon: Lightbulb,
    category: "auto-emploi",
  },
  suivi_contrats: {
    code: "suivi_contrats",
    label: "Contrats",
    route: "/conseiller/contrats",
    icon: CheckSquare,
    category: "formation",
  },
  pilotage_antenne: {
    code: "pilotage_antenne",
    label: "Pilotage antenne",
    route: "/conseiller/pilotage-antenne",
    icon: ShieldCheck,
    category: "pilotage",
  },
  gestion_antennes: {
    code: "gestion_antennes",
    label: "Reseau antennes",
    route: "/pnpe/antennes",
    icon: Network,
    category: "pilotage",
  },
  gestion_personnel: {
    code: "gestion_personnel",
    label: "Personnel",
    route: "/pnpe/personnel",
    icon: UsersRound,
    category: "pilotage",
  },
  reporting_ministere: {
    code: "reporting_ministere",
    label: "Reporting",
    route: "/pnpe/reporting",
    icon: LineChart,
    category: "reporting",
  },
};

export const CATEGORY_LABELS: Record<string, string> = {
  demandeurs: "Demandeurs",
  employeurs: "Employeurs",
  offres: "Offres",
  "auto-emploi": "Auto-Emploi",
  formation: "Formation",
  pilotage: "Pilotage",
  reporting: "Reporting",
};

export const CATEGORY_ORDER = [
  "demandeurs",
  "employeurs",
  "offres",
  "auto-emploi",
  "formation",
  "pilotage",
  "reporting",
];
