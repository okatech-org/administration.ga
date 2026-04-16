"use client";

import { ChevronDown, PhoneIncoming } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Id } from "@convex/_generated/dataModel";
import type { CallCardData } from "./CallCard";
import { IncomingCallQueue } from "./IncomingCallQueue";
import { cn } from "@/lib/utils";

type QueueItem = CallCardData & {
  callLineId: string | null;
  lineLabel: string | null;
};

/**
 * Bandeau collapsible "File d'attente (N)" — affiché au-dessus de la vue
 * de conversation pendant un appel actif. Réduit par défaut pour garder
 * l'attention de l'agent sur l'appel en cours, dépliable d'un clic.
 */
export function CollapsibleQueueBar({
  calls,
  focusedMeetingId,
  pickingUpId,
  onPickup,
  onDecline,
  onFocus,
}: {
  calls: QueueItem[];
  focusedMeetingId: Id<"meetings"> | null;
  pickingUpId: Id<"meetings"> | null;
  onPickup: (id: Id<"meetings">) => void;
  onDecline: (id: Id<"meetings">) => void;
  onFocus: (id: Id<"meetings">) => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const urgentCount = calls.filter((c) => c.priority === "urgent").length;

  return (
    <div className="shrink-0 border-b bg-muted/10">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between px-4 py-2 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex items-center gap-2">
          <PhoneIncoming className="h-3.5 w-3.5 text-muted-foreground" />
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("callCenter.queue.title")}
          </h4>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
            {calls.length}
          </span>
          {urgentCount > 0 && (
            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold text-destructive">
              {urgentCount} urgent{urgentCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded && (
        <div className="max-h-[40vh] overflow-y-auto border-t">
          <IncomingCallQueue
            calls={calls}
            focusedMeetingId={focusedMeetingId}
            pickingUpId={pickingUpId}
            onPickup={onPickup}
            onDecline={onDecline}
            onFocus={onFocus}
          />
        </div>
      )}
    </div>
  );
}
