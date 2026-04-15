"use client";

import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";

import {
  Edit2,
  Info,
  Loader2,
  MessageSquare,
  Phone,
  PhoneOff,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EmptyState } from "@/components/design-system/empty-state";
import { FlatCard } from "@/components/design-system/flat-card";
import { CallLineAgentsDialog } from "./call-line-agents-dialog";
import { CallLineFormDialog } from "./call-line-form-dialog";
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

const COLOR_CLASSES: Record<string, string> = {
  gray: "bg-gray-400",
  blue: "bg-blue-500",
  green: "bg-green-500",
  amber: "bg-amber-400",
  rose: "bg-rose-400",
  purple: "bg-purple-500",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface CallLinesTabProps {
  orgId: Id<"orgs">;
}

export function CallLinesTab({ orgId }: CallLinesTabProps) {
  const { t } = useTranslation();

  const [createOpen, setCreateOpen] = useState(false);
  const [editLine, setEditLine] = useState<EnrichedCallLine | null>(null);
  const [agentsLine, setAgentsLine] = useState<EnrichedCallLine | null>(null);

  const { data: lines, isPending } = useAuthenticatedConvexQuery(
    api.functions.callLines.listForAdmin,
    { orgId },
  );

  const { mutateAsync: removeLine } = useConvexMutationQuery(
    api.functions.callLines.remove,
  );
  const { mutateAsync: updateLine } = useConvexMutationQuery(
    api.functions.callLines.update,
  );
  const { mutateAsync: backfill, isPending: isBackfilling } = useConvexMutationQuery(
    api.functions.callLines.backfillPersonalLines,
  );

  const orgLines = (lines ?? []).filter((l) => l.type === "org") as EnrichedCallLine[];
  const personalLines = (lines ?? []).filter((l) => l.type === "personal") as EnrichedCallLine[];

  const handleDelete = async (line: EnrichedCallLine) => {
    try {
      await removeLine({ callLineId: line._id });
      toast.success(t("callLines.toast.deleted"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("callLines.toast.error");
      toast.error(msg);
    }
  };

  const handleToggleActive = async (line: EnrichedCallLine) => {
    try {
      await updateLine({ callLineId: line._id, isActive: !line.isActive });
    } catch (err) {
      toast.error(t("callLines.toast.error"));
    }
  };

  const handleBackfill = async () => {
    try {
      const result = await backfill({ orgId });
      toast.success(t("callLines.backfillSuccess", { count: result?.created ?? 0 }));
    } catch (err) {
      toast.error(t("callLines.toast.error"));
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
      {/* ─── Lignes d'organisation ─── */}
      <FlatCard>
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-base font-semibold">{t("callLines.orgLines")}</p>
            <p className="text-sm text-muted-foreground">{t("callLines.description")}</p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("callLines.newLine")}
          </Button>
        </div>

        {isPending ? (
          <div className="space-y-2 p-4 pt-0">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : orgLines.length === 0 ? (
          <EmptyState
            icon={<PhoneOff />}
            title={t("callLines.empty.title")}
            description={t("callLines.empty.description")}
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                {t("callLines.newLine")}
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-border/50 px-4 pb-4">
            {orgLines.map((line) => (
              <OrgLineRow
                key={line._id}
                line={line}
                onEdit={() => setEditLine(line)}
                onManageAgents={() => setAgentsLine(line)}
                onDelete={() => handleDelete(line)}
                onToggleActive={() => handleToggleActive(line)}
              />
            ))}
          </div>
        )}
      </FlatCard>

      {/* ─── Lignes personnelles ─── */}
      <FlatCard>
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-base font-semibold">{t("callLines.personalLines")}</p>
            <p className="text-sm text-muted-foreground">{t("callLines.personal.description")}</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBackfill}
                disabled={isBackfilling}
              >
                {isBackfilling ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 h-4 w-4" />
                )}
                {t("callLines.backfill")}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{t("callLines.personal.description")}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* ─── Info auto-création ─── */}
        <div className="mx-4 mb-3 flex items-start gap-2 rounded-md border border-blue-500/20 bg-blue-500/5 p-2.5 text-xs text-blue-700 dark:text-blue-400">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Les lignes personnelles sont créées <strong>automatiquement</strong>
            {" "}à l'ajout d'un membre. Le bouton « Recréer les lignes manquantes »
            n'est utile que pour les anciens membres ou pour rétablir des lignes
            supprimées.
          </p>
        </div>

        {isPending ? (
          <div className="space-y-2 p-4 pt-0">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : personalLines.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title={t("callLines.personal.noMembers")}
            description={t("callLines.personal.description")}
            action={
              <Button size="sm" variant="outline" onClick={handleBackfill} disabled={isBackfilling}>
                <RefreshCw className="mr-1.5 h-4 w-4" />
                {t("callLines.backfill")}
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-border/50 px-4 pb-4">
            {personalLines.map((line) => (
              <PersonalLineRow key={line._id} line={line} />
            ))}
          </div>
        )}
      </FlatCard>

      {/* Dialogs */}
      <CallLineFormDialog
        mode="create"
        orgId={orgId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      {editLine && (
        <CallLineFormDialog
          mode="edit"
          orgId={orgId}
          line={editLine}
          open={!!editLine}
          onOpenChange={(open) => !open && setEditLine(null)}
        />
      )}

      {agentsLine && (
        <CallLineAgentsDialog
          line={agentsLine}
          orgId={orgId}
          open={!!agentsLine}
          onOpenChange={(open) => !open && setAgentsLine(null)}
        />
      )}
      </div>
    </TooltipProvider>
  );
}

// ─── Ligne d'organisation ─────────────────────────────────────────────────────

interface OrgLineRowProps {
  line: EnrichedCallLine;
  onEdit: () => void;
  onManageAgents: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}

function OrgLineRow({ line, onEdit, onManageAgents, onDelete, onToggleActive }: OrgLineRowProps) {
  const { t } = useTranslation();
  const colorClass = COLOR_CLASSES[line.color ?? "gray"] ?? COLOR_CLASSES.gray;

  return (
    <div className="flex items-center gap-3 py-3">
      {/* Indicateur couleur */}
      <span className={`mt-0.5 h-3 w-3 shrink-0 rounded-full ${colorClass}`} />

      {/* Infos */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{line.label}</p>
          {line.isDefault && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
              {t("callLines.fields.isDefault")}
            </Badge>
          )}
        </div>
        {line.description && (
          <p className="truncate text-xs text-muted-foreground">{line.description}</p>
        )}

        {/* Agents avatars */}
        <div className="mt-1 flex items-center gap-1">
          {line.agents.length === 0 ? (
            <span className="text-xs text-muted-foreground">{t("callLines.agents.noAgents")}</span>
          ) : (
            <div className="flex -space-x-1">
              {line.agents.slice(0, 5).map((agent) => (
                <Tooltip key={agent.membershipId}>
                  <TooltipTrigger asChild>
                    <Avatar className="h-5 w-5 border border-background">
                      <AvatarImage src={agent.avatarUrl} />
                      <AvatarFallback className="text-[8px]">
                        {getInitials(agent.name)}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>{agent.name}</TooltipContent>
                </Tooltip>
              ))}
              {line.agents.length > 5 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-background bg-muted text-[8px] font-medium">
                  +{line.agents.length - 5}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toggle actif */}
      <Switch checked={line.isActive} onCheckedChange={onToggleActive} />

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onManageAgents}>
              <Users className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("callLines.agents.manage")}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit}>
              <Edit2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("common.edit")}</TooltipContent>
        </Tooltip>

        <AlertDialog>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent>{t("common.delete")}</TooltipContent>
          </Tooltip>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("callLines.deleteConfirm")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("callLines.deleteDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={onDelete}
              >
                {t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// ─── Ligne personnelle ────────────────────────────────────────────────────────

function PersonalLineRow({ line }: { line: EnrichedCallLine }) {
  const agent = line.agents[0];

  return (
    <div className="flex items-center gap-3 py-2.5">
      <Avatar className="h-8 w-8">
        <AvatarImage src={agent?.avatarUrl} />
        <AvatarFallback className="text-xs">
          {agent ? getInitials(agent.name) : "?"}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{line.label}</p>
      </div>

      {/* Badges modules */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px]">
              <Phone className="h-2.5 w-2.5" />
              iAppel
            </Badge>
          </TooltipTrigger>
          <TooltipContent>iAppel</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px]">
              <MessageSquare className="h-2.5 w-2.5" />
              iMessage
            </Badge>
          </TooltipTrigger>
          <TooltipContent>iMessage</TooltipContent>
        </Tooltip>
      </div>

      {/* Statut */}
      <span
        className={`h-2 w-2 rounded-full ${line.isActive ? "bg-green-500" : "bg-gray-300"}`}
      />
    </div>
  );
}
