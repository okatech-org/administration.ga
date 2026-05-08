/**
 * Routes Manifest for AI Assistant
 *
 * Source de vérité des routes connues par l'IA pour la navigation (`navigateTo`).
 * Le monorepo héberge 3 apps Next.js (App Router) avec des espaces d'URL distincts :
 *   - citizen-web    → PUBLIC_ROUTES + MY_SPACE_ROUTES
 *   - agent-web      → AGENT_ROUTES        (anciennement "ADMIN_ROUTES", servies au root)
 *   - backoffice-web → BACKOFFICE_ROUTES   (anciennement "DASHBOARD_ROUTES", servies au root)
 *
 * Convention de placeholder pour les routes paramétrées : `$paramName` (ex. `$reference`,
 * `$serviceId`). L'IA remplace par la vraie valeur avant d'appeler `navigateTo`.
 *
 * Mettre à jour ce fichier à chaque ajout/suppression/renommage de route dans une des apps.
 */

// ============================================================================
// citizen-web — pages publiques (route group `(public)`)
// ============================================================================
export const PUBLIC_ROUTES: Record<string, string> = {
  "/": "Page d'accueil du portail consulaire",
  "/services": "Liste de tous les services consulaires",
  "/services/$slug":
    "Détail d'un service spécifique (remplacer $slug par le slug du service)",
  "/news": "Actualités et annonces du consulat",
  "/news/$slug": "Article d'actualité spécifique",
  "/reps": "Liste des représentations diplomatiques (ambassades/consulats)",
  "/reps/$slug": "Détail d'une représentation diplomatique",
  "/faq": "Questions fréquentes",
  "/tarifs": "Tarifs des services consulaires",
  "/formulaires": "Formulaires téléchargeables",
  "/accessibilite": "Déclaration d'accessibilité",
  "/confidentialite": "Politique de confidentialité",
  "/mentions-legales": "Mentions légales",
  "/ressources": "Centre de ressources pour la diaspora",
  "/ressources/$slug": "Page de ressource spécifique",
  "/ressources/guides/arrivee":
    "Guide pratique : arrivée en France (installation, démarches initiales)",
  "/ressources/guides/retour":
    "Guide pratique : retour au Gabon (préparation, formalités)",
  "/ressources/guides/vie-pratique":
    "Guide pratique : vie quotidienne de la diaspora gabonaise",
};

// ============================================================================
// citizen-web — espace personnel authentifié (`/my-space/*`)
// ============================================================================
export const MY_SPACE_ROUTES: Record<string, string> = {
  "/my-space": "Tableau de bord de l'espace personnel",
  "/my-space/profile/edit": "Modifier mon profil consulaire",
  "/my-space/services": "Catalogue des services consulaires disponibles",
  "/my-space/services/$slug/new": "Démarrer une nouvelle demande pour un service",
  "/my-space/services-demarches":
    "Vue combinée services + démarches en cours",
  "/my-space/requests": "Mes demandes de services (suivi timeline)",
  "/my-space/requests/$reference":
    "Détail d'une demande (remplacer $reference par la référence de la demande)",
  "/my-space/requests/$reference/appointment":
    "Prendre un rendez-vous lié à une demande",
  "/my-space/demarches": "Mes démarches (dossiers consulaires en cours)",
  "/my-space/demarches/new": "Démarrer une nouvelle démarche",
  "/my-space/demarches/$dossierId": "Détail d'un dossier de démarche",
  "/my-space/appointments": "Mes rendez-vous",
  "/my-space/appointments/new": "Prendre un nouveau rendez-vous",
  "/my-space/appointments/book": "Réserver un créneau de rendez-vous",
  "/my-space/appointments/$appointmentId": "Détail d'un rendez-vous",
  "/my-space/appointments/$appointmentId/join":
    "Rejoindre la salle d'un rendez-vous (visio LiveKit)",
  "/my-space/appointments/$appointmentId/reschedule":
    "Reprogrammer un rendez-vous",
  "/my-space/meetings": "Mes réunions et visioconférences",
  "/my-space/notifications": "Mes notifications",
  "/my-space/iagenda": "iAgenda — agenda personnel (RDV, réunions, événements)",
  "/my-space/idocument":
    "iDocument — coffre-fort numérique de mes documents officiels",
  "/my-space/iasted": "iAsted — assistant IA personnel du citoyen",
  "/my-space/vault": "Mon coffre-fort numérique (alias historique de iDocument)",
  "/my-space/children": "Mes enfants mineurs",
  "/my-space/children/$childId": "Détail d'un enfant mineur",
  "/my-space/associations": "Mes associations",
  "/my-space/associations/$slug":
    "Détail d'une association (remplacer $slug par le slug de l'association)",
  "/my-space/companies": "Mes entreprises",
  "/my-space/companies/$id":
    "Détail d'une entreprise (remplacer $id par l'identifiant)",
  "/my-space/cv": "Mon CV consulaire (iVC)",
  "/my-space/support": "Mes tickets de support",
  "/my-space/support/new": "Créer un nouveau ticket de support",
  "/my-space/support/$ticketId": "Détail d'un ticket de support",
  "/my-space/settings": "Paramètres du compte",
};

