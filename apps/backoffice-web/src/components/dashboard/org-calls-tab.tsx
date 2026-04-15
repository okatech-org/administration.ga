"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  Check,
  Loader2,
  MoreHorizontal,
  Pencil,
  Phone,
  PhoneCall,
  PhoneMissed,
  Plus,
  Trash2,
  Users,
  Wifi,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────
interface OrgCallsTabProps {
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

// ─── KPI Card ───────────────────────────────────────────────
function KpiCard({
  icon: Icon,
  label,
  value,
  accent,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  accent: string;
  loading?: boolean;
}) {
  return (
    <FlatCard>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            {loading ? (
              <Skeleton className="h-7 w-12 mt-1" />
            ) : (
              <p className="text-xl font-bold tracking-tight mt-0.5">
                {value}
              </p>
            )}
          </div>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: `${accent}18` }}
          >
            <Icon className="h-4 w-4" style={{ color: accent }} />
          </div>
        </div>
      </div>
    </FlatCard>
  );
}

// ─── Main Component ─────────────────────────────────────────
export function OrgCallsTab({ orgId }: OrgCallsTabProps) {
  const { t } = useTranslation();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingLine, setEditingLine] = useState<EnrichedCallLine | null>(null);
  const [managingAgentsLine, setManagingAgentsLine] = useState<EnrichedCallLine | null>(null);

  // ── Data ──
  const { data: callLines, isPending: isLinesLoading } =
    useAuthenticatedConvexQuery(api.functions.callLines.listForAdmin, { orgId });

  const stats = null;
  const isStatsLoading = false;

  const { data: members } = useAuthenticatedConvexQuery(
    api.functions.orgs.getMembers,
    { orgId },
  );

  const { data: presenceData } = useAuthenticatedConvexQuery(
    api.functions.agentPresence.listOnlineAgents,
    { orgId },
  );

  // ── Mutations ──
  const createLine = useConvexMutationQuery(api.functions.callLines.create);
  const updateLine = useConvexMutationQuery(api.functions.callLines.update);
  const removeLine = useConvexMutationQuery(api.functions.callLines.remove);
  const updateAgents = useConvexMutationQuery(api.functions.callLines.updateAgents);

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

  // ── Loading ──
  if (isLinesLoading && !callLines) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const lines = (callLines ?? []) as EnrichedCallLine[];

  return (
    <div className="space-y-4">
      {/* ── KPI Row ──────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Phone}
          label={t("superadmin.organizations.calls.totalCalls", "Total appels")}
          value={stats?.totalCalls ?? 0}
          accent="#6366f1"
          loading={isStatsLoading}
        />
        <KpiCard
          icon={PhoneCall}
          label={t("superadmin.organizations.calls.activeCalls", "Appels actifs")}
          value={stats?.activeCalls ?? 0}
          accent="#10b981"
          loading={isStatsLoading}
        />
        <KpiCard
          icon={PhoneMissed}
          label={t("superadmin.organizations.calls.missedCalls", "Appels manques")}
          value={stats?.missedCalls ?? 0}
          accent="#f59e0b"
          loading={isStatsLoading}
        />
        <KpiCard
          icon={Wifi}
          label={t("superadmin.organizations.calls.onlineAgents", "Agents en ligne")}
          value={stats?.onlineAgents ?? 0}
          accent="#3b82f6"
          loading={isStatsLoading}
        />
      </div>

      {/* ── Call Lines ───────────────────────────────────── */}
      <FlatCard>
        <div className="p-3 lg:p-4">
          <SectionHeader
            icon={<Phone className="h-4 w-4" />}
            title={t("superadmin.organizations.calls.lines", "Lignes d'appel")}
            actions={
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("superadmin.organizations.calls.addLine", "Nouvelle ligne")}
              </Button>
            }
          />

          {lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Phone className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">
                {t("superadmin.organizations.calls.noLines", "Aucune ligne d'appel configuree")}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 gap-1.5"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("superadmin.organizations.calls.createFirst", "Creer la premiere ligne")}
              </Button>
            </div>
          ) : (
            <div className="space-y-2 mt-2">
              {lines.map((line) => (
                <CallLineRow
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
        </div>
      </FlatCard>

      {/* ── Agent Presence ───────────────────────────────── */}
      <FlatCard>
        <div className="p-3 lg:p-4">
          <SectionHeader
            icon={<Users className="h-4 w-4" />}
            title={t("superadmin.organizations.calls.presence", "Presence des agents")}
          />
          <AgentPresencePanel
            presenceData={presenceData ?? { online: [], busy: [], away: [], totalAvailable: 0 }}
            members={members ?? []}
          />
        </div>
      </FlatCard>

      {/* ── Dialogs ─────────────────────────────────────── */}
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
            await updateAgents.mutateAsync({
              callLineId: managingAgentsLine._id,
              membershipIds,
            });
            toast.success("Agents mis a jour");
            setManagingAgentsLine(null);
          }}
          isSaving={updateAgents.isPending}
        />
      )}
    </div>
  );
}

