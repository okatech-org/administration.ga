"use client";

import { Sparkles, X } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Badge } from "@workspace/ui/components/badge";
import { useConvexMutationQuery } from "@workspace/api/hooks";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { toast } from "sonner";

type Suggestion = Doc<"aiSuggestions">;

interface Props {
  suggestion: Suggestion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRIORITY_COLORS: Record<Suggestion["priority"], string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-accent text-accent-foreground",
  high: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  urgent: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

export function SuggestionDetailsDrawer({
  suggestion,
  open,
  onOpenChange,
}: Props) {
  const accept = useConvexMutationQuery(api.ai.suggestions.markAccepted);
  const dismiss = useConvexMutationQuery(api.ai.suggestions.markDismissed);

  if (!suggestion) return null;

  const handleAccept = async (actionIndex?: number) => {
    await accept.mutateAsync({
      suggestionId: suggestion._id as Id<"aiSuggestions">,
      resolvedActionIndex: actionIndex,
    });
    toast.success("Suggestion appliquée");
    onOpenChange(false);
  };

  const handleDismiss = async () => {
    await dismiss.mutateAsync({
      suggestionId: suggestion._id as Id<"aiSuggestions">,
    });
    toast("Suggestion rejetée");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <SheetTitle>{suggestion.title}</SheetTitle>
            <Badge
              variant="outline"
              className={PRIORITY_COLORS[suggestion.priority]}
            >
              {suggestion.priority}
            </Badge>
          </div>
          <SheetDescription>
            Capability: {suggestion.capabilityCode} — Modèle: {suggestion.model}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4 px-4">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {suggestion.body}
          </div>

          {suggestion.metadata !== undefined && (
            <details className="rounded-md border bg-muted/30 p-3 text-xs">
              <summary className="cursor-pointer select-none font-medium">
                Détails (JSON)
              </summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words">
                {JSON.stringify(suggestion.metadata, null, 2)}
              </pre>
            </details>
          )}

          <div className="flex flex-col gap-2 border-t pt-4">
            {suggestion.proposedActions.map((action, idx) => (
              <Button
                key={idx}
                variant={action.variant === "destructive" ? "destructive" : "default"}
                onClick={() => handleAccept(idx)}
                disabled={accept.isPending}
              >
                {action.label}
              </Button>
            ))}
            <Button
              variant="ghost"
              onClick={handleDismiss}
              disabled={dismiss.isPending}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Rejeter
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
