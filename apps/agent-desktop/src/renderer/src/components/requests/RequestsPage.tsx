"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { RequestStatus } from "@convex/lib/constants";
import { getLocalized } from "@convex/lib/utils";
import type { LocalizedString, RequestStatus as RequestStatusType } from "@convex/lib/validators";
import { getValidNextStatuses } from "@convex/lib/requestWorkflow";
import { formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Calendar,
  Check,
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  Inbox,
  Kanban,
  LayoutList,
  Loader2,
  Search,
  Send,
  User,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useOrg } from "../../hooks/useOrg";
import {
  useAuthenticatedConvexQuery,
  useAuthenticatedPaginatedQuery,
  useConvexMutationQuery,
} from "../../hooks/useConvexHooks";
import { cn } from "../../lib/utils";

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Combobox } from "@workspace/ui/components/combobox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Progress } from "@workspace/ui/components/progress";
import { ScrollArea, ScrollBar } from "@workspace/ui/components/scroll-area";
import { Switch } from "@workspace/ui/components/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Textarea } from "@workspace/ui/components/textarea";

// ═════════════════════════════════════════════════════════════════
// useCanDoTask (inlined — no web-only hook available in desktop)
// ═════════════════════════════════════════════════════════════════

function useCanDoTask(orgId: Id<"orgs"> | undefined) {
  const { data: taskCodes, isPending } = useAuthenticatedConvexQuery(
    api.functions.permissions.getMyTasks,
    orgId ? { orgId } : "skip",
  );
  const canDo = (code: string) => !!taskCodes?.includes(code);
  return { canDo, isPending };
}

// ═════════════════════════════════════════════════════════════════
// Status configuration (list view)
// ═════════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<
  string,
  { i18nKey: string; color: string; bgClass: string; textClass: string }
> = {
  [RequestStatus.Draft]: {
    i18nKey: "dashboard.requests.statuses.draft",
    color: "slate",
    bgClass: "bg-slate-100 dark:bg-slate-800",
    textClass: "text-slate-700 dark:text-slate-300",
  },
  [RequestStatus.Submitted]: {
    i18nKey: "dashboard.requests.statuses.submitted",
    color: "blue",
    bgClass: "bg-blue-100 dark:bg-blue-900/40",
    textClass: "text-blue-700 dark:text-blue-300",
  },
  [RequestStatus.Pending]: {
    i18nKey: "dashboard.requests.statuses.pending",
    color: "amber",
    bgClass: "bg-amber-100 dark:bg-amber-900/40",
    textClass: "text-amber-700 dark:text-amber-300",
  },
  [RequestStatus.UnderReview]: {
    i18nKey: "dashboard.requests.statuses.under_review",
    color: "purple",
    bgClass: "bg-purple-100 dark:bg-purple-900/40",
    textClass: "text-purple-700 dark:text-purple-300",
  },
  [RequestStatus.InProduction]: {
    i18nKey: "dashboard.requests.statuses.in_production",
    color: "cyan",
    bgClass: "bg-cyan-100 dark:bg-cyan-900/40",
    textClass: "text-cyan-700 dark:text-cyan-300",
  },
  [RequestStatus.Validated]: {
    i18nKey: "dashboard.requests.statuses.validated",
    color: "emerald",
    bgClass: "bg-emerald-100 dark:bg-emerald-900/40",
    textClass: "text-emerald-700 dark:text-emerald-300",
  },
  [RequestStatus.Rejected]: {
    i18nKey: "dashboard.requests.statuses.rejected",
    color: "red",
    bgClass: "bg-red-100 dark:bg-red-900/40",
    textClass: "text-red-700 dark:text-red-300",
  },
  [RequestStatus.AppointmentScheduled]: {
    i18nKey: "dashboard.requests.statuses.appointment_scheduled",
    color: "teal",
    bgClass: "bg-teal-100 dark:bg-teal-900/40",
    textClass: "text-teal-700 dark:text-teal-300",
  },
  [RequestStatus.ReadyForPickup]: {
    i18nKey: "dashboard.requests.statuses.ready_for_pickup",
    color: "green",
    bgClass: "bg-green-100 dark:bg-green-900/40",
    textClass: "text-green-700 dark:text-green-300",
  },
  [RequestStatus.Completed]: {
    i18nKey: "dashboard.requests.statuses.completed",
    color: "emerald",
    bgClass: "bg-emerald-100 dark:bg-emerald-900/40",
    textClass: "text-emerald-700 dark:text-emerald-300",
  },
  [RequestStatus.Cancelled]: {
    i18nKey: "dashboard.requests.statuses.cancelled",
    color: "gray",
    bgClass: "bg-gray-100 dark:bg-gray-800",
    textClass: "text-gray-600 dark:text-gray-400",
  },
};

const STATUS_TABS: { key: string; labelKey: string }[] = [
  { key: "all", labelKey: "dashboard.requests.tabs.all" },
  ...[
    RequestStatus.Submitted,
    RequestStatus.Pending,
    RequestStatus.UnderReview,
    RequestStatus.InProduction,
    RequestStatus.Validated,
    RequestStatus.ReadyForPickup,
    RequestStatus.Completed,
    RequestStatus.Rejected,
    RequestStatus.Cancelled,
  ].map((key) => ({ key, labelKey: `dashboard.requests.statuses.${key}` })),
];

