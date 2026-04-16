import { v } from "convex/values";
import { ObjectType, PropertyValidators } from "convex/values";
import { assertCanTransition } from "../lib/requestWorkflow";
import { paginationOptsValidator } from "convex/server";
import { query, internalQuery } from "../_generated/server";
import type { QueryCtx } from "../_generated/server";
import { triggeredInternalMutation } from "../lib/customFunctions";
import type { Doc, Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { authQuery, authMutation } from "../lib/customFunctions";
import { getMembership, requireBackOfficeAccess } from "../lib/auth";
import { logCortexAction } from "../lib/neocortex";
import { SIGNAL_TYPES, CATEGORIES_ACTION } from "../lib/types";
import { assertCanDoTask, assertCanAccessService } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";
import { generateReferenceNumber } from "../lib/utils";
import { generateRequestReference } from "../lib/referenceHelpers";
import {
  requestStatusValidator,
  requestPriorityValidator,
  RequestStatus,
  RequestPriority,
  EventType,
  ServiceCategory,
  RegistrationStatus,
} from "../lib/validators";
import { requestsByOrg } from "../lib/aggregates";
import { evaluateAutoTriggers, type AutoTrigger } from "../lib/generationTriggers";
import type { MutationCtx } from "../_generated/server";

/**
 * Evaluate and schedule auto-generation of official documents for a request.
 * Silently ignores failures at evaluation time — document generation must
 * never block or fail the triggering mutation. Individual render failures
 * surface through the `generatedDocuments` records and agent UI.
 */
async function scheduleAutoGeneration(
  ctx: MutationCtx,
  request: Doc<"requests">,
  trigger: AutoTrigger,
): Promise<void> {
  try {
    const matches = await evaluateAutoTriggers(ctx, request, trigger);
    for (const rule of matches) {
      await ctx.scheduler.runAfter(
        0,
        internal.functions.generatedDocuments.generateFromTemplateInternal,
        {
          requestId: request._id,
          templateId: rule.templateId,
          trigger: trigger.kind === "submission" ? "on_submission" : "status_transition",
          autoPublishOverride: rule.autoPublish,
          // Forward the rule's per-placeholder mapping (if configured) so
          // the resolver pulls from the configured fields instead of the
          // template's defaults.
          fieldMappingOverride: rule.fieldMapping,
        },
      );
    }
  } catch (err) {
    // Defensive — evaluateAutoTriggers is pure-ish but the DB call may fail.
    // We log but never throw: generation is side-car, not critical path.
    console.error("[scheduleAutoGeneration] failed", err);
  }
}

/**
 * Create a new service request from a dynamic form submission
 */
export const createFromForm = authMutation({
  args: {
    orgServiceId: v.id("orgServices"),
    formData: v.any(), // Validated by client-side Zod/JSON Schema
  },
  handler: async (ctx, args) => {
    const orgService = await ctx.db.get(args.orgServiceId);
    if (!orgService) {
      throw error(ErrorCode.SERVICE_NOT_FOUND);
    }

    // Phase E.3 — Vérification précédente unifiée (serviceAccess > moduleAccess > tasks[]).
    // Applique le check UNIQUEMENT si l'utilisateur est membre de l'org cible (cas agent backoffice).
    // Pour les citoyens (pas de membership), on laisse passer — ils créent leur propre demande.
    const membership = await getMembership(ctx, ctx.user._id, orgService.orgId);
    if (membership) {
      await assertCanAccessService(ctx, ctx.user, membership, orgService, "editor");
    }

    const now = Date.now();
    const reference = await generateRequestReference(ctx);
    const requestId = await ctx.db.insert("requests", {
      userId: ctx.user._id,
      orgId: orgService.orgId,
      orgServiceId: args.orgServiceId,
      reference,
      status: RequestStatus.Submitted,
      priority: RequestPriority.Normal,
      formData: args.formData,
      submittedAt: now,
      updatedAt: now,
    });

    // Log event
    await ctx.db.insert("events", {
      targetType: "request",
      targetId: requestId as unknown as string,
      actorId: ctx.user._id,
      type: EventType.RequestSubmitted,
      data: { status: RequestStatus.Submitted },
    });

    // NEOCORTEX: Signal demande soumise
    await logCortexAction(ctx, {
      action: "CREATE_REQUEST_FROM_FORM",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "requests",
      entiteId: requestId,
      userId: ctx.user._id,
      apres: { orgServiceId: args.orgServiceId, status: RequestStatus.Submitted },
      signalType: SIGNAL_TYPES.DEMANDE_SOUMISE,
    });

    // Auto-generation: fire any `on_submission` rules configured on the service.
    const createdRequest = await ctx.db.get(requestId);
    if (createdRequest) {
      await scheduleAutoGeneration(ctx, createdRequest, { kind: "submission" });
    }

    return requestId;
  },
});

/**
 * Create a new service request
 */
export const create = authMutation({
  args: {
    orgServiceId: v.id("orgServices"),
    formData: v.optional(v.any()),
    submitNow: v.optional(v.boolean()),
    childProfileId: v.optional(v.id("childProfiles")),
  },
  handler: async (ctx, args) => {
    const orgService = await ctx.db.get(args.orgServiceId);
    if (!orgService) {
      throw error(ErrorCode.SERVICE_NOT_FOUND);
    }
    if (!orgService.isActive) {
      throw error(ErrorCode.SERVICE_NOT_AVAILABLE);
    }

    // Phase E.3 — Vérification précédente unifiée (serviceAccess > moduleAccess > tasks[]).
    // Applique le check UNIQUEMENT si l'utilisateur est membre de l'org cible (cas agent backoffice).
    // Pour les citoyens (pas de membership), on laisse passer — ils créent leur propre demande.
    const creatorMembership = await getMembership(ctx, ctx.user._id, orgService.orgId);
    if (creatorMembership) {
      await assertCanAccessService(ctx, ctx.user, creatorMembership, orgService, "editor");
    }

    const status = args.submitNow ? RequestStatus.Submitted : RequestStatus.Draft;

    let targetProfileId: Id<"profiles"> | Id<"childProfiles"> | undefined;
    let documentIds: Id<"documents">[] = [];

    if (args.childProfileId) {
      // Request is for a child profile
      const child = await ctx.db.get(args.childProfileId);
      if (!child || child.authorUserId !== ctx.user._id) {
        throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
      }
      targetProfileId = child._id;
      const childDocs = child.documents ?? {};
      documentIds = Object.values(childDocs).filter(
        (id): id is Id<"documents"> => id !== undefined,
      );
    } else {
      // Request is for the adult profile (existing behavior)
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
        .unique();
      targetProfileId = profile?._id;
      const profileDocs = profile?.documents ?? {};
      documentIds = Object.values(profileDocs).filter(
        (id): id is Id<"documents"> => id !== undefined,
      );
    }

    const now = Date.now();

    const reference = args.submitNow ? await generateRequestReference(ctx) : `DRAFT-${now}`;

    const requestId = await ctx.db.insert("requests", {
      userId: ctx.user._id,
      profileId: targetProfileId,
      orgId: orgService.orgId,
      orgServiceId: args.orgServiceId,
      reference,
      status,
      priority: RequestPriority.Normal,
      formData: args.formData,
      // Auto-attach documents from profile's Document Vault
      documents: documentIds,
      submittedAt: args.submitNow ? now : undefined,
      updatedAt: now,
    });

    // Log event
    await ctx.db.insert("events", {
      targetType: "request",
      targetId: requestId as unknown as string,
      actorId: ctx.user._id,
      type:
        args.submitNow ? EventType.RequestSubmitted : EventType.RequestCreated,
      data: { status },
    });

    // NEOCORTEX: Signal demande créée/soumise
    await logCortexAction(ctx, {
      action: args.submitNow ? "SUBMIT_REQUEST" : "CREATE_REQUEST",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "requests",
      entiteId: requestId,
      userId: ctx.user._id,
      apres: { status, reference, orgServiceId: args.orgServiceId },
      signalType: args.submitNow ? SIGNAL_TYPES.DEMANDE_SOUMISE : SIGNAL_TYPES.DEMANDE_CREEE,
    });

    return { id: requestId, reference };
  },
});

/**
 * Shared helper: load all related data for a request document.
 */
async function loadRequestDetails(
  ctx: QueryCtx,
  request: Doc<"requests">,
  opts?: { includeAppointments?: boolean },
) {
  const [user, org, orgService, assignedTo] = await Promise.all([
    ctx.db.get(request.userId),
    ctx.db.get(request.orgId),
    ctx.db.get(request.orgServiceId),
    request.assignedTo ? ctx.db.get(request.assignedTo) : null,
  ]);

  const service = orgService ? await ctx.db.get(orgService.serviceId) : null;

  const requestDocIds = request.documents ?? [];
  const requestDocuments = (
    await Promise.all(requestDocIds.map((id: Id<"documents">) => ctx.db.get(id)))
  ).filter((doc): doc is NonNullable<typeof doc> => doc !== null);

  const documents = await Promise.all(
    requestDocuments.map(async (doc) => ({
      ...doc,
      url:
        doc.files?.[0]?.storageId ?
          await ctx.storage.getUrl(doc.files[0].storageId)
        : null,
      fileUrls:
        doc.files ?
          await Promise.all(
            doc.files.map(async (f) => ({
              filename: f.filename,
              mimeType: f.mimeType,
              url: await ctx.storage.getUrl(f.storageId),
            })),
          )
        : [],
    })),
  );

  const allEvents = await ctx.db
    .query("events")
    .withIndex("by_target", (q) =>
      q
        .eq("targetType", "request")
        .eq("targetId", request._id as unknown as string),
    )
    .collect();

  const notes = allEvents
    .filter((e) => e.type === EventType.NoteAdded)
    .map((e) => ({
      _id: e._id,
      content: e.data.content,
      isInternal: e.data.isInternal,
      createdAt: e._creationTime,
      userId: e.actorId,
    }));

  const statusHistory = allEvents
    .filter(
      (e) =>
        e.type === EventType.StatusChanged ||
        e.type === EventType.RequestSubmitted,
    )
    .map((e) => ({
      _id: e._id,
      type: e.type,
      from: e.data.from,
      to: e.data.to || e.data.status,
      note: e.data.note,
      createdAt: e._creationTime,
    }))
    .sort((a, b) => a.createdAt - b.createdAt);

  const joinedDocuments = service?.formSchema?.joinedDocuments ?? [];

  // Detect if this request is for a child profile
  let childProfile = null;
  let isChildRequest = false;
  if (request.profileId) {
    const maybeChild = await ctx.db.get(request.profileId as Id<"childProfiles">);
    if (maybeChild && "authorUserId" in maybeChild) {
      childProfile = maybeChild;
      isChildRequest = true;
    }
  }

  const base = {
    ...request,
    user: user ?? null,
    org: org ?? null,
    orgService: orgService ?? null,
    service: service ?? null,
    assignedTo: assignedTo ?? null,
    documents,
    notes,
    statusHistory,
    joinedDocuments,
    childProfile,
    isChildRequest,
  };

  if (opts?.includeAppointments) {
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_request", (q) => q.eq("requestId", request._id))
      .collect();
    return { ...base, appointments };
  }

  return base;
}

/**
 * Get request by ID with all related data (authenticated)
 */
export const getById = authQuery({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) return null;

    // Authorization: owner or staff with requests.view permission
    const isOwner = request.userId === ctx.user._id;
    if (!isOwner) {
      const membership = await getMembership(ctx, ctx.user._id, request.orgId);
      await assertCanDoTask(ctx, ctx.user, membership, "requests.view");
    }

    return loadRequestDetails(ctx, request);
  },
});

