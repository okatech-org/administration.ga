/**
 * Phase 3 : Lettres — Correspondance officielle et invitations
 */

import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, Plus, Sparkles, Loader2, FileDown } from "lucide-react";
import { useOrg } from "@/components/org/org-provider";
import { AIActionButton } from "@/components/diplomatic/AIActionPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute(
  "/_app/affaires-diplomatiques/lettres",
)({
  component: LettresPhase,
});

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft: { label: "Brouillon", color: "bg-zinc-500/15 text-zinc-400" },
  pending_approval: {
    label: "En attente",
    color: "bg-amber-500/15 text-amber-400",
  },
  approved: { label: "Approuvé", color: "bg-blue-500/15 text-blue-400" },
  sent: { label: "Envoyé", color: "bg-emerald-500/15 text-emerald-400" },
  responded: { label: "Répondu", color: "bg-cyan-500/15 text-cyan-400" },
  archived: { label: "Archivé", color: "bg-zinc-500/15 text-zinc-400" },
};

const FORMAT_LABEL: Record<string, string> = {
  formal_letter: "Lettre officielle",
  email: "Email",
  note_verbale: "Note verbale",
  invitation: "Invitation",
};

function LettresPhase() {
  const { activeOrgId } = useOrg();

  const { data: letters, isPending } = useAuthenticatedConvexQuery(
    api.functions.diplomaticAffairs.listLetters,
    activeOrgId ? { orgId: activeOrgId } : "skip",
  );

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
          label="Rédiger une lettre"
          icon={Sparkles}
          onClick={() =>
            toast.info(
              "Sélectionnez d'abord une cible avec un plan stratégique",
            )
          }
        />
      </div>

      {/* Liste des lettres */}
      {!letters || letters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-cyan-500/60" />
          </div>
          <h3 className="text-lg font-semibold mb-1">
            Aucune lettre de contact
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Rédigez des courriers formels à destination de vos cibles
            diplomatiques et partenaires.
          </p>
          <Button disabled className="gap-1.5">
            <Sparkles className="h-4 w-4" />
            Rédiger une lettre
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {letters.map((letter) => {
            const status =
              STATUS_LABEL[letter.status] ?? STATUS_LABEL.draft;
            return (
              <Card
                key={letter._id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="flex items-center gap-4 py-3">
                  <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5 text-cyan-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {letter.subject}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {letter.reference} • À : {letter.recipientName}
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
                    {letter.status === "approved" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() => toast.info("Export PDF bientôt disponible")}
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        PDF
                      </Button>
                    )}
                    <Badge className={cn("text-[9px]", status.color)}>
                      {status.label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