// ============================================================================
// agent-web — application des agents consulaires (toutes routes au root)
//
// ⚠️  Conservé sous le nom historique `ADMIN_ROUTES` pour la compat des imports,
//     mais les chemins n'ont PLUS de préfixe `/admin/*` — l'app sert au root.
// ============================================================================
export const ADMIN_ROUTES: Record<string, string> = {
  "/": "Tableau de bord de l'agent (vue d'accueil de l'agent-web)",
  "/downloads": "Téléchargements et exports de l'agent",
  "/calls": "Historique et gestion des appels téléphoniques / visio",
  "/statistics": "Statistiques et rapports de l'organisation",
  "/settings": "Paramètres du consulat / de l'agent",
  "/settings/ai-assistant": "Configuration de l'assistant IA (iAsted)",
  "/settings/signature": "Configuration de la signature électronique",
  "/posts": "Gestion des actualités/publications",
  "/posts/new": "Créer une nouvelle actualité",
  "/posts/$postId/edit": "Modifier une actualité",
  "/requests": "Gestion des demandes de services des citoyens",
  "/requests/$reference":
    "Traiter une demande spécifique (remplacer $reference par la référence)",
  "/appointments": "Gestion des rendez-vous",
  "/appointments/new": "Créer un nouveau rendez-vous",
  "/appointments/$appointmentId": "Détail d'un rendez-vous",
  "/appointments/$appointmentId/reschedule": "Reprogrammer un rendez-vous",
  "/appointments/agent-schedules": "Plannings des agents",
  "/appointments/waitlist": "Liste d'attente des rendez-vous",
  "/appointments/print": "Impression des rendez-vous",
  "/consular-registry": "Registre consulaire (citoyens immatriculés)",
  "/consular-registry/print-queue": "File d'impression des cartes consulaires",
  "/profiles/$profileId": "Profil détaillé d'un citoyen / opérateur",
  "/services": "Services proposés par le consulat",
  "/services/$serviceId/edit": "Modifier un service",
  "/team": "Équipe consulaire",
  "/team/agents/$membershipId": "Détail d'un agent membre de l'équipe",
  "/meetings": "Réunions et visioconférences",
  "/icorrespondance":
    "iCorrespondance — gestion des correspondances officielles entrantes/sortantes",
  "/iagenda": "iAgenda — agenda partagé de l'organisation",
  "/iarchive": "iArchive — archives documentaires consulaires",
  "/iasted": "iAsted — assistant IA des agents",
  "/idocument": "iDocument — gestion documentaire de l'organisation",
  "/iprofil": "iProfil — gestion des profils citoyens et opérateurs",
  "/itemplates": "Modèles de documents (templates)",
  "/itemplates/$templateId": "Détail/édition d'un modèle de document",
  "/affaires-consulaires":
    "Module Affaires Consulaires — pipeline de traitement des dossiers consulaires",
  "/affaires-consulaires/profiles":
    "Profils citoyens dans le pipeline consulaire",
  "/affaires-consulaires/profiles/$profileId":
    "Profil détaillé d'un citoyen dans le pipeline",
  "/affaires-diplomatiques":
    "Module Affaires Diplomatiques — pipeline de coopération avec les opérateurs économiques",
  "/affaires-diplomatiques/cibles":
    "Cibles diplomatiques (opérateurs ciblés pour coopération)",
  "/affaires-diplomatiques/$targetId":
    "Détail d'une cible diplomatique (opérateur)",
  "/affaires-diplomatiques/rapports": "Rapports de réunions diplomatiques",
  "/affaires-diplomatiques/projets": "Projets de coopération diplomatique",
  "/affaires-diplomatiques/plans":
    "Plans stratégiques diplomatiques (méthodologie OkaTech)",
  "/affaires-diplomatiques/lettres": "Lettres diplomatiques officielles",
  "/ai-assistant/activity":
    "Journal d'activité de l'assistant IA (actions exécutées, conversations)",
};