/**
 * Get request by reference ID with all related data (authenticated)
 */
export const getByReferenceId = authQuery({
  args: { referenceId: v.string() },
  handler: async (ctx, args) => {
    const request = await ctx.db
      .query("requests")
      .withIndex("by_reference", (q) => q.eq("reference", args.referenceId))
      .first();

    if (!request) return null;

    // Authorization: owner or staff with requests.view permission
    const isOwner = request.userId === ctx.user._id;
    if (!isOwner) {
      const membership = await getMembership(ctx, ctx.user._id, request.orgId);
      await assertCanDoTask(ctx, ctx.user, membership, "requests.view");
    }

    return loadRequestDetails(ctx, request, { includeAppointments: true });
  },
});

/**
 * Internal: get request by ID (no auth check, for trusted server-side callers only)
 */
export const internalGetById = internalQuery({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) return null;
    return loadRequestDetails(ctx, request);
  },
});

/**
 * Internal: get request by reference ID (no auth check, for trusted server-side callers only)
 */
export const internalGetByReferenceId = internalQuery({
  args: { referenceId: v.string() },
  handler: async (ctx, args) => {
    const request = await ctx.db
      .query("requests")
      .withIndex("by_reference", (q) => q.eq("reference", args.referenceId))
      .first();
    if (!request) return null;
    return loadRequestDetails(ctx, request, { includeAppointments: true });
  },
});

/**
 * List requests for current user
 */
export const listMine = authQuery({
  args: {
    status: v.optional(requestStatusValidator),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const paginatedResult =
      args.status ?
        await ctx.db
          .query("requests")
          .withIndex("by_user_status", (q) =>
            q.eq("userId", ctx.user._id).eq("status", args.status!),
          )
          .order("desc")
          .paginate(args.paginationOpts)
      : await ctx.db
          .query("requests")
          .withIndex("by_user_status", (q) => q.eq("userId", ctx.user._id))
          .order("desc")
          .paginate(args.paginationOpts);

    // Batch fetch related data for current page only
    const orgServiceIds = [
      ...new Set(paginatedResult.page.map((r) => r.orgServiceId)),
    ];
    const orgIds = [...new Set(paginatedResult.page.map((r) => r.orgId))];

    const [orgServices, orgs] = await Promise.all([
      Promise.all(orgServiceIds.map((id) => ctx.db.get(id))),
      Promise.all(orgIds.map((id) => ctx.db.get(id))),
    ]);

    const orgServiceMap = new Map(
      orgServices.filter(Boolean).map((os) => [os!._id, os!]),
    );
    const orgMap = new Map(orgs.filter(Boolean).map((o) => [o!._id, o!]));

    // Get service details
    const serviceIds = [
      ...new Set(orgServices.filter(Boolean).map((os) => os!.serviceId)),
    ];
    const services = await Promise.all(serviceIds.map((id) => ctx.db.get(id)));
    const serviceMap = new Map(
      services.filter(Boolean).map((s) => [s!._id, s!]),
    );

    // Fetch documents for page requests
    const requestDocuments = await Promise.all(
      paginatedResult.page.map(async (request) => {
        const docIds = request.documents ?? [];
        const docs = (
          await Promise.all(docIds.map((id) => ctx.db.get(id)))
        ).filter((doc): doc is NonNullable<typeof doc> => doc !== null);
        return { requestId: request._id, documents: docs };
      }),
    );
    const documentsMap = new Map(
      requestDocuments.map((rd) => [rd.requestId, rd.documents]),
    );

    // Resolve child profile names for requests made on behalf of children
    const childProfileIds = [
      ...new Set(
        paginatedResult.page
          .map((r) => r.profileId)
          .filter((id): id is NonNullable<typeof id> => !!id),
      ),
    ];
    const childProfiles = await Promise.all(
      childProfileIds.map(async (id) => {
        const maybeChild = await ctx.db.get(id as Id<"childProfiles">);
        if (maybeChild && "authorUserId" in maybeChild) {
          return { id, child: maybeChild };
        }
        return null;
      }),
    );
    const childProfileMap = new Map(
      childProfiles
        .filter((c): c is NonNullable<typeof c> => c !== null)
        .map((c) => [c.id, c.child]),
    );

    return {
      ...paginatedResult,
      page: paginatedResult.page.map((request) => {
        const orgService = orgServiceMap.get(request.orgServiceId);
        const service =
          orgService ? serviceMap.get(orgService.serviceId) : null;
        const childProfile = request.profileId
          ? childProfileMap.get(request.profileId)
          : null;
        return {
          ...request,
          org: orgMap.get(request.orgId),
          orgService,
          service,
          serviceName: service?.name,
          documents: documentsMap.get(request._id) || [],
          childProfile: childProfile
            ? {
                firstName: childProfile.identity.firstName,
                lastName: childProfile.identity.lastName,
              }
            : null,
          isChildRequest: !!childProfile,
          pendingActionsCount: (request.actionsRequired ?? []).filter(
            (a: { completedAt?: number }) => !a.completedAt,
          ).length,
        };
      }),
    };
  },
});

