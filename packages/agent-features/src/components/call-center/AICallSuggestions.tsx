"use client";

import type { Id } from "@convex/_generated/dataModel";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";

type SuggestionKind = "suggestion" | "reference" | "action";

interface Suggestion {
  kind: SuggestionKind;
  text: string;
  applyLabel?: string;
}

const KIND_LABEL: Record<SuggestionKind, string> = {
  suggestion: "Suggestion",
  reference: "Référence",
  action: "Action",
};

/**
 * AICallSuggestions — panneau "Assistant Diplomate" pendant l'appel.
 *
 * Sprint 1 : UI + données placeholder. La génération réelle (transcription
 * temps réel + LLM) est branchée dans une tâche distincte.
 */
export function AICallSuggestions({
  meetingId: _meetingId,
  citizenName,
}: {
  meetingId: Id<"meetings">;
  citizenName: string;
}) {
  const { t } = useTranslation();

  // TODO: brancher sur transcription LiveKit + suggestions LLM côté Convex action.
  const suggestions: Suggestion[] = [
    {
      kind: "suggestion",
      text: t(
        "callCenter.aiAssist.placeholderSuggestion",
        "Proposer un RDV en agence — créneau libre disponible cette semaine.",
      ),
      applyLabel: t("callCenter.aiAssist.apply", "Appliquer"),
    },
    {
      kind: "reference",
      text: t(
        "callCenter.aiAssist.placeholderReference",
        "Vérifiez le dossier dans le panneau de droite pour les références utiles.",
      ),
    },
    {
      kind: "action",
      text: t("callCenter.aiAssist.placeholderAction", "Préparer un récap email post-appel pour {{name}}.", {
        name: citizenName,
      }),
      applyLabel: t("callCenter.aiAssist.apply", "Appliquer"),
    },
  ];

  return (
    <div className="flex flex-col gap-2 overflow-y-auto pr-1 -mr-1">
      <div className="flex items-start gap-2 rounded-lg bg-secondary/40 px-3 py-2 text-[11.5px] text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
        <span>
          {t(
            "callCenter.aiAssist.disclaimer",
            "Suggestions IA — seront enrichies par la transcription en temps réel.",
          )}
        </span>
      </div>
      {suggestions.map((s, i) => (
        <div
          key={i}
          className="grid grid-cols-[auto_1fr_auto] items-start gap-2.5 rounded-xl border bg-card p-3"
        >
          <Badge
            variant="outline"
            className="h-5 px-2 text-[10px] font-medium border-primary/30 text-primary bg-primary/5 shrink-0"
          >
            {KIND_LABEL[s.kind]}
          </Badge>
          <p className="text-[12.5px] leading-[1.45] text-foreground/90">
            {s.text}
          </p>
          {s.applyLabel && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] text-primary hover:bg-primary/10"
              disabled
            >
              {s.applyLabel}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
