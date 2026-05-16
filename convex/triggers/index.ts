import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import {
  RequestStatus,
  RegistrationStatus,
  ServiceCategory,
  NotificationType,
} from "../lib/constants";
import { getTasksForMembership } from "../lib/permissions";
import {
  requestsByOrg,
  membershipsByOrg,
  orgServicesByOrg,
  globalCounts,
  registrationsByOrg,
  requestsGlobal,
  associationsGlobal,
  companiesGlobal,
  orgsGlobal,
  servicesGlobal,
  appointmentsByOrg,
  childProfilesGlobal,
  diplomaticTargetsByOrg,
  diplomaticLettersByOrg,
  diplomaticPlansByOrg,
  diplomaticReportsByOrg,
  diplomaticProjectsByOrg,
  correspondanceItemsByOrg,
  dossierProceduresByOrg,
  documentsByOwnerCategory,
  documentsByOwnerExpiry,
  missedCallsByOrgStatus,
  missedCallsByOrgReason,
  requestsByOrgService,
  usersByRole,
  usersByStatus,
  usersByCountry,
  membershipsByUser,
} from "../lib/aggregates";
import triggers from "../lib/triggerSetup";
import {
  onRequestChanged,
  onDocumentUploaded,
  onCorrespondanceCreated,
  onAppointmentScheduled,
  onContextUpdated,
} from "../ai/aiTriggers";

// ============================================================================
// AGGREGATE TRIGGERS — Keep denormalized counts in sync
// ============================================================================
// Using idempotentTrigger so backfill migrations work safely
triggers.register("requests", requestsByOrg.idempotentTrigger());
triggers.register("memberships", membershipsByOrg.idempotentTrigger());
triggers.register("orgServices", orgServicesByOrg.idempotentTrigger());
triggers.register("users", globalCounts.idempotentTrigger());

// New aggregate triggers
triggers.register("consularRegistrations", registrationsByOrg.idempotentTrigger());
triggers.register("requests", requestsGlobal.idempotentTrigger());
triggers.register("associations", associationsGlobal.idempotentTrigger());
triggers.register("companies", companiesGlobal.idempotentTrigger());
triggers.register("orgs", orgsGlobal.idempotentTrigger());
triggers.register("services", servicesGlobal.idempotentTrigger());
triggers.register("appointments", appointmentsByOrg.idempotentTrigger());
triggers.register("childProfiles", childProfilesGlobal.idempotentTrigger());

// Phase 2 — Dashboard performance aggregates
triggers.register("diplomaticTargets", diplomaticTargetsByOrg.idempotentTrigger());
triggers.register("diplomaticLetters", diplomaticLettersByOrg.idempotentTrigger());
triggers.register("diplomaticPlans", diplomaticPlansByOrg.idempotentTrigger());
triggers.register("diplomaticReports", diplomaticReportsByOrg.idempotentTrigger());
triggers.register("diplomaticProjects", diplomaticProjectsByOrg.idempotentTrigger());
triggers.register("correspondanceItems", correspondanceItemsByOrg.idempotentTrigger());
triggers.register("dossierProcedures", dossierProceduresByOrg.idempotentTrigger());
triggers.register("documents", documentsByOwnerCategory.idempotentTrigger());
triggers.register("documents", documentsByOwnerExpiry.idempotentTrigger());
triggers.register("missedCalls", missedCallsByOrgStatus.idempotentTrigger());
triggers.register("missedCalls", missedCallsByOrgReason.idempotentTrigger());

// Public services catalog — featured service computation
triggers.register("requests", requestsByOrgService.idempotentTrigger());

// /users page facets — role / status / country / per-user membership counts.
// idempotentTrigger handles namespace flips (role change, isActive flip) via
// _replace automatically.
triggers.register("users", usersByRole.idempotentTrigger());
triggers.register("users", usersByStatus.idempotentTrigger());
triggers.register("profiles", usersByCountry.idempotentTrigger());
triggers.register("memberships", membershipsByUser.idempotentTrigger());

// ============================================================================
// REQUESTS TRIGGERS
// ============================================================================

