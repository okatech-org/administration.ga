import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import {
  Activity,
  Brain,
  BarChart3,
  Waves,
  Zap,
  History,
  Shield,
  TrendingUp,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function NeocortexMonitoringWidget() {
  const data = useQuery(api.monitoring.getDashboardData);

  if (!data) {
    return <Skeleton className="w-full h-[300px] rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold flex items-center gap-2">
        <Brain className="w-6 h-6 text-purple-500" />
        Monitoring NEOCORTEX
      </h3>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Santé */}
        <FlatCard
          className={
            data.sante.status === "DEGRADED"
              ? "border border-red-500"
              : "border border-green-500"
          }
        >
          <div className="p-3 lg:p-4">
            <div className="text-sm font-medium flex items-center justify-between mb-2">
              Etat global
              <Shield className="w-4 h-4 text-muted-foreground" />
            </div>
            <div
              className={`text-2xl font-bold ${data.sante.status === "DEGRADED" ? "text-red-500" : "text-green-500"}`}
            >
              {data.sante.status}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              File d'attente: {data.sante.queueCount} signaux
            </p>
          </div>
        </FlatCard>

        {/* Volume 24h */}
        <FlatCard>
          <div className="p-3 lg:p-4">
            <div className="text-sm font-medium flex items-center justify-between mb-2">
              Activite 24h
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">
              {data.totalSignaux24h ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              signaux emis |{" "}
              {data.totalActions24h ?? 0} actions tracees
            </p>
          </div>
        </FlatCard>

        {/* Hippocampe */}
        <FlatCard>
          <div className="p-3 lg:p-4">
            <div className="text-sm font-medium flex items-center justify-between mb-2">
              Hippocampe (Memoire)
              <History className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">
              {data.actionsRecentes.length} recentes
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Derniere: {data.actionsRecentes[0]?.action ?? "Aucune"}
            </p>
          </div>
        </FlatCard>

        {/* Plasticite */}
        <FlatCard>
          <div className="p-3 lg:p-4">
            <div className="text-sm font-medium flex items-center justify-between mb-2">
              Plasticite (Apprentissage)
              <Waves className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">
              {data.poidsAdaptatifs.length} poids
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Taux lissage: 0.15 (alpha)
            </p>
          </div>
        </FlatCard>
      </div>

      {/* Detail Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Signal Types (24h) */}
        <FlatCard>
          <div className="p-3 lg:p-4">
            <SectionHeader
              icon={<Zap className="h-3.5 w-3.5" />}
              iconBgClass="bg-yellow-500/10"
              iconTextClass="text-yellow-500"
              title="Top signaux (24h)"
            />
            {data.topSignalTypes && data.topSignalTypes.length > 0 ? (
              <div className="space-y-2">
                {data.topSignalTypes.map(
                  (st: { type: string; count: number }) => (
                    <div
                      key={st.type}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-mono text-xs truncate max-w-[200px]">
                        {st.type}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {st.count}
                      </span>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun signal dans les dernieres 24h
              </p>
            )}
          </div>
        </FlatCard>

        {/* Actions par categorie */}
        <FlatCard>
          <div className="p-3 lg:p-4">
            <SectionHeader
              icon={<BarChart3 className="h-3.5 w-3.5" />}
              iconBgClass="bg-blue-500/10"
              iconTextClass="text-blue-500"
              title="Actions par categorie (24h)"
            />
            {data.actionCounts &&
            Object.keys(data.actionCounts).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(
                  data.actionCounts as Record<string, number>,
                ).map(([cat, count]) => (
                  <div
                    key={cat}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          cat === "METIER"
                            ? "bg-blue-500"
                            : cat === "UTILISATEUR"
                              ? "bg-green-500"
                              : cat === "SECURITE"
                                ? "bg-red-500"
                                : "bg-gray-500"
                        }`}
                      />
                      {cat}
                    </span>
                    <span className="font-semibold tabular-nums">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucune action tracee dans les dernieres 24h
              </p>
            )}
          </div>
        </FlatCard>
      </div>

      {/* Recent Actions Log */}
      {data.actionsRecentes.length > 0 && (
        <FlatCard>
          <div className="p-3 lg:p-4">
            <SectionHeader
              icon={<Activity className="h-3.5 w-3.5" />}
              iconBgClass="bg-purple-500/10"
              iconTextClass="text-purple-500"
              title="Dernieres actions (Hippocampe)"
            />
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {data.actionsRecentes.slice(0, 10).map((action: { _id: string; action: string; categorie: string; entiteType: string }) => (
                <div
                  key={action._id}
                  className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        action.categorie === "METIER"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                          : action.categorie === "SECURITE"
                            ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {action.categorie}
                    </span>
                    <span className="font-mono truncate">{action.action}</span>
                  </div>
                  <span className="text-muted-foreground whitespace-nowrap ml-2">
                    {action.entiteType}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </FlatCard>
      )}
    </div>
  );
}
