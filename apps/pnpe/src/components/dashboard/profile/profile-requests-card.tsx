import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Clock, ExternalLink, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/my-space/flat-card";
import { cn } from "@/lib/utils";

function getStatusBadgeConfig(status?: string) {
  switch (status) {
    case "Completed":
    case "Approved":
      return {
        className: "bg-success-light text-success border-success/20",
        label: status,
      };
    case "Rejected":
      return {
        className: "bg-destructive-light text-destructive border-destructive/20",
        label: status,
      };
    case "Processing":
    case "InReview":
      return {
        className: "bg-primary/10 text-primary border-primary/20",
        label: status,
      };
    case "Pending":
    case "Draft":
    default:
      return {
        className: "bg-warning-light text-warning border-warning/20",
        label: status ?? "Inconnu",
      };
  }
}

export interface ProfileRequestsCardProps {
  requests: any[];
  context: "admin" | "agent";
  basePath?: string;
}

export function ProfileRequestsCard({
  requests,
  basePath = "/admin/requests",
}: ProfileRequestsCardProps) {
  const sortedRequests = [...requests].sort((a, b) => {
    const dateA = a.submittedAt || a._creationTime || 0;
    const dateB = b.submittedAt || b._creationTime || 0;
    return dateB - dateA;
  });

  return (
    <FlatCard>
      <div className="pb-2 pt-3 px-4">
        <div className="text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <FileText className="w-3.5 h-3.5 text-primary" />
            </div>
            Demandes
          </div>
          <Badge variant="secondary" className="text-xs">
            {requests.length}
          </Badge>
        </div>
      </div>

      <div className="p-0 pt-0">
        {sortedRequests.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground px-4">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-xs">Aucune demande</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-y border-border/50">
                <tr>
                  <th className="px-3 py-2 font-semibold">Reference</th>
                  <th className="px-3 py-2 font-semibold">Service</th>
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Statut</th>
                  <th className="px-3 py-2 font-semibold w-12">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {sortedRequests.map((req) => {
                  const statusConfig = getStatusBadgeConfig(req.status);
                  const requestDate = req.submittedAt || req._creationTime;
                  const serviceName =
                    req.serviceName?.fr ??
                    req.service?.name?.fr ??
                    req.service?.name ??
                    "Service";

                  return (
                    <tr
                      key={req._id}
                      className="bg-card hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-3 py-2.5 font-mono font-medium text-xs">
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

                      <td
                        className="px-3 py-2.5 max-w-[150px] truncate"
                        title={serviceName}
                      >
                        {serviceName}
                      </td>

                      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap text-xs">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {requestDate
                            ? format(new Date(requestDate), "dd MMM yyyy", {
                                locale: fr,
                              })
                            : "\u2014"}
                        </span>
                      </td>

                      <td className="px-3 py-2.5">
                        <Badge
                          variant="outline"
                          className={cn("text-xs", statusConfig.className)}
                        >
                          {statusConfig.label}
                        </Badge>
                      </td>

                      <td className="px-3 py-2.5">
                        {req.reference && (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="h-7 w-7"
                          >
                            <Link href={`${basePath}/${req.reference}`} title="Voir">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        )}
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