// Sync status and timestamps from events to requests (Event Sourcing hydration)
triggers.register("events", async (ctx, change) => {
  if (change.operation !== "insert") return;

  const event = change.newDoc;

  // Only handle events targeting requests
  if (event.targetType !== "request") return;

  const requestId = event.targetId as Id<"requests">;

  // We need to check if the request actually exists (it might have been deleted)
  // Note: triggers run in the same transaction, so this `get` is consistent
  const request = await ctx.db.get(requestId);
  if (!request) return;

  const updates: Partial<any> = {
    updatedAt: Date.now(),
  };

  // Handle specific event types
  if (event.type === "status_changed" && event.data?.to) {
    updates.status = event.data.to;

    if (event.data.to === RequestStatus.Submitted) {
      updates.submittedAt = Date.now();
    }
    if (event.data.to === RequestStatus.Completed) {
      updates.completedAt = Date.now();
    }
  } else if (event.type === "request_submitted") {
    // Explicit submission event
    updates.status = RequestStatus.Submitted;
    updates.submittedAt = Date.now();
  }

  // Only patch if there are meaningful updates
  if (Object.keys(updates).length > 1) {
    // updatedAt is always there
    await ctx.db.patch(requestId, updates);
  }
});

// ============================================================================
// REQUEST SUBMITTED → AUTO-ASSIGN + AI ANALYSIS
// ============================================================================
// Fires ONLY on Draft → Submitted (first submission).
// If service requires a deposit appointment, auto-assign is DEFERRED
// until the citizen books one (handled by the appointments trigger below).

triggers.register("requests", async (ctx, change) => {
  if (!change.newDoc) return;
  if (change.newDoc.status !== RequestStatus.Submitted) return;

  // Fire on: insert with Submitted OR update Draft → Submitted
  const isNewSubmission =
    change.operation === "insert" ||
    (change.operation === "update" &&
      change.oldDoc?.status === RequestStatus.Draft);

  if (!isNewSubmission) return;

  const request = change.newDoc;
  const org = await ctx.db.get(request.orgId);
  if (!org) return;

  // Check if service requires a deposit appointment
  const orgService = await ctx.db.get(request.orgServiceId);
  const needsDepositAppointment = orgService?.requiresAppointment === true;

  // 1. Auto-assign if org has requestAssignment === "auto"
  //    BUT defer if service requires deposit appointment (wait for booking)
  if (org.settings?.requestAssignment === "auto" && !needsDepositAppointment) {
    await autoAssignRequest(ctx, change.id, request.orgId);
  }

  // 2. Trigger AI analysis (conditional on org settings, default: enabled)
  if (org.settings?.aiAnalysisEnabled !== false) {
    await ctx.scheduler.runAfter(0, internal.functions.ai.analyzeRequest, {
      requestId: change.id,
    });
  }
});

// ============================================================================
// APPOINTMENTS → SYNC REQUEST + DEFERRED AUTO-ASSIGN
// ============================================================================
// When a new appointment is created with a requestId:
// 1. Link it to the request (depositAppointmentId or pickupAppointmentId)
// 2. If it's a deposit appointment and the request has no agent → auto-assign

triggers.register("appointments", async (ctx, change) => {
  if (change.operation !== "insert") return;
  const appointment = change.newDoc;
  if (!appointment?.requestId) return;

  const request = await ctx.db.get(appointment.requestId);
  if (!request) return;

  // Determine which field to update based on appointment type
  const isPickup = appointment.appointmentType === "pickup";
  const field = isPickup ? "pickupAppointmentId" : "depositAppointmentId";

  await ctx.db.patch(request._id, { [field]: change.id });

  // If it's a deposit appointment and the request has no agent → deferred auto-assign
  if (!isPickup && !request.assignedTo) {
    const org = await ctx.db.get(request.orgId);
    if (org?.settings?.requestAssignment === "auto") {
      await autoAssignRequest(ctx, request._id, request.orgId);
    }
  }
});

// ============================================================================
// SHARED: Auto-assign to least-busy agent
// ============================================================================

async function autoAssignRequest(
  ctx: any,
  requestId: Id<"requests">,
  orgId: Id<"orgs">,
) {
  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
    .filter((q: any) => q.eq(q.field("deletedAt"), undefined))
    .collect();

  if (memberships.length === 0) return;

  // Filter to only members with the "requests.process" task
  const eligibleMemberships = [];
  for (const m of memberships) {
    const tasks = await getTasksForMembership(ctx, m);
    if (tasks.has("requests.process")) {
      eligibleMemberships.push(m);
    }
  }

  if (eligibleMemberships.length === 0) return;

  // Count active (non-completed/cancelled) requests per eligible agent
  const assignCounts = await Promise.all(
    eligibleMemberships.map(async (m: any) => ({
      membershipId: m._id,
      count: (
        await ctx.db
          .query("requests")
          .withIndex("by_assigned", (q: any) => q.eq("assignedTo", m._id))
          .filter((q: any) =>
            q.and(
              q.neq(q.field("status"), RequestStatus.Completed),
              q.neq(q.field("status"), RequestStatus.Cancelled),
            ),
          )
          .collect()
      ).length,
    })),
  );

  // Pick the agent with the fewest active requests
  assignCounts.sort((a: any, b: any) => a.count - b.count);
  await ctx.db.patch(requestId, {
    assignedTo: assignCounts[0].membershipId,
  });
}

