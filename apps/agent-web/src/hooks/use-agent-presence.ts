import { useEffect, useRef } from "react";
import { useConvexMutationQuery } from "@/integrations/convex/hooks";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useCallStore } from "@/stores/call-store";

const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Sends periodic heartbeats to keep the agent's presence alive.
 * Mount at the app layout level so it fires regardless of page.
 *
 * @param orgIds - The org IDs for which the agent is a member
 * @param clientType - "agent-web" or "agent-desktop"
 */
export function useAgentPresence(
  orgIds: Id<"orgs">[] | undefined,
  clientType: "agent-web" | "agent-desktop" = "agent-web",
) {
  const heartbeatMutation = useConvexMutationQuery(
    api.functions.agentPresence.heartbeat,
  );
  const setOfflineMutation = useConvexMutationQuery(
    api.functions.agentPresence.setOffline,
  );
  const { globalActiveMeetingId } = useCallStore();
  const orgIdsRef = useRef(orgIds);
  orgIdsRef.current = orgIds;

  useEffect(() => {
    if (!orgIds || orgIds.length === 0) return;

    const sendHeartbeat = () => {
      const currentOrgIds = orgIdsRef.current;
      if (!currentOrgIds) return;

      for (const orgId of currentOrgIds) {
        heartbeatMutation.mutate({
          orgId,
          currentCallId: globalActiveMeetingId ?? undefined,
          clientType,
        });
      }
    };

    // Send immediately on mount
    sendHeartbeat();

    // Then every 30s
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    // Go offline on tab close
    const handleBeforeUnload = () => {
      const currentOrgIds = orgIdsRef.current;
      if (!currentOrgIds) return;
      for (const orgId of currentOrgIds) {
        // Use navigator.sendBeacon via mutate (fire-and-forget)
        setOfflineMutation.mutate({ orgId });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Mark offline when hook unmounts
      handleBeforeUnload();
    };
  }, [orgIds?.join(",")]); // Re-run when orgIds change
}
