/**
 * Exécuteur des read-tools admin — partagé entre adminChat (request/response),
 * adminChatStreaming (streaming) et adminVoice (Gemini Live).
 *
 * Les UI tools (`navigateTo`, `executePageAction`) et les mutative tools
 * (`updateRequestStatus`, etc.) ne sont PAS gérés ici — chaque entry point
 * décide comment les exposer (action UI immédiate vs confirmation).
 */
import type { ActionCtx } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

export type AdminReadToolContext = {
  orgId: Id<"orgs">;
  user: {
    _id: Id<"users">;
    firstName?: string | null;
    lastName?: string | null;
  };
  positionName: string;
  org: { name?: string } | null;
};

const slimRequest = (r: Record<string, unknown>) => ({
  _id: r._id,
  reference: r.reference,
  status: r.status,
  priority: r.priority,
  createdAt: r._creationTime,
  updatedAt: r.updatedAt,
  assignedTo: r.assignedTo,
  userName:
    r.user && typeof r.user === "object"
      ? `${(r.user as Record<string, unknown>).firstName || ""} ${(r.user as Record<string, unknown>).lastName || ""}`.trim()
      : undefined,
  userEmail:
    r.user && typeof r.user === "object"
      ? (r.user as Record<string, unknown>).email
      : undefined,
  serviceName:
    r.serviceName && typeof r.serviceName === "object"
      ? (r.serviceName as Record<string, string>).fr
      : r.serviceName,
});