// ============================================================================
// REQUEST STATUS CHANGE → SYNC REGISTRATION + NOTIFY
// ============================================================================

triggers.register("requests", async (ctx, change) => {
  // Only handle updates where status changed
  if (change.operation === "delete") return;
  if (!change.oldDoc || !change.newDoc) return;
  if (change.oldDoc.status === change.newDoc.status) return;

  const newStatus = change.newDoc.status;
  const requestId = change.id;

  // 1. Sync status to consularRegistrations if applicable
  const orgService = await ctx.db.get(change.newDoc.orgServiceId);
  const service = orgService ? await ctx.db.get(orgService.serviceId) : null;

  if (service?.category === ServiceCategory.Registration) {
    let regStatus:
      | (typeof RegistrationStatus)[keyof typeof RegistrationStatus]
      | null = null;

    // Le dossier devient actif dès que la demande sort des étapes de revue.
    // L'expiration est gérée par un cron séparé qui vérifie la validité des cartes.
    if (
      newStatus === RequestStatus.Validated ||
      newStatus === RequestStatus.InProduction ||
      newStatus === RequestStatus.Completed
    ) {
      regStatus = RegistrationStatus.Active;
    }

    if (regStatus) {
      // Check consularRegistrations first
      const registration = await ctx.db
        .query("consularRegistrations")
        .withIndex("by_request", (q) => q.eq("requestId", requestId))
        .unique();

      if (registration && registration.status !== regStatus) {
        await ctx.db.patch(registration._id, {
          status: regStatus,
        });
      }

      // Also check consularNotifications (signalements)
      const notification = await ctx.db
        .query("consularNotifications")
        .withIndex("by_request", (q) => q.eq("requestId", requestId))
        .unique();

      if (notification && notification.status !== regStatus) {
        const notifUpdates: Record<string, unknown> = { status: regStatus };
        if (regStatus === RegistrationStatus.Active) {
          notifUpdates.activatedAt = Date.now();
        }
        await ctx.db.patch(notification._id, notifUpdates);
      }
    }
  }

  // 2. Create in-app notification for status update
  const statusLabels: Record<string, string> = {
    pending: "En attente",
    processing: "En traitement",
    pending_completion: "Compléments requis",
    validated: "Validée",
    completed: "Terminée",
    cancelled: "Annulée",
    rejected: "Rejetée",
    ready_for_pickup: "Prête à retirer",
  };

  await ctx.scheduler.runAfter(
    0,
    internal.functions.notifications.createNotification,
    {
      userId: change.newDoc.userId,
      type: NotificationType.StatusUpdate,
      title: "Mise à jour de votre demande",
      body: `Votre demande ${change.newDoc.reference || ""} est maintenant: ${statusLabels[newStatus] || newStatus}`,
      link: `/my-space/requests/${change.newDoc.reference}`,
      relatedId: requestId as unknown as string,
      relatedType: "request",
    },
  );

  // 3. Send status notification email
  await ctx.scheduler.runAfter(
    0,
    internal.functions.notifications.notifyStatusUpdate,
    {
      requestId: requestId,
      newStatus: newStatus,
    },
  );
});

// ============================================================================
// MESSAGES TRIGGERS - Auto-notification on new message
// ============================================================================

triggers.register("messages", async (ctx, change) => {
  if (change.operation !== "insert") return;

  const message = change.newDoc;

  // Get request to find recipient user
  const request = await ctx.db.get(message.requestId);
  if (!request) return;

  // Determine recipient (the one who didn't send the message)
  const recipientId =
    message.senderId === request.userId ?
      null // Agent received - handle separately if needed
    : request.userId; // Citizen received

  // For now, only notify citizens (when agents send messages)
  if (recipientId && recipientId !== message.senderId) {
    const sender = await ctx.db.get(message.senderId);

    // Create in-app notification
    await ctx.scheduler.runAfter(
      0,
      internal.functions.notifications.createNotification,
      {
        userId: recipientId,
        type: NotificationType.NewMessage,
        title: "Nouveau message",
        body: `${sender?.name || "Agent consulaire"}: ${message.content.substring(0, 100)}...`,
        link: `/my-space/requests/${request.reference}`,
        relatedId: message.requestId,
        relatedType: "request",
      },
    );
  }

  // Schedule notification email (runs after transaction commits)
  await ctx.scheduler.runAfter(
    0,
    internal.functions.notifications.notifyNewMessage,
    {
      requestId: message.requestId,
      senderId: message.senderId,
      messagePreview: message.content.substring(0, 200),
    },
  );
});

