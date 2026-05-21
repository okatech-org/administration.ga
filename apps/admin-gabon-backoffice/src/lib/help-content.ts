/**
 * help-content — Dictionnaire des contenus d'aide pédagogique
 * Phase C4
 *
 * Centralise les explications affichées dans les `<HelpTooltip>` à travers
 * l'app. Chaque clé pointe vers un objet { fr, en } pour i18n.
 *
 * Usage :
 *   import { HELP } from "@/lib/help-content";
 *   <HelpTooltip content={HELP.calls.ringTimeout} />
 */

interface LocalizedHelp {
  fr: string;
  en: string;
}

export const HELP = {
  // ─── iAppel / Téléphonie ─────────────────────────────
  calls: {
    ringTimeout: {
      fr: "Durée maximale d'attente avant qu'un appel non décroché soit basculé vers la boîte vocale ou la file d'attente. Recommandé : 30-60 secondes.",
      en: "Maximum wait time before an unanswered call is sent to voicemail or queue. Recommended: 30-60 seconds.",
    },
    loadBalancing: {
      fr: "Stratégie de distribution des appels entre les agents : Broadcast (tous reçoivent), Round-robin (à tour de rôle), Least busy (le moins occupé), Priority order (selon l'ordre).",
      en: "Strategy for distributing calls to agents: Broadcast (all receive), Round-robin (in turn), Least busy, Priority order.",
    },
    recording: {
      fr: "L'enregistrement permet la relecture pour contrôle qualité et audit. Vérifiez la conformité RGPD selon la juridiction du pays hôte avant d'activer.",
      en: "Recording enables playback for quality control and audit. Check GDPR compliance based on host country jurisdiction before enabling.",
    },
    fallback: {
      fr: "Action exécutée quand aucun agent n'est disponible : boîte vocale (laisser un message), demande de rappel (crée un missedCall), raccrocher silencieusement.",
      en: "Action when no agent is available: voicemail (leave a message), callback request (creates a missedCall), or silent disconnect.",
    },
  },

  // ─── Notifications ───────────────────────────────────
  notifications: {
    quietHours: {
      fr: "Période pendant laquelle les SMS et WhatsApp ne sont pas envoyés (sauf priorité critique). Les notifications in-app et email continuent normalement.",
      en: "Period when SMS and WhatsApp are not sent (except critical priority). In-app and email notifications continue normally.",
    },
    escalation: {
      fr: "Si la notification reste sans action après le délai défini, une relance est envoyée. Au-delà du nombre max de relances, un membre superviseur est notifié.",
      en: "If notification stays without action after delay, a reminder is sent. Beyond max reminders, a supervisor membership is notified.",
    },
    smsSenderName: {
      fr: "Nom alphanumérique affiché comme expéditeur SMS via Bird. Limité à 11 caractères. La disponibilité dépend des opérateurs du pays cible.",
      en: "Alphanumeric name shown as SMS sender via Bird. Max 11 characters. Availability depends on target country operators.",
    },
  },

  // ─── iCorrespondance ─────────────────────────────────
  correspondance: {
    referencePattern: {
      fr: "Format automatique pour numéroter les correspondances. Tokens disponibles : {YYYY} année 4 chiffres, {YY} 2 chiffres, {TYPE} code du type, {NN} numéro à 5 chiffres.",
      en: "Auto-format for numbering correspondance. Tokens: {YYYY} 4-digit year, {YY} 2-digit, {TYPE} type code, {NN} 5-digit number.",
    },
    autoRouting: {
      fr: "Quand activé, les correspondances suivent automatiquement la chaîne hiérarchique des postes (rédacteur → superviseur → chef de poste).",
      en: "When enabled, correspondance automatically follows the hierarchical chain of positions (drafter → supervisor → head of mission).",
    },
    watermark: {
      fr: "Filigrane appliqué en diagonale sur les documents générés. Utile pour marquer 'COPIE', 'BROUILLON', 'CONFIDENTIEL'.",
      en: "Watermark applied diagonally on generated documents. Useful for marking 'COPY', 'DRAFT', 'CONFIDENTIAL'.",
    },
  },

  // ─── iAsted ──────────────────────────────────────────
  iasted: {
    persona: {
      fr: "Identité visible par les citoyens. Le ton (formel/professionnel/chaleureux/concis) est appliqué automatiquement aux réponses générées.",
      en: "Identity visible to citizens. The tone (formal/professional/warm/concise) is automatically applied to generated responses.",
    },
    systemPrompt: {
      fr: "Instructions Markdown ajoutées au prompt système Gemini à chaque conversation. Permet de contextualiser pour cette représentation (services prioritaires, procédures locales).",
      en: "Markdown instructions added to Gemini system prompt for each conversation. Enables contextualization for this representation.",
    },
    toolsPolicy: {
      fr: "Whitelist (cocher les autorisés), Blacklist (cocher les interdits), All (tous activés). Le mode 'all' est plus permissif mais plus risqué.",
      en: "Whitelist (check allowed), Blacklist (check forbidden), All (all enabled). 'All' mode is more permissive but riskier.",
    },
    escalation: {
      fr: "Quand le citoyen tape un mot-clé sensible ou exprime de la frustration, iAsted propose un transfert vers un agent humain via une ligne d'appel ou un chat direct.",
      en: "When citizen types a sensitive keyword or expresses frustration, iAsted proposes handoff to a human agent via call line or direct chat.",
    },
    quotas: {
      fr: "Limite le nombre de messages par citoyen et par jour pour éviter abus. Limite les tokens totaux pour contrôler les coûts Gemini.",
      en: "Limits messages per citizen per day to prevent abuse. Caps total tokens to control Gemini costs.",
    },
  },

  // ─── Calendrier ──────────────────────────────────────
  calendar: {
    serviceHours: {
      fr: "Horaires d'ouverture par service. Les services sans horaire spécifique utilisent l'horaire 'default' de la représentation.",
      en: "Opening hours per service. Services without specific schedule use the representation's 'default' hours.",
    },
    holidays: {
      fr: "Jours fériés Gabon (officiels nationaux), pays hôte (selon juridiction) ou personnalisés. Les RDV ne peuvent pas être pris ces jours-là.",
      en: "Public holidays for Gabon (national), host country (per jurisdiction), or custom. Appointments cannot be booked on these days.",
    },
    appointmentLeadTime: {
      fr: "Délai minimum entre la prise de RDV et la date du RDV. Évite les RDV de dernière minute. Recommandé : 24h pour standard, 2h pour urgence.",
      en: "Minimum delay between booking and appointment date. Prevents last-minute bookings. Recommended: 24h standard, 2h urgent.",
    },
  },

  // ─── Modules ─────────────────────────────────────────
  modules: {
    coreModules: {
      fr: "Les modules fondamentaux (org, requests, profiles, settings) ne peuvent pas être désactivés car ils sont nécessaires au fonctionnement minimal.",
      en: "Core modules (org, requests, profiles, settings) cannot be disabled as they are required for minimal operation.",
    },
    capabilities: {
      fr: "Sous-fonctionnalités d'un module. Permet d'activer un module avec uniquement certaines capacités (ex: 'consular_registrations.view' sans 'manage').",
      en: "Sub-features of a module. Allows enabling a module with only certain capabilities.",
    },
    impactAnalysis: {
      fr: "Avant désactivation, le système analyse l'impact : postes ayant des tâches du module, services actifs liés, demandes en cours. Empêche les orphelins.",
      en: "Before deactivation, system analyzes impact: positions with module tasks, active linked services, pending requests. Prevents orphans.",
    },
  },

  // ─── Services ────────────────────────────────────────
  services: {
    pricing: {
      fr: "Tarif appliqué au citoyen pour ce service (EUR/USD/XAF supportés).",
      en: "Fee applied to citizen for this service (EUR/USD/XAF supported).",
    },
    sla: {
      fr: "Délai de traitement indicatif communiqué au citoyen. Utilisé pour les alertes 'demande en retard' dans le dashboard.",
      en: "Indicative processing time communicated to citizen. Used for 'overdue request' alerts in dashboard.",
    },
    serviceAccess: {
      fr: "Restreint le service à certains postes uniquement. Si vide, tout poste avec la permission requests.process peut le traiter.",
      en: "Restricts the service to specific positions only. If empty, any position with requests.process permission can handle it.",
    },
  },

  // ─── Branding ────────────────────────────────────────
  branding: {
    colors: {
      fr: "Palette utilisée sur la page publique de la représentation. Par défaut : couleurs du Gabon (vert/jaune/bleu).",
      en: "Palette used on the public page. Default: Gabon colors (green/yellow/blue).",
    },
    publicDescription: {
      fr: "Description visible par tous les visiteurs de la page publique. Recommandé en français + langue du pays hôte.",
      en: "Description visible to all visitors of the public page. Recommended in French + host country language.",
    },
  },
} as const satisfies Record<string, Record<string, LocalizedHelp>>;

export type HelpKey = keyof typeof HELP;

/**
 * Helper pour résoudre un contenu d'aide selon la langue active.
 */
export function getHelpContent(
  content: LocalizedHelp,
  lang: "fr" | "en",
): string {
  return content[lang] ?? content.fr;
}
