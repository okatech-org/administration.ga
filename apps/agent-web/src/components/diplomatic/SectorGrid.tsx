/**
 * Vue d'ensemble des dossiers opérateurs groupés par secteur.
 * Accessible depuis l'onglet "Vue d'ensemble" des affaires diplomatiques.
 */

import { api } from "@convex/_generated/api";
import Link from "next/link";
import {
  FolderOpen,
  FileText,
  Loader2,
  Building2,
  Target,
} from "lucide-react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { FlatCard } from "@/components/my-space/flat-card";
import { useOrg } from "@/components/org/org-provider";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";

const PHASE_LABEL: Record<string, { label: string; className: string }> = {
  targeting: { label: "Ciblage", className: "bg-primary/10 text-primary" },
  strategy: { label: "Stratégie", className: "bg-warning/10 text-warning" },
  outreach: { label: "Contact", className: "bg-success/10 text-success" },
  reporting: { label: "Rapport", className: "bg-destructive/10 text-destructive" },
  project: { label: "Projet", className: "bg-primary/10 text-primary" },
};

export function SectorGrid() {
  const { activeOrgId } = useOrg();

  const { data, isPending } = useAuthenticatedConvexQuery(
    api.functions.diplomaticFolders.listOperatorFolders,
    activeOrgId ? { orgId: activeOrgId } : "skip",
  );

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.totalFolders === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <FolderOpen className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">
          Aucun dossier opérateur créé.
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Les dossiers sont créés automatiquement lors de l'identification de nouvelles cibles.
        </p>
      </div>
    );
  }

  const { sectors, totalFolders, totalDocuments } = data;

  return (
    <div className="space-y-6">
      {/* Résumé */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Building2 className="h-3.5 w-3.5" />
          {Object.keys(sectors).length} secteur{Object.keys(sectors).length > 1 ? "s" : ""}
        </span>
        <span>·</span>
        <span>{totalFolders} opérateur{totalFolders > 1 ? "s" : ""}</span>
        <span>·</span>
        <span>{totalDocuments} document{totalDocuments > 1 ? "s" : ""}</span>
      </div>

      {/* Grille par secteur */}
      {Object.entries(sectors).map(([sectorName, folders], idx) => (
        <motion.div
          key={sectorName}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: idx * 0.05 }}
        >
          <div className="mb-2">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              {sectorName}
              <Badge variant="secondary" className="text-[9px]">
                {folders.length}
              </Badge>
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {folders.map((folder) => {
              const phase = folder.pipelinePhase
                ? PHASE_LABEL[folder.pipelinePhase]
                : null;

              return (
                <Link
                  key={folder.folderId}
                  href={`/affaires-diplomatiques/${folder.targetId ?? ""}`}
                >
                  <FlatCard className="hover:bg-muted/30 transition-colors cursor-pointer">
                    <div className="p-3 lg:p-4">
                      <p className="text-sm font-medium truncate" title={folder.name}>
                        {folder.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {phase && (
                          <Badge className={`text-[8px] ${phase.className}`}>
                            {phase.label}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {folder.documentCount} doc{folder.documentCount > 1 ? "s" : ""}
                        </span>
                        {folder.opportunityScore != null && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Target className="h-3 w-3" />
                            {folder.opportunityScore}%
                          </span>
                        )}
                      </div>
                    </div>
                  </FlatCard>
                </Link>
              );
            })}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