// ============================================================================
// CHILD PROFILES TRIGGERS - Completion score (similar to profiles)
// ============================================================================

triggers.register("childProfiles", async (_ctx, change) => {
  if (change.operation === "delete") return;

  const child = change.newDoc;

  // Calculate child profile completion score
  let score = 0;
  const identity = child.identity;

  // Identity fields (50 points max)
  if (identity.firstName) score += 10;
  if (identity.lastName) score += 10;
  if (identity.birthDate) score += 10;
  if (identity.birthPlace) score += 5;
  if (identity.birthCountry) score += 5;
  if (identity.gender) score += 5;
  if (identity.nationality) score += 5;

  // Passport info (20 points max)
  if (child.passportInfo?.number) score += 10;
  if (child.passportInfo?.expiryDate) score += 10;

  // Parents (15 points max)
  if (child.parents && child.parents.length > 0) {
    score += Math.min(15, child.parents.length * 8);
  }

  // Documents (15 points max)
  if (child.documents) {
    if (child.documents.passport) score += 5;
    if (child.documents.birthCertificate) score += 5;
    if (child.documents.photo) score += 5;
  }

  // Store score (add completionScore field if not already in schema)
  // For now, we can add it as metadata in a future schema update
  // This trigger is ready when the schema includes completionScore
});

// ============================================================================
// AUDIT LOGGING TRIGGERS - Critical tables
// ============================================================================

const AUDITED_TABLES = [
  "requests",
  "documents",
  "consularRegistrations",
  "consularNotifications",
] as const;

// Register audit triggers for each critical table
for (const tableName of AUDITED_TABLES) {
  triggers.register(tableName, async (ctx, change) => {
    const timestamp = Date.now();

    // Get actor from auth context if available
    let actorId: Id<"users"> | undefined;
    let actorTokenIdentifier: string | undefined;

    try {
      const identity = await ctx.auth.getUserIdentity();
      if (identity) {
        actorTokenIdentifier = identity.tokenIdentifier;
        // Try to find user by authId
        const user = await ctx.db
          .query("users")
          .withIndex("by_authId", (q) =>
            q.eq("authId", identity.subject),
          )
          .unique();
        if (user) {
          actorId = user._id;
        }
      }
    } catch {
      // Auth context may not be available in all contexts
    }

    // Create audit log entry
    await ctx.db.insert("auditLog", {
      table: tableName,
      docId: change.id as unknown as string,
      operation: change.operation,
      actorId,
      actorTokenIdentifier,
      changes: {
        oldDoc:
          change.oldDoc ? JSON.parse(JSON.stringify(change.oldDoc)) : null,
        newDoc:
          change.newDoc ? JSON.parse(JSON.stringify(change.newDoc)) : null,
      },
      timestamp,
    });
  });
}
// ============================================================================
// MEMBERSHIPS → AUTO-CREATE PERSONAL CALL LINE
// ============================================================================
// When a new membership is created, auto-create a personal call line for the agent.

triggers.register("memberships", async (ctx, change) => {
  if (change.operation !== "insert") return;
  const membership = change.newDoc;
  if (!membership || membership.deletedAt) return;

  // Check if a personal call line already exists for this user in this org
  const existing = await ctx.db
    .query("callLines")
    .withIndex("by_user", (q) => q.eq("userId", membership.userId))
    .filter((q) =>
      q.and(
        q.eq(q.field("orgId"), membership.orgId),
        q.eq(q.field("type"), "personal"),
      ),
    )
    .first();

  if (existing) return; // Already has a personal line

  // Get the user's name for the line label
  const user = await ctx.db.get(membership.userId);
  const label = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Agent"
    : "Agent";

  await ctx.db.insert("callLines", {
    type: "personal",
    orgId: membership.orgId,
    label,
    priority: 100, // Personal lines appear after org lines
    isActive: true,
    membershipIds: [change.id],
    userId: membership.userId,
  });
});

// ============================================================================
// AI ASSISTANT PROACTIVE — dispatch events vers proactiveAgent
// ============================================================================
// Chaque callback est defensif : verifie que le module ai_assistant est
// active pour l'org avant de schedule. Aucun appel LLM ici (trigger tx).

triggers.register("requests", onRequestChanged as any);
triggers.register("documents", onDocumentUploaded as any);
triggers.register("correspondanceItems", onCorrespondanceCreated as any);
triggers.register("appointments", onAppointmentScheduled as any);
triggers.register("aiAgentPresence", onContextUpdated as any);

export default triggers;
