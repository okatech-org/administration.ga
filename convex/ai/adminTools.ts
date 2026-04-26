/**
 * AI Assistant Tool Definitions for Admin/Consular Agents
 * Each tool maps to a Convex query/mutation available to staff
 */
import { ADMIN_ROUTES } from "./routes_manifest";
import type { TaskCodeValue } from "../lib/taskCodes";

// ============================================
// Permission mapping: tool name → required task code
// ============================================

export const ADMIN_TOOL_PERMISSIONS: Record<string, TaskCodeValue> = {
  // Read tools
  getOrgDashboardStats: "requests.view",
  getRequestsList: "requests.view",
  getRequestDetail: "requests.view",
  getPendingRequests: "requests.view",
  getCitizenProfile: "profiles.view",
  searchCitizens: "consular_registrations.view",
  getRegistryStats: "consular_registrations.view",
  getAppointmentsList: "appointments.view",
  getTeamMembers: "team.view",
  getOrgMailInbox: "digital_mail.view",
  getRecentPayments: "payments.view",
  getOrgPosts: "communication.publish",
  getAgentContext: "requests.view",
  // Mutative tools
  updateRequestStatus: "requests.process",
  addNoteToRequest: "requests.view",
  assignRequest: "requests.assign",
  manageAppointment: "appointments.manage",
  sendOrgMail: "digital_mail.manage",
};

// Tool names that require user confirmation before execution
export const ADMIN_MUTATIVE_TOOLS = [
  "updateRequestStatus",
  "addNoteToRequest",
  "assignRequest",
  "manageAppointment",
  "sendOrgMail",
] as const;

// Tool names that are UI actions (handled by frontend)
export const ADMIN_UI_TOOLS = ["navigateTo", "executePageAction"] as const;

/**
 * Tools "core" toujours disponibles, peu importe la page courante.
 * Les autres tools sont opt-in via `pageContext.scopedToolNames`.
 */
export const ADMIN_ALWAYS_AVAILABLE_TOOLS = [
  "getAgentContext",
  "navigateTo",
  "executePageAction",
  "getTeamMembers",
] as const;