// ============================================================================
// backoffice-web — console super-admin / ministère (toutes routes au root)
//
// ⚠️  Conservé sous le nom historique `DASHBOARD_ROUTES` pour la compat des
//     imports, mais les chemins n'ont PLUS de préfixe `/dashboard/*`.
// ============================================================================
export const DASHBOARD_ROUTES: Record<string, string> = {
  "/": "Tableau de bord backoffice (super-admin / ministère)",
  "/reps": "Gestion des représentations diplomatiques (orgs)",
  "/reps/new": "Créer une nouvelle représentation",
  "/reps/$orgId": "Détail d'une représentation",
  "/reps/$orgId/edit": "Modifier une représentation",
  "/reps/$orgId/branding": "Configurer le branding d'une représentation",
  "/users": "Gestion des utilisateurs système",
  "/users/$userId": "Détail d'un utilisateur",
  "/profiles": "Liste globale des profils citoyens",
  "/profiles/$profileId": "Détail d'un profil citoyen",
  "/associations": "Gestion globale des associations",
  "/services": "Catalogue global des services",
  "/services/new": "Créer un nouveau service",
  "/services/$serviceId/edit": "Modifier un service",
  "/services/$serviceId/form-builder":
    "Constructeur de formulaire pour un service",
  "/posts": "Actualités globales",
  "/posts/new": "Créer une actualité",
  "/posts/$postId/edit": "Modifier une actualité",
  "/requests": "Vue globale des demandes (cross-org)",
  "/requests/$requestId": "Détail d'une demande (vue super-admin)",
  "/appointments": "Vue globale des rendez-vous",
  "/appointments/reports": "Rapports analytiques sur les rendez-vous",
  "/events": "Gestion des événements consulaires",
  "/events/new": "Créer un nouvel événement",
  "/events/$eventId/edit": "Modifier un événement",
  "/tutorials": "Tutoriels et documentation utilisateur",
  "/tutorials/new": "Créer un nouveau tutoriel",
  "/tutorials/$tutorialId/edit": "Modifier un tutoriel",
  "/support": "Tickets de support (vue super-admin)",
  "/support/$ticketId": "Détail d'un ticket de support",
  "/affaires-consulaires":
    "Module Affaires Consulaires (vue super-admin cross-org)",
  "/affaires-diplomatiques":
    "Module Affaires Diplomatiques (vue super-admin cross-org)",
  "/iagenda": "iAgenda — vue super-admin",
  "/icorrespondance": "iCorrespondance — vue super-admin",
  "/idocument": "iDocument — vue super-admin",
  "/ai/contacts":
    "Carnet de contacts de l'IA (entités connues, opérateurs, partenaires)",
  "/monitoring": "Monitoring système et métriques techniques",
  "/audit-logs": "Logs d'audit (toutes actions tracées)",
  "/config/modules": "Configuration des modules métier",
  "/config/positions": "Configuration des postes/fonctions consulaires",
  "/config/print-settings":
    "Configuration de l'impression (cartes, badges, étiquettes)",
  "/config/representations":
    "Configuration globale des représentations diplomatiques",
  "/config/services": "Configuration du catalogue services",
  "/config/templates": "Modèles de documents (templates globaux)",
  "/config/templates/new": "Créer un nouveau modèle de document",
  "/config/templates/$templateId": "Détail/édition d'un modèle",
  "/config/templates/$templateId/versions":
    "Versions historiques d'un modèle de document",
  "/settings": "Paramètres globaux du backoffice",
};

// All routes combined (utilisé uniquement pour des outils de validation cross-app
// ou des tests ; pour la navigation runtime, toujours scoper via `getRoutesForApp`).
export const ALL_ROUTES = {
  ...PUBLIC_ROUTES,
  ...MY_SPACE_ROUTES,
  ...ADMIN_ROUTES,
  ...DASHBOARD_ROUTES,
} as const;

// ============================================================================
// Scoping par app
//
// `navigateTo` côté client utilise `next/navigation`'s `router.push()` qui ne
// traverse PAS les frontières d'app (chaque app est déployée à son propre
// domaine). On scope donc les routes exposées à l'IA en fonction de l'app
// dans laquelle tourne le chat.
// ============================================================================
export type AppScope = "citizen" | "agent" | "backoffice";

export function getRoutesForApp(app: AppScope): Record<string, string> {
  switch (app) {
    case "citizen":
      return { ...PUBLIC_ROUTES, ...MY_SPACE_ROUTES };
    case "agent":
      return { ...ADMIN_ROUTES };
    case "backoffice":
      return { ...DASHBOARD_ROUTES };
  }
}

const APP_LABEL: Record<AppScope, string> = {
  citizen: "espace citoyen (citizen-web)",
  agent: "console agent consulaire (agent-web)",
  backoffice: "backoffice super-admin / ministère (backoffice-web)",
};

/**
 * Génère la section "ROUTES DISPONIBLES" du system prompt, scopée à l'app
 * dans laquelle le chat est exécuté.
 */
export function generateRoutesPromptSection(app: AppScope): string {
  const routes = getRoutesForApp(app);
  const routesList = Object.entries(routes)
    .map(([path, desc]) => `- ${path}: ${desc}`)
    .join("\n");

  return `
ROUTES DISPONIBLES (${APP_LABEL[app]}):
Tu peux naviguer l'utilisateur vers ces pages avec la fonction navigateTo.
Tu ne peux PAS naviguer en dehors de cette app — toute autre URL sera ignorée.

${routesList}

Pour les routes avec paramètres ($slug, $reference, $appointmentId, etc.), remplace par la vraie valeur.
Exemple: navigateTo({ route: "/my-space/requests/REQ-2026-001" }) pour voir une demande spécifique.`;
}

// Liste des patterns valides pour validation runtime (toutes apps confondues).
export const VALID_ROUTE_PATTERNS = Object.keys(ALL_ROUTES);