/**
 * List requests for an organization
 */
export const listByOrg = authQuery({
  args: {
    orgId: v.id("orgs"),
    status: v.optional(requestStatusValidator),
    assignedTo: v.optional(v.id("memberships")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "requests.view");

    let paginatedResult;

    if (args.assignedTo) {
      // Filter by assigned agent — use the by_assigned index
      paginatedResult = await ctx.db
        .query("requests")
        .withIndex("by_assigned", (q) => q.eq("assignedTo", args.assignedTo!))
        .filter((q) =>
          args.status
            ? q.and(
                q.eq(q.field("orgId"), args.orgId),
                q.eq(q.field("status"), args.status),
              )
            : q.eq(q.field("orgId"), args.orgId),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (args.status) {
      paginatedResult = await ctx.db
        .query("requests")
        .withIndex("by_org_status", (q) =>
          q.eq("orgId", args.orgId).eq("status", args.status!),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      paginatedResult = await ctx.db
        .query("requests")
        .withIndex("by_org_status", (q) => q.eq("orgId", args.orgId))
        .order("desc")
        .paginate(args.paginationOpts);
    }

    // Batch fetch users and services for the current page only
    const userIds = [...new Set(paginatedResult.page.map((r) => r.userId))];
    const orgServiceIds = [
      ...new Set(paginatedResult.page.map((r) => r.orgServiceId)),
    ];

    const [users, orgServices] = await Promise.all([
      Promise.all(userIds.map((id) => ctx.db.get(id))),
      Promise.all(orgServiceIds.map((id) => ctx.db.get(id))),
    ]);

    const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u!]));
    const orgServiceMap = new Map(
      orgServices.filter(Boolean).map((os) => [os!._id, os!]),
    );

    const serviceIds = [
      ...new Set(orgServices.filter(Boolean).map((os) => os!.serviceId)),
    ];
    const services = await Promise.all(serviceIds.map((id) => ctx.db.get(id)));
    const serviceMap = new Map(
      services.filter(Boolean).map((s) => [s!._id, s!]),
    );

    // Resolve child profiles for requests made on behalf of children
    const childProfileIds = [
      ...new Set(
        paginatedResult.page
          .map((r) => r.profileId)
          .filter((id): id is NonNullable<typeof id> => !!id),
      ),
    ];
    const childProfileResults = await Promise.all(
      childProfileIds.map(async (id) => {
        const maybeChild = await ctx.db.get(id as Id<"childProfiles">);
        if (maybeChild && "authorUserId" in maybeChild) {
          return { id, child: maybeChild };
        }
        return null;
      }),
    );
    const childProfileMap = new Map(
      childProfileResults
        .filter((c): c is NonNullable<typeof c> => c !== null)
        .map((c) => [c.id, c.child]),
    );

    return {
      ...paginatedResult,
      page: paginatedResult.page.map((request) => {
        const orgService = orgServiceMap.get(request.orgServiceId);
        const service =
          orgService ? serviceMap.get(orgService.serviceId) : null;
        const childProfile = request.profileId
          ? childProfileMap.get(request.profileId)
          : null;
        return {
          ...request,
          user: userMap.get(request.userId),
          orgService,
          service,
          serviceName: service?.name,
          childProfile: childProfile
            ? {
                firstName: childProfile.identity.firstName,
                lastName: childProfile.identity.lastName,
              }
            : null,
          isChildRequest: !!childProfile,
          pendingActionsCount: (request.actionsRequired ?? []).filter(
            (a: { completedAt?: number }) => !a.completedAt,
          ).length,
        };
      }),
    };
  },
});

/**
 * Phase C5 — Liste les demandes en retard pour une org
 *
 * Retourne les demandes dont (now - _creationTime) > service.estimatedDays.
 * Utilisé pour les alertes SLA dans le dashboard et la liste des demandes.
 */
export const listOverdueByOrg = authQuery({
  args: {
    orgId: v.id("orgs"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "requests.view");

    const limit = args.limit ?? 50;

    // Demandes non terminées
    const allActive = await ctx.db
      .query("requests")
      .withIndex("by_org_status", (q) => q.eq("orgId", args.orgId))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), RequestStatus.Completed),
          q.neq(q.field("status"), RequestStatus.Cancelled),
          q.neq(q.field("status"), RequestStatus.Rejected),
        ),
      )
      .collect();

    const now = Date.now();
    const overdue = await Promise.all(
      allActive.map(async (req) => {
        const orgService = await ctx.db.get(req.orgServiceId);
        if (!orgService) return null;
        const service = await ctx.db.get(orgService.serviceId);
        if (!service) return null;

        const sla =
          (orgService as { estimatedDays?: number }).estimatedDays ??
          (service as { estimatedDays?: number }).estimatedDays ??
          null;
        if (!sla || sla <= 0) return null;

        const ageDays = (now - req._creationTime) / (24 * 60 * 60 * 1000);
        const daysRemaining = sla - ageDays;

        if (daysRemaining > 0) return null; // pas encore en retard

        const user = await ctx.db.get(req.userId);

        return {
          _id: req._id,
          reference: req.reference,
          status: req.status,
          createdAt: req._creationTime,
          ageDays: Math.floor(ageDays),
          slaDays: sla,
          daysOverdue: Math.floor(-daysRemaining),
          serviceName: (service as { name?: { fr?: string; en?: string } })
            ?.name,
          user: user
            ? {
                _id: user._id,
                firstName: (user as { firstName?: string }).firstName,
                lastName: (user as { lastName?: string }).lastName,
                email: user.email,
              }
            : null,
        };
      }),
    );

    const filtered = overdue
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
      .slice(0, limit);

    return filtered;
  },
});

/**
 * Phase F3.1 — Forecast SLA breach : retourne les demandes qui vont
 * approcher leur deadline SLA dans les N prochains jours.
 *
 * Utilisé par le RepDashboard pour afficher un widget d'anticipation
 * « X demandes à risque dans les 3 prochains jours ».
 *
 * Différence avec listOverdueByOrg : retourne les demandes NON ENCORE
 * en retard, avec un score de risque (daysUntilBreach décroissant).
 */
export const forecastSlaBreach = authQuery({
  args: {
    orgId: v.id("orgs"),
    withinDays: v.optional(v.number()), // défaut : 7 jours
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "requests.view");

    const withinDays = args.withinDays ?? 7;
    const limit = args.limit ?? 20;

    const allActive = await ctx.db
      .query("requests")
      .withIndex("by_org_status", (q) => q.eq("orgId", args.orgId))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), RequestStatus.Completed),
          q.neq(q.field("status"), RequestStatus.Cancelled),
          q.neq(q.field("status"), RequestStatus.Rejected),
        ),
      )
      .collect();

    const now = Date.now();
    const atRisk = await Promise.all(
      allActive.map(async (req) => {
        const orgService = await ctx.db.get(req.orgServiceId);
        if (!orgService) return null;
        const service = await ctx.db.get(orgService.serviceId);
        if (!service) return null;

        const sla =
          (orgService as { estimatedDays?: number }).estimatedDays ??
          (service as { estimatedDays?: number }).estimatedDays ??
          null;
        if (!sla || sla <= 0) return null;

        const ageDays = (now - req._creationTime) / (24 * 60 * 60 * 1000);
        const daysRemaining = sla - ageDays;

        // Filtre : uniquement celles qui vont breach dans withinDays
        // mais qui ne sont PAS encore en retard
        if (daysRemaining <= 0 || daysRemaining > withinDays) return null;

        const user = await ctx.db.get(req.userId);
        const riskLevel: "critical" | "high" | "medium" =
          daysRemaining <= 1 ? "critical" : daysRemaining <= 3 ? "high" : "medium";

        return {
          _id: req._id,
          reference: req.reference,
          status: req.status,
          createdAt: req._creationTime,
          ageDays: Math.floor(ageDays),
          slaDays: sla,
          daysUntilBreach: Math.floor(daysRemaining * 10) / 10,
          riskLevel,
          serviceName: (service as { name?: { fr?: string; en?: string } })
            ?.name,
          user: user
            ? {
                _id: user._id,
                firstName: (user as { firstName?: string }).firstName,
                lastName: (user as { lastName?: string }).lastName,
                email: user.email,
              }
            : null,
        };
      }),
    );

    return atRisk
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => a.daysUntilBreach - b.daysUntilBreach)
      .slice(0, limit);
  },
});

