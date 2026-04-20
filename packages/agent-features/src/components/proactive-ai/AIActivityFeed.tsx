"use client";

import { Sparkles, Check, X, AlertCircle, Clock } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";

type ActivityRow = Doc<"aiActivityLog">;

const ACTION_ICONS: Record<string, React.ReactNode> = {
  proposed: <Sparkles className="h-4 w-4 text-primary" />,
  accepted: <Check className="h-4 w-4 text-emerald-600" />,
  dismissed: <X className="h-4 w-4 text-muted-foreground" />,
  auto_applied: <Sparkles className="h-4 w-4 text-emerald-600" />,
  errored: <AlertCircle className="h-4 w-4 text-rose-600" />,
  expired: <Clock className="h-4 w-4 text-muted-foreground" />,
  blocked: <X className="h-4 w-4 text-amber-600" />,
  rate_limited: <Clock className="h-4 w-4 text-amber-600" />,
  budget_exceeded: <AlertCircle className="h-4 w-4 text-rose-600" />,
};

function formatCost(microCents?: number) {
  if (microCents === undefined || microCents === 0) return "-";
  return `$${(microCents / 1_000_000).toFixed(4)}`;
}

function formatTimestamp(ts: number) {
  return new Date(ts).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AIActivityFeed() {
  const activity = useAuthenticatedConvexQuery(
    api.ai.activityLog.getActivityForMembership,
    { limit: 100 },
  );

  if (activity.isPending) {
    return (
      <div className="text-sm text-muted-foreground">Chargement…</div>
    );
  }

  const rows = (activity.data ?? []) as ActivityRow[];

  if (rows.length === 0) {
    return (
      <div className="rounded-md border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        Aucune activité IA pour le moment.
      </div>
    );
  }

  return (
    <div className="divide-y rounded-md border bg-background">
      {rows.map((row) => (
        <div key={row._id} className="flex items-start gap-3 px-4 py-3">
          <div className="mt-0.5">
            {ACTION_ICONS[row.action] ?? (
              <Sparkles className="h-4 w-4 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{row.capabilityCode}</span>
              <Badge variant="outline" className="text-[10px]">
                {row.action}
              </Badge>
              {row.model && row.model !== "none" && (
                <span className="text-xs text-muted-foreground">
                  {row.model}
                </span>
              )}
            </div>
            {row.error && (
              <div className="mt-1 text-xs text-rose-600">{row.error}</div>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>{formatTimestamp(row.timestamp)}</span>
              {row.latencyMs !== undefined && (
                <span>{row.latencyMs}ms</span>
              )}
              {(row.tokensIn !== undefined || row.tokensOut !== undefined) && (
                <span>
                  {row.tokensIn ?? 0} → {row.tokensOut ?? 0} tok
                </span>
              )}
              <span>{formatCost(row.costMicroCents)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
