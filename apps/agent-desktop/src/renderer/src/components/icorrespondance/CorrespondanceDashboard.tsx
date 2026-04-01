/**
 * CorrespondanceDashboard — Dashboard with stats, activity feed, and quick actions.
 */

import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Clock,
  Folder,
  Mail,
  Plus,
  Send,
  User,
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardStats {
  correspondance: {
    total: number;
    byStatus: Record<string, number>;
    overdue: number;
    pendingApprovals: number;
  };
  dossiers: {
    total: number;
    byStatus: Record<string, number>;
    overdue: number;
    myDossiers: number;
  };
}

interface ActivityItem {
  type: string;
  action: string;
  actorName: string;
  comment?: string;
  timestamp: number;
  itemReference: string;
  itemTitle: string;
}

interface DashboardProps {
  stats: DashboardStats;
  recentActivity: ActivityItem[];
  onNavigateCorrespondance: () => void;
  onNavigateDossiers: () => void;
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTION_BADGE_STYLES: Record<string, string> = {
  created: "bg-emerald-500/15 text-emerald-400",
  approved: "bg-green-500/15 text-green-400",
  rejected: "bg-red-500/15 text-red-400",
  transferred: "bg-blue-500/15 text-blue-400",
  commented: "bg-sky-500/15 text-sky-400",
  updated: "bg-amber-500/15 text-amber-400",
  archived: "bg-zinc-500/15 text-zinc-400",
};

const ACTION_LABELS: Record<string, string> = {
  created: "Cree",
  approved: "Approuve",
  rejected: "Rejete",
  transferred: "Transfere",
  commented: "Commente",
  updated: "Mis a jour",
  archived: "Archive",
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.35, ease: "easeOut" as const },
  }),
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
  index,
  isLoading,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  index: number;
  isLoading?: boolean;
}) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="relative overflow-hidden border border-border/50 bg-card rounded-xl">
        <div className="flex items-center gap-4 p-5">
          <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", colorClass)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            {isLoading ? (
              <div className="mb-1 h-7 w-16 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{value}</p>
            )}
            <p className="truncate text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ActivityFeed({
  items,
  isLoading,
}: {
  items: ActivityItem[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="h-8 w-8 shrink-0 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
              <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Clock className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Aucune activite recente</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <motion.div
          key={`${item.itemReference}-${item.timestamp}`}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          className="group flex gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/50"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{item.actorName}</span>
              <span className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                ACTION_BADGE_STYLES[item.action] ?? "bg-muted text-muted-foreground",
              )}>
                {ACTION_LABELS[item.action] ?? item.action}
              </span>
            </div>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              <span className="font-medium text-foreground/80">{item.itemReference}</span>
              {" -- "}{item.itemTitle}
            </p>
            {item.comment && (
              <p className="mt-1 truncate text-xs italic text-muted-foreground/70">
                &ldquo;{item.comment}&rdquo;
              </p>
            )}
            <p className="mt-1 text-[11px] text-muted-foreground/60">
              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: fr })}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function QuickActions({
  onNavigateCorrespondance,
  onNavigateDossiers,
}: {
  onNavigateCorrespondance: () => void;
  onNavigateDossiers: () => void;
}) {
  const actions = [
    {
      label: "Nouvelle correspondance",
      icon: Plus,
      onClick: onNavigateCorrespondance,
      colorClass: "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20",
    },
    {
      label: "Nouveau dossier",
      icon: Folder,
      onClick: onNavigateDossiers,
      colorClass: "bg-violet-500/10 text-violet-400 hover:bg-violet-500/20",
    },
    {
      label: "Registre entrant",
      icon: Mail,
      onClick: onNavigateCorrespondance,
      colorClass: "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
    },
    {
      label: "Registre sortant",
      icon: Send,
      onClick: onNavigateCorrespondance,
      colorClass: "bg-sky-500/10 text-sky-400 hover:bg-sky-500/20",
    },
  ];

  return (
    <div className="grid gap-2">
      {actions.map((action, i) => (
        <motion.div
          key={action.label}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08, duration: 0.3 }}
        >
          <button
            onClick={action.onClick}
            className={cn(
              "flex h-auto w-full items-center justify-start gap-3 rounded-lg border border-border/50 p-4 transition-all",
              action.colorClass,
            )}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background/80">
              <action.icon className="h-4 w-4" />
            </div>
            <span className="flex-1 text-left text-sm font-medium">{action.label}</span>
            <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        </motion.div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CorrespondanceDashboard({
  stats,
  recentActivity,
  onNavigateCorrespondance,
  onNavigateDossiers,
  isLoading,
}: DashboardProps) {
  const statCards = [
    {
      label: "Total correspondances",
      value: stats.correspondance.total,
      icon: Mail,
      colorClass: "bg-indigo-500/15 text-indigo-400",
    },
    {
      label: "En attente d'approbation",
      value: stats.correspondance.pendingApprovals,
      icon: Clock,
      colorClass: "bg-amber-500/15 text-amber-400",
    },
    {
      label: "Dossiers en cours",
      value: stats.dossiers.myDossiers,
      icon: Folder,
      colorClass: "bg-violet-500/15 text-violet-400",
    },
    {
      label: "En retard",
      value: stats.correspondance.overdue + stats.dossiers.overdue,
      icon: AlertTriangle,
      colorClass: "bg-red-500/15 text-red-400",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
            colorClass={card.colorClass}
            index={i}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Recent Activity */}
        <div className="border border-border/50 bg-card rounded-xl lg:col-span-2">
          <div className="px-6 pt-6 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">Activite recente</h3>
                <p className="text-sm text-muted-foreground">
                  Dernieres actions sur les correspondances et dossiers
                </p>
              </div>
              <BookOpen className="h-5 w-5 text-muted-foreground/50" />
            </div>
          </div>
          <div className="px-6 pb-6">
            <ActivityFeed items={recentActivity} isLoading={isLoading} />
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="border border-border/50 bg-card rounded-xl">
          <div className="px-6 pt-6 pb-3">
            <h3 className="text-base font-semibold text-foreground">Actions rapides</h3>
            <p className="text-sm text-muted-foreground">
              Acces direct aux operations courantes
            </p>
          </div>
          <div className="px-6 pb-6">
            <QuickActions
              onNavigateCorrespondance={onNavigateCorrespondance}
              onNavigateDossiers={onNavigateDossiers}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Re-export as Dashboard for backward compatibility
export { CorrespondanceDashboard as Dashboard };
