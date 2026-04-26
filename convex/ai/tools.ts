/**
 * AI Assistant Tool Definitions for Gemini Function Calling
 * Each tool maps to a Convex query/mutation
 */
import { getRoutesForApp } from "./routes_manifest";

// Ces tools sont consommés par citizen-web uniquement — `navigateTo` est donc
// scopé sur les routes citizen (PUBLIC + MY_SPACE). Les apps staff utilisent
// `adminTools` (cf. `getAdminTools`).
const CITIZEN_ROUTES = getRoutesForApp("citizen");

// Tool names that require user confirmation before execution
export const MUTATIVE_TOOLS = [
  "updateProfile",
  "createRequest",
  "cancelRequest",
  "markNotificationRead",
  "markAllNotificationsRead",
  "sendMail",
  "markMailRead",
  "createAssociation",
  "createCompany",
  "respondToAssociationInvite",
  // CV mutations
  "updateCV",
  "addCVExperience",
  "addCVEducation",
  "addCVSkill",
  "addCVLanguage",
  // CV AI actions
  "improveCVSummary",
  "suggestCVSkills",
  "optimizeCV",
  "generateCoverLetter",
  "getCVATSScore",
] as const;

// Tool names that are UI actions (handled by frontend)
export const UI_TOOLS = ["navigateTo", "fillForm"] as const;

