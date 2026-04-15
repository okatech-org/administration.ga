"use client";

/**
 * Phase 3 : Lettres — Correspondance officielle et invitations
 *
 * Dialog IA complet : selection cible/plan → generation lettre via draftLetter
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useSearchParams } from "next/navigation";
import {
  Mail,
  Sparkles,
  Loader2,
  FileText,
  Calendar,
  MapPin,
  ListChecks,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { toast } from "sonner";
import { useOrg } from "@/components/org/org-provider";
import {
  AIActionPanel,
  AIActionButton,
} from "@/components/diplomatic/AIActionPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/my-space/flat-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAuthenticatedConvexQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";


const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft: { label: "Brouillon", color: "bg-zinc-500/15 text-zinc-400" },
  pending_approval: {
    label: "En attente",
    color: "bg-warning/15 text-warning",
  },
  approved: { label: "Approuve", color: "bg-primary/15 text-primary" },
  sent: { label: "Envoye", color: "bg-success/15 text-success" },
  responded: { label: "Repondu", color: "bg-success/15 text-success" },
  archived: { label: "Archive", color: "bg-zinc-500/15 text-zinc-400" },
};

const FORMAT_LABEL: Record<string, string> = {
  formal_letter: "Lettre officielle",
  email: "Email",
  note_verbale: "Note verbale",
  invitation: "Invitation",
};

export default function LettresPhase() {
  const { activeOrgId } = useOrg();
  const searchParams = useSearchParams();
  const requestDocx = useMutation(api.functions.diplomaticAffairs.requestLetterDocxGeneration);

  // Dialog state
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [draftState, setDraftState] = useState<
    "idle" | "loading" | "result" | "error"
  >("idle");
  const [draftError, setDraftError] = useState("");
  const [draftResult, setDraftResult] = useState<{
    letterId: Id<"diplomaticLetters">;
    subject: string;
    content: string;
    type: string;
    meetingDetails?: {
      proposedDate?: string;
      proposedLocation?: string;
      agenda?: string[];
    };
  } | null>(null);

  // Form fields
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [letterFormat, setLetterFormat] = useState<string>("formal_letter");
  const [purpose, setPurpose] = useState("");
  const [ambassadorName, setAmbassadorName] = useState("");

  // Queries
  const { data: letters, isPending } = useAuthenticatedConvexQuery(
    api.functions.diplomaticAffairs.listLetters,
    activeOrgId ? { orgId: activeOrgId } : "skip",
  );

  const { data: targets } = useAuthenticatedConvexQuery(
    api.functions.diplomaticAffairs.listTargets,
    activeOrgId ? { orgId: activeOrgId } : "skip",
  );

  const { data: plans } = useAuthenticatedConvexQuery(
    api.functions.diplomaticAffairs.listPlans,
    activeOrgId ? { orgId: activeOrgId } : "skip",
  );

  // Action IA
  const draftLetterAction = useAction(api.ai.diplomaticAI.draftLetter);

  // Cibles eligibles (phase strategy ou outreach)
  const eligibleTargets = targets?.filter(
    (t) =>
      t.pipelinePhase === "strategy" || t.pipelinePhase === "outreach",
  );

  // Plans filtres par cible selectionnee
  const filteredPlans = plans?.filter(
    (p) =>
      selectedTargetId &&
      p.targetId === selectedTargetId,
  );

  // Pre-remplir depuis les search params (navigation depuis $targetId.tsx ou plans.tsx)
  useEffect(() => {
    if (searchParams.get("targetId") && !showDraftDialog) {
      setSelectedTargetId(searchParams.get("targetId") ?? "");
      if (searchParams.get("planId")) {
        setSelectedPlanId(searchParams.get("planId") ?? "");
      }
      // Ouvrir le dialog automatiquement
      setShowDraftDialog(true);
    }
  }, [searchParams.get("targetId"), searchParams.get("planId")]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDraftLetter = async () => {
    if (!activeOrgId || !selectedTargetId) {
      toast.error("Selectionnez une cible");
      return;
    }
    if (!purpose.trim()) {
      toast.error("Indiquez l'objet de la lettre");
      return;
    }
    setDraftState("loading");
    setDraftError("");
    try {
      const result = await draftLetterAction({
        orgId: activeOrgId,
        targetId: selectedTargetId as Id<"diplomaticTargets">,
        planId: selectedPlanId
          ? (selectedPlanId as Id<"diplomaticPlans">)
          : undefined,
        letterFormat: letterFormat as
          | "formal_letter"
          | "email"
          | "note_verbale"
          | "invitation",
        purpose: purpose.trim(),
        ambassadorName: ambassadorName.trim() || undefined,
      });
      setDraftResult(result);
      setDraftState("result");
      toast.success(`Lettre "${result.subject}" generee avec succes`);
    } catch (error) {
      console.error("Erreur generation lettre:", error);
      setDraftError(
        error instanceof Error
          ? error.message
          : "Erreur lors de la generation de la lettre",
      );
      setDraftState("error");
    }
  };

  const resetDialog = () => {
    setDraftState("idle");
    setDraftResult(null);
    setDraftError("");
    setPurpose("");
    setAmbassadorName("");
  };

  const selectedTargetName =
    selectedTargetId
      ? targets?.find((t) => t._id === selectedTargetId)?.name ?? ""
      : "";

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barre d'actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {letters?.length ?? 0} lettre(s)
        </p>
        <AIActionButton
          label="Rediger une lettre"
          icon={Sparkles}
          onClick={() => {
            resetDialog();
            setShowDraftDialog(true);
          }}
          disabled={!eligibleTargets || eligibleTargets.length === 0}
        />
      </div>

      {/* Info si aucune cible eligible */}
      {eligibleTargets && eligibleTargets.length === 0 && targets && targets.length > 0 && (
        <div className="rounded-lg bg-warning/10 border border-warning/20 p-3 text-xs text-warning">
          Aucune cible en phase "Strategie" ou "Contact". Generez d'abord un plan strategique depuis l'onglet Cibles.
        </div>
      )}

      {/* Liste des lettres */}
      {!letters || letters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-2xl bg-success/10 flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-success/60" />
          </div>
          <h3 className="text-lg font-semibold mb-1">
            Aucune lettre de contact
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Redigez des courriers formels a destination de vos cibles
            diplomatiques et partenaires.
          </p>
          <Button
            className="gap-1.5"
            disabled={!eligibleTargets || eligibleTargets.length === 0}
            onClick={() => {
              resetDialog();
              setShowDraftDialog(true);
            }}
          >
            <Sparkles className="h-4 w-4" />
            Rediger une lettre
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {letters.map((letter) => {
            const status =
              STATUS_LABEL[letter.status] ?? STATUS_LABEL.draft;
            return (
              <FlatCard
                key={letter._id}
              >
                <div className="p-3 lg:p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {letter.subject}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {letter.reference} • A : {letter.recipientName}
                      {letter.recipientOrg && ` (${letter.recipientOrg})`}
                      {letter.letterFormat &&
                        ` • ${FORMAT_LABEL[letter.letterFormat] ?? letter.letterFormat}`}
                    </p>
                    {letter.aiDraftContent && (
                      <div className="flex items-center gap-1 mt-0.5 text-[10px] text-primary">
                        <Sparkles className="h-3 w-3" />
                        Brouillon IA
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs"
                      onClick={async () => {
                        try {
                          await requestDocx({ letterId: letter._id });
                          toast.success("Document DOCX en cours de generation");
                        } catch {
                          toast.error("Erreur lors de la generation");
                        }
                      }}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Générer le .docx
                    </Button>
                    <Badge className={cn("text-[9px]", status.color)}>
                      {status.label}
                    </Badge>
                  </div>
                </div>
              </FlatCard>
            );
          })}
        </div>
      )}

      {/* Dialog IA : Rediger une lettre */}
      <AIActionPanel
        open={showDraftDialog}
        onOpenChange={(v) => {
          if (!v && draftState !== "loading") {
            setShowDraftDialog(false);
            resetDialog();
          }
        }}
        title="Rediger une lettre de contact"
        description="L'IA redige une lettre diplomatique formelle basee sur votre strategie et la cible selectionnee."
        icon={Mail}
        state={draftState}
        errorMessage={draftError}
        onSubmit={handleDraftLetter}
        submitLabel="Generer la lettre"
        loadingMessage={`Generation de la lettre pour ${selectedTargetName}...`}
        validateLabel="Fermer"
        onValidate={() => {
          setShowDraftDialog(false);
          resetDialog();
        }}
        onRegenerate={handleDraftLetter}
        inputForm={
          <div className="space-y-3">
            {/* Selection de la cible */}
            <div className="space-y-1.5">
              <Label className="text-xs">Cible diplomatique *</Label>
              <Select value={selectedTargetId} onValueChange={(v) => {
                setSelectedTargetId(v);
                setSelectedPlanId(""); // Reset plan quand la cible change
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner une cible..." />
                </SelectTrigger>
                <SelectContent>
                  {eligibleTargets?.map((t) => (
                    <SelectItem key={t._id} value={t._id}>
                      {t.name}
                      {t.sector && ` — ${t.sector}`}
                      {t.pipelinePhase && ` (${t.pipelinePhase})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selection du plan lie */}
            {selectedTargetId && filteredPlans && filteredPlans.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Plan strategique lie (optionnel)</Label>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionner un plan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredPlans.map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {/* Format de lettre */}
              <div className="space-y-1.5">
                <Label className="text-xs">Format</Label>
                <Select value={letterFormat} onValueChange={setLetterFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal_letter">Lettre officielle</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="note_verbale">Note verbale</SelectItem>
                    <SelectItem value="invitation">Invitation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Nom de l'ambassadeur */}
              <div className="space-y-1.5">
                <Label className="text-xs">Ambassadeur (optionnel)</Label>
                <Input
                  value={ambassadorName}
                  onChange={(e) => setAmbassadorName(e.target.value)}
                  placeholder="S.E.M. ..."
                />
              </div>
            </div>

            {/* Objet / But */}
            <div className="space-y-1.5">
              <Label className="text-xs">Objet de la lettre *</Label>
              <Input
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Ex: Invitation a un rendez-vous de prospection economique"
              />
            </div>
          </div>
        }
        resultView={
          draftResult ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-success/5 border border-success/20 p-4">
                <p className="text-sm font-medium mb-1">
                  {draftResult.subject}
                </p>
                <Badge variant="outline" className="text-[9px] mb-2">
                  {FORMAT_LABEL[letterFormat] ?? letterFormat} •{" "}
                  {draftResult.type}
                </Badge>
                <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-12">
                  {draftResult.content}
                </p>
              </div>

              {/* Details de reunion si presents */}
              {draftResult.meetingDetails && (
                <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                  <p className="text-xs font-medium">Details de reunion proposes</p>
                  {draftResult.meetingDetails.proposedDate && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {draftResult.meetingDetails.proposedDate}
                    </div>
                  )}
                  {draftResult.meetingDetails.proposedLocation && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {draftResult.meetingDetails.proposedLocation}
                    </div>
                  )}
                  {draftResult.meetingDetails.agenda &&
                    draftResult.meetingDetails.agenda.length > 0 && (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <ListChecks className="h-3 w-3" />
                          Ordre du jour :
                        </div>
                        <ul className="ml-5 space-y-0.5">
                          {draftResult.meetingDetails.agenda.map((item, i) => (
                            <li
                              key={i}
                              className="text-[10px] text-muted-foreground"
                            >
                              {i + 1}. {typeof item === "string" ? item : (item as { title?: string }).title ?? JSON.stringify(item)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              )}

              <div className="flex items-center gap-1 text-[10px] text-primary">
                <Sparkles className="h-3 w-3" />
                Lettre generee par l'IA — Phase cible avancee a "Contact"
              </div>
            </div>
          ) : null
        }
      />
    </div>
  );
}
