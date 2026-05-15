// convex/convex.config.ts
import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
import resend from "@convex-dev/resend/convex.config.js";
import aggregate from "@convex-dev/aggregate/convex.config.js";

const app = defineApp();
app.use(betterAuth);
app.use(rateLimiter);
app.use(resend);

// Aggregate instances for denormalized counts/stats
app.use(aggregate, { name: "requestsByOrg" });
app.use(aggregate, { name: "membershipsByOrg" });
app.use(aggregate, { name: "orgServicesByOrg" });
app.use(aggregate, { name: "globalCounts" });

// New aggregates
app.use(aggregate, { name: "registrationsByOrg" });
app.use(aggregate, { name: "requestsGlobal" });
app.use(aggregate, { name: "associationsGlobal" });
app.use(aggregate, { name: "companiesGlobal" });
app.use(aggregate, { name: "orgsGlobal" });
app.use(aggregate, { name: "servicesGlobal" });
app.use(aggregate, { name: "appointmentsByOrg" });
app.use(aggregate, { name: "childProfilesGlobal" });

// Phase 2 — Dashboard performance (O(log n) stats)
app.use(aggregate, { name: "diplomaticTargetsByOrg" });
app.use(aggregate, { name: "diplomaticLettersByOrg" });
app.use(aggregate, { name: "diplomaticPlansByOrg" });
app.use(aggregate, { name: "diplomaticReportsByOrg" });
app.use(aggregate, { name: "diplomaticProjectsByOrg" });
app.use(aggregate, { name: "correspondanceItemsByOrg" });
app.use(aggregate, { name: "dossierProceduresByOrg" });
app.use(aggregate, { name: "documentsByOwnerCategory" });
app.use(aggregate, { name: "documentsByOwnerExpiry" });
app.use(aggregate, { name: "missedCallsByOrgStatus" });
app.use(aggregate, { name: "missedCallsByOrgReason" });

// Public services catalog — featured service computation
// Namespace: orgServiceId, sortKey: _creationTime → window queries on requests
app.use(aggregate, { name: "requestsByOrgService" });

// /users page facets — O(log n) counts for dropdown filters
app.use(aggregate, { name: "usersByRole" });
app.use(aggregate, { name: "usersByStatus" });
app.use(aggregate, { name: "usersByCountry" });
app.use(aggregate, { name: "membershipsByUser" });

// /skills page — aggregates O(log n) pour les compteurs par catégorie,
// statut professionnel, statut d'enrichissement IA, niveau CV.
app.use(aggregate, { name: "profilesByCategory" });
app.use(aggregate, { name: "profilesByProfessionStatus" });
app.use(aggregate, { name: "profilesByEnrichmentStatus" });
app.use(aggregate, { name: "cvSkillItemsByLevel" });

export default app;