function getStatusConfig(status: string) {
  return (
    STATUS_CONFIG[status] ?? {
      i18nKey: `dashboard.requests.statuses.${status}`,
      color: "gray",
      bgClass: "bg-gray-100 dark:bg-gray-800",
      textClass: "text-gray-600 dark:text-gray-400",
    }
  );
}

// ═════════════════════════════════════════════════════════════════
// Status styling (detail view)
// ═════════════════════════════════════════════════════════════════

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  draft: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  submitted: {
    bg: "bg-blue-100 dark:bg-blue-900/40",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  pending: {
    bg: "bg-amber-100 dark:bg-amber-900/40",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  pending_completion: {
    bg: "bg-orange-100 dark:bg-orange-900/40",
    text: "text-orange-700 dark:text-orange-300",
    dot: "bg-orange-500",
  },
  edited: {
    bg: "bg-indigo-100 dark:bg-indigo-900/40",
    text: "text-indigo-700 dark:text-indigo-300",
    dot: "bg-indigo-500",
  },
  under_review: {
    bg: "bg-purple-100 dark:bg-purple-900/40",
    text: "text-purple-700 dark:text-purple-300",
    dot: "bg-purple-500",
  },
  in_production: {
    bg: "bg-cyan-100 dark:bg-cyan-900/40",
    text: "text-cyan-700 dark:text-cyan-300",
    dot: "bg-cyan-500",
  },
  validated: {
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  rejected: {
    bg: "bg-red-100 dark:bg-red-900/40",
    text: "text-red-700 dark:text-red-300",
    dot: "bg-red-500",
  },
  appointment_scheduled: {
    bg: "bg-teal-100 dark:bg-teal-900/40",
    text: "text-teal-700 dark:text-teal-300",
    dot: "bg-teal-500",
  },
  ready_for_pickup: {
    bg: "bg-green-100 dark:bg-green-900/40",
    text: "text-green-700 dark:text-green-300",
    dot: "bg-green-500",
  },
  completed: {
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  cancelled: {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-600 dark:text-gray-400",
    dot: "bg-gray-400",
  },
  processing: {
    bg: "bg-purple-100 dark:bg-purple-900/40",
    text: "text-purple-700 dark:text-purple-300",
    dot: "bg-purple-500",
  },
};

function getStatusStyle(status: string) {
  return (
    STATUS_STYLE[status] ?? {
      bg: "bg-gray-100 dark:bg-gray-800",
      text: "text-gray-600 dark:text-gray-400",
      dot: "bg-gray-400",
    }
  );
}

// ═════════════════════════════════════════════════════════════════
// Kanban column definitions
// ═════════════════════════════════════════════════════════════════

interface KanbanColumnDef {
  id: string;
  labelKey: string;
  icon: string;
  statuses: RequestStatus[];
  headerColor: string;
  dotColor: string;
}

const KANBAN_COLUMNS: KanbanColumnDef[] = [
  {
    id: "incoming",
    labelKey: "dashboard.requests.kanban.columns.incoming",
    icon: "",
    statuses: [RequestStatus.Draft, RequestStatus.Submitted, RequestStatus.Pending],
    headerColor:
      "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    dotColor: "bg-amber-400",
  },
  {
    id: "review",
    labelKey: "dashboard.requests.kanban.columns.review",
    icon: "",
    statuses: [RequestStatus.UnderReview],
    headerColor:
      "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800",
    dotColor: "bg-purple-400",
  },
  {
    id: "production",
    labelKey: "dashboard.requests.kanban.columns.production",
    icon: "",
    statuses: [
      RequestStatus.InProduction,
      RequestStatus.AppointmentScheduled,
      RequestStatus.Validated,
      RequestStatus.ReadyForPickup,
    ],
    headerColor:
      "bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800",
    dotColor: "bg-cyan-400",
  },
  {
    id: "done",
    labelKey: "dashboard.requests.kanban.columns.done",
    icon: "",
    statuses: [RequestStatus.Completed],
    headerColor:
      "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
    dotColor: "bg-emerald-400",
  },
  {
    id: "closed",
    labelKey: "dashboard.requests.kanban.columns.closed",
    icon: "",
    statuses: [RequestStatus.Rejected, RequestStatus.Cancelled],
    headerColor:
      "bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700",
    dotColor: "bg-gray-400",
  },
];

// ═════════════════════════════════════════════════════════════════
// Helpers
// ═════════════════════════════════════════════════════════════════

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "A l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days}j`;
  if (days < 30) return `il y a ${Math.floor(days / 7)}sem`;
  return new Date(timestamp).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.[0]?.toUpperCase() ?? "";
  const l = lastName?.[0]?.toUpperCase() ?? "";
  return f + l || "?";
}

/** Format a raw value for display */
function renderValue(value: unknown, lang: string): string {
  if (value === null || value === undefined || value === "") return "\u2014";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (Array.isArray(value))
    return value.map((v) => renderValue(v, lang)).join(", ");
  if (typeof value === "object") {
    if ("fr" in (value as object)) {
      return String(
        (value as Record<string, string>)[lang] ||
          (value as Record<string, string>).fr,
      );
    }
    return JSON.stringify(value);
  }
  const str = String(value);
  if (/^[A-Z]{2}$/.test(str)) {
    try {
      const name = new Intl.DisplayNames([lang], { type: "region" }).of(str);
      if (name) return name;
    } catch {
      /* fallback */
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    try {
      return new Date(str).toLocaleDateString(
        lang === "fr" ? "fr-FR" : "en-US",
        { day: "numeric", month: "long", year: "numeric" },
      );
    } catch {
      /* fallback */
    }
  }
  return str;
}

// Types for FormSchema
interface FormSchemaField {
  id: string;
  type?: string;
  label?: LocalizedString;
  description?: LocalizedString;
  options?: Array<{ value: string; label?: LocalizedString }>;
}

interface FormSchemaSection {
  id: string;
  title?: LocalizedString;
  description?: LocalizedString;
  fields?: FormSchemaField[];
}

interface FormSchema {
  sections?: FormSchemaSection[];
  joinedDocuments?: Array<{
    type: string;
    label: LocalizedString;
    required: boolean;
  }>;
  showRecap?: boolean;
}

// ═════════════════════════════════════════════════════════════════
// Main Exported Component
// ═════════════════════════════════════════════════════════════════

export function RequestsPage() {
  const { orgId, membership } = useOrg();
  const activeMembershipId = membership?._id ?? null;
  const { t } = useTranslation();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("kanban");
  const [showMyRequests, setShowMyRequests] = useState(false);
  const [selectedReference, setSelectedReference] = useState<string | null>(null);

  // ── Table mode: paginated query ──
  const {
    results: requests,
    status: paginationStatus,
    loadMore,
    isLoading,
  } = useAuthenticatedPaginatedQuery(
    api.functions.requests.listByOrg,
    viewMode === "table" && orgId
      ? {
          orgId,
          status: statusFilter !== "all" ? (statusFilter as any) : undefined,
          assignedTo:
            showMyRequests && activeMembershipId
              ? activeMembershipId
              : undefined,
        }
      : "skip",
    { initialNumItems: 50 },
  );

  const { data: services } = useAuthenticatedConvexQuery(
    api.functions.services.listByOrg,
    orgId ? { orgId, activeOnly: true } : "skip",
  );

  // Client-side filtering for Service & Search (table mode only)
  const filteredRequests = useMemo(
    () =>
      requests?.filter((req: any) => {
        const matchesService =
          serviceFilter === "all" || req.orgServiceId === serviceFilter;
        const matchesSearch =
          searchQuery === "" ||
          req.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          req.user?.firstName
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          req.user?.lastName
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          req.user?.email?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesService && matchesSearch;
      }),
    [requests, serviceFilter, searchQuery],
  );

  // Aggregate counts
  const { data: requestStats } = useAuthenticatedConvexQuery(
    api.functions.requests.getStatsByOrg,
    orgId ? { orgId } : "skip",
  );

  const statusCounts = requestStats?.statusCounts ?? {};
  const totalCount = requestStats?.total ?? 0;

  // ── If a request is selected, show its detail view ──
  if (selectedReference) {
    return (
      <RequestDetailView
        reference={selectedReference}
        onBack={() => setSelectedReference(null)}
      />
    );
  }

  return (
    <div className="flex min-h-full flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("dashboard.requests.title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t(
              "dashboard.requests.description",
              "Gerez les demandes de services de votre organisation",
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {totalCount > 0 && (
            <Badge variant="outline" className="text-sm px-3 py-1 font-medium">
              {totalCount} demande{totalCount > 1 ? "s" : ""}
            </Badge>
          )}
          <div className="flex items-center border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="rounded-none gap-1.5 h-9"
            >
              <LayoutList className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">
                {t("dashboard.requests.viewTable")}
              </span>
            </Button>
            <Button
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("kanban")}
              className="rounded-none gap-1.5 h-9"
            >
              <Kanban className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">
                {t("dashboard.requests.viewKanban")}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t(
                "dashboard.requests.search",
                "Rechercher par reference, nom ou email...",
              )}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 text-sm bg-card border-border shadow-sm"
            />
          </div>
          <Combobox
            value={serviceFilter}
            onValueChange={setServiceFilter}
            placeholder={t("dashboard.requests.allServices")}
            searchPlaceholder={t("common.search")}
            emptyText={t("dashboard.services.noResults")}
            className="w-full sm:w-[240px] h-11 bg-card border-border shadow-sm"
            options={[
              { value: "all", label: t("dashboard.requests.allServices") },
              ...(services?.map((service: any) => ({
                value: service._id,
                label: service.service?.name?.fr ?? "Service",
              })) ?? []),
            ]}
          />
          <div className="flex items-center gap-2 h-11 px-3 rounded-lg border border-border bg-card shadow-sm shrink-0">
            <Switch
              id="show-my-requests"
              checked={showMyRequests}
              onCheckedChange={setShowMyRequests}
            />
            <Label
              htmlFor="show-my-requests"
              className="text-sm font-medium cursor-pointer whitespace-nowrap"
            >
              {t("dashboard.requests.myRequests")}
            </Label>
          </div>
        </div>

        {/* Status pill tabs - table mode only */}
        {viewMode === "table" && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {STATUS_TABS.map((tab) => {
              const isActive = statusFilter === tab.key;
              const count =
                tab.key === "all" ? totalCount : (statusCounts[tab.key] ?? 0);
              const config = getStatusConfig(tab.key);

              return (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 border",
                    isActive
                      ? tab.key === "all"
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : `${config.bgClass} ${config.textClass} border-current/20 shadow-sm`
                      : "bg-background hover:bg-muted/60 text-muted-foreground border-transparent hover:border-border/60",
                  )}
                >
                  {t(tab.labelKey)}
                  {count > 0 && (
                    <span
                      className={cn(
                        "inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1",
                        isActive
                          ? tab.key === "all"
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-current/10"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Content Area */}
      {viewMode === "table" ? (
        <TableView
          requests={filteredRequests}
          isLoading={isLoading}
          paginationStatus={paginationStatus}
          loadMore={loadMore}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          onSelectRequest={setSelectedReference}
          t={t}
        />
      ) : (
        <KanbanView
          orgId={orgId}
          activeMembershipId={activeMembershipId}
          showMyRequests={showMyRequests}
          searchQuery={searchQuery}
          serviceFilter={serviceFilter}
          onSelectRequest={setSelectedReference}
          t={t}
        />
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// Table View
// ═════════════════════════════════════════════════════════════════

function TableView({
  requests,
  isLoading,
  paginationStatus,
  loadMore,
  searchQuery,
  statusFilter,
  onSelectRequest,
  t,
}: {
  requests: any[] | undefined;
  isLoading: boolean;
  paginationStatus: string;
  loadMore: (n: number) => void;
  searchQuery: string;
  statusFilter: string;
  onSelectRequest: (reference: string) => void;
  t: TFunction;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="font-semibold">
              {t("dashboard.requests.table.reference")}
            </TableHead>
            <TableHead className="font-semibold">
              {t("dashboard.requests.table.service")}
            </TableHead>
            <TableHead className="font-semibold">
              {t("dashboard.requests.table.requester")}
            </TableHead>
            <TableHead className="font-semibold">
              {t("dashboard.requests.table.date")}
            </TableHead>
            <TableHead className="font-semibold">
              {t("dashboard.requests.table.status")}
            </TableHead>
            <TableHead className="text-right font-semibold">
              {t("dashboard.requests.table.actions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (requests?.length ?? 0) === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {t("dashboard.requests.loading", "Chargement des demandes...")}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ) : requests?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center">
                <div className="flex flex-col items-center gap-3 py-8">
                  <div className="rounded-full bg-muted/60 p-3">
                    <Inbox className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground/80">
                      {t("dashboard.requests.empty")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {searchQuery || statusFilter !== "all"
                        ? t(
                            "dashboard.requests.emptyFiltered",
                            "Essayez de modifier vos filtres",
                          )
                        : t(
                            "dashboard.requests.emptyAll",
                            "Les nouvelles demandes apparaitront ici",
                          )}
                    </p>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            requests?.map((request: any) => {
              const statusConf = getStatusConfig(request.status);
              const userName = request.user
                ? `${request.user.firstName ?? ""} ${request.user.lastName ?? ""}`.trim()
                : null;

              return (
                <TableRow
                  key={request._id}
                  className="cursor-pointer hover:bg-muted/40 transition-colors group"
                  onClick={() => onSelectRequest(request.reference)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="rounded-md bg-primary/10 p-1.5">
                        <FileText className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="font-mono text-xs font-semibold">
                        {request.reference || "\u2014"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {(request.serviceName as any)?.fr ??
                        (request.service as any)?.name?.fr ??
                        "Service"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-xs font-bold shrink-0">
                        {userName ? (
                          getInitials(request.user?.firstName, request.user?.lastName)
                        ) : (
                          <User className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-sm truncate">
                          {userName || "Utilisateur inconnu"}
                        </span>
                        {request.user?.email && (
                          <span className="text-xs text-muted-foreground truncate">
                            {request.user.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs whitespace-nowrap">
                        {request.submittedAt
                          ? timeAgo(request.submittedAt)
                          : request._creationTime
                            ? timeAgo(request._creationTime)
                            : "-"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        statusConf.bgClass,
                        statusConf.textClass,
                      )}
                    >
                      {t(statusConf.i18nKey)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRequest(request.reference);
                      }}
                    >
                      {t("dashboard.requests.manage")}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {paginationStatus === "CanLoadMore" && (
        <div className="flex justify-center py-4 border-t border-border/40">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadMore(50)}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            {t("dashboard.requests.loadMore")}
          </Button>
        </div>
      )}
      {paginationStatus === "LoadingMore" && (
        <div className="flex justify-center py-4 border-t border-border/40">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// Kanban View
// ═════════════════════════════════════════════════════════════════

function KanbanView({
  orgId,
  activeMembershipId,
  showMyRequests,
  searchQuery,
  serviceFilter,
  onSelectRequest,
  t,
}: {
  orgId: Id<"orgs"> | null;
  activeMembershipId: Id<"memberships"> | null;
  showMyRequests: boolean;
  searchQuery: string;
  serviceFilter: string;
  onSelectRequest: (reference: string) => void;
  t: TFunction;
}) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ScrollArea className="w-full flex-1">
        <div className="flex gap-4 pb-4 h-[calc(100vh-240px)]">
          {KANBAN_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              orgId={orgId}
              activeMembershipId={activeMembershipId}
              showMyRequests={showMyRequests}
              searchQuery={searchQuery}
              serviceFilter={serviceFilter}
              onSelectRequest={onSelectRequest}
              t={t}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// Kanban Column (each with its own paginated query)
// ═════════════════════════════════════════════════════════════════

function KanbanColumn({
  column,
  orgId,
  activeMembershipId,
  showMyRequests,
  searchQuery,
  serviceFilter,
  onSelectRequest,
  t,
}: {
  column: KanbanColumnDef;
  orgId: Id<"orgs"> | null;
  activeMembershipId: Id<"memberships"> | null;
  showMyRequests: boolean;
  searchQuery: string;
  serviceFilter: string;
  onSelectRequest: (reference: string) => void;
  t: TFunction;
}) {
  const {
    results: rawCards,
    status: paginationStatus,
    loadMore,
    isLoading,
  } = useAuthenticatedPaginatedQuery(
    api.functions.requests.listByOrgStatuses,
    orgId
      ? {
          orgId,
          statuses: column.statuses,
          assignedTo:
            showMyRequests && activeMembershipId
              ? activeMembershipId
              : undefined,
        }
      : "skip",
    { initialNumItems: 10 },
  );

  const cards = useMemo(
    () =>
      rawCards?.filter((req: any) => {
        const matchesService =
          serviceFilter === "all" || req.orgServiceId === serviceFilter;
        const matchesSearch =
          searchQuery === "" ||
          req.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          req.user?.firstName
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          req.user?.lastName
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          req.user?.email?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesService && matchesSearch;
      }) ?? [],
    [rawCards, serviceFilter, searchQuery],
  );

  return (
    <div className="flex flex-col min-w-[280px] w-[280px] shrink-0">
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2.5 rounded-t-lg border border-b-0",
          column.headerColor,
        )}
      >
        <div className={cn("w-2 h-2 rounded-full", column.dotColor)} />
        <span className="text-sm font-semibold">{t(column.labelKey)}</span>
        <Badge
          variant="secondary"
          className="ml-auto text-[10px] h-5 min-w-[20px] justify-center"
        >
          {cards.length}
          {paginationStatus === "CanLoadMore" ? "+" : ""}
        </Badge>
      </div>

      <div className="flex-1 bg-muted/20 border border-t-0 border-border/60 rounded-b-lg p-2 space-y-2 overflow-y-auto">
        {isLoading && cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50 mb-2" />
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Inbox className="h-5 w-5 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground/50">
              {t("dashboard.requests.kanban.empty")}
            </p>
          </div>
        ) : (
          <>
            {cards.map((request: any) => (
              <KanbanCard
                key={request._id}
                request={request}
                onSelectRequest={onSelectRequest}
                t={t}
              />
            ))}
            {paginationStatus === "CanLoadMore" && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={() => loadMore(10)}
              >
                {t("dashboard.requests.loadMore")}
              </Button>
            )}
            {paginationStatus === "LoadingMore" && (
              <div className="flex justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// Kanban Card
// ═════════════════════════════════════════════════════════════════

function KanbanCard({
  request,
  onSelectRequest,
  t,
}: {
  request: any;
  onSelectRequest: (reference: string) => void;
  t: TFunction;
}) {
  const statusConf = getStatusConfig(request.status);
  const userName = request.user
    ? `${request.user.firstName ?? ""} ${request.user.lastName ?? ""}`.trim()
    : null;
  const serviceName =
    (request.serviceName as any)?.fr ??
    (request.service as any)?.name?.fr ??
    "Service";

  return (
    <div
      onClick={() => onSelectRequest(request.reference)}
      className="group cursor-pointer bg-card rounded-lg border border-border/60 p-3 shadow-sm hover:shadow-md hover:border-border transition-all duration-200 hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium",
            statusConf.bgClass,
            statusConf.textClass,
          )}
        >
          {t(statusConf.i18nKey)}
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground transition-all" />
      </div>

      <p className="text-sm font-medium leading-snug mb-1.5 line-clamp-2">
        {request.reference || "Sans reference"}
      </p>

      <Badge
        variant="secondary"
        className="text-[10px] font-normal mb-3 max-w-full truncate"
      >
        {serviceName}
      </Badge>

      <div className="flex items-center justify-between pt-2 border-t border-border/40">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-[9px] font-bold shrink-0">
            {userName ? (
              getInitials(request.user?.firstName, request.user?.lastName)
            ) : (
              <User className="h-3 w-3" />
            )}
          </div>
          <span className="text-xs text-muted-foreground truncate">
            {userName || "Inconnu"}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {request.submittedAt
            ? timeAgo(request.submittedAt)
            : request._creationTime
              ? timeAgo(request._creationTime)
              : ""}
        </span>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// Request Detail View (inline — no separate route)
// ═════════════════════════════════════════════════════════════════

function RequestDetailView({
  reference,
  onBack,
}: {
  reference: string;
  onBack: () => void;
}) {
  const { i18n, t } = useTranslation();
  const { orgId } = useOrg();
  const { canDo } = useCanDoTask(orgId ?? undefined);

  const { data: request } = useAuthenticatedConvexQuery(
    api.functions.requests.getByReferenceId,
    { referenceId: reference },
  );
  const { data: agentNotes } = useAuthenticatedConvexQuery(
    api.functions.agentNotes.listByRequest,
    request?._id ? { requestId: request._id } : "skip",
  );
  const { mutateAsync: updateStatus } = useConvexMutationQuery(
    api.functions.requests.updateStatus,
  );
  const { mutateAsync: createNote } = useConvexMutationQuery(
    api.functions.agentNotes.create,
  );
  const { mutate: toggleFieldValidation } = useConvexMutationQuery(
    api.functions.requests.validateField,
  );
  const { mutateAsync: assignAgent } = useConvexMutationQuery(
    api.functions.requests.assign,
  );

  const { data: members } = useAuthenticatedConvexQuery(
    api.functions.orgs.getMembers,
    orgId ? { orgId } : "skip",
  );

  const [noteContent, setNoteContent] = useState("");
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const _viewedRequestId = useRef<string | null>(null);

  const lang = i18n.language;
  const dateFnsLocale = lang === "fr" ? fr : enUS;

  const formSchema = useMemo(
    () => request?.service?.formSchema as FormSchema | undefined,
    [request?.service?.formSchema],
  );

  const formDataObj: Record<string, unknown> = useMemo(() => {
    if (!request?.formData) return {};
    if (typeof request.formData === "string") {
      try {
        return JSON.parse(request.formData);
      } catch {
        return {};
      }
    }
    if (typeof request.formData === "object")
      return request.formData as Record<string, unknown>;
    return {};
  }, [request?.formData]);

  const sections = useMemo(() => {
    if (!formSchema?.sections) return [];
    return formSchema.sections
      .map((section) => {
        const sectionData = formDataObj[section.id];
        const fields = (section.fields ?? []).map((field) => {
          let value: unknown;
          if (
            sectionData &&
            typeof sectionData === "object" &&
            !Array.isArray(sectionData)
          ) {
            value = (sectionData as Record<string, unknown>)[field.id];
          }
          if (value === undefined) {
            value = formDataObj[field.id];
          }
          const label = getLocalized(field.label, lang) || field.id;
          let display: string;
          if (field.options && typeof value === "string") {
            const opt = field.options.find((o) => o.value === value);
            display = opt
              ? getLocalized(opt.label, lang) || value
              : renderValue(value, lang);
          } else {
            display = renderValue(value, lang);
          }
          const fieldPath = `${section.id}.${field.id}`;
          return { id: field.id, fieldPath, label, display, isEmpty: display === "\u2014" };
        });

        return {
          id: section.id,
          title: getLocalized(section.title, lang) || section.id,
          fields,
        };
      })
      .filter((s) => s.fields.length > 0);
  }, [formSchema, formDataObj, lang]);

  const fieldValidations = (request?.fieldValidations ?? {}) as Record<
    string,
    { validatedAt: number; validatedBy: string }
  >;
  const totalFields = sections.reduce((sum, s) => sum + s.fields.length, 0);
  const validatedFields = sections.reduce(
    (sum, s) =>
      sum + s.fields.filter((f) => fieldValidations[f.fieldPath]).length,
    0,
  );
  const fieldProgress =
    totalFields > 0 ? (validatedFields / totalFields) * 100 : 0;

  const agentOptions = useMemo(() => {
    if (!members) return [];
    return members.map((m) => {
      const posStr = m.positionTitle
        ? getLocalized(m.positionTitle, lang)
        : "Sans poste";
      return {
        value: m.membershipId,
        label: `${m.firstName} ${m.lastName} - ${posStr}`,
      };
    });
  }, [members, lang]);

  const assignedToId = useMemo(() => {
    if (!request?.assignedTo) return null;
    const rawAssignedTo = request.assignedTo as any;
    return typeof rawAssignedTo === "string"
      ? rawAssignedTo
      : rawAssignedTo._id;
  }, [request?.assignedTo]);

  const assignedAgent = useMemo(() => {
    if (!assignedToId || !members) return null;
    return members.find((m) => m.membershipId === assignedToId);
  }, [assignedToId, members]);

  useEffect(() => {
    if (request?._id && _viewedRequestId.current !== request._id) {
      _viewedRequestId.current = request._id;
    }
  }, [request]);

  // Loading state
  if (request === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not found
  if (request === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <FileText className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-muted-foreground">{t("requestDetail.notFound")}</p>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t("requestDetail.backToList")}
        </Button>
      </div>
    );
  }

  const handleStatusUpdate = async (newStatus: string) => {
    setIsStatusUpdating(true);
    try {
      await updateStatus({ requestId: request._id, status: newStatus as any });
      toast.success(t("requestDetail.statusUpdated"));
    } catch {
      toast.error(t("common.error"));
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const statusHistory = (request as any).statusHistory ?? [];
  const validNextStatuses = getValidNextStatuses(request.status as RequestStatusType);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 min-w-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold truncate">
              {t("requestDetail.title")}
            </h2>
          </div>
          <Badge variant="outline" className="font-mono text-xs shadow-sm shrink-0">
            # {request.reference || request._id.slice(-6).toUpperCase()}
          </Badge>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {canDo("requests.process") && (
            <Combobox
              options={[
                request.status,
                ...validNextStatuses,
              ].map((status) => ({
                value: status,
                label: t(`fields.requestStatus.options.${status}`, status),
              }))}
              value={request.status}
              onValueChange={(value) => {
                if (value && value !== request.status) {
                  handleStatusUpdate(value);
                }
              }}
              placeholder={t("fields.requestStatus.placeholder", "Changer le statut")}
              searchPlaceholder={t("common.search")}
              emptyText={t("common.noResults")}
              className="w-[220px]"
              disabled={isStatusUpdating}
            />
          )}
        </div>
      </div>

      {/* Action Banners */}
      {request.actionsRequired
        ?.filter((a: any) => !a.completedAt)
        .map((action: any) => (
          <Alert
            key={action.id}
            variant="destructive"
            className="border-amber-500 bg-amber-50 dark:bg-amber-950/20"
          >
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-400">
              {t("requestDetail.actionRequired.title", "Action requise du citoyen")}
              <Badge variant="outline" className="ml-1 text-xs">
                {String(
                  t(`requestDetail.actionRequired.types.${action.type}`, action.type),
                )}
              </Badge>
            </AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              {action.message}
            </AlertDescription>
          </Alert>
        ))}

      {request.actionsRequired
        ?.filter((a: any) => a.completedAt)
        .map((action: any) => (
          <Alert key={action.id} className="border-border bg-muted/30">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>
              {t("requestDetail.actionCompleted.title", "Reponse recue du citoyen")}
              <Badge variant="outline" className="ml-1 text-xs text-green-600">
                {t("requestDetail.actionCompleted.badge")}
              </Badge>
            </AlertTitle>
            <AlertDescription className="text-muted-foreground">
              {t(
                "requestDetail.actionCompleted.description",
                "Le citoyen a fourni les elements demandes. Verifiez et validez sa reponse.",
              )}
            </AlertDescription>
          </Alert>
        ))}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
        {/* LEFT: Form Data */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border/40 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-primary/10 p-1.5">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm">
                      {t("requestDetail.formData.title", "Donnees du formulaire")}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {validatedFields}/{totalFields}{" "}
                      {t("requestDetail.formData.fieldsVerified", "champs verifies")}
                    </p>
                  </div>
                </div>
                {fieldProgress === 100 && (
                  <Badge
                    variant="outline"
                    className="bg-green-500/10 text-green-600 border-green-500/30"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    {t("requestDetail.formData.allVerified")}
                  </Badge>
                )}
              </div>
              <Progress value={fieldProgress} className="h-2 mt-3" />
            </div>

            <div className="p-5">
              {sections.length > 0 ? (
                <Tabs defaultValue={sections[0].id} className="w-full">
                  <div className="overflow-x-auto overflow-y-hidden scrollbar-hide">
                    <TabsList className="h-auto justify-start w-max">
                      {sections.map((section) => {
                        const sectionValidated = section.fields.filter(
                          (f) => fieldValidations[f.fieldPath],
                        ).length;
                        const sectionTotal = section.fields.length;
                        return (
                          <TabsTrigger
                            key={section.id}
                            value={section.id}
                            className="shrink-0 gap-1.5 text-xs sm:text-sm"
                          >
                            {section.title}
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px] px-1.5 py-0 h-4 min-w-[28px] justify-center",
                                sectionValidated === sectionTotal
                                  ? "bg-green-500/20 text-green-600"
                                  : "",
                              )}
                            >
                              {sectionValidated}/{sectionTotal}
                            </Badge>
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>
                  </div>

                  {sections.map((section) => (
                    <TabsContent key={section.id} value={section.id}>
                      <Table className="table-fixed w-full">
                        <TableBody>
                          {section.fields.map((field) => {
                            const isValidated = !!fieldValidations[field.fieldPath];
                            return (
                              <TableRow key={field.id} className="transition-colors">
                                <TableCell className="w-8 pr-0 align-top">
                                  <Checkbox
                                    checked={isValidated}
                                    disabled={!canDo("requests.validate")}
                                    onCheckedChange={(checked) => {
                                      toggleFieldValidation({
                                        requestId: request._id,
                                        fieldPath: field.fieldPath,
                                        validated: !!checked,
                                      });
                                    }}
                                    className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                  />
                                </TableCell>
                                <TableCell className="text-muted-foreground font-medium w-[40%] truncate">
                                  {field.label}
                                </TableCell>
                                <TableCell className="truncate">
                                  {field.display}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <div className="text-muted-foreground italic text-center py-8 text-sm">
                  {t("requestDetail.formData.empty", "Aucune donnee de formulaire")}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Assignment, Timeline, Notes */}
        <div className="space-y-6">
          {/* Agent Assignment */}
          {(request.assignedTo || canDo("requests.assign")) && (
            <Card>
              <CardHeader className="py-3 px-4 border-b bg-muted/20">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {t("requestDetail.agentAssignment.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex flex-col gap-4">
                {assignedAgent ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={assignedAgent.avatarUrl} />
                      <AvatarFallback>
                        {assignedAgent.firstName?.[0]}
                        {assignedAgent.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {assignedAgent.firstName} {assignedAgent.lastName}
                      </p>
                      {assignedAgent.positionTitle && (
                        <p className="text-xs text-muted-foreground truncate">
                          {getLocalized(assignedAgent.positionTitle, lang)}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-dashed">
                    {t(
                      "requestDetail.agentAssignment.unassigned",
                      "Il n'y a pas d'agent assigne a cette demande pour le moment.",
                    )}
                  </div>
                )}

                {canDo("requests.assign") && (
                  <Combobox
                    options={agentOptions}
                    value={assignedToId}
                    onValueChange={async (value) => {
                      try {
                        await assignAgent({
                          requestId: request._id,
                          agentId: value as Id<"memberships">,
                        });
                        toast.success(
                          t("requestDetail.agentAssigned", "Agent assigne avec succes"),
                        );
                      } catch {
                        toast.error(t("common.error"));
                      }
                    }}
                    placeholder={t("requestDetail.assignAgent", "Assigner a un agent...")}
                    searchPlaceholder={t("common.search")}
                    emptyText={t("common.noResult")}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Status Timeline */}
          {statusHistory.length > 0 && (
            <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border/40 bg-muted/20">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {t("requestDetail.timeline.title")}
                  <Badge variant="secondary" className="text-xs font-normal ml-auto">
                    {statusHistory.length}
                  </Badge>
                </h3>
              </div>
              <div className="p-4">
                <div className="relative">
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/60" />
                  <div className="space-y-4">
                    {statusHistory.map((event: any, idx: number) => {
                      const toStyle = getStatusStyle(event.to);
                      const isLast = idx === statusHistory.length - 1;
                      return (
                        <div key={event._id} className="relative flex gap-3 pl-0">
                          <div
                            className={cn(
                              "relative z-10 mt-1 h-[15px] w-[15px] rounded-full border-2 border-background shrink-0",
                              isLast ? toStyle.dot : "bg-muted-foreground/30",
                            )}
                          />
                          <div className="flex-1 min-w-0 pb-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold",
                                  toStyle.bg,
                                  toStyle.text,
                                )}
                              >
                                {String(
                                  t(`fields.requestStatus.options.${event.to}`, event.to),
                                )}
                              </span>
                              {event.from && (
                                <span className="text-[10px] text-muted-foreground">
                                  {"\u2190"}{" "}
                                  {String(
                                    t(
                                      `fields.requestStatus.options.${event.from}`,
                                      event.from,
                                    ),
                                  )}
                                </span>
                              )}
                            </div>
                            {event.note && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {event.note}
                              </p>
                            )}
                            <span className="text-[10px] text-muted-foreground/70">
                              {formatDistanceToNow(event.createdAt, {
                                addSuffix: true,
                                locale: dateFnsLocale,
                              })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Internal Notes */}
          <Card className="flex flex-col max-h-[400px]">
            <CardHeader className="shrink-0 pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                {t("requestDetail.notes.title")}
                <Badge variant="secondary" className="text-xs font-normal ml-auto">
                  {agentNotes?.length || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-3">
              {!agentNotes || agentNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("requestDetail.notes.empty")}
                </p>
              ) : (
                agentNotes.map((note) => (
                  <div
                    key={note._id}
                    className={cn(
                      "p-3 rounded-lg text-sm",
                      note.source === "ai"
                        ? "bg-primary/5 border border-primary/15"
                        : "bg-muted/40",
                    )}
                  >
                    {note.source === "ai" && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <Bot className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-medium text-primary">
                          {t("requestDetail.notes.aiAnalysis")}
                        </span>
                        {note.aiConfidence && (
                          <Badge variant="outline" className="text-xs ml-auto">
                            {note.aiConfidence}% {t("requestDetail.notes.confidence")}
                          </Badge>
                        )}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{note.content}</p>
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                      <span>
                        {note.source === "ai"
                          ? "IA"
                          : note.author
                            ? `${note.author.firstName} ${note.author.lastName}`
                            : "Agent"}
                      </span>
                      <span>
                        {formatDistanceToNow(note.createdAt, {
                          addSuffix: true,
                          locale: dateFnsLocale,
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
            <CardFooter className="shrink-0 pt-3">
              {canDo("requests.process") && (
                <div className="flex w-full gap-2">
                  <Textarea
                    placeholder={t(
                      "requestDetail.notes.placeholder",
                      "Ajouter une note...",
                    )}
                    className="min-h-[40px] text-sm"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                  />
                  <Button
                    size="icon"
                    onClick={async () => {
                      if (!noteContent.trim()) return;
                      try {
                        await createNote({
                          requestId: request._id,
                          content: noteContent,
                        });
                        setNoteContent("");
                        toast.success(t("requestDetail.notes.added"));
                      } catch {
                        toast.error(
                          t("requestDetail.notes.addError", "Erreur lors de l'ajout"),
                        );
                      }
                    }}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
