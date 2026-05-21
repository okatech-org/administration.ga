"use client";

/**
 * VacantPositionsView — Vue des postes vacants avec action « Affecter »
 *
 * Affiche tous les postes sans occupant, groupés par grade, avec un bouton
 * direct pour affecter un membre existant non assigné, ou créer un nouveau membre.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { AlertTriangle, Crown, Shield, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AddMemberDialog } from "@/components/org/add-member-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks";

export interface VacantPositionsViewProps {
  orgId: Id<"orgs">;
}

const GRADE_META: Record<
  string,
  { label: string; icon: typeof Crown; color: string }
> = {
  chief: { label: "Chef de mission", icon: Crown, color: "text-amber-600" },
  deputy_chief: { label: "Adjoint", icon: Shield, color: "text-blue-600" },
  counselor: { label: "Conseiller", icon: Users, color: "text-indigo-600" },
  agent: { label: "Agent", icon: Users, color: "text-emerald-600" },
  external: { label: "Externe", icon: Users, color: "text-slate-600" },
};

interface PositionVacant {
  _id: Id<"positions">;
  title: { fr?: string; en?: string };
  description?: { fr?: string; en?: string };
  grade?: string;
  level?: number;
  isRequired?: boolean;
}

export function VacantPositionsView({ orgId }: VacantPositionsViewProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith("fr") ? "fr" : "en";

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [positionToAssign, setPositionToAssign] =
    useState<PositionVacant | null>(null);

  const { data: orgChart, isPending } = useAuthenticatedConvexQuery(
    api.functions.orgs.getOrgChart,
    { orgId },
  );

  const vacantByGrade = useMemo(() => {
    const groups: Record<string, PositionVacant[]> = {};
    const positions = (orgChart?.positions ?? []) as Array<
      PositionVacant & { occupants: unknown[] }
    >;
    for (const p of positions) {
      if (p.occupants && p.occupants.length > 0) continue;
      const grade = p.grade ?? "agent";
      if (!groups[grade]) groups[grade] = [];
      groups[grade].push(p);
    }
    return groups;
  }, [orgChart]);

  const totalVacant = Object.values(vacantByGrade).reduce(
    (acc, arr) => acc + arr.length,
    0,
  );

  return (
    <FlatCard>
      <div className="p-3 lg:p-4 space-y-3">
        <div className="flex items-center justify-between">
          <SectionHeader
            icon={<UserPlus className="h-4 w-4 text-amber-600" />}
            title={`${totalVacant} poste${totalVacant > 1 ? "s" : ""} vacant${totalVacant > 1 ? "s" : ""}`}
          />
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            Inviter un nouveau membre
          </Button>
        </div>

        {isPending ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : totalVacant === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">
              Tous les postes sont occupés 🎉
            </p>
            <p className="text-xs mt-1">
              L'organigramme est complet pour cette représentation.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {(Object.keys(vacantByGrade) as Array<keyof typeof GRADE_META>).map(
              (grade) => {
                const positions = vacantByGrade[grade as string];
                const meta =
                  GRADE_META[grade as string] ??
                  ({
                    label: grade as string,
                    icon: Users,
                    color: "text-muted-foreground",
                  } as const);
                const Icon = meta.icon;
                return (
                  <div key={grade as string}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {meta.label}
                      </h4>
                      <Badge variant="secondary" className="text-[10px]">
                        {positions.length}
                      </Badge>
                    </div>
                    <ul className="space-y-1.5">
                      {positions.map((p) => {
                        const title =
                          p.title?.[lang as "fr" | "en"] ??
                          p.title?.fr ??
                          "Sans titre";
                        const desc = p.description?.[lang as "fr" | "en"];
                        return (
                          <li
                            key={p._id}
                            className="flex items-start justify-between gap-3 p-3 rounded-md border border-border/50 hover:bg-muted/30"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {title}
                                </span>
                                {p.isRequired && (
                                  <Badge className="bg-rose-500/10 text-rose-700 border-rose-500/20 text-[9px]">
                                    <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                                    Requis
                                  </Badge>
                                )}
                              </div>
                              {desc && (
                                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                  {desc}
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPositionToAssign(p)}
                            >
                              Affecter
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              },
            )}
          </div>
        )}
      </div>

      <AddMemberDialog
        orgId={orgId}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />

      <AssignFromUnassignedDialog
        orgId={orgId}
        position={positionToAssign}
        onClose={() => setPositionToAssign(null)}
      />
    </FlatCard>
  );
}

// ─── Modale interne : choisir un membre non affecté ─────────────
function AssignFromUnassignedDialog({
  orgId,
  position,
  onClose,
}: {
  orgId: Id<"orgs">;
  position: PositionVacant | null;
  onClose: () => void;
}) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith("fr") ? "fr" : "en";
  const isOpen = position !== null;
  const [membershipId, setMembershipId] = useState<string>("");

  const { data: orgChart } = useAuthenticatedConvexQuery(
    api.functions.orgs.getOrgChart,
    isOpen ? { orgId } : "skip",
  );

  const { mutateAsync: assignPosition, isPending } = useConvexMutationQuery(
    api.functions.orgs.assignMemberPosition,
  );

  const unassigned = (orgChart?.unassignedMembers ?? []) as Array<{
    membershipId: Id<"memberships">;
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  }>;

  const handleAssign = async () => {
    if (!position || !membershipId) return;
    try {
      await assignPosition({
        orgId,
        membershipId: membershipId as Id<"memberships">,
        positionId: position._id,
      });
      toast.success("Membre affecté avec succès");
      onClose();
      setMembershipId("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  const positionTitle =
    position?.title?.[lang as "fr" | "en"] ?? position?.title?.fr ?? "";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Affecter à « {positionTitle} »</DialogTitle>
          <DialogDescription>
            Choisis un membre déjà ajouté à la représentation mais sans poste.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          {unassigned.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-4">
              Aucun membre sans poste. Utilise « Inviter un nouveau membre »
              dans la vue précédente.
            </p>
          ) : (
            <Select value={membershipId} onValueChange={setMembershipId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un membre…" />
              </SelectTrigger>
              <SelectContent>
                {unassigned.map((m) => {
                  const name =
                    `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() ||
                    m.email ||
                    "—";
                  return (
                    <SelectItem key={m.membershipId} value={m.membershipId}>
                      {name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!membershipId || isPending}
          >
            Affecter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