export async function executeAdminReadTool(
  ctx: ActionCtx,
  toolName: string,
  args: Record<string, unknown>,
  context: AdminReadToolContext,
): Promise<unknown> {
  const { orgId, user, positionName, org } = context;

  switch (toolName) {
    case "getAgentContext": {
      const [requestStats, registryStats] = await Promise.all([
        ctx.runQuery(api.functions.requests.getStatsByOrg, { orgId }),
        ctx.runQuery(api.functions.consularRegistrations.getStatsByOrg, {
          orgId,
        }),
      ]);
      return {
        agent: {
          name: `${user.firstName || ""} ${user.lastName || ""}`,
          position: positionName,
        },
        organization: org?.name,
        requestStats,
        registryStats,
      };
    }

    case "getOrgDashboardStats": {
      const [requestStats, registryStats] = await Promise.all([
        ctx.runQuery(api.functions.requests.getStatsByOrg, { orgId }),
        ctx.runQuery(api.functions.consularRegistrations.getStatsByOrg, {
          orgId,
        }),
      ]);
      return { requestStats, registryStats };
    }

    case "getRequestsList": {
      const typedArgs = args as { status?: string };
      const stats = await ctx.runQuery(
        api.functions.requests.getStatsByOrg,
        { orgId },
      );
      const result = await ctx.runQuery(api.functions.requests.listByOrg, {
        orgId,
        status: typedArgs.status as any,
        paginationOpts: { numItems: 10, cursor: null },
      });
      return {
        stats: typedArgs.status
          ? { count: stats.statusCounts[typedArgs.status] ?? 0 }
          : stats,
        requests: result.page.map((r: Record<string, unknown>) =>
          slimRequest(r),
        ),
        hasMore: result.continueCursor !== null && !result.isDone,
      };
    }

    case "getRequestDetail": {
      const typedArgs = args as { requestId: string };
      let detail: unknown = await ctx.runQuery(
        internal.functions.requests.internalGetByReferenceId,
        { referenceId: typedArgs.requestId },
      );
      if (!detail) {
        try {
          detail = await ctx.runQuery(
            internal.functions.requests.internalGetById,
            { requestId: typedArgs.requestId as Id<"requests"> },
          );
        } catch {
          detail = null;
        }
      }
      if (!detail) return { error: "Demande introuvable" };
      const d = detail as Record<string, unknown>;
      return {
        ...slimRequest(d),
        formData: d.formData,
        documents: Array.isArray(d.documents) ? d.documents.length : 0,
        notes: d.notes,
      };
    }

    case "getPendingRequests": {
      const stats = await ctx.runQuery(
        api.functions.requests.getStatsByOrg,
        { orgId },
      );
      const [submittedResult, pendingResult] = await Promise.all([
        ctx.runQuery(api.functions.requests.listByOrg, {
          orgId,
          status: "submitted" as any,
          paginationOpts: { numItems: 10, cursor: null },
        }),
        ctx.runQuery(api.functions.requests.listByOrg, {
          orgId,
          status: "pending" as any,
          paginationOpts: { numItems: 10, cursor: null },
        }),
      ]);
      return {
        submittedCount: stats.statusCounts.submitted ?? 0,
        pendingCount: stats.statusCounts.pending ?? 0,
        totalActionRequired:
          (stats.statusCounts.submitted ?? 0) +
          (stats.statusCounts.pending ?? 0),
        submitted: submittedResult.page.map((r: Record<string, unknown>) =>
          slimRequest(r),
        ),
        pending: pendingResult.page.map((r: Record<string, unknown>) =>
          slimRequest(r),
        ),
        hasMoreSubmitted: !submittedResult.isDone,
        hasMorePending: !pendingResult.isDone,
      };
    }

    case "getCitizenProfile": {
      const typedArgs = args as { profileId: string };
      return await ctx.runQuery(api.functions.profiles.getProfileDetail, {
        profileId: typedArgs.profileId as Id<"profiles">,
      });
    }

    case "searchCitizens": {
      const typedArgs = args as { query: string };
      return await ctx.runQuery(
        api.functions.consularRegistrations.searchRegistrations,
        { orgId, searchQuery: typedArgs.query },
      );
    }

    case "getRegistryStats":
      return await ctx.runQuery(
        api.functions.consularRegistrations.getStatsByOrg,
        { orgId },
      );

    case "getAppointmentsList":
      return await ctx.runQuery(api.functions.appointments.listByOrg, {
        orgId,
      });

    case "getTeamMembers":
      return await ctx.runQuery(internal.ai.adminChat.getOrgMembers, {
        orgId,
      });

    case "getRecentPayments":
      try {
        return await ctx.runQuery(api.functions.requests.getStatsByOrg, {
          orgId,
        });
      } catch {
        return { message: "Module paiements non disponible" };
      }

    case "getOrgPosts": {
      const result = await ctx.runQuery(api.functions.posts.listByOrg, {
        orgId,
        paginationOpts: { numItems: 10, cursor: null },
      });
      return result.page.map((p: Record<string, unknown>) => ({
        _id: p._id,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        category: p.category,
        status: p.status,
        publishedAt: p.publishedAt,
        authorName: p.authorName,
      }));
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

/**
 * Truncate un résultat de tool pour rester sous la limite Convex (1MB / doc).
 * Utilisé lors de la persistance dans `conversations`.
 */
const MAX_RESULT_SIZE = 2000;

export function truncateToolResult(result: unknown): unknown {
  const json = JSON.stringify(result);
  if (json.length <= MAX_RESULT_SIZE) return result;
  if (Array.isArray(result)) {
    return {
      _truncated: true,
      count: result.length,
      summary: result.slice(0, 3).map((item: Record<string, unknown>) => ({
        _id: item?._id,
        reference: item?.reference,
        status: item?.status,
        userName:
          item?.user && typeof item.user === "object"
            ? `${(item.user as Record<string, unknown>).firstName || ""} ${(item.user as Record<string, unknown>).lastName || ""}`
            : undefined,
        serviceName: item?.serviceName,
      })),
    };
  }
  if (typeof result === "object" && result !== null) {
    const r = result as Record<string, unknown>;
    if (r.pending || r.submitted) {
      return {
        _truncated: true,
        pendingCount: Array.isArray(r.pending) ? r.pending.length : 0,
        submittedCount: Array.isArray(r.submitted) ? r.submitted.length : 0,
        total: r.total,
      };
    }
  }
  return { _truncated: true, preview: json.slice(0, MAX_RESULT_SIZE) };
}