// ─── CallLineRow ────────────────────────────────────────────
function CallLineRow({
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
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border border-border/50 p-3 transition-colors",
        !line.isActive && "opacity-50",
      )}
    >
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={cn("h-3 w-3 rounded-full shrink-0", getColorDot(line.color))}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{line.label}</span>
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-4 shrink-0"
            >
              {line.type === "personal" ? "Personnel" : "Partage"}
            </Badge>
            {line.isDefault && (
              <Badge className="text-[10px] px-1.5 py-0 h-4 bg-foreground/10 text-foreground hover:bg-foreground/15 shrink-0">
                Defaut
              </Badge>
            )}
          </div>
          {line.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {line.description}
            </p>
          )}
        </div>
      </div>

      {/* Agents avatars */}
      <div className="flex items-center gap-1 shrink-0">
        <div className="flex -space-x-1.5">
          {line.agents.slice(0, 3).map((agent) => (
            <Avatar key={agent.membershipId} className="h-6 w-6 border-2 border-background">
              {agent.avatarUrl ? (
                <AvatarImage src={agent.avatarUrl} alt={agent.name} />
              ) : null}
              <AvatarFallback className="text-[9px] bg-foreground/10">
                {agent.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
        {line.agents.length > 3 && (
          <span className="text-[10px] text-muted-foreground ml-0.5">
            +{line.agents.length - 3}
          </span>
        )}
        {line.agents.length === 0 && (
          <span className="text-[10px] text-muted-foreground italic">
            Aucun agent
          </span>
        )}
      </div>

      {/* Right: Switch + Actions */}
      <div className="flex items-center gap-2 shrink-0">
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
    </div>
  );
}

// ─── Agent Presence Panel ───────────────────────────────────
function AgentPresencePanel({
  presenceData,
  members,
}: {
  presenceData: {
    online: Array<{ userId: Id<"users">; currentCallId?: Id<"meetings"> }>;
    busy: Array<{ userId: Id<"users">; currentCallId?: Id<"meetings"> }>;
    away: Array<{ userId: Id<"users">; currentCallId?: Id<"meetings"> }>;
    totalAvailable: number;
  };
  members: Array<{
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatarUrl?: string;
  }>;
}) {
  const memberMap = useMemo(() => {
    const map = new Map<string, { name: string; avatarUrl?: string }>();
    for (const m of members) {
      const name = [m.firstName, m.lastName].filter(Boolean).join(" ") || m.email || "Agent";
      map.set(m._id, { name, avatarUrl: m.avatarUrl });
    }
    return map;
  }, [members]);

  const groups = [
    { key: "online", label: "En ligne", dot: "bg-emerald-500", agents: presenceData.online },
    { key: "busy", label: "En appel", dot: "bg-amber-500", agents: presenceData.busy },
    { key: "away", label: "Absent", dot: "bg-foreground/30", agents: presenceData.away },
  ] as const;

  const totalAgents = presenceData.totalAvailable;

  if (totalAgents === 0) {
    return (
      <p className="text-sm text-muted-foreground italic py-4 text-center">
        Aucun agent en ligne
      </p>
    );
  }

  return (
    <div className="space-y-3 mt-2">
      {groups.map((group) =>
        group.agents.length > 0 ? (
          <div key={group.key}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              {group.label} ({group.agents.length})
            </p>
            <div className="space-y-1">
              {group.agents.map((agent) => {
                const info = memberMap.get(agent.userId) ?? { name: "Agent" };
                return (
                  <div
                    key={agent.userId}
                    className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/30 transition-colors"
                  >
                    <div className="relative">
                      <Avatar className="h-7 w-7">
                        {info.avatarUrl ? (
                          <AvatarImage src={info.avatarUrl} alt={info.name} />
                        ) : null}
                        <AvatarFallback className="text-[10px] bg-foreground/10">
                          {info.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
                          group.dot,
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{info.name}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                    >
                      {group.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null,
      )}
    </div>
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

  // Reset on open
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
            <Label htmlFor="line-label">Nom de la ligne</Label>
            <Input
              id="line-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ex: Accueil, Urgences, Etat Civil..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="line-desc">Description</Label>
            <Input
              id="line-desc"
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
              <Label htmlFor="line-priority">Priorite</Label>
              <Input
                id="line-priority"
                type="number"
                min={1}
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                id="line-default"
                checked={isDefault}
                onCheckedChange={(v) => setIsDefault(v === true)}
              />
              <Label htmlFor="line-default" className="text-sm">
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
                      isChecked
                        ? "bg-foreground/5"
                        : "hover:bg-muted/40",
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