/**
 * List requests for an organization filtered by multiple statuses (for Kanban columns).
 * Uses index prefix on orgId + runtime filter for status array.
 */
export const listByOrgStatuses = authQuery({
  args: {
    orgId: v.id("orgs"),
    statuses: v.array(v.string()),
    assignedTo: v.optional(v.id("memberships")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "requests.view");

    let paginatedResult;

    if (args.assignedTo) {
      paginatedResult = await ctx.db
        .query("requests")
        .withIndex("by_assigned", (q) => q.eq("assignedTo", args.assignedTo!))
        .filter((q) =>
          q.and(
            q.eq(q.field("orgId"), args.orgId),
            q.or(...args.statuses.map((s) => q.eq(q.field("status"), s))),
          ),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      paginatedResult = await ctx.db
        .query("requests")
        .withIndex("by_org_status", (q) => q.eq("orgId", args.orgId))
        .filter((q) =>
          q.or(...args.statuses.map((s) => q.eq(q.field("status"), s))),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }

    // Batch fetch users and services for the current page only
    const userIds = [...new Set(paginatedResult.page.map((r) => r.userId))];
    const orgServiceIds = [
      ...new Set(paginatedResult.page.map((r) => r.orgServiceId)),
    ];

    const [users, orgServices] = await Promise.all([
      Promise.all(userIds.map((id) => ctx.db.get(id))),
      Promise.all(orgServiceIds.map((id) => ctx.db.get(id))),
    ]);

    const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u!]));
    const orgServiceMap = new Map(
      orgServices.filter(Boolean).map((os) => [os!._id, os!]),
    );

    const serviceIds = [
      ...new Set(orgServices.filter(Boolean).map((os) => os!.serviceId)),
    ];
    const servicesData = await Promise.all(serviceIds.map((id) => ctx.db.get(id)));
    const serviceMap = new Map(
      servicesData.filter(Boolean).map((s) => [s!._id, s!]),
    );

    return {
      ...paginatedResult,
      page: paginatedResult.page.map((request) => {
        const orgService = orgServiceMap.get(request.orgServiceId);
        const service =
          orgService ? serviceMap.get(orgService.serviceId) : null;
        return {
          ...request,
          user: userMap.get(request.userId),
          orgService,
          service,
          serviceName: service?.name,
          pendingActionsCount: (request.actionsRequired ?? []).filter(
            (a: { completedAt?: number }) => !a.completedAt,
          ).length,
        };
      }),
    };
  },
});

/**
 * List ALL requests across all orgs (superadmin only)
 * Supports optional orgId and status filters
 */
export const listAll = authQuery({
  args: {
    orgId: v.optional(v.id("orgs")),
    status: v.optional(requestStatusValidator),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireBackOfficeAccess(ctx);

    let paginatedResult;

    if (args.orgId && args.status) {
      paginatedResult = await ctx.db
        .query("requests")
        .withIndex("by_org_status", (q) =>
          q.eq("orgId", args.orgId!).eq("status", args.status!),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (args.orgId) {
      paginatedResult = await ctx.db
        .query("requests")
        .withIndex("by_org_status", (q) => q.eq("orgId", args.orgId!))
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (args.status) {
      // No index for status-only, scan all desc
      paginatedResult = await ctx.db
        .query("requests")
        .order("desc")
        .filter((q) => q.eq(q.field("status"), args.status!))
        .paginate(args.paginationOpts);
    } else {
      paginatedResult = await ctx.db
        .query("requests")
        .order("desc")
        .paginate(args.paginationOpts);
    }

    // Batch fetch users, orgs, and services for the current page
    const userIds = [...new Set(paginatedResult.page.map((r) => r.userId))];
    const orgIds = [...new Set(paginatedResult.page.map((r) => r.orgId))];
    const orgServiceIds = [
      ...new Set(paginatedResult.page.map((r) => r.orgServiceId)),
    ];

    const [users, orgs, orgServices] = await Promise.all([
      Promise.all(userIds.map((id) => ctx.db.get(id))),
      Promise.all(orgIds.map((id) => ctx.db.get(id))),
      Promise.all(orgServiceIds.map((id) => ctx.db.get(id))),
    ]);

    const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u!]));
    const orgMap = new Map(orgs.filter(Boolean).map((o) => [o!._id, o!]));
    const orgServiceMap = new Map(
      orgServices.filter(Boolean).map((os) => [os!._id, os!]),
    );

    const serviceIds = [
      ...new Set(orgServices.filter(Boolean).map((os) => os!.serviceId)),
    ];
    const services = await Promise.all(serviceIds.map((id) => ctx.db.get(id)));
    const serviceMap = new Map(
      services.filter(Boolean).map((s) => [s!._id, s!]),
    );

    return {
      ...paginatedResult,
      page: paginatedResult.page.map((request) => {
        const orgService = orgServiceMap.get(request.orgServiceId);
        const service =
          orgService ? serviceMap.get(orgService.serviceId) : null;
        return {
          ...request,
          user: userMap.get(request.userId),
          org: orgMap.get(request.orgId),
          orgService,
          service,
          serviceName: service?.name,
        };
      }),
    };
  },
});

/**
 * Internal submit: core submission logic without auth checks.
 * Transitions a Draft request to Pending, generates reference, logs event, triggers AI.
 * Called by the public `submit` and by profile-level auto-submit functions.
 */
export const internalSubmit = triggeredInternalMutation({
  args: {
    requestId: v.id("requests"),
    formData: v.optional(v.any()),
    actorId: v.id("users"),
    extraEventData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw error(ErrorCode.REQUEST_NOT_FOUND);
    }
    if (request.status !== RequestStatus.Draft) {
      throw error(ErrorCode.REQUEST_NOT_DRAFT);
    }

    const now = Date.now();

    const newReference = await generateRequestReference(ctx);
    await ctx.db.patch(args.requestId, {
      status: RequestStatus.Submitted,
      formData: args.formData ?? request.formData,
      reference: newReference,
      submittedAt: now,
      updatedAt: now,
    });

    // Log event
    await ctx.db.insert("events", {
      targetType: "request",
      targetId: args.requestId as unknown as string,
      actorId: args.actorId,
      type: EventType.RequestSubmitted,
      data: {
        from: RequestStatus.Draft,
        to: RequestStatus.Submitted,
        ...(args.extraEventData ?? {}),
      },
    });

    // Auto-assign and AI analysis are handled reactively by triggers
    // (see convex/triggers/index.ts — fires on Draft → Submitted only)

    return args.requestId;
  },
});

/**
 * Submit a draft request (public, with auth + appointment handling)
 */
export const submit = authMutation({
  args: {
    requestId: v.id("requests"),
    formData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw error(ErrorCode.REQUEST_NOT_FOUND);
    }
    if (request.userId !== ctx.user._id) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }
    if (request.status !== RequestStatus.Draft) {
      throw error(ErrorCode.REQUEST_NOT_DRAFT);
    }


    // Delegate core submission to internalSubmit
    await ctx.scheduler.runAfter(0, internal.functions.requests.internalSubmit, {
      requestId: args.requestId,
      formData: args.formData,
      actorId: ctx.user._id,
    });

    // Check if Registration service → create consularRegistrations entry
    const orgService = await ctx.db.get(request.orgServiceId);
    const service = orgService ? await ctx.db.get(orgService.serviceId) : null;
    if (service?.category === ServiceCategory.Registration) {
      // Detect if this request is for a child profile
      const childProfile = request.profileId
        ? await ctx.db.get(request.profileId as Id<"childProfiles">)
        : null;
      const isChildRequest = childProfile !== null && "authorUserId" in childProfile;

      if (isChildRequest) {
        await ctx.scheduler.runAfter(
          0,
          internal.functions.consularRegistrations.createFromRequest,
          {
            childProfileId: request.profileId as Id<"childProfiles">,
            orgId: request.orgId,
            requestId: args.requestId,
          },
        );
      } else {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
          .unique();

        if (profile) {
          await ctx.scheduler.runAfter(
            0,
            internal.functions.consularRegistrations.createFromRequest,
            {
              profileId: profile._id,
              orgId: request.orgId,
              requestId: args.requestId,
            },
          );
        }
      }
    }

    // NEOCORTEX: Signal demande soumise
    await logCortexAction(ctx, {
      action: "SUBMIT_REQUEST",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "requests",
      entiteId: args.requestId,
      userId: ctx.user._id,
      avant: { status: RequestStatus.Draft },
      apres: { status: RequestStatus.Submitted },
      signalType: SIGNAL_TYPES.DEMANDE_SOUMISE,
    });

    // Auto-generation: fire any `on_submission` rules configured on the service.
    await scheduleAutoGeneration(ctx, request, { kind: "submission" });

    return args.requestId;
  },
});

