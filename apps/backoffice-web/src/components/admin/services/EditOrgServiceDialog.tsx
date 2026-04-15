"use client";

/**
 * EditOrgServiceDialog — Édition rapide pricing/SLA d'un orgService (Phase B7)
 *
 * Évite de devoir désactiver/réactiver le service pour modifier le tarif.
 * Utilise la mutation `updateOrgService` existante avec patch granulaire.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConvexMutationQuery } from "@/integrations/convex/hooks";

export interface EditOrgServiceDialogProps {
  orgServiceId: Id<"orgServices"> | null;
  serviceName: string;
  initialPricing?: { amount: number; currency: string };
  initialEstimatedDays?: number;
  onClose: () => void;
}

export function EditOrgServiceDialog({
  orgServiceId,
  serviceName,
  initialPricing,
  initialEstimatedDays,
  onClose,
}: EditOrgServiceDialogProps) {
  const isOpen = orgServiceId !== null;
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState<"EUR" | "USD" | "XAF">("EUR");
  const [estimatedDays, setEstimatedDays] = useState<number | "">("");

  const { mutateAsync: updateOrgService, isPending } = useConvexMutationQuery(
    api.functions.services.updateOrgService,
  );

  useEffect(() => {
    if (isOpen) {
      setAmount(initialPricing?.amount ?? 0);
      setCurrency(
        ((initialPricing?.currency?.toUpperCase() ?? "EUR") as "EUR" | "USD" | "XAF"),
      );
      setEstimatedDays(initialEstimatedDays ?? "");
    }
  }, [isOpen, initialPricing, initialEstimatedDays]);

  const handleSubmit = async () => {
    if (!orgServiceId) return;
    try {
      await updateOrgService({
        orgServiceId,
        pricing: { amount, currency: currency.toLowerCase() },
        estimatedDays:
          typeof estimatedDays === "number" ? estimatedDays : undefined,
      });
      toast.success("Service mis à jour");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier {serviceName}</DialogTitle>
          <DialogDescription>
            Édite le tarif et le délai de traitement de ce service. Pas besoin
            de désactiver le service.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <div className="grid grid-cols-[1fr_120px] gap-2">
            <Field>
              <FieldLabel>Tarif</FieldLabel>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </Field>
            <Field>
              <FieldLabel>Devise</FieldLabel>
              <Select
                value={currency}
                onValueChange={(v) => setCurrency(v as "EUR" | "USD" | "XAF")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR €</SelectItem>
                  <SelectItem value="USD">USD $</SelectItem>
                  <SelectItem value="XAF">XAF FCFA</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field>
            <FieldLabel>Délai de traitement (jours ouvrés)</FieldLabel>
            <Input
              type="number"
              min={0}
              value={estimatedDays}
              onChange={(e) =>
                setEstimatedDays(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              placeholder="ex : 7"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Délai indicatif communiqué au citoyen lors de la création de la
              demande. Utilisé pour les alertes SLA.
            </p>
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
