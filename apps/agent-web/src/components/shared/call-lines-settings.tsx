"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  Check,
  Loader2,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  SettingsDivider,
  SettingsRow,
  SettingsSectionHeader,
} from "@/components/shared/settings-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────
interface CallLinesSettingsProps {
  orgId: Id<"orgs">;
}

interface EnrichedAgent {
  membershipId: Id<"memberships">;
  userId: Id<"users">;
  name: string;
  avatarUrl?: string;
}

interface EnrichedCallLine {
  _id: Id<"callLines">;
  _creationTime: number;
  type: "org" | "personal";
  orgId: Id<"orgs">;
  label: string;
  description?: string;
  icon?: string;
  color?: string;
  priority: number;
  isDefault?: boolean;
  isActive: boolean;
  membershipIds: Id<"memberships">[];
  userId?: Id<"users">;
  agents: EnrichedAgent[];
}

// ─── Accent Colors ──────────────────────────────────────────
const ACCENT_COLORS = [
  { value: "blue", label: "Bleu", dot: "bg-[oklch(0.65_0.19_255)]" },
  { value: "green", label: "Vert", dot: "bg-[oklch(0.65_0.19_155)]" },
  { value: "amber", label: "Ambre", dot: "bg-[oklch(0.75_0.15_75)]" },
  { value: "rose", label: "Rose", dot: "bg-[oklch(0.65_0.19_10)]" },
];

function getColorDot(color?: string) {
  const found = ACCENT_COLORS.find((c) => c.value === color);
  return found?.dot ?? "bg-foreground/20";
}

