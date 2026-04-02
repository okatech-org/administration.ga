import { v } from "convex/values";
import { ObjectType, PropertyValidators } from "convex/values";
import { assertCanTransition } from "../lib/requestWorkflow";
import { paginationOptsValidator } from "convex/server";
import { query } from "../_generated/server";
import { triggeredInternalMutation } from "../lib/customFunctions";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { authQuery, authMutation } from "../lib/customFunctions";
import { getMembership, requireBackOfficeAccess } from "../lib/auth";
import { logCortexAction } from "../lib/neocortex";
import { SIGNAL_TYPES, CATEGORIES_ACTION } from "../lib/types";
import { assertCanDoTask } from "../lib/permissions";
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
  },
  handler: async (ctx, args) => {
    const orgService = await ctx.db.get(args.orgServiceId);
    if (!orgService) {
      throw error(ErrorCode.SERVICE_NOT_FOUND);
    }
    if (!orgService.isActive) {
      throw error(ErrorCode.SERVICE_NOT_AVAILABLE);
    }

    const status = args.submitNow ? RequestStatus.Submitted : RequestStatus.Draft;

    // Get user's profile for Document Vault auto-attachment
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();

    const now = Date.now();

    // Convert profile's typed documents object to array of document IDs
    const profileDocs = profile?.documents ?? {};
    const documentIds = Object.values(profileDocs).filter(
      (id): id is Id<"documents"> => id !== undefined,
    );

    const reference = args.submitNow ? await generateRequestReference(ctx) : `DRAFT-${now}`;

    const requestId = await ctx.db.insert("requests", {
      userId: ctx.user._id,
      profileId: profile?._id,
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
 * Get request by ID with all related data
 */
export const getById = query({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) return null;

    const [user, org, orgService, assignedTo] = await Promise.all([
      ctx.db.get(request.userId),
      ctx.db.get(request.orgId),
      ctx.db.get(request.orgServiceId),
      request.assignedTo ? ctx.db.get(request.assignedTo) : null,
    ]);

    const service = orgService ? await ctx.db.get(orgService.serviceId) : null;

    // Get documents for this request using the documents array
    const requestDocIds = request.documents ?? [];
    const requestDocuments = (
      await Promise.all(requestDocIds.map((id) => ctx.db.get(id)))
    ).filter((doc): doc is NonNullable<typeof doc> => doc !== null);

    // Use request documents directly
    const mergedDocs = requestDocuments;

    // Generate URLs for each document (first file for backwards compatibility)
    const documents = await Promise.all(
      mergedDocs.map(async (doc) => ({
        ...doc,
        url:
          doc.files?.[0]?.storageId ?
            await ctx.storage.getUrl(doc.files[0].storageId)
          : null,
        // Include all file URLs for multi-file support
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

    // Get ALL events for this request (notes, status changes, etc.)
    const allEvents = await ctx.db
      .query("events")
      .withIndex("by_target", (q) =>
        q
          .eq("targetType", "request")
          .eq("targetId", args.requestId as unknown as string),
      )
      .collect();

    // Separate notes for backwards compatibility
    const notes = allEvents
      .filter((e) => e.type === EventType.NoteAdded)
      .map((e) => ({
        _id: e._id,
        content: e.data.content,
        isInternal: e.data.isInternal,
        createdAt: e._creationTime,
        userId: e.actorId,
      }));

    // Get status change events for timeline
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

    // Get joinedDocuments from orgService or service formSchema
    const joinedDocuments = service?.formSchema?.joinedDocuments ?? [];

    return {
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
    };
  },
});

/**
 * Get request by reference ID with all related data
 */
export const getByReferenceId = query({
  args: { referenceId: v.string() },
  handler: async (ctx, args) => {
    const request = await ctx.db
      .query("requests")
      .withIndex("by_reference", (q) => q.eq("reference", args.referenceId))
      .first();

    if (!request) return null;

    const [user, org, orgService, assignedTo] = await Promise.all([
      ctx.db.get(request.userId),
      ctx.db.get(request.orgId),
      ctx.db.get(request.orgServiceId),
      request.assignedTo ? ctx.db.get(request.assignedTo) : null,
    ]);

    const service = orgService ? await ctx.db.get(orgService.serviceId) : null;

    // Get documents for this request using the documents array
    const requestDocIds = request.documents ?? [];
    const requestDocuments = (
      await Promise.all(requestDocIds.map((id) => ctx.db.get(id)))
    ).filter((doc): doc is NonNullable<typeof doc> => doc !== null);

    // Use request documents directly
    const mergedDocs = requestDocuments;

    // Generate URLs for each document (first file for backwards compatibility)
    const documents = await Promise.all(
      mergedDocs.map(async (doc) => ({
        ...doc,
        url:
          doc.files?.[0]?.storageId ?
            await ctx.storage.getUrl(doc.files[0].storageId)
          : null,
        // Include all file URLs for multi-file support
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

    // Get ALL events for this request (notes, status changes, etc.)
    const allEvents = await ctx.db
      .query("events")
      .withIndex("by_target", (q) =>
        q
          .eq("targetType", "request")
          .eq("targetId", request._id as unknown as string),
      )
      .collect();

    // Separate notes for backwards compatibility
    const notes = allEvents
      .filter((e) => e.type === EventType.NoteAdded)
      .map((e) => ({
        _id: e._id,
        content: e.data.content,
        isInternal: e.data.isInternal,
        createdAt: e._creationTime,
        userId: e.actorId,
      }));

    // Get status change events for timeline
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

    // Get joinedDocuments from orgService or service formSchema
    const joinedDocuments = service?.formSchema?.joinedDocuments ?? [];

    // Fetch the linked appointments if they exist
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_request", (q) => q.eq("requestId", request._id))
      .collect();

    return {
      ...request,
      user,
      org,
      orgService,
      service,
      assignedTo,
      documents,
      notes,
      statusHistory,
      joinedDocuments,
      appointments,
    };
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

    return {
      ...paginatedResult,
      page: paginatedResult.page.map((request) => {
        const orgService = orgServiceMap.get(request.orgServiceId);
        const service =
          orgService ? serviceMap.get(orgService.serviceId) : null;
        return {
          ...request,
          org: orgMap.get(request.orgId),
          orgService,
          service,
          serviceName: service?.name,
          documents: documentsMap.get(request._id) || [],
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
        };
      }),
    };
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
  },
  handler: async (ctx, args) => {
    const draft = await ctx.db
      .query("requests")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", ctx.user._id).eq("status", RequestStatus.Draft),
      )
      .filter((q) => q.eq(q.field("orgServiceId"), args.orgServiceId))
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
