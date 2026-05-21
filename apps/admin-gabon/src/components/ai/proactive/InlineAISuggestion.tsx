"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@/lib/utils";
import { useOrg } from "@/components/org/org-provider";
import { useProactiveAISuggestions } from "./useAIPresence";
import { SuggestionDetailsDrawer } from "./SuggestionDetailsDrawer";
import type { Doc } from "@convex/_generated/dataModel";

type Suggestion = Doc<"aiSuggestions">;

interface Props {
  targetType: string;
  targetId: string | undefined;
  className?: string;
}

/**
 * Badge inline propose par l'IA sur une entite (request, document, etc.).
 * Affiche un bouton subtile « Suggestion IA » quand une suggestion pending
 * existe pour cette cible. Au clic → ouvre un drawer avec les details.
 */
export function InlineAISuggestion({ targetType, targetId, className }: Props) {
  const { activeOrgId } = useOrg();
  const suggestions = useProactiveAISuggestions(
    activeOrgId ?? undefined,
    targetType,
    targetId,
  );
  const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(
    null,
  );

  if (!suggestions.data || suggestions.data.length === 0) return null;

  const topSuggestion = suggestions.data[0] as Suggestion | undefined;
  if (!topSuggestion) return null;

  const urgencyDot =
    topSuggestion.priority === "urgent"
      ? "bg-rose-500"
      : topSuggestion.priority === "high"
        ? "bg-amber-500"
        : "bg-primary";

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setActiveSuggestion(topSuggestion)}
        className={cn("gap-2 text-xs", className)}
      >
        <span className={cn("h-2 w-2 rounded-full", urgencyDot)} />
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="hidden sm:inline">{topSuggestion.title}</span>
        <span className="sm:hidden">Suggestion IA</span>
        {suggestions.data.length > 1 && (
          <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
            +{suggestions.data.length - 1}
          </Badge>
        )}
      </Button>

      <SuggestionDetailsDrawer
        suggestion={activeSuggestion}
        open={activeSuggestion !== null}
        onOpenChange={(open) => !open && setActiveSuggestion(null)}
      />
    </>
  );
}
