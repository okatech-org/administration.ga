import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Clock,
  ExternalLink,
  FileText,
  UserCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/my-space/flat-card";
import { cn } from "@/lib/utils";

// ─── Status styling ───────────────────────────────────────────
function getStatusBadgeConfig(status?: string) {
  switch (status) {
    case "Completed":
    case "Approved":
      return { className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20", label: status };
    case "Rejected":
      return { className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20", label: status };
    case "Processing":
    case "InReview":
      return { className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", label: status };
    case "Pending":
    case "Draft":
    default:
      return { className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20", label: status ?? "Inconnu" };
  }
}

// ─── Props ────────────────────────────────────────────────────
export interface ProfileRequestsCardProps {
  requests: any[];
  context: "admin" | "agent";
  basePath?: string;
  onAssign?: (requestId: string) => void;
}

/**
 * Tableau compact des demandes d'un profil.
 * Tri par date decroissante, avec actions contextuelles.
 */
export function ProfileRequestsCard({
  requests,
  context,
  basePath = "/admin/requests",
  onAssign,
}: ProfileRequestsCardProps) {
  // Tri par date decroissante
  const sortedRequests = [...requests].sort((a, b) => {
    const dateA = a.submittedAt || a._creationTime || 0;
    const dateB = b.submittedAt || b._creationTime || 0;
    return dateB - dateA;
  });

  return (
    <FlatCard>
      <div className="pb-2 pt-3 px-4">
        <div className="text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10">
              <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            Demandes
          </div>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {requests.length}
          </Badge>
        </div>
      </div>

      <div className="p-0 pt-0">
        {sortedRequests.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground px-4">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-[12px]">Aucune demande</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] text-left">
              <thead className="text-[10px] text-muted-foreground uppercase bg-muted/40 border-y border-border/50">
                <tr>
                  <th className="px-3 py-2 font-semibold">Reference</th>
                  <th className="px-3 py-2 font-semibold">Service</th>
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Statut</th>
                  <th className="px-3 py-2 font-semibold w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {sortedRequests.map((req) => {
                  const statusConfig = getStatusBadgeConfig(req.status);
                  const requestDate = req.submittedAt || req._creationTime;
                  const serviceName =
                    req.serviceName?.fr ?? req.service?.name?.fr ?? req.service?.name ?? "Service";

                  return (
                    <tr
                      key={req._id}
                      className="bg-card hover:bg-muted/30 transition-colors"
                    >
                      {/* Reference (lien) */}
                      <td className="px-3 py-2.5 font-mono font-medium">
                        {req.reference ? (
                          <Link
                            href={`${basePath}/${req.reference}`}
                            className="text-primary hover:underline"
                          >
                            {req.reference}
                          </Link>
                        ) : (
                          "\u2014"
                        )}
                      </td>

                      {/* Service */}
                      <td className="px-3 py-2.5 max-w-[150px] truncate" title={serviceName}>
                        {serviceName}
                      </td>

                      {/* Date */}
                      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {requestDate
                            ? format(new Date(requestDate), "dd MMM yyyy", { locale: fr })
                            : "\u2014"}
                        </span>
                      </td>

                      {/* Statut */}
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", statusConfig.className)}>
                          {statusConfig.label}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          {req.reference && (
                            <Button variant="ghost" size="icon" asChild className="h-6 w-6">
                              <Link
                                href={`${basePath}/${req.reference}`}
                                title="Voir"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            </Button>
                          )}
                          {context === "agent" && req.status === "Pending" && onAssign && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 hover:bg-teal-500/10"
                              onClick={() => onAssign(req._id)}
                              title="Traiter"
                            >
                              <UserCheck className="h-3 w-3 text-teal-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </FlatCard>
  );
}