// Gemini FunctionDeclaration format
export const tools = [
  // ============ READ TOOLS (no confirmation) ============
  {
    name: "getProfile",
    description:
      "Récupère le profil consulaire complet de l'utilisateur connecté, incluant identité, passeport, adresses, famille et documents.",
    parameters: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "getServices",
    description:
      "Liste les services consulaires disponibles. Peut filtrer par catégorie.",
    parameters: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          description:
            "Catégorie de service: identity, travel, civil_status, legalization, social, registration",
        },
      },
    },
  },
  {
    name: "getRequests",
    description:
      "Liste les demandes de services de l'utilisateur connecté avec leur statut actuel.",
    parameters: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          description:
            "Filtrer par statut: draft, submitted, processing, completed, rejected, cancelled",
        },
      },
    },
  },
  {
    name: "getAppointments",
    description:
      "Liste les rendez-vous planifiés de l'utilisateur avec le consulat.",
    parameters: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "getNotifications",
    description:
      "Liste les notifications récentes de l'utilisateur (messages, mises à jour de statut, actions requises).",
    parameters: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description:
            "Nombre maximum de notifications à retourner (défaut: 10)",
        },
      },
    },
  },
  {
    name: "getUnreadNotificationCount",
    description:
      "Retourne le nombre de notifications non lues de l'utilisateur.",
    parameters: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "getUserContext",
    description:
      "Récupère le contexte complet de l'utilisateur: profil, carte consulaire, demande active, et compteur de notifications. Utilise cet outil pour avoir une vue d'ensemble de la situation de l'utilisateur.",
    parameters: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "getServicesByCountry",
    description:
      "Liste les services disponibles pour un pays de résidence spécifique. Utilise le pays de résidence de l'utilisateur par défaut.",
    parameters: {
      type: "object" as const,
      properties: {
        country: {
          type: "string",
          description:
            "Code pays ISO (ex: FR, GA, BE). Si non fourni, utilise le pays de résidence de l'utilisateur.",
        },
        category: {
          type: "string",
          description:
            "Catégorie de service: identity, travel, civil_status, legalization, social, registration",
        },
      },
    },
  },
  {
    name: "getOrganizationInfo",
    description:
      "Récupère les informations d'un consulat ou ambassade: adresse, horaires, contact.",
    parameters: {
      type: "object" as const,
      properties: {
        orgId: {
          type: "string",
          description:
            "Identifiant de l'organisation. Si non fourni, retourne l'organisation correspondant au pays de résidence de l'utilisateur.",
        },
      },
    },
  },
  {
    name: "getLatestNews",
    description: "Récupère les dernières actualités et annonces du consulat.",
    parameters: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Nombre d'actualités à retourner (défaut: 5)",
        },
      },
    },
  },
  {
    name: "getMyAssociations",
    description: "Liste les associations dont l'utilisateur est membre.",
    parameters: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "getMyConsularCard",
    description:
      "Récupère les informations de la carte consulaire de l'utilisateur: numéro, date d'émission, date d'expiration.",
    parameters: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "getRequestDetails",
    description:
      "Récupère les détails complets d'une demande spécifique: statut, documents, historique, prochaines étapes.",
    parameters: {
      type: "object" as const,
      properties: {
        requestId: {
          type: "string",
          description: "Identifiant de la demande",
        },
      },
      required: ["requestId"],
    },
  },

  // ============ iBOÎTE (MESSAGERIE INTERNE) ============
  {
    name: "getMyMailboxes",
    description:
      "Liste toutes les boîtes mail de l'utilisateur (profil personnel, organisations, associations, entreprises) avec le nombre de messages non lus pour chacune.",
    parameters: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "getMailInbox",
    description:
      "Liste les messages d'une boîte mail spécifique. Peut filtrer par dossier (inbox, sent, trash, starred).",
    parameters: {
      type: "object" as const,
      properties: {
        ownerId: {
          type: "string",
          description:
            "Identifiant du propriétaire de la boîte (profil, organisation, association ou entreprise). Si omis, utilise le profil de l'utilisateur.",
        },
        ownerType: {
          type: "string",
          description:
            "Type du propriétaire: profile, organization, association, company. Requis si ownerId est fourni.",
        },
        folder: {
          type: "string",
          description:
            "Dossier à consulter: inbox (défaut), sent, trash, starred",
        },
      },
    },
  },
  {
    name: "getMailMessage",
    description:
      "Récupère le contenu complet d'un message spécifique dans iBoîte.",
    parameters: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "Identifiant du message",
        },
      },
      required: ["id"],
    },
  },

  // ============ ENTREPRISES ============
  {
    name: "getMyCompanies",
    description: "Liste les entreprises dont l'utilisateur est membre.",
    parameters: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "getCompanyDetails",
    description:
      "Récupère les détails complets d'une entreprise: informations, membres, secteur d'activité.",
    parameters: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "Identifiant de l'entreprise",
        },
      },
      required: ["id"],
    },
  },

  // ============ ASSOCIATIONS (renforcé) ============
  {
    name: "getAssociationDetails",
    description:
      "Récupère les détails complets d'une association: informations, membres, type.",
    parameters: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "Identifiant de l'association",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "getAssociationInvites",
    description:
      "Liste les invitations d'associations en attente pour l'utilisateur.",
    parameters: {
      type: "object" as const,
      properties: {},
    },
  },

  // ============ CV (LECTURE) ============
  {
    name: "getMyCV",
    description:
      "Récupère le CV complet de l'utilisateur: informations personnelles, expériences, formations, compétences, langues, centres d'intérêt.",
    parameters: {
      type: "object" as const,
      properties: {},
    },
  },

  // ============ UI TOOLS (handled by frontend) ============
  {
    name: "navigateTo",
    description:
      "Navigue l'utilisateur vers une page de l'espace citoyen. Routes disponibles:\n" +
      Object.entries(CITIZEN_ROUTES)
        .map(([path, desc]) => `- ${path}: ${desc}`)
        .join("\n") +
      "\nRemplace $slug, $reference, $appointmentId, etc. par les vraies valeurs (souvent disponibles dans les données retournées par les autres outils). Toute route hors de cette liste sera ignorée.",
    parameters: {
      type: "object" as const,
      properties: {
        route: {
          type: "string",
          description: "La route vers laquelle naviguer",
        },
        reason: {
          type: "string",
          description: "Explication de pourquoi naviguer vers cette page",
        },
      },
      required: ["route"],
    },
  },
  {
    name: "fillForm",
    description:
      "Pré-remplit un formulaire avec les données fournies. Utilise pour aider l'utilisateur à compléter son profil ou une demande.",
    parameters: {
      type: "object" as const,
      properties: {
        formId: {
          type: "string",
          description:
            "Identifiant du formulaire: profile, profile.identity, profile.addresses, profile.family, profile.contacts, request",
        },
        fields: {
          type: "object",
          description:
            "Données à pré-remplir. Pour profile.identity: firstName, lastName, birthDate (YYYY-MM-DD), birthPlace, birthCountry, gender (male/female), nationality. Pour profile.addresses.residence: street, city, postalCode, country. Pour profile.contacts: phone, email.",
        },
        navigateFirst: {
          type: "boolean",
          description:
            "Si true, navigue d'abord vers la page du formulaire avant de le pré-remplir.",
        },
      },
      required: ["formId", "fields"],
    },
  },

  // ============ MUTATIVE TOOLS (require confirmation) ============
  {
    name: "createRequest",
    description:
      "Crée une nouvelle demande de service consulaire pour l'utilisateur. Nécessite l'identifiant du service et optionnellement des données de formulaire.",
    parameters: {
      type: "object" as const,
      properties: {
        serviceSlug: {
          type: "string",
          description:
            "Slug du service (ex: passport-renewal, consular-card-registration)",
        },
        submitNow: {
          type: "boolean",
          description:
            "Si true, soumet directement la demande. Sinon crée un brouillon.",
        },
      },
      required: ["serviceSlug"],
    },
  },
  {
    name: "cancelRequest",
    description:
      "Annule une demande existante de l'utilisateur. Fonctionne uniquement pour les demandes en brouillon ou soumises.",
    parameters: {
      type: "object" as const,
      properties: {
        requestId: {
          type: "string",
          description: "Identifiant de la demande à annuler",
        },
      },
      required: ["requestId"],
    },
  },
  {
    name: "markNotificationRead",
    description: "Marque une notification comme lue.",
    parameters: {
      type: "object" as const,
      properties: {
        notificationId: {
          type: "string",
          description: "Identifiant de la notification à marquer comme lue",
        },
      },
      required: ["notificationId"],
    },
  },
  {
    name: "markAllNotificationsRead",
    description: "Marque toutes les notifications de l'utilisateur comme lues.",
    parameters: {
      type: "object" as const,
      properties: {},
    },
  },

  // ============ iBOÎTE MUTATIONS ============
  {
    name: "sendMail",
    description:
      "Envoie un message interne via iBoîte à un destinataire (profil, organisation, association ou entreprise). Nécessite confirmation.",
    parameters: {
      type: "object" as const,
      properties: {
        recipientOwnerId: {
          type: "string",
          description: "Identifiant du destinataire",
        },
        recipientOwnerType: {
          type: "string",
          description:
            "Type du destinataire: profile, organization, association, company",
        },
        subject: {
          type: "string",
          description: "Objet du message",
        },
        body: {
          type: "string",
          description: "Contenu du message",
        },
        senderOwnerId: {
          type: "string",
          description:
            "Identifiant de l'expéditeur (si différent du profil personnel). Optionnel.",
        },
        senderOwnerType: {
          type: "string",
          description:
            "Type de l'expéditeur: profile, organization, association, company. Optionnel.",
        },
      },
      required: ["recipientOwnerId", "recipientOwnerType", "subject", "body"],
    },
  },
  {
    name: "markMailRead",
    description: "Marque un message iBoîte comme lu.",
    parameters: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "Identifiant du message à marquer comme lu",
        },
      },
      required: ["id"],
    },
  },

  // ============ ASSOCIATIONS MUTATIONS ============
  {
    name: "createAssociation",
    description:
      "Crée une nouvelle association. L'utilisateur en devient le président. Nécessite confirmation.",
    parameters: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Nom de l'association",
        },
        associationType: {
          type: "string",
          description:
            "Type: cultural, sports, religious, professional, solidarity, education, youth, women, student, other",
        },
        description: {
          type: "string",
          description: "Description de l'association",
        },
        email: {
          type: "string",
          description: "Email de contact",
        },
        phone: {
          type: "string",
          description: "Numéro de téléphone",
        },
      },
      required: ["name", "associationType"],
    },
  },
  {
    name: "respondToAssociationInvite",
    description:
      "Accepte ou refuse une invitation à rejoindre une association. Nécessite confirmation.",
    parameters: {
      type: "object" as const,
      properties: {
        associationId: {
          type: "string",
          description: "Identifiant de l'association",
        },
        accept: {
          type: "boolean",
          description: "true pour accepter, false pour refuser",
        },
      },
      required: ["associationId", "accept"],
    },
  },

  // ============ ENTREPRISES MUTATIONS ============
  {
    name: "createCompany",
    description:
      "Crée une nouvelle entreprise. L'utilisateur en devient le CEO. Nécessite confirmation.",
    parameters: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Nom commercial de l'entreprise",
        },
        legalName: {
          type: "string",
          description: "Raison sociale (nom légal)",
        },
        companyType: {
          type: "string",
          description:
            "Type: sarl, sa, sas, sasu, eurl, auto_entrepreneur, sci, snc, cooperative, association_loi_1901, other",
        },
        activitySector: {
          type: "string",
          description:
            "Secteur: technology, finance, health, education, agriculture, commerce, construction, transport, tourism, media, energy, mining, fishing, forestry, manufacturing, services, real_estate, legal, consulting, ngo, other",
        },
        description: {
          type: "string",
          description: "Description de l'entreprise",
        },
        email: {
          type: "string",
          description: "Email de contact",
        },
        phone: {
          type: "string",
          description: "Numéro de téléphone",
        },
      },
      required: ["name", "companyType", "activitySector"],
    },
  },

  // ============ CV MUTATIONS ============
  {
    name: "updateCV",
    description:
      "Met à jour les informations générales du CV de l'utilisateur (titre, résumé, objectif, coordonnées, visibilité). Crée le CV s'il n'existe pas encore. Nécessite confirmation.",
    parameters: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Titre professionnel (ex: Développeur Full Stack)",
        },
        objective: {
          type: "string",
          description: "Objectif professionnel",
        },
        summary: {
          type: "string",
          description: "Résumé professionnel / profil",
        },
        email: {
          type: "string",
          description: "Email de contact pour le CV",
        },
        phone: {
          type: "string",
          description: "Téléphone",
        },
        address: {
          type: "string",
          description: "Adresse",
        },
        portfolioUrl: {
          type: "string",
          description: "URL du portfolio",
        },
        linkedinUrl: {
          type: "string",
          description: "URL du profil LinkedIn",
        },
        isPublic: {
          type: "boolean",
          description: "Rendre le CV visible publiquement",
        },
      },
    },
  },
  {
    name: "addCVExperience",
    description:
      "Ajoute une expérience professionnelle au CV de l'utilisateur. Nécessite confirmation.",
    parameters: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Intitulé du poste",
        },
        company: {
          type: "string",
          description: "Nom de l'entreprise",
        },
        location: {
          type: "string",
          description: "Lieu (ville, pays)",
        },
        startDate: {
          type: "string",
          description: "Date de début (YYYY-MM)",
        },
        endDate: {
          type: "string",
          description: "Date de fin (YYYY-MM). Laisser vide si poste actuel",
        },
        current: {
          type: "boolean",
          description: "true si c'est le poste actuel",
        },
        description: {
          type: "string",
          description: "Description des responsabilités et réalisations",
        },
      },
      required: ["title", "company", "startDate", "current"],
    },
  },
  {
    name: "addCVEducation",
    description:
      "Ajoute une formation au CV de l'utilisateur. Nécessite confirmation.",
    parameters: {
      type: "object" as const,
      properties: {
        degree: {
          type: "string",
          description: "Diplôme obtenu (ex: Master en Informatique)",
        },
        school: {
          type: "string",
          description: "Établissement",
        },
        location: {
          type: "string",
          description: "Lieu (ville, pays)",
        },
        startDate: {
          type: "string",
          description: "Date de début (YYYY-MM)",
        },
        endDate: {
          type: "string",
          description: "Date de fin (YYYY-MM). Laisser vide si en cours",
        },
        current: {
          type: "boolean",
          description: "true si formation en cours",
        },
        description: {
          type: "string",
          description: "Description de la formation",
        },
      },
      required: ["degree", "school", "startDate", "current"],
    },
  },
  {
    name: "addCVSkill",
    description:
      "Ajoute une compétence au CV de l'utilisateur. Nécessite confirmation.",
    parameters: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Nom de la compétence (ex: React, Gestion de projet)",
        },
        level: {
          type: "string",
          description:
            "Niveau: beginner (débutant), intermediate (intermédiaire), advanced (avancé), expert",
        },
      },
      required: ["name", "level"],
    },
  },
  {
    name: "addCVLanguage",
    description:
      "Ajoute une langue au CV de l'utilisateur. Nécessite confirmation.",
    parameters: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Nom de la langue (ex: Français, Anglais, Espagnol)",
        },
        level: {
          type: "string",
          description:
            "Niveau CECRL: A1, A2, B1, B2, C1, C2, ou native (langue maternelle)",
        },
      },
      required: ["name", "level"],
    },
  },

  // ============ CV AI ACTIONS ============
  {
    name: "improveCVSummary",
    description:
      "Utilise l'IA pour améliorer le résumé professionnel du CV. Récupère automatiquement le CV actuel. Nécessite confirmation.",
    parameters: {
      type: "object" as const,
      properties: {
        language: {
          type: "string",
          description: "Langue du résumé amélioré (ex: fr, en). Défaut: fr",
        },
      },
    },
  },
  {
    name: "suggestCVSkills",
    description:
      "Utilise l'IA pour suggérer des compétences pertinentes basées sur les expériences du CV. Nécessite confirmation.",
    parameters: {
      type: "object" as const,
      properties: {
        language: {
          type: "string",
          description: "Langue des suggestions (ex: fr, en). Défaut: fr",
        },
      },
    },
  },
  {
    name: "optimizeCV",
    description:
      "Utilise l'IA pour optimiser le CV pour une offre d'emploi spécifique. Retourne des recommandations, mots-clés à ajouter et un score de correspondance. Nécessite confirmation.",
    parameters: {
      type: "object" as const,
      properties: {
        jobDescription: {
          type: "string",
          description: "Description de l'offre d'emploi ciblée",
        },
        language: {
          type: "string",
          description: "Langue de l'analyse (ex: fr, en). Défaut: fr",
        },
      },
      required: ["jobDescription"],
    },
  },
  {
    name: "generateCoverLetter",
    description:
      "Utilise l'IA pour générer une lettre de motivation personnalisée basée sur le CV et un poste cible. Nécessite confirmation.",
    parameters: {
      type: "object" as const,
      properties: {
        jobTitle: {
          type: "string",
          description: "Intitulé du poste visé",
        },
        companyName: {
          type: "string",
          description: "Nom de l'entreprise",
        },
        style: {
          type: "string",
          description:
            "Style de la lettre: formal (formel), modern (moderne), creative (créatif). Défaut: formal",
        },
        additionalInfo: {
          type: "string",
          description:
            "Informations supplémentaires à inclure (motivation personnelle, etc.)",
        },
        language: {
          type: "string",
          description: "Langue de la lettre (ex: fr, en). Défaut: fr",
        },
      },
      required: ["jobTitle", "companyName"],
    },
  },
  {
    name: "getCVATSScore",
    description:
      "Utilise l'IA pour analyser la compatibilité ATS (Applicant Tracking System) du CV. Retourne un score, points forts, faiblesses et recommandations. Nécessite confirmation.",
    parameters: {
      type: "object" as const,
      properties: {
        targetJob: {
          type: "string",
          description:
            "Poste cible pour l'analyse ATS (optionnel, améliore la pertinence de l'analyse)",
        },
        language: {
          type: "string",
          description: "Langue de l'analyse (ex: fr, en). Défaut: fr",
        },
      },
    },
  },

  // ============ VOICE SESSION CONTROL ============
  {
    name: "endVoiceSession",
    description:
      "Termine la session vocale. Utilise cet outil quand l'utilisateur dit au revoir, merci, ou souhaite mettre fin à la conversation vocale. Dis d'abord au revoir avant d'appeler cet outil.",
    parameters: {
      type: "object" as const,
      properties: {},
    },
  },
];

// Type for tool execution results
export type ToolResult = {
  name: string;
  success: boolean;
  data?: unknown;
  error?: string;
};

// Type for actions sent to frontend
export type AIAction = {
  type: string;
  args: Record<string, unknown>;
  requiresConfirmation: boolean;
  reason?: string;
};