// Gemini FunctionDeclaration format
export const adminTools = [
  // ============ READ TOOLS (no confirmation) ============
  {
    name: "getAgentContext",
    description:
      "Récupère le contexte complet de l'agent: organisation active, nom, poste, statistiques rapides des demandes. Utilise cet outil en premier pour avoir une vue d'ensemble.",
    parameters: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "getOrgDashboardStats",
    description:
      "Récupère les statistiques du tableau de bord de l'organisation: nombre de demandes par statut, rendez-vous du jour, inscriptions récentes.",
    parameters: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "getRequestsList",
    description:
      "Liste les demandes de services des citoyens pour cette organisation. Peut filtrer par statut.",
    parameters: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          description:
            "Filtrer par statut: submitted, pending, processing, completed, rejected, cancelled",
        },
      },
    },
  },
  {
    name: "getRequestDetail",
    description:
      "Récupère les détails complets d'une demande spécifique: citoyen, service, statut, historique, notes, documents.",
    parameters: {
      type: "object" as const,
      properties: {
        requestId: {
          type: "string",
          description: "Identifiant ou référence de la demande",
        },
      },
      required: ["requestId"],
    },
  },
  {
    name: "getPendingRequests",
    description:
      "Liste les demandes en attente de traitement (statut: submitted ou pending). Utile pour le traitement quotidien.",
    parameters: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "getCitizenProfile",
    description:
      "Récupère le profil détaillé d'un citoyen inscrit: identité, adresse, famille, documents, carte consulaire.",
    parameters: {
      type: "object" as const,
      properties: {
        profileId: {
          type: "string",
          description: "Identifiant du profil citoyen",
        },
      },
      required: ["profileId"],
    },
  },
  {
    name: "searchCitizens",
    description:
      "Recherche dans le registre consulaire par nom, prénom ou numéro de carte. Retourne les inscriptions correspondantes.",
    parameters: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Terme de recherche (nom, prénom, numéro de carte)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "getRegistryStats",
    description:
      "Statistiques du registre consulaire: nombre total d'inscrits, inscriptions récentes, cartes à imprimer.",
    parameters: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "getAppointmentsList",
    description:
      "Liste les rendez-vous de l'organisation. Peut filtrer par date.",
    parameters: {
      type: "object" as const,
      properties: {
        date: {
          type: "string",
          description: "Date au format YYYY-MM-DD pour filtrer (optionnel)",
        },
      },
    },
  },
  {
    name: "getTeamMembers",
    description:
      "Liste les membres de l'équipe consulaire avec leur poste et rôle.",
    parameters: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "getOrgMailInbox",
    description:
      "Liste les messages de la boîte mail de l'organisation.",
    parameters: {
      type: "object" as const,
      properties: {
        folder: {
          type: "string",
          description: "Dossier: inbox (défaut), sent, trash, starred",
        },
      },
    },
  },
  {
    name: "getRecentPayments",
    description:
      "Liste les paiements récents reçus par l'organisation.",
    parameters: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "getOrgPosts",
    description:
      "Liste les actualités/publications de l'organisation.",
    parameters: {
      type: "object" as const,
      properties: {},
    },
  },

  // ============ UI TOOLS (handled by frontend) ============
  {
    name: "executePageAction",
    description:
      "Déclenche une action UI exposée par la page courante. " +
      "À UTILISER UNIQUEMENT pour les `actionId` listés dans la section " +
      "« Actions disponibles sur cette page » du contexte. " +
      "L'utilisateur sera invité à confirmer si l'action le requiert.",
    parameters: {
      type: "object" as const,
      properties: {
        actionId: {
          type: "string",
          description:
            "ID de l'action déclarée par la page (ex. « switch-tab », « print-view »).",
        },
        params: {
          type: "object",
          description:
            "Paramètres optionnels passés au handler (forme libre selon l'action).",
        },
        reason: {
          type: "string",
          description: "Brève explication de pourquoi déclencher cette action.",
        },
      },
      required: ["actionId"],
    },
  },
  {
    name: "navigateTo",
    description:
      "Navigue l'agent vers une page de l'administration. Routes admin disponibles:\n" +
      Object.entries(ADMIN_ROUTES)
        .map(([path, desc]) => `- ${path}: ${desc}`)
        .join("\n") +
      "\nRemplace $requestId, $appointmentId etc. par les vraies valeurs.",
    parameters: {
      type: "object" as const,
      properties: {
        route: {
          type: "string",
          description: "La route admin vers laquelle naviguer",
        },
        reason: {
          type: "string",
          description: "Explication de pourquoi naviguer vers cette page",
        },
      },
      required: ["route"],
    },
  },

  // ============ MUTATIVE TOOLS (require confirmation) ============
  {
    name: "updateRequestStatus",
    description:
      "Change le statut d'une demande. Transitions possibles: submitted→processing, processing→completed, processing→rejected, submitted→rejected. Nécessite confirmation.",
    parameters: {
      type: "object" as const,
      properties: {
        requestId: {
          type: "string",
          description: "Identifiant de la demande",
        },
        status: {
          type: "string",
          description:
            "Nouveau statut: processing, completed, rejected, pending",
        },
        note: {
          type: "string",
          description: "Note expliquant le changement de statut (optionnel)",
        },
      },
      required: ["requestId", "status"],
    },
  },
  {
    name: "addNoteToRequest",
    description:
      "Ajoute une note interne à une demande. Les notes internes ne sont visibles que par les agents. Nécessite confirmation.",
    parameters: {
      type: "object" as const,
      properties: {
        requestId: {
          type: "string",
          description: "Identifiant de la demande",
        },
        content: {
          type: "string",
          description: "Contenu de la note",
        },
        isInternal: {
          type: "boolean",
          description: "Si true, note visible uniquement par les agents (défaut: true)",
        },
      },
      required: ["requestId", "content"],
    },
  },
  {
    name: "assignRequest",
    description:
      "Assigne une demande à un agent de l'équipe. Nécessite confirmation.",
    parameters: {
      type: "object" as const,
      properties: {
        requestId: {
          type: "string",
          description: "Identifiant de la demande",
        },
        agentId: {
          type: "string",
          description: "Identifiant du membership de l'agent à qui assigner",
        },
      },
      required: ["requestId", "agentId"],
    },
  },
  {
    name: "manageAppointment",
    description:
      "Confirme, annule ou marque un rendez-vous comme terminé. Nécessite confirmation.",
    parameters: {
      type: "object" as const,
      properties: {
        appointmentId: {
          type: "string",
          description: "Identifiant du rendez-vous",
        },
        action: {
          type: "string",
          description: "Action: confirm, cancel, complete, no_show",
        },
      },
      required: ["appointmentId", "action"],
    },
  },
  {
    name: "sendOrgMail",
    description:
      "Envoie un message officiel depuis la boîte mail de l'organisation. Nécessite confirmation.",
    parameters: {
      type: "object" as const,
      properties: {
        recipientOwnerId: {
          type: "string",
          description: "Identifiant du destinataire (profil)",
        },
        subject: {
          type: "string",
          description: "Objet du message",
        },
        body: {
          type: "string",
          description: "Contenu du message",
        },
      },
      required: ["recipientOwnerId", "subject", "body"],
    },
  },
];
