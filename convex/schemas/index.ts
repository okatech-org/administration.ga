// Barrel export for all schema tables
export { usersTable } from "./users";
export { orgsTable } from "./orgs";
export { membershipsTable } from "./memberships";
export { servicesTable } from "./services";
export { orgServicesTable } from "./orgServices";
export { profilesTable } from "./profiles";
export { requestsTable } from "./requests";
export { eventsTable } from "./events";
export { documentsTable } from "./documents";
export { postsTable } from "./posts";
export { conversationsTable } from "./conversations";
export { formTemplatesTable } from "./formTemplates";
export { appointmentsTable } from "./appointments";
export { agentSchedulesTable } from "./agentSchedules";
export { messagesTable } from "./messages";
export { documentTemplatesTable } from "./documentTemplates";
export { paymentsTable } from "./payments";
export { documentVerificationsTable } from "./documentVerifications";
export { agentNotesTable } from "./agentNotes";
export { consularRegistrationsTable } from "./consularRegistrations";
export { consularNotificationsTable } from "./consularNotifications";
export { cvTable } from "./cv";
export { childProfilesTable } from "./childProfiles";
export { auditLogTable } from "./auditLog";
export { notificationsTable } from "./notifications";
export { tutorialsTable } from "./tutorials";
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
} from "./diplomaticAffairs";