/**
 * Update request status (org agent only)
 */
export const updateStatus = authMutation({
  args: {
    requestId: v.id("requests"),
    status: requestStatusValidator,
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw error(ErrorCode.REQUEST_NOT_FOUND);
    }

    const membership = await getMembership(ctx, ctx.user._id, request.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "requests.process");

    const oldStatus = request.status as RequestStatus;
    const newStatus = args.status as RequestStatus;
    const now = Date.now();

    // Enforce valid transitions
    if (oldStatus !== newStatus) {
      assertCanTransition(oldStatus, newStatus);
    }

    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: now,
    };

    if (args.status === RequestStatus.Completed) {
      updates.completedAt = now;
    }

    await ctx.db.patch(args.requestId, updates);

    // Log event
    await ctx.db.insert("events", {
      targetType: "request",
      targetId: args.requestId as unknown as string,
      actorId: ctx.user._id,
      type: EventType.StatusChanged,
      data: { from: oldStatus, to: args.status, note: args.note },
    });

    // NEOCORTEX: Signal changement de statut
    const statusSignal =
      newStatus === RequestStatus.Completed ? SIGNAL_TYPES.DEMANDE_COMPLETEE
      : newStatus === RequestStatus.Rejected ? SIGNAL_TYPES.DEMANDE_REJETEE
      : SIGNAL_TYPES.DEMANDE_STATUT_CHANGE;
    await logCortexAction(ctx, {
      action: "UPDATE_REQUEST_STATUS",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "requests",
      entiteId: args.requestId,
      userId: ctx.user._id,
      avant: { status: oldStatus },
      apres: { status: newStatus },
      signalType: statusSignal,
      priorite: newStatus === RequestStatus.Rejected ? "HIGH" : "NORMAL",
    });

    // Auto-generation: fire any `on_status_transition` rules matching
    // old → new status on the service.
    if (oldStatus !== newStatus) {
      await scheduleAutoGeneration(ctx, request, {
        kind: "status_transition",
        from: oldStatus,
        to: newStatus,
      });
    }

    // Sync consularRegistrations if this is a Registration service
    const orgService = await ctx.db.get(request.orgServiceId);
    const service = orgService ? await ctx.db.get(orgService.serviceId) : null;

    if (service?.category === ServiceCategory.Registration) {
      let regStatus:
        | (typeof RegistrationStatus)[keyof typeof RegistrationStatus]
        | null = null;

      if (args.status === RequestStatus.Completed) {
        regStatus = RegistrationStatus.Active;
      } else if (args.status === RequestStatus.Cancelled) {
        regStatus = RegistrationStatus.Expired;
      }

      if (regStatus) {
        const registration = await ctx.db
          .query("consularRegistrations")
          .withIndex("by_request", (q) => q.eq("requestId", args.requestId))
          .unique();

        if (registration && registration.status !== regStatus) {
          await ctx.db.patch(registration._id, {
            status: regStatus,
            ...(regStatus === RegistrationStatus.Active && {
              activatedAt: now,
            }),
          });
        }
      }
    }

    return args.requestId;
  },
});

/**
 * Assign request to an agent
 */
export const assign = authMutation({
  args: {
    requestId: v.id("requests"),
    agentId: v.id("memberships"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw error(ErrorCode.REQUEST_NOT_FOUND);
    }

    const membership = await getMembership(ctx, ctx.user._id, request.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "requests.assign");

    await ctx.db.patch(args.requestId, {
      assignedTo: args.agentId,
      updatedAt: Date.now(),
    });

    // Log event
    await ctx.db.insert("events", {
      targetType: "request",
      targetId: args.requestId as unknown as string,
      actorId: ctx.user._id,
      type: EventType.Assigned,
      data: { agentId: args.agentId },
    });

    // NEOCORTEX: Signal demande assignée
    await logCortexAction(ctx, {
      action: "ASSIGN_REQUEST",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "requests",
      entiteId: args.requestId,
      userId: ctx.user._id,
      apres: { assignedTo: args.agentId },
      signalType: SIGNAL_TYPES.DEMANDE_ASSIGNEE,
    });

    return args.requestId;
  },
});

/**
 * Add note to a request
 */
export const addNote = authMutation({
  args: {
    requestId: v.id("requests"),
    content: v.string(),
    isInternal: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw error(ErrorCode.REQUEST_NOT_FOUND);
    }

    // Check permissions
    const isOwner = request.userId === ctx.user._id;
    if (!isOwner) {
      const membership = await getMembership(ctx, ctx.user._id, request.orgId);
      await assertCanDoTask(ctx, ctx.user, membership, "requests.view");
    }

    // Only agents can add internal notes
    if (isOwner && args.isInternal) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    // Log event as a note
    await ctx.db.insert("events", {
      targetType: "request",
      targetId: args.requestId as unknown as string,
      actorId: ctx.user._id,
      type: EventType.NoteAdded,
      data: {
        content: args.content,
        isInternal: args.isInternal ?? false,
      },
    });

    return args.requestId;
  },
});

/**
 * Cancel a request (user only, draft/submitted only)
 */
export const cancel = authMutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw error(ErrorCode.REQUEST_NOT_FOUND);
    }
    if (request.userId !== ctx.user._id) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }
    if (
      ![RequestStatus.Draft, RequestStatus.Pending].includes(
        request.status as any,
      )
    ) {
      throw error(ErrorCode.REQUEST_CANNOT_CANCEL);
    }

    await ctx.db.patch(args.requestId, {
      status: RequestStatus.Cancelled,
      updatedAt: Date.now(),
    });

    // Log event
    await ctx.db.insert("events", {
      targetType: "request",
      targetId: args.requestId as unknown as string,
      actorId: ctx.user._id,
      type: EventType.StatusChanged,
      data: { from: request.status, to: RequestStatus.Cancelled },
    });

    // NEOCORTEX: Signal annulation
    await logCortexAction(ctx, {
      action: "CANCEL_REQUEST",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "requests",
      entiteId: args.requestId,
      userId: ctx.user._id,
      avant: { status: request.status },
      apres: { status: RequestStatus.Cancelled },
      signalType: SIGNAL_TYPES.DEMANDE_STATUT_CHANGE,
    });

    return args.requestId;
  },
});

/**
 * Set action required on a request (agent only)
 * Notifies the citizen that they need to provide additional info/documents
 */
export const setActionRequired = authMutation({
  args: {
    requestId: v.id("requests"),
    type: v.union(
      v.literal("upload_document"),
      v.literal("complete_info"),
      v.literal("schedule_appointment"),
      v.literal("make_payment"),
      v.literal("confirm_info"),
    ),
    message: v.string(),
    // Rich document types with metadata
    documentTypes: v.optional(v.array(v.object({
      type: v.string(),
      label: v.optional(v.any()),
      required: v.optional(v.boolean()),
    }))),
    // Rich field metadata for dynamic rendering
    fields: v.optional(v.array(v.object({
      fieldPath: v.string(),
      label: v.optional(v.any()),
      type: v.optional(v.string()),
      options: v.optional(v.any()),
      currentValue: v.optional(v.any()),
      sectionTitle: v.optional(v.any()),
    }))),
    infoToConfirm: v.optional(v.string()),
    deadline: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw error(ErrorCode.REQUEST_NOT_FOUND);
    }

    const membership = await getMembership(ctx, ctx.user._id, request.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "requests.process");

    const now = Date.now();
    const actionId = crypto.randomUUID().slice(0, 12);
    const existingActions = (request as any).actionsRequired ?? [];

    await ctx.db.patch(args.requestId, {
      actionsRequired: [
        ...existingActions,
        {
          id: actionId,
          type: args.type,
          message: args.message,
          documentTypes: args.documentTypes,
          fields: args.fields,
          infoToConfirm: args.infoToConfirm,
          deadline: args.deadline,
          createdAt: now,
        },
      ],
      updatedAt: now,
    });

    // Log event
    await ctx.db.insert("events", {
      targetType: "request",
      targetId: args.requestId as unknown as string,
      actorId: ctx.user._id,
      type: EventType.ActionRequired,
      data: {
        actionType: args.type,
        message: args.message,
        documentTypes: args.documentTypes,
        deadline: args.deadline,
      },
    });

    // Send notification email to citizen
    await ctx.scheduler.runAfter(
      0,
      internal.functions.notifications.notifyActionRequired,
      {
        requestId: args.requestId,
        message: args.message,
        deadline: args.deadline,
      },
    );

    return args.requestId;
  },
});

