/**
 * Aggregate definitions for denormalized counts/stats.
 *
 * Each TableAggregate keeps a B-tree structure in sync with a source table,
 * enabling O(log n) count/sum/min/max queries instead of full table scans.
 *
 * @see https://www.convex.dev/components/aggregate
 */
import { components } from "../_generated/api";
import { DataModel } from "../_generated/dataModel";
import { TableAggregate } from "@convex-dev/aggregate";

// ---------------------------------------------------------------------------
// 1. Requests by Org — count by status, by time range, etc.
//    Namespace: orgId
//    SortKey:   [status, _creationTime]
//    SumValue:  1 (just counting)
// ---------------------------------------------------------------------------
export const requestsByOrg = new TableAggregate<{
  Namespace: string; // orgId as string
  Key: [string, number]; // [status, _creationTime]
  DataModel: DataModel;
  TableName: "requests";
}>(components.requestsByOrg, {
  namespace: (doc) => doc.orgId,
  sortKey: (doc) => [doc.status, doc._creationTime],
});

// ---------------------------------------------------------------------------
// 2. Memberships by Org — count active members per org
//    Namespace: orgId
//    SortKey:   _creationTime
//    Only tracks non-deleted memberships (deletedAt === undefined)
// ---------------------------------------------------------------------------
export const membershipsByOrg = new TableAggregate<{
  Namespace: string; // orgId as string
  Key: number; // _creationTime
  DataModel: DataModel;
  TableName: "memberships";
}>(components.membershipsByOrg, {
  namespace: (doc) => doc.orgId,
  sortKey: (doc) => doc._creationTime,
});

// ---------------------------------------------------------------------------
// 3. OrgServices by Org — count active services per org
//    Namespace: orgId
//    SortKey:   isActive (boolean → 0/1 for sorting)
// ---------------------------------------------------------------------------
export const orgServicesByOrg = new TableAggregate<{
  Namespace: string; // orgId as string
  Key: number; // isActive as 0|1
  DataModel: DataModel;
  TableName: "orgServices";
}>(components.orgServicesByOrg, {
  namespace: (doc) => doc.orgId,
  sortKey: (doc) => (doc.isActive ? 1 : 0),
});

// ---------------------------------------------------------------------------
// 4. Global counts — used by admin dashboard
//    No namespace, sortKey encodes [tableName] for partitioning.
//    We use a standalone Aggregate (not TableAggregate) approach:
//    each table inserts items keyed by table name.
//
//    Actually, we'll use separate TableAggregates per table for simplicity,
//    but since the admin only needs 4 global counts and they're rarely updated,
//    we reuse the existing aggregates:
//      - requests total  → requestsByOrg.count(ctx)      (global, no namespace)
//      - memberships     → membershipsByOrg.count(ctx)    (global, no namespace)
//      - orgServices     → orgServicesByOrg.count(ctx)    (global, no namespace)
//
//    For users + orgs, we create one more instance.
// ---------------------------------------------------------------------------
export const globalCounts = new TableAggregate<{
  Key: number; // _creationTime
  DataModel: DataModel;
  TableName: "users";
}>(components.globalCounts, {
  sortKey: (doc) => doc._creationTime,
});

// ---------------------------------------------------------------------------
// 5. Consular Registrations by Org — count by status & profile type per org
//    Namespace: orgId
//    SortKey:   [profileType, status, _creationTime]
//    profileType: "adult" | "child" based on which profileId is set
// ---------------------------------------------------------------------------
export const registrationsByOrg = new TableAggregate<{
  Namespace: string; // orgId as string
  Key: [string, string, number]; // [profileType, status, _creationTime]
  DataModel: DataModel;
  TableName: "consularRegistrations";
}>(components.registrationsByOrg, {
  namespace: (doc) => doc.orgId,
  sortKey: (doc) => [
    doc.childProfileId && !doc.profileId ? "child" : "adult",
    doc.status,
    doc._creationTime,
  ],
});

// ---------------------------------------------------------------------------
// 6. Requests Global — count all requests by status (superadmin dashboard)
//    No namespace (global)
//    SortKey:   [status, _creationTime]
// ---------------------------------------------------------------------------
export const requestsGlobal = new TableAggregate<{
  Key: [string, number]; // [status, _creationTime]
  DataModel: DataModel;
  TableName: "requests";
}>(components.requestsGlobal, {
  sortKey: (doc) => [doc.status, doc._creationTime],
});

