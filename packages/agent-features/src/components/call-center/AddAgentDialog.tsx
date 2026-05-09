"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Loader2, Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Avatar,
  AvatarFallback,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@workspace/api/hooks";
import { cn } from "@workspace/ui/lib/utils";
import { useOrg } from "../../shell/org-provider";

/**
 * AddAgentDialog — ajoute un agent disponible à l'appel actif (conférence 3-way).
 *
 * Backend : `meetings.addParticipant` — l'agent reçoit une notif d'invitation
 * et rejoint via /meetings?join=<id>. Le citoyen et l'agent initial restent
 * en ligne.
 */
export function AddAgentDialog({
  open,
  onOpenChange,
  meetingId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: Id<"meetings">;
}) {
  const { t } = useTranslation();
  const { activeOrgId } = useOrg();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const { data: presence } = useAuthenticatedConvexQuery(
    api.functions.agentPresence.listOnlineAgents,
    open && activeOrgId ? { orgId: activeOrgId } : "skip",
  );

  const { mutateAsync: addParticipant } = useConvexMutationQuery(
    api.functions.meetings.addParticipant,
  );

  const onlineAgents = (presence?.online ?? []) as Array<{
    userId: Id<"users">;
  }>;
  const busyAgents = (presence?.busy ?? []) as Array<{ userId: Id<"users"> }>;

  const candidates = [...onlineAgents, ...busyAgents];

  const handleAdd = async (targetUserId: Id<"users">) => {
    setPendingId(targetUserId as string);
    try {
      await addParticipant({ meetingId, targetUserId });
      toast.success(t("callCenter.addAgent.success", "Agent invité à rejoindre"));
      onOpenChange(false);
    } catch (e: any) {
      toast.error(
        e?.message ?? t("callCenter.addAgent.error", "Impossible d'inviter cet agent"),
      );
    } finally {
      setPendingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t("callCenter.addAgent.title", "Ajouter un agent à l'appel")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "callCenter.addAgent.description",
              "L'agent recevra une notification et pourra rejoindre la conversation. Le citoyen reste en ligne.",
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[360px]">
          <div className="flex flex-col gap-1">
            {candidates.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t(
                  "callCenter.addAgent.empty",
                  "Aucun agent en ligne pour l'instant.",
                )}
              </p>
            ) : (
              candidates.map((agent) => (
                <AgentRow
                  key={agent.userId as string}
                  userId={agent.userId}
                  isOnline={onlineAgents.some(
                    (a) => a.userId === agent.userId,
                  )}
                  isBusy={busyAgents.some((a) => a.userId === agent.userId)}
                  pending={pendingId === (agent.userId as string)}
                  onAdd={() => handleAdd(agent.userId)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function AgentRow({
  userId,
  isOnline,
  isBusy,
  pending,
  onAdd,
}: {
  userId: Id<"users">;
  isOnline: boolean;
  isBusy: boolean;
  pending: boolean;
  onAdd: () => void;
}) {
  const { t } = useTranslation();
  const { data: user } = useAuthenticatedConvexQuery(
    api.functions.users.getById,
    { userId },
  );

  const fullName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.email ||
      "Agent"
    : "…";

  const initials =
    fullName
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50">
      <Avatar className="h-9 w-9">
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{fullName}</p>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              isOnline ? "bg-success" : isBusy ? "bg-warning" : "bg-muted-foreground",
            )}
          />
          <span className="text-muted-foreground">
            {isOnline
              ? t("agentPresence.online", "Disponible")
              : isBusy
                ? t("agentPresence.busy", "Occupé")
                : t("agentPresence.away", "Absent")}
          </span>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-8"
        disabled={pending || (!isOnline && !isBusy)}
        onClick={onAdd}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          t("callCenter.addAgent.add", "Inviter")
        )}
      </Button>
    </div>
  );
}