/**
 * Build a profile patch from formData changes (inverse of buildRegistrationFormData).
 * Maps form section/field IDs back to profile nested structure.
 * Only includes fields that are present in the formData update.
 */
function buildProfilePatchFromFormData(
  formData: Record<string, Record<string, unknown>>,
  existingProfile: Record<string, any>,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  // basic_info -> identity
  if (formData.basic_info) {
    const bi = formData.basic_info;
    const identity = { ...(existingProfile.identity ?? {}) };
    if (bi.last_name !== undefined) identity.lastName = bi.last_name;
    if (bi.first_name !== undefined) identity.firstName = bi.first_name;
    if (bi.nip !== undefined) identity.nip = bi.nip;
    if (bi.gender !== undefined) identity.gender = bi.gender;
    if (bi.birth_date !== undefined) {
      const ts = typeof bi.birth_date === "string" ? new Date(bi.birth_date).getTime() : bi.birth_date;
      if (typeof ts === "number" && !isNaN(ts)) identity.birthDate = ts;
    }
    if (bi.birth_place !== undefined) identity.birthPlace = bi.birth_place;
    if (bi.birth_country !== undefined) identity.birthCountry = bi.birth_country;
    if (bi.nationality !== undefined) identity.nationality = bi.nationality;
    if (bi.nationality_acquisition !== undefined) identity.nationalityAcquisition = bi.nationality_acquisition;
    patch.identity = identity;
  }

  // passport_info -> passportInfo
  if (formData.passport_info) {
    const pi = formData.passport_info;
    const passportInfo = { ...(existingProfile.passportInfo ?? {}) };
    if (pi.passport_number !== undefined) passportInfo.number = pi.passport_number;
    if (pi.passport_issue_date !== undefined) {
      const ts = typeof pi.passport_issue_date === "string" ? new Date(pi.passport_issue_date).getTime() : pi.passport_issue_date;
      if (typeof ts === "number" && !isNaN(ts)) passportInfo.issueDate = ts;
    }
    if (pi.passport_expiry_date !== undefined) {
      const ts = typeof pi.passport_expiry_date === "string" ? new Date(pi.passport_expiry_date).getTime() : pi.passport_expiry_date;
      if (typeof ts === "number" && !isNaN(ts)) passportInfo.expiryDate = ts;
    }
    if (pi.passport_issuing_authority !== undefined) passportInfo.issuingAuthority = pi.passport_issuing_authority;
    patch.passportInfo = passportInfo;
  }

  // family_info -> family
  if (formData.family_info) {
    const fi = formData.family_info;
    const family = { ...(existingProfile.family ?? {}) };
    if (fi.marital_status !== undefined) family.maritalStatus = fi.marital_status;
    if (fi.father_last_name !== undefined || fi.father_first_name !== undefined) {
      family.father = { ...(family.father ?? {}) };
      if (fi.father_last_name !== undefined) family.father.lastName = fi.father_last_name;
      if (fi.father_first_name !== undefined) family.father.firstName = fi.father_first_name;
    }
    if (fi.mother_last_name !== undefined || fi.mother_first_name !== undefined) {
      family.mother = { ...(family.mother ?? {}) };
      if (fi.mother_last_name !== undefined) family.mother.lastName = fi.mother_last_name;
      if (fi.mother_first_name !== undefined) family.mother.firstName = fi.mother_first_name;
    }
    if (fi.spouse_last_name !== undefined || fi.spouse_first_name !== undefined) {
      family.spouse = { ...(family.spouse ?? {}) };
      if (fi.spouse_last_name !== undefined) family.spouse.lastName = fi.spouse_last_name;
      if (fi.spouse_first_name !== undefined) family.spouse.firstName = fi.spouse_first_name;
    }
    patch.family = family;
  }

  // contact_info -> contacts
  if (formData.contact_info) {
    const ci = formData.contact_info;
    const contacts = { ...(existingProfile.contacts ?? {}) };
    if (ci.email !== undefined) contacts.email = ci.email;
    if (ci.phone !== undefined) contacts.phone = ci.phone;
    patch.contacts = contacts;
  }

  // residence_address -> addresses.residence
  if (formData.residence_address) {
    const ra = formData.residence_address;
    const addresses = { ...(existingProfile.addresses ?? {}) };
    const residence = { ...(addresses.residence ?? {}) };
    if (ra.residence_street !== undefined) residence.street = ra.residence_street;
    if (ra.residence_city !== undefined) residence.city = ra.residence_city;
    if (ra.residence_postal_code !== undefined) residence.postalCode = ra.residence_postal_code;
    if (ra.residence_country !== undefined) residence.country = ra.residence_country;
    addresses.residence = residence;
    patch.addresses = addresses;
  }

  // homeland_address -> addresses.homeland
  if (formData.homeland_address) {
    const ha = formData.homeland_address;
    const addresses = (patch.addresses as Record<string, any>) ?? { ...(existingProfile.addresses ?? {}) };
    const homeland = { ...(addresses.homeland ?? {}) };
    if (ha.homeland_street !== undefined) homeland.street = ha.homeland_street;
    if (ha.homeland_city !== undefined) homeland.city = ha.homeland_city;
    if (ha.homeland_postal_code !== undefined) homeland.postalCode = ha.homeland_postal_code;
    if (ha.homeland_country !== undefined) homeland.country = ha.homeland_country;
    addresses.homeland = homeland;
    patch.addresses = addresses;
  }

  // emergency_contacts (new array format) -> contacts.emergencyContacts
  if (Array.isArray(formData.emergency_contacts) && formData.emergency_contacts.length > 0) {
    const contacts = (patch.contacts as Record<string, any>) ?? { ...(existingProfile.contacts ?? {}) };
    contacts.emergencyContacts = formData.emergency_contacts.map((ec: any) => ({
      ...(ec.last_name !== undefined && { lastName: ec.last_name }),
      ...(ec.first_name !== undefined && { firstName: ec.first_name }),
      ...(ec.phone !== undefined && { phone: ec.phone }),
      ...(ec.email !== undefined && { email: ec.email }),
      ...(ec.country !== undefined && { country: ec.country }),
    }));
    patch.contacts = contacts;
  }

  // Legacy: emergency_residence -> contacts.emergencyContacts[0]
  if (formData.emergency_residence) {
    const er = formData.emergency_residence;
    const contacts = (patch.contacts as Record<string, any>) ?? { ...(existingProfile.contacts ?? {}) };
    const emergencyContacts = [...(contacts.emergencyContacts ?? [])];
    const existing = emergencyContacts[0] ?? {};
    emergencyContacts[0] = {
      ...existing,
      ...(er.emergency_residence_last_name !== undefined && { lastName: er.emergency_residence_last_name }),
      ...(er.emergency_residence_first_name !== undefined && { firstName: er.emergency_residence_first_name }),
      ...(er.emergency_residence_phone !== undefined && { phone: er.emergency_residence_phone }),
      ...(er.emergency_residence_email !== undefined && { email: er.emergency_residence_email }),
    };
    contacts.emergencyContacts = emergencyContacts;
    patch.contacts = contacts;
  }

  // Legacy: emergency_homeland -> contacts.emergencyContacts[1]
  if (formData.emergency_homeland) {
    const eh = formData.emergency_homeland;
    const contacts = (patch.contacts as Record<string, any>) ?? { ...(existingProfile.contacts ?? {}) };
    const emergencyContacts = [...(contacts.emergencyContacts ?? [])];
    if (!emergencyContacts[0]) emergencyContacts[0] = {};
    const existing = emergencyContacts[1] ?? {};
    emergencyContacts[1] = {
      ...existing,
      ...(eh.emergency_homeland_last_name !== undefined && { lastName: eh.emergency_homeland_last_name }),
      ...(eh.emergency_homeland_first_name !== undefined && { firstName: eh.emergency_homeland_first_name }),
      ...(eh.emergency_homeland_phone !== undefined && { phone: eh.emergency_homeland_phone }),
      ...(eh.emergency_homeland_email !== undefined && { email: eh.emergency_homeland_email }),
    };
    contacts.emergencyContacts = emergencyContacts;
    patch.contacts = contacts;
  }

  // professional_info -> profession
  if (formData.professional_info) {
    const pi = formData.professional_info;
    const profession = { ...(existingProfile.profession ?? {}) };
    if (pi.work_status !== undefined) profession.status = pi.work_status;
    if (pi.profession !== undefined) profession.title = pi.profession;
    if (pi.employer !== undefined) profession.employer = pi.employer;
    patch.profession = profession;
  }

  return patch;
}