// ---------------------------------------------------------------------------
// 7. Associations Global — count all associations
//    SortKey: _creationTime
// ---------------------------------------------------------------------------
export const associationsGlobal = new TableAggregate<{
  Key: number; // _creationTime
  DataModel: DataModel;
  TableName: "associations";
}>(components.associationsGlobal, {
  sortKey: (doc) => doc._creationTime,
});

// ---------------------------------------------------------------------------
// 8. Companies Global — count all companies
//    SortKey: _creationTime
// ---------------------------------------------------------------------------
export const companiesGlobal = new TableAggregate<{
  Key: number; // _creationTime
  DataModel: DataModel;
  TableName: "companies";
}>(components.companiesGlobal, {
  sortKey: (doc) => doc._creationTime,
});

// ---------------------------------------------------------------------------
// 9. Orgs Global — count all organizations (superadmin dashboard)
//    SortKey: _creationTime
// ---------------------------------------------------------------------------
export const orgsGlobal = new TableAggregate<{
  Key: number; // _creationTime
  DataModel: DataModel;
  TableName: "orgs";
}>(components.orgsGlobal, {
  sortKey: (doc) => doc._creationTime,
});

// ---------------------------------------------------------------------------
// 10. Services Global — count all services (superadmin dashboard)
//     SortKey: isActive (0|1)
// ---------------------------------------------------------------------------
export const servicesGlobal = new TableAggregate<{
  Key: number; // isActive as 0|1
  DataModel: DataModel;
  TableName: "services";
}>(components.servicesGlobal, {
  sortKey: (doc) => (doc.isActive ? 1 : 0),
});

// ---------------------------------------------------------------------------
// 11. Appointments by Org — count appointments per org by status
//     Namespace: orgId
//     SortKey: [status, _creationTime]
// ---------------------------------------------------------------------------
export const appointmentsByOrg = new TableAggregate<{
  Namespace: string; // orgId as string
  Key: [string, number]; // [status, _creationTime]
  DataModel: DataModel;
  TableName: "appointments";
}>(components.appointmentsByOrg, {
  namespace: (doc) => doc.orgId,
  sortKey: (doc) => [doc.status, doc._creationTime],
});