// ─── Main Component ─────────────────────────────────────────
export function CallLinesSettings({ orgId }: CallLinesSettingsProps) {
  const { t } = useTranslation();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingLine, setEditingLine] = useState<EnrichedCallLine | null>(null);
  const [managingAgentsLine, setManagingAgentsLine] = useState<EnrichedCallLine | null>(null);

  // ── Data ──
  const { data: callLines } = useAuthenticatedConvexQuery(
    api.functions.callLines.listForAdmin,
    { orgId },
  );

  const { data: members } = useAuthenticatedConvexQuery(
    api.functions.orgs.getMembers,
    { orgId },
  );

  // ── Mutations ──
  const createLine = useConvexMutationQuery(api.functions.callLines.create);
  const updateLine = useConvexMutationQuery(api.functions.callLines.update);
  const removeLine = useConvexMutationQuery(api.functions.callLines.remove);
  const updateAgentsMutation = useConvexMutationQuery(api.functions.callLines.updateAgents);

  const lines = (callLines ?? []) as EnrichedCallLine[];

  // ── Handlers ──
  const handleToggleActive = useCallback(
    async (line: EnrichedCallLine) => {
      try {
        await updateLine.mutateAsync({
          callLineId: line._id,
          isActive: !line.isActive,
        });
        toast.success(line.isActive ? "Ligne desactivee" : "Ligne activee");
      } catch {
        toast.error("Erreur lors de la mise a jour");
      }
    },
    [updateLine],
  );

  const handleDelete = useCallback(
    async (line: EnrichedCallLine) => {
      if (line.type === "personal") {
        toast.error("Les lignes personnelles ne peuvent pas etre supprimees");
        return;
      }
      try {
        await removeLine.mutateAsync({ callLineId: line._id });
        toast.success("Ligne supprimee");
      } catch {
        toast.error("Erreur lors de la suppression");
      }
    },
    [removeLine],
  );

  return (
    <div>
      {/* ── Call Lines Section ──────────────────────────── */}
      <SettingsSectionHeader
        title={t("settings.communications.callLines", "Lignes d'appel")}
        description={t(
          "settings.communications.callLinesDesc",
          "Configurez les lignes d'appel de votre organisme pour recevoir les appels des citoyens.",
        )}
        action={
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("settings.communications.addLine", "Nouvelle ligne")}
          </Button>
        }
      />

      {lines.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border rounded-lg">
          <Phone className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-sm">
            {t("settings.communications.noLines", "Aucune ligne d'appel configuree")}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3 gap-1.5"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("settings.communications.createFirst", "Creer la premiere ligne")}
          </Button>
        </div>
      ) : (
        <div className="space-y-0">
          {lines.map((line) => (
            <CallLineSettingsRow
              key={line._id}
              line={line}
              onToggleActive={handleToggleActive}
              onEdit={setEditingLine}
              onManageAgents={setManagingAgentsLine}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <SettingsDivider />

      {/* ── Agent Assignments Section ──────────────────── */}
      <SettingsSectionHeader
        title={t("settings.communications.assignments", "Assignation des agents")}
        description={t(
          "settings.communications.assignmentsDesc",
          "Vue d'ensemble des agents assignes a chaque ligne d'appel.",
        )}
      />

      {lines.filter((l) => l.type === "org").length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-4">
          {t("settings.communications.noOrgLines", "Aucune ligne partagee configuree")}
        </p>
      ) : (
        <div className="space-y-4">
          {lines
            .filter((l) => l.type === "org")
            .map((line) => (
              <div key={line._id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", getColorDot(line.color))} />
                    <span className="text-sm font-medium">{line.label}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      {line.agents.length} agent{line.agents.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1 text-xs h-7"
                    onClick={() => setManagingAgentsLine(line)}
                  >
                    <Users className="h-3 w-3" />
                    {t("settings.communications.manage", "Gerer")}
                  </Button>
                </div>

                {line.agents.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic pl-5">
                    Aucun agent assigne
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 pl-5">
                    {line.agents.map((agent) => (
                      <div
                        key={agent.membershipId}
                        className="flex items-center gap-1.5 rounded-full border bg-background px-2 py-1"
                      >
                        <Avatar className="h-5 w-5">
                          {agent.avatarUrl ? (
                            <AvatarImage src={agent.avatarUrl} alt={agent.name} />
                          ) : null}
                          <AvatarFallback className="text-[8px] bg-foreground/10">
                            {agent.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{agent.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {/* ── Dialogs ────────────────────────────────────── */}
      <CallLineFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        mode="create"
        onSubmit={async (data) => {
          await createLine.mutateAsync({ ...data, orgId });
          toast.success("Ligne creee");
          setShowCreateDialog(false);
        }}
        isSubmitting={createLine.isPending}
      />

      {editingLine && (
        <CallLineFormDialog
          open={!!editingLine}
          onOpenChange={(open) => !open && setEditingLine(null)}
          mode="edit"
          initialData={editingLine}
          onSubmit={async (data) => {
            await updateLine.mutateAsync({
              callLineId: editingLine._id,
              ...data,
            });
            toast.success("Ligne modifiee");
            setEditingLine(null);
          }}
          isSubmitting={updateLine.isPending}
        />
      )}

      {managingAgentsLine && (
        <ManageLineAgentsDialog
          open={!!managingAgentsLine}
          onOpenChange={(open) => !open && setManagingAgentsLine(null)}
          line={managingAgentsLine}
          members={members ?? []}
          onSave={async (membershipIds) => {
            await updateAgentsMutation.mutateAsync({
              callLineId: managingAgentsLine._id,
              membershipIds,
            });
            toast.success("Agents mis a jour");
            setManagingAgentsLine(null);
          }}
          isSaving={updateAgentsMutation.isPending}
        />
      )}
    </div>
  );
}

// ─── CallLine Settings Row ──────────────────────────────────
function CallLineSettingsRow({
  line,
  onToggleActive,
  onEdit,
  onManageAgents,
  onDelete,
}: {
  line: EnrichedCallLine;
  onToggleActive: (line: EnrichedCallLine) => void;
  onEdit: (line: EnrichedCallLine) => void;
  onManageAgents: (line: EnrichedCallLine) => void;
  onDelete: (line: EnrichedCallLine) => void;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <SettingsRow
      className={cn(!line.isActive && "opacity-50")}
      title={
        <div className="flex items-center gap-2">
          <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", getColorDot(line.color))} />
          <span>{line.label}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
            {line.type === "personal" ? "Personnel" : "Partage"}
          </Badge>
          {line.isDefault && (
            <Badge className="text-[10px] px-1.5 py-0 h-4 bg-foreground/10 text-foreground hover:bg-foreground/15">
              Defaut
            </Badge>
          )}
        </div>
      }
      description={
        <span className="flex items-center gap-2">
          {line.description && <span>{line.description}</span>}
          <span className="text-xs">
            {line.agents.length} agent{line.agents.length !== 1 ? "s" : ""}
          </span>
        </span>
      }
      action={
        <div className="flex items-center gap-2">
          <Switch
            checked={line.isActive}
            onCheckedChange={() => onToggleActive(line)}
            className="scale-90"
          />
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowActions(!showActions)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            {showActions && (
              <div
                className="absolute right-0 top-8 z-10 w-40 rounded-lg border bg-popover p-1 shadow-md"
                onMouseLeave={() => setShowActions(false)}
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                  onClick={() => {
                    onEdit(line);
                    setShowActions(false);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Modifier
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                  onClick={() => {
                    onManageAgents(line);
                    setShowActions(false);
                  }}
                >
                  <Users className="h-3.5 w-3.5" />
                  Gerer agents
                </button>
                {line.type !== "personal" && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={() => {
                      onDelete(line);
                      setShowActions(false);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Supprimer
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      }
    />
  );
}

// ─── CallLine Form Dialog ───────────────────────────────────
function CallLineFormDialog({
  open,
  onOpenChange,
  mode,
  initialData,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: EnrichedCallLine;
  onSubmit: (data: {
    label: string;
    description?: string;
    color?: string;
    priority?: number;
    isDefault?: boolean;
  }) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [label, setLabel] = useState(initialData?.label ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [color, setColor] = useState(initialData?.color ?? "blue");
  const [priority, setPriority] = useState(initialData?.priority ?? 1);
  const [isDefault, setIsDefault] = useState(initialData?.isDefault ?? false);

  const handleOpenChange = (v: boolean) => {
    if (v && initialData) {
      setLabel(initialData.label);
      setDescription(initialData.description ?? "");
      setColor(initialData.color ?? "blue");
      setPriority(initialData.priority);
      setIsDefault(initialData.isDefault ?? false);
    } else if (v) {
      setLabel("");
      setDescription("");
      setColor("blue");
      setPriority(1);
      setIsDefault(false);
    }
    onOpenChange(v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    try {
      await onSubmit({
        label: label.trim(),
        description: description.trim() || undefined,
        color,
        priority,
        isDefault,
      });
    } catch {
      toast.error("Erreur");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nouvelle ligne d'appel" : "Modifier la ligne"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Creez une ligne d'appel pour recevoir les appels des citoyens."
              : "Modifiez les proprietes de cette ligne d'appel."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cl-label">Nom de la ligne</Label>
            <Input
              id="cl-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ex: Accueil, Urgences, Etat Civil..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cl-desc">Description</Label>
            <Input
              id="cl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description optionnelle"
            />
          </div>

          <div className="space-y-2">
            <Label>Couleur</Label>
            <div className="flex gap-2">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center border-2 transition-colors",
                    color === c.value
                      ? "border-foreground/40"
                      : "border-transparent hover:border-foreground/20",
                  )}
                >
                  <div className={cn("h-4 w-4 rounded-full", c.dot)} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="space-y-2 flex-1">
              <Label htmlFor="cl-priority">Priorite</Label>
              <Input
                id="cl-priority"
                type="number"
                min={1}
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                id="cl-default"
                checked={isDefault}
                onCheckedChange={(v) => setIsDefault(v === true)}
              />
              <Label htmlFor="cl-default" className="text-sm">
                Ligne par defaut
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={!label.trim() || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {mode === "create" ? "Creer" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Manage Line Agents Dialog ──────────────────────────────
function ManageLineAgentsDialog({
  open,
  onOpenChange,
  line,
  members,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  line: EnrichedCallLine;
  members: Array<Record<string, any>>;
  onSave: (membershipIds: Id<"memberships">[]) => Promise<void>;
  isSaving: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(line.membershipIds),
  );
  const [search, setSearch] = useState("");

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        (m.firstName ?? "").toLowerCase().includes(q) ||
        (m.lastName ?? "").toLowerCase().includes(q) ||
        (m.email ?? "").toLowerCase().includes(q),
    );
  }, [members, search]);

  const toggleMember = (membershipId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(membershipId)) {
        next.delete(membershipId);
      } else {
        next.add(membershipId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    try {
      await onSave(Array.from(selected) as Id<"memberships">[]);
    } catch {
      toast.error("Erreur lors de la mise a jour");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerer les agents — {line.label}</DialogTitle>
          <DialogDescription>
            Selectionnez les agents qui recevront les appels sur cette ligne.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            placeholder="Rechercher un agent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="max-h-64 overflow-y-auto space-y-1 rounded-lg border p-1">
            {filteredMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun membre trouve
              </p>
            ) : (
              filteredMembers.map((m) => {
                const mId = m.membershipId ?? m._id;
                const isChecked = selected.has(mId);
                const name =
                  [m.firstName, m.lastName].filter(Boolean).join(" ") ||
                  m.email ||
                  "Inconnu";
                return (
                  <button
                    key={mId}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors",
                      isChecked ? "bg-foreground/5" : "hover:bg-muted/40",
                    )}
                    onClick={() => toggleMember(mId)}
                  >
                    <Checkbox checked={isChecked} className="pointer-events-none" />
                    <Avatar className="h-6 w-6">
                      {m.avatarUrl ? (
                        <AvatarImage src={m.avatarUrl} alt={name} />
                      ) : null}
                      <AvatarFallback className="text-[9px] bg-foreground/10">
                        {name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate">{name}</span>
                    {isChecked && (
                      <Check className="ml-auto h-3.5 w-3.5 text-foreground/60 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {selected.size} agent{selected.size !== 1 ? "s" : ""} selectionne
            {selected.size !== 1 ? "s" : ""}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
