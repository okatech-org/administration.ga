import { cn } from "@workspace/ui/lib/utils";
import { Clock, MessageSquare, User } from "lucide-react";

interface WorkflowStep {
  id: string;
  action: string;
  actorName?: string;
  targetName?: string;
  comment?: string;
  timestamp: number;
}

interface WorkflowTimelineProps {
  steps: WorkflowStep[];
}

const ACTION_CONFIG: Record<string, { label: string; color: string }> = {
  CREATED: { label: "Créé", color: "bg-green-500" },
  creer: { label: "Créé", color: "bg-green-500" },
  SENT_FOR_APPROVAL: { label: "Soumis pour approbation", color: "bg-blue-500" },
  soumettre: { label: "Soumis pour approbation", color: "bg-blue-500" },
  APPROVED: { label: "Approuvé", color: "bg-emerald-500" },
  valider: { label: "Approuvé", color: "bg-emerald-500" },
  REJECTED: { label: "Rejeté", color: "bg-red-500" },
  rejeter: { label: "Rejeté", color: "bg-red-500" },
  TRANSMITTED: { label: "Transmis", color: "bg-primary" },
  transmettre: { label: "Transmis", color: "bg-primary" },
  SENT_EMAIL: { label: "Envoyé par email", color: "bg-sky-500" },
  ARCHIVED: { label: "Archivé", color: "bg-amber-500" },
  archiver: { label: "Archivé", color: "bg-amber-500" },
  VIEWED: { label: "Consulté", color: "bg-gray-500" },
  retourner: { label: "Renvoyé", color: "bg-orange-500" },
  suspendre: { label: "Suspendu", color: "bg-yellow-500" },
  reprendre: { label: "Repris", color: "bg-green-500" },
  signer: { label: "Signé", color: "bg-primary" },
  clore: { label: "Clôturé", color: "bg-zinc-500" },
  commenter: { label: "Commentaire", color: "bg-gray-500" },
};

const rtf = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = timestamp - now;
  const diffSeconds = Math.round(diffMs / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);
  const diffWeeks = Math.round(diffDays / 7);
  const diffMonths = Math.round(diffDays / 30);

  if (Math.abs(diffSeconds) < 60) return rtf.format(diffSeconds, "second");
  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, "minute");
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");
  if (Math.abs(diffDays) < 7) return rtf.format(diffDays, "day");
  if (Math.abs(diffWeeks) < 5) return rtf.format(diffWeeks, "week");
  return rtf.format(diffMonths, "month");
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] ?? { label: action, color: "bg-gray-400" };
}

export function WorkflowTimeline({ steps }: WorkflowTimelineProps) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="relative flex flex-col gap-0">
      {steps.map((step, index) => {
        const { label, color } = getActionConfig(step.action);
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="relative flex gap-3 pb-6 last:pb-0">
            {/* Vertical line */}
            {!isLast && (
              <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gray-200" />
            )}

            {/* Dot */}
            <div
              className={cn(
                "relative z-10 mt-1 h-6 w-6 shrink-0 rounded-full border-2 border-white shadow-sm",
                color,
              )}
            />

            {/* Content */}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {label}
                </span>
                {step.targetName && (
                  <span className="text-xs text-gray-500">
                    → {step.targetName}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                {step.actorName && (
                  <span className="flex items-center gap-1">
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[10px] font-medium text-gray-600"
                      title={step.actorName}
                    >
                      {getInitials(step.actorName)}
                    </span>
                    <span>{step.actorName}</span>
                  </span>
                )}
                {!step.actorName && (
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    <span>Système</span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{getRelativeTime(step.timestamp)}</span>
                </span>
              </div>

              {step.comment && (
                <div className="mt-1 flex items-start gap-1.5 rounded-md bg-gray-50 p-2 text-xs text-gray-600">
                  <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-gray-400" />
                  <span>{step.comment}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