// ---------------------------------------------------------------------------
// 12. Child Profiles Global — count all child profiles by status
//     No namespace (global)
//     SortKey: [status, _creationTime]
// ---------------------------------------------------------------------------
export const childProfilesGlobal = new TableAggregate<{
  Key: [string, number]; // [status, _creationTime]
  DataModel: DataModel;
  TableName: "childProfiles";
}>(components.childProfilesGlobal, {
  sortKey: (doc) => [doc.status, doc._creationTime],
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase 2 — Dashboard performance aggregates
//
// Convention `isDeleted` : 0 = actif, 1 = soft-deleted.
// Les queries ajoutent `bounds: { prefix: [0, ...] }` pour ignorer les
// éléments supprimés, évitant d'avoir à retirer/réinsérer dans l'agrégat.
// ═══════════════════════════════════════════════════════════════════════════

const isDeletedKey = (doc: { deletedAt?: number }): 0 | 1 =>
  doc.deletedAt === undefined ? 0 : 1;

// ---------------------------------------------------------------------------
// 13. Diplomatic Targets by Org — dashboard iAffaires
// ---------------------------------------------------------------------------
export const diplomaticTargetsByOrg = new TableAggregate<{
  Namespace: string;
  Key: [number, string, number]; // [isDeleted, status, _creationTime]
  DataModel: DataModel;
  TableName: "diplomaticTargets";
}>(components.diplomaticTargetsByOrg, {
  namespace: (doc) => doc.orgId,
  sortKey: (doc) => [isDeletedKey(doc), doc.status, doc._creationTime],
});

// ---------------------------------------------------------------------------
// 14. Diplomatic Letters by Org
// ---------------------------------------------------------------------------
export const diplomaticLettersByOrg = new TableAggregate<{
  Namespace: string;
  Key: [number, string, number];
  DataModel: DataModel;
  TableName: "diplomaticLetters";
}>(components.diplomaticLettersByOrg, {
  namespace: (doc) => doc.orgId,
  sortKey: (doc) => [isDeletedKey(doc), doc.status, doc._creationTime],
});

// ---------------------------------------------------------------------------
// 15. Diplomatic Plans by Org
// ---------------------------------------------------------------------------
export const diplomaticPlansByOrg = new TableAggregate<{
  Namespace: string;
  Key: [number, string, number];
  DataModel: DataModel;
  TableName: "diplomaticPlans";
}>(components.diplomaticPlansByOrg, {
  namespace: (doc) => doc.orgId,
  sortKey: (doc) => [isDeletedKey(doc), doc.status, doc._creationTime],
});

// ---------------------------------------------------------------------------
// 16. Diplomatic Reports by Org
// ---------------------------------------------------------------------------
export const diplomaticReportsByOrg = new TableAggregate<{
  Namespace: string;
  Key: [number, string, number];
  DataModel: DataModel;
  TableName: "diplomaticReports";
}>(components.diplomaticReportsByOrg, {
  namespace: (doc) => doc.orgId,
  sortKey: (doc) => [isDeletedKey(doc), doc.status, doc._creationTime],
});

// ---------------------------------------------------------------------------
// 17. Diplomatic Projects by Org
// ---------------------------------------------------------------------------
export const diplomaticProjectsByOrg = new TableAggregate<{
  Namespace: string;
  Key: [number, string, number];
  DataModel: DataModel;
  TableName: "diplomaticProjects";
}>(components.diplomaticProjectsByOrg, {
  namespace: (doc) => doc.orgId,
  sortKey: (doc) => [isDeletedKey(doc), doc.status, doc._creationTime],
});

// ---------------------------------------------------------------------------
// 18. Correspondance Items by Org — dashboard iCorrespondance
// ---------------------------------------------------------------------------
export const correspondanceItemsByOrg = new TableAggregate<{
  Namespace: string;
  Key: [number, string, number]; // [isDeleted, status, _creationTime]
  DataModel: DataModel;
  TableName: "correspondanceItems";
}>(components.correspondanceItemsByOrg, {
  namespace: (doc) => doc.orgId,
  sortKey: (doc) => [isDeletedKey(doc), doc.status, doc._creationTime],
});

// ---------------------------------------------------------------------------
// 19. Dossier Procedures by Org
// ---------------------------------------------------------------------------
export const dossierProceduresByOrg = new TableAggregate<{
  Namespace: string;
  Key: [number, string, number];
  DataModel: DataModel;
  TableName: "dossierProcedures";
}>(components.dossierProceduresByOrg, {
  namespace: (doc) => doc.orgId,
  sortKey: (doc) => [isDeletedKey(doc), doc.status, doc._creationTime],
});

// ---------------------------------------------------------------------------
// 20. Documents by Owner — Category
//     Namespace: ownerId (stringified polymorphic ID)
//     SortKey: [isDeleted, category]
// ---------------------------------------------------------------------------
export const documentsByOwnerCategory = new TableAggregate<{
  Namespace: string;
  Key: [number, string]; // [isDeleted, category]
  DataModel: DataModel;
  TableName: "documents";
}>(components.documentsByOwnerCategory, {
  namespace: (doc) => doc.ownerId as unknown as string,
  sortKey: (doc) => [isDeletedKey(doc), doc.category ?? "other"],
});

// ---------------------------------------------------------------------------
// 21. Documents by Owner — Expiry
//     Namespace: ownerId
//     SortKey: [isDeleted, expiresAt ?? MAX_SAFE_INTEGER]
//     Documents sans expiresAt sont placés à la fin (MAX_SAFE_INTEGER) pour
//     être exclus par les bornes `upper: { key: [0, threshold] }`.
// ---------------------------------------------------------------------------
export const documentsByOwnerExpiry = new TableAggregate<{
  Namespace: string;
  Key: [number, number]; // [isDeleted, expiresAt]
  DataModel: DataModel;
  TableName: "documents";
}>(components.documentsByOwnerExpiry, {
  namespace: (doc) => doc.ownerId as unknown as string,
  sortKey: (doc) => [
    isDeletedKey(doc),
    doc.expiresAt ?? Number.MAX_SAFE_INTEGER,
  ],
});

// ---------------------------------------------------------------------------
// 22. Missed Calls by Org — callbackStatus + time
// ---------------------------------------------------------------------------
export const missedCallsByOrgStatus = new TableAggregate<{
  Namespace: string;
  Key: [string, number]; // [callbackStatus, startedAt]
  DataModel: DataModel;
  TableName: "missedCalls";
}>(components.missedCallsByOrgStatus, {
  namespace: (doc) => doc.orgId,
  sortKey: (doc) => [doc.callbackStatus, doc.startedAt],
});

// ---------------------------------------------------------------------------
// 24. Missed Calls by Org — reason + time
// ---------------------------------------------------------------------------
export const missedCallsByOrgReason = new TableAggregate<{
  Namespace: string;
  Key: [string, number]; // [reason, startedAt]
  DataModel: DataModel;
  TableName: "missedCalls";
}>(components.missedCallsByOrgReason, {
  namespace: (doc) => doc.orgId,
  sortKey: (doc) => [doc.reason, doc.startedAt],
});

// ---------------------------------------------------------------------------
// 26. Users by Role — count users per platform role (O(log n))
//     Namespace: role (string). Users without a role default to "user".
//     SortKey:   _creationTime
//
//     Powers the role dropdown counts on /users:
//       usersByRole.count(ctx, { namespace: "admin" })
//     For population buckets that aggregate several roles (backoffice =
//     super_admin + admin_system + admin + sous_admin), sum the per-role
//     counts client-side or use `countBatch`.
// ---------------------------------------------------------------------------
export const usersByRole = new TableAggregate<{
  Namespace: string; // role
  Key: number; // _creationTime
  DataModel: DataModel;
  TableName: "users";
}>(components.usersByRole, {
  namespace: (doc) => doc.role ?? "user",
  sortKey: (doc) => doc._creationTime,
});

// ---------------------------------------------------------------------------
// 27. Users by Status — active / inactive / deleted
//     Namespace: "active" | "inactive" | "deleted"
//     SortKey:   _creationTime
//
//     Powers the Statut dropdown counts on /users. "deleted" is the
//     soft-delete bucket (deletedAt set); we keep it separate so callers
//     never confuse trash with inactive accounts.
// ---------------------------------------------------------------------------
export const usersByStatus = new TableAggregate<{
  Namespace: "active" | "inactive" | "deleted";
  Key: number;
  DataModel: DataModel;
  TableName: "users";
}>(components.usersByStatus, {
  namespace: (doc) =>
    doc.deletedAt ? "deleted" : doc.isActive ? "active" : "inactive",
  sortKey: (doc) => doc._creationTime,
});

// ---------------------------------------------------------------------------
// 28. Users by Country — count profiles per country of residence
//     Namespace: ISO 3166-1 alpha-2 (UPPER-case), or "__none__" when the
//                profile has no resolvable country.
//     SortKey:   _creationTime
//     TableName: "profiles" — country lives on the profile, not on users.
//                A user without a profile contributes nothing here; counts
//                represent profiled users, which matches the /users page UX.
//
//     Continent counts are derived client-side by mapping country → continent
//     and summing.
// ---------------------------------------------------------------------------
export const usersByCountry = new TableAggregate<{
  Namespace: string; // country code or "__none__"
  Key: number;
  DataModel: DataModel;
  TableName: "profiles";
}>(components.usersByCountry, {
  namespace: (doc) => {
    const c =
      doc.countryOfResidence ||
      doc.addresses?.residence?.country ||
      doc.identity?.nationality;
    return c ? String(c).toUpperCase() : "__none__";
  },
  sortKey: (doc) => doc._creationTime,
});

// ---------------------------------------------------------------------------
// 29. Memberships by User — "does this user belong to any org?"
//     Namespace: userId
//     SortKey:   [isDeleted (0|1), _creationTime]
//
//     Active memberships only: bound the count to keys with isDeleted = 0.
//
//       const activeCount = await membershipsByUser.count(ctx, {
//         namespace: userId,
//         bounds: { upper: { key: [0, Number.MAX_SAFE_INTEGER], inclusive: true } },
//       });
//       const hasMembership = activeCount > 0;
//
//     This complements `membershipsByOrg` (counts members per org) — same
//     source table, different namespace orientation.
// ---------------------------------------------------------------------------
export const membershipsByUser = new TableAggregate<{
  Namespace: string; // userId
  Key: [number, number]; // [isDeleted, _creationTime]
  DataModel: DataModel;
  TableName: "memberships";
}>(components.membershipsByUser, {
  namespace: (doc) => doc.userId,
  sortKey: (doc) => [doc.deletedAt ? 1 : 0, doc._creationTime],
});

// ---------------------------------------------------------------------------
// 25. Requests by OrgService — featured service computation (public catalog)
//     Namespace: orgServiceId
//     SortKey:   _creationTime
//     Permet de compter en O(log n) le nombre de demandes créées sur les
//     N derniers jours par orgService. Le calcul service-level (toutes orgs
//     confondues) est fait dans la query `getFeaturedService`.
// ---------------------------------------------------------------------------
export const requestsByOrgService = new TableAggregate<{
  Namespace: string; // orgServiceId as string
  Key: number; // _creationTime
  DataModel: DataModel;
  TableName: "requests";
}>(components.requestsByOrgService, {
  namespace: (doc) => doc.orgServiceId,
  sortKey: (doc) => doc._creationTime,
});

// ---------------------------------------------------------------------------
// 30. Profils par catégorie de métier — alimente la tab Catégories
//     (count par catégorie) et le ratio "profils catégorisés / total".
//     Namespace: ProfessionCategory ("tech" | "health" | ... | "other")
//                ou "__none__" si le profil n'a pas de profession.title.
//     SortKey:   _creationTime
// ---------------------------------------------------------------------------
export const profilesByCategory = new TableAggregate<{
  Namespace: string;
  Key: number;
  DataModel: DataModel;
  TableName: "profiles";
}>(components.profilesByCategory, {
  namespace: (doc) => doc.profession?.category ?? "__none__",
  sortKey: (doc) => doc._creationTime,
});

// ---------------------------------------------------------------------------
// 31. Profils par statut professionnel — donut "Statut professionnel"
//     de la tab Overview.
//     Namespace: ProfessionStatus ("employee" | "self_employed" | ... )
//                ou "__none__" si non renseigné.
//     SortKey:   _creationTime
// ---------------------------------------------------------------------------
export const profilesByProfessionStatus = new TableAggregate<{
  Namespace: string;
  Key: number;
  DataModel: DataModel;
  TableName: "profiles";
}>(components.profilesByProfessionStatus, {
  namespace: (doc) => doc.profession?.status ?? "__none__",
  sortKey: (doc) => doc._creationTime,
});

// ---------------------------------------------------------------------------
// 32. Profils par statut d'enrichissement IA — alimente les jauges de la
//     tab Santé + le compteur "X profils en attente".
//     Namespace: "no_title" (pas de profession.title)
//                "pending"  (title renseigné, aiEnrichedAt absent)
//                "enriched" (aiEnrichedAt présent, au moins 1 skill suggérée)
//                "ai_failed" (aiEnrichedAt présent mais category=other ou
//                             aucune skill suggérée — l'IA a échoué).
//     SortKey:   _creationTime
// ---------------------------------------------------------------------------
export const profilesByEnrichmentStatus = new TableAggregate<{
  Namespace: string;
  Key: number;
  DataModel: DataModel;
  TableName: "profiles";
}>(components.profilesByEnrichmentStatus, {
  namespace: (doc) => {
    const title = doc.profession?.title?.trim();
    if (!title) return "no_title";
    if (!doc.profession?.aiEnrichedAt) return "pending";
    const suggested = doc.profession?.aiSuggestedSkills ?? [];
    const cat = doc.profession?.category;
    if (suggested.length === 0 || cat === "other") return "ai_failed";
    return "enriched";
  },
  sortKey: (doc) => doc._creationTime,
});

// ---------------------------------------------------------------------------
// 33. Items cv.skills par niveau — distribution globale des niveaux
//     (tab Overview "Niveaux des compétences"). Pour la distribution
//     par skill, on lit `skillCatalogStats.byLevel` (précalculé).
//     Namespace: SkillLevel ("beginner" | "intermediate" | "advanced" | "expert")
//     SortKey:   _creationTime
// ---------------------------------------------------------------------------
export const cvSkillItemsByLevel = new TableAggregate<{
  Namespace: string;
  Key: number;
  DataModel: DataModel;
  TableName: "cvSkillItems";
}>(components.cvSkillItemsByLevel, {
  namespace: (doc) => doc.level,
  sortKey: (doc) => doc._creationTime,
});