/**
 * Respond to action required (citizen only)
 * Allows citizen to provide requested info/documents
 */
export const respondToAction = authMutation({
  args: {
    requestId: v.id("requests"),
    actionId: v.string(),
    documentIds: v.optional(v.array(v.id("documents"))),
    formData: v.optional(v.any()),
    confirmed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw error(ErrorCode.REQUEST_NOT_FOUND);
    }

    // Only the request owner can respond
    if (request.userId !== ctx.user._id) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    const actions = request.actionsRequired ?? [];
    const actionIndex = actions.findIndex((a) => a.id === args.actionId);
    if (actionIndex === -1) {
      throw error(
        ErrorCode.REQUEST_NOT_DRAFT,
        "No action required with this ID on this request",
      );
    }

    const action = actions[actionIndex];
    const now = Date.now();

    // Add documents to request if provided
    if (args.documentIds && args.documentIds.length > 0) {
      const existingDocs = request.documents || [];
      await ctx.db.patch(args.requestId, {
        documents: [...existingDocs, ...args.documentIds],
      });

      // Ensure each document's ownerId is set to the citizen's profileId
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
        .unique();

      if (profile) {
        for (const docId of args.documentIds) {
          const doc = await ctx.db.get(docId);
          if (doc && doc.ownerId !== profile._id) {
            await ctx.db.patch(docId, { ownerId: profile._id });
          }
        }

        // Sync to profile.documents for registration/notification services only
        const orgService = await ctx.db.get(request.orgServiceId);
        const service = orgService ? await ctx.db.get(orgService.serviceId) : null;
        const PROFILE_SYNC_CATEGORIES: string[] = [
          ServiceCategory.Registration,
          ServiceCategory.Notification,
        ];

        if (service && PROFILE_SYNC_CATEGORIES.includes(service.category)) {
          const PROFILE_DOC_MAP: Record<string, string> = {
            passport: "passport",
            proof_of_address: "proofOfAddress",
            identity_photo: "identityPhoto",
            birth_certificate: "birthCertificate",
            proof_of_residency: "proofOfResidency",
          };
          const profileDocUpdates: Record<string, Id<"documents">> = {};

          for (const docId of args.documentIds) {
            const doc = await ctx.db.get(docId);
            if (doc?.documentType && PROFILE_DOC_MAP[doc.documentType]) {
              profileDocUpdates[PROFILE_DOC_MAP[doc.documentType]] = docId;
            }
          }

          if (Object.keys(profileDocUpdates).length > 0) {
            await ctx.db.patch(profile._id, {
              documents: {
                ...(profile.documents ?? {}),
                ...profileDocUpdates,
              },
              updatedAt: now,
            });
          }
        }
      }
    }

    // Deep merge formData response into request.formData
    if (args.formData && typeof args.formData === 'object') {
      const existingFormData = (request.formData as Record<string, unknown>) || {};
      const merged = { ...existingFormData };
      for (const [key, value] of Object.entries(args.formData as Record<string, unknown>)) {
        if (
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value) &&
          merged[key] &&
          typeof merged[key] === 'object' &&
          !Array.isArray(merged[key])
        ) {
          merged[key] = { ...(merged[key] as Record<string, unknown>), ...(value as Record<string, unknown>) };
        } else {
          merged[key] = value;
        }
      }
      await ctx.db.patch(args.requestId, {
        formData: merged,
      });

      // Sync formData changes to profile for registration/notification requests
      const orgService = await ctx.db.get(request.orgServiceId);
      const service = orgService ? await ctx.db.get(orgService.serviceId) : null;
      const PROFILE_SYNC_CATEGORIES: string[] = [
        ServiceCategory.Registration,
        ServiceCategory.Notification,
      ];

      if (service && PROFILE_SYNC_CATEGORIES.includes(service.category)) {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
          .unique();

        if (profile) {
          const profilePatch = buildProfilePatchFromFormData(
            args.formData as Record<string, Record<string, unknown>>,
            profile as any,
          );
          if (Object.keys(profilePatch).length > 0) {
            await ctx.db.patch(profile._id, {
              ...profilePatch,
              updatedAt: now,
            });
          }
        }
      }
    }

    // Update the specific action in the array with response
    const updatedActions = [...actions];
    updatedActions[actionIndex] = {
      ...action,
      completedAt: now,
      response: {
        respondedAt: now,
        documentIds: args.documentIds,
        formData: args.formData,
        confirmed: args.confirmed,
      },
    };

    await ctx.db.patch(args.requestId, {
      actionsRequired: updatedActions,
      updatedAt: now,
    });

    // Log event
    await ctx.db.insert("events", {
      targetType: "request",
      targetId: args.requestId as unknown as string,
      actorId: ctx.user._id,
      type: EventType.ActionCleared,
      data: {
        responseType: action.type,
        documentCount: args.documentIds?.length || 0,
      },
    });

    return args.requestId;
  },
});

/**
 * Clear action required on a request (agent only)
 * If actionId is provided, removes only that action. Otherwise clears all.
 */
export const clearActionRequired = authMutation({
  args: {
    requestId: v.id("requests"),
    actionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw error(ErrorCode.REQUEST_NOT_FOUND);
    }

    const membership = await getMembership(ctx, ctx.user._id, request.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "requests.process");

    if (args.actionId) {
      // Remove only the targeted action
      const actions = request.actionsRequired ?? [];
      const filtered = actions.filter((a) => a.id !== args.actionId);
      await ctx.db.patch(args.requestId, {
        actionsRequired: filtered.length > 0 ? filtered : undefined,
        updatedAt: Date.now(),
      });
    } else {
      // Clear all actions
      await ctx.db.patch(args.requestId, {
        actionsRequired: undefined,
        updatedAt: Date.now(),
      });
    }

    // Log event
    await ctx.db.insert("events", {
      targetType: "request",
      targetId: args.requestId as unknown as string,
      actorId: ctx.user._id,
      type: EventType.ActionCleared,
      data: { actionId: args.actionId },
    });

    return args.requestId;
  },
});

/**
 * Update request priority
 */
export const updatePriority = authMutation({
  args: {
    requestId: v.id("requests"),
    priority: requestPriorityValidator,
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw error(ErrorCode.REQUEST_NOT_FOUND);
    }

    const membership = await getMembership(ctx, ctx.user._id, request.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "requests.process");

    await ctx.db.patch(args.requestId, {
      priority: args.priority,
      updatedAt: Date.now(),
    });

    return args.requestId;
  },
});

/**
 * Get the latest active request for the current user (not completed, cancelled, or rejected)
 */
export const getLatestActive = authQuery({
  args: {},
  handler: async (ctx) => {
    // Get all requests for user and filter for active ones
    const requests = await ctx.db
      .query("requests")
      .withIndex("by_user_status", (q) => q.eq("userId", ctx.user._id))
      .take(1);

    // Filter for active statuses
    const activeStatuses = [
      RequestStatus.Draft,
      RequestStatus.Submitted,
      RequestStatus.Pending,
      RequestStatus.UnderReview,
      RequestStatus.InProduction,
      RequestStatus.Validated,
      RequestStatus.AppointmentScheduled,
      RequestStatus.ReadyForPickup,
    ];

    const activeRequest = requests.find((r) =>
      activeStatuses.includes(
        r.status,
      ),
    );

    if (!activeRequest) return null;

    // Get related data
    const [org, orgService] = await Promise.all([
      ctx.db.get(activeRequest.orgId),
      ctx.db.get(activeRequest.orgServiceId),
    ]);

    const service = orgService ? await ctx.db.get(orgService.serviceId) : null;

    return {
      ...activeRequest,
      org,
      orgService,
      service,
    };
  },
});

