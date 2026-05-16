// Barrel export for all schema tables
export { usersTable } from "./users";
export { orgsTable } from "./orgs";
export { membershipsTable } from "./memberships";
export { servicesTable } from "./services";
export { orgServicesTable } from "./orgServices";
export { profilesTable } from "./profiles";
export { requestsTable } from "./requests";
export { eventsTable } from "./events";
export { documentsTable, documentFoldersTable } from "./documents";
export { postsTable } from "./posts";
export { conversationsTable } from "./conversations";
export { streamingChatsTable } from "./streamingChats";
export { formTemplatesTable } from "./formTemplates";
export { appointmentsTable } from "./appointments";
export { appointmentWaitlistTable } from "./appointmentWaitlist";
export { agentSchedulesTable } from "./agentSchedules";
export { messagesTable } from "./messages";
export { documentTemplatesTable } from "./documentTemplates";
export { documentTemplateVersionsTable } from "./documentTemplateVersions";
export { generatedDocumentsTable } from "./generatedDocuments";
export { documentVerificationsTable } from "./documentVerifications";
export { agentNotesTable } from "./agentNotes";
export { profileNotesTable } from "./profileNotes";
export { intelligenceNotesTable } from "./intelligenceNotes";
export {
  intelligenceWatchlistsTable,
  intelligenceWatchlistItemsTable,
} from "./intelligenceWatchlists";
export { intelligenceLinksTable } from "./intelligenceLinks";
export { intelligenceAuditLogTable } from "./intelligenceAuditLog";
export {
  intelligenceAlertRulesTable,
  intelligenceAlertsTable,
} from "./intelligenceAlerts";
export {
  intelligenceCasesTable,
  intelligenceCaseEntitiesTable,
  intelligenceCaseEventsTable,
} from "./intelligenceCases";
export { intelligenceEnclavesTable } from "./intelligenceEnclaves";
export { intelligenceBriefingsTable } from "./intelligenceBriefings";
export { consularRegistrationsTable } from "./consularRegistrations";
export { consularNotificationsTable } from "./consularNotifications";
export { cvTable } from "./cv";
export { childProfilesTable } from "./childProfiles";
export { auditLogTable } from "./auditLog";
export { notificationsTable } from "./notifications";
export { tutorialsTable } from "./tutorials";
export { tutorialProgressTable } from "./tutorialProgress";
export { faqsTable } from "./faqs";
export { orgPublicDocumentsTable } from "./orgPublicDocuments";
export { communityEventsTable } from "./communityEvents";
export { digitalMailTable } from "./digitalMail";
export { deliveryPackagesTable } from "./deliveryPackages";
export { associationsTable } from "./associations";
export { associationMembersTable } from "./associationMembers";
export { associationClaimsTable } from "./associationClaims";
export { companiesTable } from "./companies";
export { companyMembersTable } from "./companyMembers";
export { ticketsTable } from "./tickets";
export { meetingsTable } from "./meetings";
export { callLinesTable } from "./callLines";
export { agentPresenceTable } from "./agentPresence";
export { chatsTable } from "./chats";
export { chatMessagesTable } from "./chatMessages";
export { chatTypingTable } from "./chatTyping";

export {
  positionsTable,
  ministryGroupsTable,
} from "./roleConfig";
export { securityPoliciesTable, maintenanceConfigTable } from "./security";
export { countersTable } from "./counters";

export {
  signauxTable,
  historiqueActionsTable,
  configSystemeTable,
  metriquesTable,
  poidsAdaptatifsTable,
} from "./neocortex";

export { gcpMetricsCacheTable } from "./gcpMetricsCache";
export { cardDesignsTable } from "./cardDesigns";
export { printJobsTable } from "./printJobs";

export {
  correspondanceFoldersTable,
  correspondanceItemsTable,
  correspondanceWorkflowStepsTable,
  correspondanceRecipientsTable,
  correspondanceTypeConfigsTable,
  correspondanceApprovalStepsTable,
  correspondanceAnnotationsTable,
  correspondanceSignaturesTable,
} from "./correspondance";

export {
  typeDemarchesTable,
  dossierProceduresTable,
  dossierPiecesTable,
  dossierTransitionsTable,
  copiesPassageTable,
  journalActionsTable,
} from "./dossierProcedure";

export {
  diplomaticTargetsTable,
  diplomaticLettersTable,
  diplomaticPlansTable,
  diplomaticReportsTable,
  diplomaticProjectsTable,
  diplomaticPrioritiesTable,
  diplomaticDocumentsTable,
} from "./diplomaticAffairs";

export { ipThreatScoresTable } from "./ipThreatScores";
export { guidesTable } from "./guides";
export { archivePoliciesTable, archiveAuditLogTable } from "./archivePolicies";

// Phase 1 Fondations — Paramétrage représentation
export { orgCalendarTable } from "./orgCalendar";

// Phase 2 Communication — Extensions iAppel
export { missedCallsTable } from "./missedCalls";

// Phase 3 iAsted par org — Configuration chatbot par représentation
export { orgIAstedConfigTable } from "./orgIAstedConfig";

// Phase C3 — Templates de rôles personnalisables par org
export { orgRoleTemplatesTable } from "./orgRoleTemplates";

// Phase D3 — Politique d'escalation unifiée (chatbot + callcenter)
export { orgEscalationPolicyTable } from "./orgEscalationPolicy";

// iAppel — Enregistrements, voicemails, supervision
export { callRecordingsTable } from "./callRecordings";
export { voicemailsTable } from "./voicemails";
export { supervisionSessionsTable } from "./supervisionSessions";

// Notifications — Web Push subscriptions
export { pushSubscriptionsTable } from "./pushSubscriptions";

// Sprint 6 — Notes post-appel + brouillons de messages
export { callNotesTable } from "./callNotes";
export { draftMessagesTable } from "./draftMessages";

// Agent IA Proactif — Module ai_assistant
export { aiSuggestionsTable } from "./aiSuggestions";
export { aiActivityLogTable } from "./aiActivityLog";
export { userAIPreferencesTable } from "./userAIPreferences";
export { aiAgentPresenceTable } from "./aiAgentPresence";
export { aiCapabilityConfigTable } from "./aiCapabilityConfig";

// Public — abonnements newsletter
export { newsletterSubscriptionsTable } from "./newsletterSubscriptions";

// Super-admin /skills — dénormalisation skills + stats + historique runs IA
export {
  cvSkillItemsTable,
  aiSuggestedSkillItemsTable,
  skillCatalogStatsTable,
  professionTitleStatsTable,
  aiEnrichmentRunsTable,
} from "./skillsAggregation";
