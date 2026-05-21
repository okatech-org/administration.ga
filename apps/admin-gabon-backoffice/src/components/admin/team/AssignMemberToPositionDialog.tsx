"use client";

/**
 * AssignMemberToPositionDialog — Modale d'affectation rapide
 *
 * Permet de :
 *   - Affecter un membre à une nouvelle position (ou changer de position)
 *   - Désaffecter complètement (« Aucun poste »)
 *
 * Utilise la mutation `assignMemberPosition` qui gère automatiquement le
 * transfert si la position cible est unique.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Briefcase, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks";

export interface AssignMemberToPositionDialogProps {
  orgId: Id<"orgs">;
  membershipId: Id<"memberships"> | null;
  memberName: string;
  currentPositionId: Id<"positions"> | null;
  onClose: () => void;
}

export function AssignMemberToPositionDialog({
  orgId,
  membershipId,
  memberName,
  currentPositionId,
  onClose,
}: AssignMemberToPositionDialogProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language === "fr" ? "fr" : "en";

  const isOpen = membershipId !== null;
  const [selectedPositionId, setSelectedPositionId] = useState<string>("none");

  const { data: orgChart } = useAuthenticatedConvexQuery(
    api.functions.orgs.getOrgChart,
    isOpen ? { orgId } : "skip",
  );

  const { mutateAsync: assignPosition, isPending } = useConvexMutationQuery(
    api.functions.orgs.assignMemberPosition,
  );

  // Reset sélection à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setSelectedPositionId(currentPositionId ?? "none");
    }
  }, [isOpen, currentPositionId]);

  const handleSubmit = async () => {
    if (!membershipId) return;
    try {
      await assignPosition({
        orgId,
        membershipId,
        positionId:
          selectedPositionId === "none"
            ? null
            : (selectedPositionId as Id<"positions">),
      });
      toast.success("Affectation mise à jour");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  const positions = (orgChart?.positions ?? []) as Array<{
    _id: Id<"positions">;
    title: { fr?: string; en?: string };
    grade?: string;
    occupants: Array<{ membershipId: Id<"memberships"> }>;
    isRequired?: boolean;
  }>;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Affecter à un poste
          </DialogTitle>
          <DialogDescription>
            Choisis le poste pour <strong>{memberName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <Select
            value={selectedPositionId}
            onValueChange={setSelectedPositionId}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choisir un poste…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">— Aucun poste —</span>
              </SelectItem>
              {positions.map((p) => {
                const isOccupied = p.occupants.length > 0;
                const isCurrent = p._id === currentPositionId;
                const title =
                  p.title?.[lang as "fr" | "en"] ?? p.title?.fr ?? "Sans titre";
                return (
                  <SelectItem key={p._id} value={p._id}>
                    <div className="flex items-center gap-2 w-full">
                      <span className="truncate">{title}</span>
                      {isCurrent && (
                        <Badge variant="secondary" className="text-[9px]">
                          Actuel
                        </Badge>
                      )}
                      {isOccupied && !isCurrent && (
                        <Badge
                          variant="outline"
                          className="text-[9px] text-amber-600"
                        >
                          Occupé
                        </Badge>
                      )}
                      {p.isRequired && (
                        <Badge
                          variant="outline"
                          className="text-[9px] border-rose-300 text-rose-600"
                        >
                          Requis
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <p className="text-[10px] text-muted-foreground">
            Si le poste sélectionné est <strong>unique</strong> et déjà occupé,
            l'occupant actuel sera automatiquement désaffecté.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
            Valider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
