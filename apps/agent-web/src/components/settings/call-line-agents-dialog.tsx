"use client";

import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";

import { Loader2, Minus, Plus, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks";

type Agent = {
  membershipId: Id<"memberships">;
  userId: Id<"users">;
  name: string;
  avatarUrl?: string;
};

type EnrichedCallLine = Doc<"callLines"> & { agents: Agent[] };

interface CallLineAgentsDialogProps {
  line: EnrichedCallLine;
  orgId: Id<"orgs">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function CallLineAgentsDialog({
  line,
  orgId,
  open,
  onOpenChange,
}: CallLineAgentsDialogProps) {
  const { t } = useTranslation();

  const { data: allMembers, isPending: isLoadingMembers } = useAuthenticatedConvexQuery(
    api.functions.orgs.getMembers,
    open ? { orgId } : "skip",
  );

  const { mutateAsync: addAgent, isPending: isAdding } = useConvexMutationQuery(
    api.functions.callLines.addAgent,
  );
  const { mutateAsync: removeAgent, isPending: isRemoving } = useConvexMutationQuery(
    api.functions.callLines.removeAgent,
  );

  const assignedIds = new Set(line.membershipIds);
  const availableMembers = (allMembers ?? []).filter(
    (m) => !assignedIds.has(m.membershipId),
  );

  const handleAdd = async (membershipId: Id<"memberships">) => {
    try {
      await addAgent({ callLineId: line._id, membershipId });
      toast.success(t("callLines.toast.agentAdded"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("callLines.toast.error");
      toast.error(msg);
    }
  };

  const handleRemove = async (membershipId: Id<"memberships">) => {
    try {
      await removeAgent({ callLineId: line._id, membershipId });
      toast.success(t("callLines.toast.agentRemoved"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("callLines.toast.error");
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t("callLines.agents.title")} — {line.label}
          </DialogTitle>
          <DialogDescription>{t("callLines.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {t("callLines.agents.title")} ({line.agents.length})
          </p>
          {line.agents.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("callLines.agents.noAgents")}</p>
          ) : (
            <div className="space-y-1">
              {line.agents.map((agent) => (
                <div
                  key={agent.membershipId}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={agent.avatarUrl} />
                      <AvatarFallback className="text-xs">{getInitials(agent.name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{agent.name}</span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleRemove(agent.membershipId)}
                    disabled={isRemoving}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {t("callLines.agents.available")}
          </p>
          {isLoadingMembers ? (
            <div className="space-y-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : availableMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("callLines.agents.noAvailable")}</p>
          ) : (
            <ScrollArea className="max-h-48">
              <div className="space-y-1">
                {availableMembers.map((member) => (
                  <div
                    key={member.membershipId}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={member.avatarUrl} />
                        <AvatarFallback className="text-xs">
                          {getInitials(
                            member.firstName && member.lastName
                              ? `${member.firstName} ${member.lastName}`
                              : member.email ?? "?",
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm">
                          {member.firstName && member.lastName
                            ? `${member.firstName} ${member.lastName}`
                            : member.email}
                        </p>
                        {member.positionTitle && (
                          <p className="text-xs text-muted-foreground">
                            {typeof member.positionTitle === "string"
                              ? member.positionTitle
                              : (member.positionTitle as Record<string, string>)?.fr ?? ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-primary"
                      onClick={() => handleAdd(member.membershipId)}
                      disabled={isAdding}
                    >
                      {isAdding ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