/**
 * List all active (non-terminal) requests for the current user.
 * Used by the dashboard "Démarches en cours" widget.
 */
export const listMyActive = authQuery({
  args: {},
  handler: async (ctx) => {
    const activeStatuses = [
      RequestStatus.Draft,
      RequestStatus.Submitted,
      RequestStatus.Pending,
      RequestStatus.UnderReview,
      RequestStatus.InProduction,
      RequestStatus.Validated,
      RequestStatus.AppointmentScheduled,
      RequestStatus.ReadyForPickup,
    ];

    // Fetch recent requests (take enough to cover active ones)
    const requests = await ctx.db
      .query("requests")
      .withIndex("by_user_status", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .take(50);

    const activeRequests = requests.filter((r) =>
      activeStatuses.includes(r.status),
    );

    // Batch-fetch related data
    const orgIds = [...new Set(activeRequests.map((r) => r.orgId))];
    const orgServiceIds = [...new Set(activeRequests.map((r) => r.orgServiceId))];

    const [orgs, orgServices] = await Promise.all([
      Promise.all(orgIds.map((id) => ctx.db.get(id))),
      Promise.all(orgServiceIds.map((id) => ctx.db.get(id))),
    ]);

    const orgMap = new Map(orgs.filter(Boolean).map((o) => [o!._id, o!]));
    const orgServiceMap = new Map(
      orgServices.filter(Boolean).map((os) => [os!._id, os!]),
    );

    const serviceIds = [
      ...new Set(orgServices.filter(Boolean).map((os) => os!.serviceId)),
    ];
    const services = await Promise.all(serviceIds.map((id) => ctx.db.get(id)));
    const serviceMap = new Map(
      services.filter(Boolean).map((s) => [s!._id, s!]),
    );

    // Resolve child profiles
    const childProfileIds = [
      ...new Set(
        activeRequests
          .map((r) => r.profileId)
          .filter((id): id is NonNullable<typeof id> => !!id),
      ),
    ];
    const childProfileResults = await Promise.all(
      childProfileIds.map(async (id) => {
        const maybeChild = await ctx.db.get(id as Id<"childProfiles">);
        if (maybeChild && "authorUserId" in maybeChild) {
          return { id, child: maybeChild };
        }
        return null;
      }),
    );
    const childProfileMap = new Map(
      childProfileResults
        .filter((c): c is NonNullable<typeof c> => c !== null)
        .map((c) => [c.id, c.child]),
    );

    return activeRequests.map((r) => {
      const orgService = orgServiceMap.get(r.orgServiceId);
      const service = orgService ? serviceMap.get(orgService.serviceId) : null;
      const childProfile = r.profileId
        ? childProfileMap.get(r.profileId)
        : null;
      return {
        _id: r._id,
        _creationTime: r._creationTime,
        status: r.status,
        reference: r.reference,
        org: orgMap.get(r.orgId) ?? null,
        service: service ?? null,
        childProfile: childProfile
          ? {
              firstName: childProfile.identity.firstName,
              lastName: childProfile.identity.lastName,
            }
          : null,
        isChildRequest: !!childProfile,
        pendingActionsCount: (r.actionsRequired ?? []).filter(
          (a: { completedAt?: number }) => !a.completedAt,
        ).length,
      };
    });
  },
});

/**
 * Get dashboard stats for current user
 */
export const getDashboardStats = authQuery({
  args: {},
  handler: async (ctx) => {
    const requests = await ctx.db
      .query("requests")
      .withIndex("by_user_status", (q) => q.eq("userId", ctx.user._id))
      .take(500);

    const activeStatuses = [
      RequestStatus.Draft,
      RequestStatus.Submitted,
      RequestStatus.Pending,
      RequestStatus.UnderReview,
      RequestStatus.InProduction,
      RequestStatus.Validated,
      RequestStatus.AppointmentScheduled,
      RequestStatus.ReadyForPickup,
    ];

    const totalRequests = requests.length;
    const activeRequests = requests.filter((r) =>
      activeStatuses.includes(
        r.status as (typeof RequestStatus)[keyof typeof RequestStatus],
      ),
    ).length;

    return {
      totalRequests,
      activeRequests,
    };
  },
});

/**
 * Get existing draft request for a specific service (if any)
 * Returns the draft so it can be resumed instead of creating a new one
 */
export const getDraftForService = authQuery({
  args: {
    orgServiceId: v.id("orgServices"),
    childProfileId: v.optional(v.id("childProfiles")),
  },
  handler: async (ctx, args) => {
    const draft = await ctx.db
      .query("requests")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", ctx.user._id).eq("status", RequestStatus.Draft),
      )
      .filter((q) => {
        const serviceMatch = q.eq(q.field("orgServiceId"), args.orgServiceId);
        if (args.childProfileId) {
          // Only return drafts for this specific child
          return q.and(serviceMatch, q.eq(q.field("profileId"), args.childProfileId));
        }
        return serviceMatch;
      })
      .first();

    return draft;
  },
});

/**
 * Delete a draft request permanently
 * Only works for drafts, only by the owner
 */
export const deleteDraft = authMutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw error(ErrorCode.REQUEST_NOT_FOUND);
    }
    if (request.userId !== ctx.user._id) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }
    if (request.status !== RequestStatus.Draft) {
      throw error(ErrorCode.REQUEST_NOT_DRAFT);
    }

    // Delete associated documents using request.documents array
    const docIds = request.documents ?? [];
    for (const docId of docIds) {
      const doc = await ctx.db.get(docId);
      if (doc) {
        await ctx.db.delete(doc._id);
      }
    }

    // Delete events for this request
    const events = await ctx.db
      .query("events")
      .withIndex("by_target", (q) =>
        q
          .eq("targetType", "request")
          .eq("targetId", args.requestId as unknown as string),
      )
      .collect();

    for (const event of events) {
      await ctx.db.delete(event._id);
    }

    // Delete the request itself
    await ctx.db.delete(args.requestId);

    return true;
  },
});

/**
 * Toggle validation state for a form field (agent only)
 */
export const validateField = authMutation({
  args: {
    requestId: v.id("requests"),
    fieldPath: v.string(), // "sectionId.fieldId"
    validated: v.boolean(),
  },
  handler: async (ctx, { requestId, fieldPath, validated }) => {
    const request = await ctx.db.get(requestId);
    if (!request) {
      throw error(ErrorCode.REQUEST_NOT_FOUND);
    }

    // Only agents can validate fields
    const membership = await getMembership(ctx, ctx.user._id, request.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "requests.validate");

    const current = request.fieldValidations ?? {};

    if (validated) {
      current[fieldPath] = {
        validatedAt: Date.now(),
        validatedBy: ctx.user._id,
      };
    } else {
      delete current[fieldPath];
    }

    await ctx.db.patch(requestId, {
      fieldValidations: current,
      updatedAt: Date.now(),
    });

    return requestId;
  },
});

/**
 * Get aggregate stats for requests by org.
 * Uses requestsByOrg aggregate for O(log n) counts per status.
 */
export const getStatsByOrg = authQuery({
  args: {
    orgId: v.id("orgs"),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "requests.view");

    const total = await requestsByOrg.count(ctx, { namespace: args.orgId });

    // Count per status using prefix bounds
    const statuses = [
      "draft", "submitted", "pending", "pending_completion", "edited",
      "under_review", "processing", "in_production", "validated",
      "appointment_scheduled", "ready_for_pickup", "completed",
      "cancelled", "rejected",
    ] as const;

    const statusCounts: Record<string, number> = {};
    for (const status of statuses) {
      const count = await requestsByOrg.count(ctx, {
        namespace: args.orgId,
        bounds: { prefix: [status] },
      });
      if (count > 0) statusCounts[status] = count;
    }

    return { total, statusCounts };
  },
});
