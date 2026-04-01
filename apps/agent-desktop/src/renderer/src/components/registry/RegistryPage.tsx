import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { RegistrationStatus } from "@convex/lib/validators";
import {
  Baby,
  BadgeCheck,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Loader2,
  Printer,
  Search,
  User,
  Users,
  XCircle,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useOrg } from "../../hooks/useOrg";
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
  usePaginatedConvexQuery,
} from "../../hooks/useConvexHooks";
import { cn } from "../../lib/utils";
import { ProfileDetailView } from "../profiles/ProfileDetailView";

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";

// ═══════════════════════════════════════════════════════════════
// Types (inlined from web column definitions)
// ═══════════════════════════════════════════════════════════════

interface RegistrationRow {
  _id: Id<"consularRegistrations">;
  requestId: Id<"requests">;
  requestReference?: string;
  type?: string;
  duration?: string;
  status: string;
  cardNumber?: string;
  registeredAt: number;
  printedAt?: number;
  isChildProfile?: boolean;
  profileId?: Id<"profiles"> | Id<"childProfiles">;
  profile?: {
    identity?: { firstName?: string | null; lastName?: string | null };
  } | null;
  user?: {
    email?: string | null;
    photoUrl?: string | null;
  } | null;
}

interface NotificationRow {
  _id: Id<"consularNotifications">;
  requestId: Id<"requests">;
  requestReference?: string;
  type?: string;
  status: string;
  signaledAt: number;
  stayStartDate?: string;
  stayEndDate?: string;
  profileId?: Id<"profiles"> | Id<"childProfiles">;
  profile?: {
    identity?: { firstName?: string; lastName?: string };
  } | null;
  user?: {
    _id: Id<"users">;
    email?: string;
    avatarUrl?: string;
  } | null;
}

// ═══════════════════════════════════════════════════════════════
// Status filter tabs
// ═══════════════════════════════════════════════════════════════

const REGISTRY_STATUS_TABS = [
  { key: "all", labelKey: "dashboard.consularRegistry.tabs.all" },
  { key: "requested", labelKey: "dashboard.consularRegistry.statuses.requested" },
  { key: "active", labelKey: "dashboard.consularRegistry.statuses.active" },
  { key: "expired", labelKey: "dashboard.consularRegistry.statuses.expired" },
];

// ═══════════════════════════════════════════════════════════════
// Inline helpers
// ═══════════════════════════════════════════════════════════════

function getInitials(first?: string | null, last?: string | null) {
  return ((first?.[0] ?? "") + (last?.[0] ?? "")).toUpperCase() || "?";
}

function RegistrationStatusBadge({ status, hasCard }: { status: string; hasCard: boolean }) {
  const { t } = useTranslation();

  if (status === "active" && hasCard) {
    return (
      <Badge variant="default" className="bg-green-600">
        <BadgeCheck className="mr-1 h-3 w-3" />
        {t("dashboard.consularRegistry.badges.cardGenerated")}
      </Badge>
    );
  }
  switch (status) {
    case "requested":
      return (
        <Badge variant="secondary">
          <Clock className="mr-1 h-3 w-3" />
          {t("dashboard.consularRegistry.badges.requested")}
        </Badge>
      );
    case "active":
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-600">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          {t("dashboard.consularRegistry.badges.activeNoCard")}
        </Badge>
      );
    case "expired":
      return (
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" />
          {t("dashboard.consularRegistry.badges.expired")}
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function NotifStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();

  switch (status) {
    case "requested":
      return (
        <Badge variant="secondary">
          <Clock className="mr-1 h-3 w-3" />
          {t("dashboard.consularRegistry.badges.requested")}
        </Badge>
      );
    case "active":
      return (
        <Badge variant="default" className="bg-green-600">
          <BadgeCheck className="mr-1 h-3 w-3" />
          {t("dashboard.consularRegistry.badges.activeNoCard")}
        </Badge>
      );
    case "expired":
      return (
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" />
          {t("dashboard.consularRegistry.badges.expired")}
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// ═══════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════

export function RegistryPage() {
  const { t, i18n } = useTranslation();
  const { orgId } = useOrg();
  const locale = i18n.language === "fr" ? "fr-FR" : "en-US";

  // ── Local state ──────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState("all");
  const [profileTypeFilter, setProfileTypeFilter] = useState<"all" | "adult" | "child">("all");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize] = useState(10);

  // Dialog state
  const [selectedRegistration, setSelectedRegistration] = useState<RegistrationRow | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<NotificationRow | null>(null);
  const [showCardDialog, setShowCardDialog] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);

  // Search state
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const isSearching = debouncedSearch.trim().length >= 2;

  // Cursor map for server pagination
  const cursorsRef = useRef<Map<number, string>>(new Map());

  // Filter change resets pagination
  const handleStatusFilterChange = useCallback((newFilter: string) => {
    cursorsRef.current = new Map();
    setPageIndex(0);
    setStatusFilter(newFilter);
  }, []);

  const handleProfileTypeFilterChange = useCallback((newFilter: "all" | "adult" | "child") => {
    cursorsRef.current = new Map();
    setPageIndex(0);
    setProfileTypeFilter(newFilter);
  }, []);

  const currentCursor = pageIndex === 0 ? undefined : cursorsRef.current.get(pageIndex);

  // ── Data ─────────────────────────────────────────────────────
  const { data: listResult, isPending: isLoadingList } = useAuthenticatedConvexQuery(
    api.functions.consularRegistrations.paginatedListByOrg,
    orgId && !isSearching
      ? {
          orgId,
          status: (statusFilter === "all" ? undefined : statusFilter) as RegistrationStatus | undefined,
          profileType: profileTypeFilter,
          cursor: currentCursor,
          pageSize,
        }
      : "skip",
  );

  const { data: searchResult, isPending: isLoadingSearch } = useAuthenticatedConvexQuery(
    api.functions.consularRegistrations.searchRegistrations,
    orgId && isSearching
      ? {
          orgId,
          searchQuery: searchInput,
          status: (statusFilter === "all" ? undefined : statusFilter) as RegistrationStatus | undefined,
          profileType: profileTypeFilter,
        }
      : "skip",
  );

  const activeResult = isSearching ? searchResult : listResult;
  const isLoading = isSearching ? isLoadingSearch : isLoadingList;

  // Store next cursor
  if (!isSearching && listResult?.nextCursor) {
    cursorsRef.current.set(pageIndex + 1, listResult.nextCursor);
  }

  // Keep previous data while loading
  const previousResultRef = useRef(activeResult);
  if (activeResult !== undefined) {
    previousResultRef.current = activeResult;
  }
  const displayResult = activeResult ?? previousResultRef.current;

  const registrations = (displayResult?.page ?? []) as RegistrationRow[];
  const totalCount = displayResult?.totalCount;

  const { results: notifications, isLoading: isLoadingNotifs } = usePaginatedConvexQuery(
    api.functions.consularNotifications.listByOrg,
    orgId ? { orgId } : "skip",
    { initialNumItems: 100 },
  );

  // ── Mutations ────────────────────────────────────────────────
  const { mutateAsync: generateCard } = useConvexMutationQuery(
    api.functions.consularRegistrations.generateCard,
  );
  const createPrintJob = useMutation(api.functions.printJobs.create);

  // Fetch available card designs for print dialog
  const cardDesigns = useQuery(
    api.functions.cardDesigns.listByOrg,
    orgId ? { orgId } : "skip",
  );

  // ── Handlers ─────────────────────────────────────────────────
  const handleGenerateCard = async (registrationId: Id<"consularRegistrations">) => {
    try {
      const result = await generateCard({ registrationId });
      if (result.success) {
        toast.success(t("dashboard.consularRegistry.cardDialog.success"), {
          description: t("dashboard.consularRegistry.cardDialog.successDescription", {
            cardNumber: result.cardNumber,
          }),
        });
      } else {
        toast.error(t("dashboard.consularRegistry.cardDialog.error"), {
          description: result.message,
        });
      }
      setShowCardDialog(false);
    } catch {
      toast.error(t("dashboard.consularRegistry.cardDialog.errorGeneric"));
    }
  };

  const [selectedDesignId, setSelectedDesignId] = useState<string>("");
  const [printCopies, setPrintCopies] = useState(1);
  const [printPriority, setPrintPriority] = useState<"normal" | "high" | "urgent">("normal");
  const [isSendingToPrint, setIsSendingToPrint] = useState(false);

  const handleSendToPrintQueue = async () => {
    if (!selectedRegistration || !orgId || !selectedDesignId) return;
    setIsSendingToPrint(true);
    try {
      const design = cardDesigns?.find((d: any) => d._id === selectedDesignId);
      if (!design) throw new Error("Design introuvable");

      // Build field values from registration data — ALL fields needed for card rendering
      const reg = selectedRegistration as any;
      const firstName = reg.profile?.identity?.firstName ?? "";
      const lastName = reg.profile?.identity?.lastName ?? "";
      const fullName = [firstName, lastName].filter(Boolean).join(" ") || "—";

      const fieldValues: Record<string, string> = {};

      // Identity fields
      if (firstName) fieldValues.firstName = firstName;
      if (lastName) fieldValues.lastName = lastName;
      if (reg.profile?.identity?.dateOfBirth) fieldValues.dateOfBirth = reg.profile.identity.dateOfBirth;
      if (reg.profile?.identity?.placeOfBirth) fieldValues.placeOfBirth = reg.profile.identity.placeOfBirth;
      if (reg.profile?.identity?.nationality) fieldValues.nationality = reg.profile.identity.nationality;
      if (reg.profile?.identity?.sex) fieldValues.sex = reg.profile.identity.sex;
      if (reg.profile?.identity?.nip) fieldValues.nip = reg.profile.identity.nip;

      // Card fields
      if (reg.cardNumber) fieldValues.cardNumber = reg.cardNumber;
      if (reg.registeredAt) {
        const issuedDate = new Date(reg.registeredAt);
        fieldValues.cardIssuedAt = issuedDate.toLocaleDateString("fr-FR");
        // Expiry = issued + 3 years
        const expiryDate = new Date(issuedDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + 3);
        fieldValues.cardExpiresAt = expiryDate.toLocaleDateString("fr-FR");
      }

      // Photo URL
      if (reg.user?.photoUrl) fieldValues.photoUrl = reg.user.photoUrl;

      // Email
      if (reg.user?.email || reg.profile?.identity?.email) {
        fieldValues.email = reg.user?.email || reg.profile?.identity?.email;
      }

      // Store registrationId so updateStatus can mark it as printed
      fieldValues._registrationId = String(selectedRegistration._id);

      await createPrintJob({
        designId: design._id,
        designName: design.name ?? "Sans nom",
        designVersion: design.version ?? 1,
        profileId: reg.profileId ?? undefined,
        profileName: reg.cardNumber ? `${fullName} — ${reg.cardNumber}` : fullName,
        fieldValues,
        copies: printCopies,
        printDuplex: design.printDuplex ?? false,
        priority: printPriority,
        orgId,
      });

      toast.success("Envoyé dans la file d'impression", {
        description: `${fullName} — ${reg.cardNumber ?? ""} — ${design.name}`,
      });
      setShowPrintDialog(false);
      setSelectedDesignId("");
      setPrintCopies(1);
      setPrintPriority("normal");
    } catch (err) {
      toast.error("Erreur lors de l'envoi", {
        description: String(err),
      });
    } finally {
      setIsSendingToPrint(false);
    }
  };

  // ── Stats ────────────────────────────────────────────────────
  const { data: stats } = useAuthenticatedConvexQuery(
    api.functions.consularRegistrations.getStatsByOrg,
    orgId ? { orgId } : "skip",
  );

  // ── Pagination helpers ───────────────────────────────────────
  const totalPages = totalCount != null ? Math.ceil(totalCount / pageSize) : undefined;
  const hasNextPage = isSearching ? false : !!listResult?.nextCursor;
  const hasPrevPage = pageIndex > 0;

  // ── Selected profile info ────────────────────────────────────
  const selectedName = selectedRegistration
    ? `${selectedRegistration?.profile?.identity?.firstName ?? ""} ${selectedRegistration?.profile?.identity?.lastName ?? ""}`.trim()
    : selectedNotification
      ? `${selectedNotification?.profile?.identity?.firstName ?? ""} ${selectedNotification?.profile?.identity?.lastName ?? ""}`.trim()
      : "";

  const selectedProfileId = selectedRegistration?.profileId ?? selectedNotification?.profileId;

  // ── Loading state ────────────────────────────────────────────
  if (!orgId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("dashboard.consularRegistry.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("dashboard.consularRegistry.description")}
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Printer className="h-4 w-4 mr-2" />
          {t("dashboard.consularRegistry.printQueue")}
        </Button>
      </div>

      {/* Tabs: Registrations / Notifications */}
      <Tabs defaultValue="registrations" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabsList>
            <TabsTrigger value="registrations" className="gap-1.5">
              <FileText className="h-4 w-4" />
              {t("dashboard.consularRegistry.tabs.registrations")}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5">
              <Bell className="h-4 w-4" />
              {t("dashboard.consularRegistry.tabs.notifications")}
            </TabsTrigger>
          </TabsList>

          {/* Status Filter Tabs (pill toggles) */}
          <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
            {/* Profile type segmented control */}
            <div className="flex items-center border rounded-lg overflow-hidden shrink-0">
              <button
                type="button"
                onClick={() => handleProfileTypeFilterChange("all")}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors",
                  profileTypeFilter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted text-muted-foreground",
                )}
              >
                <Users className="h-3.5 w-3.5" />
                {t("dashboard.consularRegistry.filters.allProfiles", "Tous")}
              </button>
              <button
                type="button"
                onClick={() => handleProfileTypeFilterChange("adult")}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors border-l",
                  profileTypeFilter === "adult"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted text-muted-foreground",
                )}
              >
                <User className="h-3.5 w-3.5" />
                {t("dashboard.consularRegistry.filters.adults", "Adultes")}
              </button>
              <button
                type="button"
                onClick={() => handleProfileTypeFilterChange("child")}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors border-l",
                  profileTypeFilter === "child"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted text-muted-foreground",
                )}
              >
                <Baby className="h-3.5 w-3.5" />
                {t("dashboard.consularRegistry.filters.children", "Enfants")}
              </button>
            </div>

            <div className="h-5 w-px bg-border shrink-0" />

            {/* Status pills */}
            {REGISTRY_STATUS_TABS.map((tab) => {
              const isActive = statusFilter === tab.key;
              let count = 0;
              if (stats) {
                if (tab.key === "all") count = stats.total;
                else count = (stats as Record<string, number>)[tab.key] || 0;
              }

              return (
                <button
                  key={tab.key}
                  onClick={() => handleStatusFilterChange(tab.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 border",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background hover:bg-muted/60 text-muted-foreground border-transparent hover:border-border/60",
                  )}
                >
                  {t(tab.labelKey)}
                  {count > 0 && (
                    <span
                      className={cn(
                        "inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
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
        </div>

        {/* ── Tab 1: Registrations ──────────────────────────── */}
        <TabsContent value="registrations">
          <div className="space-y-4">
            {/* Search bar */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("dashboard.consularRegistry.table.searchPlaceholder")}
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPageIndex(0);
                }}
                className="pl-9"
              />
            </div>

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("dashboard.consularRegistry.table.columns.citizen")}</TableHead>
                    <TableHead>{t("dashboard.consularRegistry.table.columns.type")}</TableHead>
                    <TableHead>{t("dashboard.consularRegistry.table.columns.status")}</TableHead>
                    <TableHead>{t("dashboard.consularRegistry.table.columns.cardNumber")}</TableHead>
                    <TableHead>{t("dashboard.consularRegistry.table.columns.registrationDate")}</TableHead>
                    <TableHead className="text-right">{t("dashboard.consularRegistry.table.columns.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && registrations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : registrations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        {t("common.noResults", "Aucun r\u00e9sultat")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    registrations.map((reg) => (
                      <TableRow
                        key={reg._id}
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedRegistration(reg);
                          setSelectedNotification(null);
                          setShowProfileSheet(true);
                        }}
                      >
                        {/* Citizen */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={reg.user?.photoUrl ?? undefined} />
                              <AvatarFallback>
                                {getInitials(
                                  reg.profile?.identity?.firstName,
                                  reg.profile?.identity?.lastName,
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-medium">
                                {reg.profile?.identity?.firstName} {reg.profile?.identity?.lastName}
                              </span>
                              <p className="text-xs text-muted-foreground">{reg.user?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        {/* Type */}
                        <TableCell>
                          <span className="capitalize">{reg.type ?? "\u2014"}</span>
                        </TableCell>
                        {/* Status */}
                        <TableCell>
                          <RegistrationStatusBadge status={reg.status} hasCard={!!reg.cardNumber} />
                        </TableCell>
                        {/* Card Number */}
                        <TableCell>
                          {reg.cardNumber ? (
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">{reg.cardNumber}</code>
                          ) : (
                            <span className="text-muted-foreground">{"\u2014"}</span>
                          )}
                        </TableCell>
                        {/* Date */}
                        <TableCell>
                          {new Date(reg.registeredAt).toLocaleDateString(locale)}
                        </TableCell>
                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="icon"
                              variant="ghost"
                              title={t("dashboard.consularRegistry.actions.viewProfile")}
                              onClick={() => {
                                setSelectedRegistration(reg);
                                setSelectedNotification(null);
                                setShowProfileSheet(true);
                              }}
                            >
                              <User className="h-4 w-4" />
                            </Button>
                            {reg.status === "active" && !reg.cardNumber && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedRegistration(reg);
                                  setShowCardDialog(true);
                                }}
                              >
                                <CreditCard className="h-4 w-4 mr-1" />
                                {t("dashboard.consularRegistry.actions.generate")}
                              </Button>
                            )}
                            {reg.cardNumber && (
                              <Button
                                size="sm"
                                variant={reg.printedAt ? "ghost" : "outline"}
                                onClick={() => {
                                  setSelectedRegistration(reg);
                                  setShowPrintDialog(true);
                                }}
                              >
                                <Printer className="h-4 w-4 mr-1" />
                                {reg.printedAt ? "Réimprimer" : "Imprimer"}
                              </Button>
                            )}
                            {reg.printedAt && (
                              <Badge variant="secondary" className="text-xs text-green-600">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Imprimé
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {!isSearching && (
              <div className="flex items-center justify-between px-2">
                <p className="text-sm text-muted-foreground">
                  {totalCount != null
                    ? t("common.showingOf", {
                        from: pageIndex * pageSize + 1,
                        to: Math.min((pageIndex + 1) * pageSize, totalCount),
                        total: totalCount,
                        defaultValue: `${pageIndex * pageSize + 1}-${Math.min((pageIndex + 1) * pageSize, totalCount)} / ${totalCount}`,
                      })
                    : "\u00a0"}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasPrevPage}
                    onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                  >
                    {t("common.previous", "Pr\u00e9c\u00e9dent")}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {totalPages != null ? `${pageIndex + 1} / ${totalPages}` : `${pageIndex + 1}`}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasNextPage}
                    onClick={() => setPageIndex((p) => p + 1)}
                  >
                    {t("common.next", "Suivant")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Tab 2: Notifications ──────────────────────────── */}
        <TabsContent value="notifications">
          <div className="space-y-4">
            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("dashboard.consularRegistry.notificationsTable.columns.citizen")}</TableHead>
                    <TableHead>{t("dashboard.consularRegistry.notificationsTable.columns.type")}</TableHead>
                    <TableHead>{t("dashboard.consularRegistry.notificationsTable.columns.status")}</TableHead>
                    <TableHead>{t("dashboard.consularRegistry.notificationsTable.columns.stayPeriod")}</TableHead>
                    <TableHead>{t("dashboard.consularRegistry.notificationsTable.columns.signaledDate")}</TableHead>
                    <TableHead className="text-right">{t("dashboard.consularRegistry.notificationsTable.columns.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingNotifs && notifications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : notifications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        {t("common.noResults", "Aucun r\u00e9sultat")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    (notifications as NotificationRow[]).map((notif) => (
                      <TableRow
                        key={notif._id}
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedNotification(notif);
                          setSelectedRegistration(null);
                          setShowProfileSheet(true);
                        }}
                      >
                        {/* Citizen */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={notif.user?.avatarUrl} />
                              <AvatarFallback>
                                {getInitials(
                                  notif.profile?.identity?.firstName,
                                  notif.profile?.identity?.lastName,
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-medium">
                                {notif.profile?.identity?.firstName} {notif.profile?.identity?.lastName}
                              </span>
                              <p className="text-xs text-muted-foreground">{notif.user?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        {/* Type */}
                        <TableCell>
                          <span className="capitalize">{notif.type ?? "\u2014"}</span>
                        </TableCell>
                        {/* Status */}
                        <TableCell>
                          <NotifStatusBadge status={notif.status} />
                        </TableCell>
                        {/* Stay Period */}
                        <TableCell>
                          {notif.stayStartDate && notif.stayEndDate ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{new Date(notif.stayStartDate).toLocaleDateString(locale)}</span>
                              <span className="text-muted-foreground">{"\u2192"}</span>
                              <span>{new Date(notif.stayEndDate).toLocaleDateString(locale)}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              {t("dashboard.consularRegistry.notificationsTable.noStayDates")}
                            </span>
                          )}
                        </TableCell>
                        {/* Signaled date */}
                        <TableCell>
                          {new Date(notif.signaledAt).toLocaleDateString(locale)}
                        </TableCell>
                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="icon"
                              variant="ghost"
                              title={t("dashboard.consularRegistry.actions.viewProfile")}
                              onClick={() => {
                                setSelectedNotification(notif);
                                setSelectedRegistration(null);
                                setShowProfileSheet(true);
                              }}
                            >
                              <User className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ───────────────────────────────────────────── */}

      {/* Generate Card Dialog */}
      <Dialog open={showCardDialog} onOpenChange={setShowCardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("dashboard.consularRegistry.cardDialog.title")}
            </DialogTitle>
            <DialogDescription>
              <Trans
                i18nKey="dashboard.consularRegistry.cardDialog.description"
                values={{ name: selectedName }}
                components={{ strong: <strong /> }}
              />
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCardDialog(false)}>
              {t("dashboard.consularRegistry.cardDialog.cancel")}
            </Button>
            <Button
              onClick={() =>
                selectedRegistration && handleGenerateCard(selectedRegistration._id)
              }
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {t("dashboard.consularRegistry.cardDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Dialog — Queue for printing */}
      <Dialog open={showPrintDialog} onOpenChange={(open) => {
        setShowPrintDialog(open);
        if (!open) { setSelectedDesignId(""); setPrintCopies(1); setPrintPriority("normal"); }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" />
              Envoyer pour impression
            </DialogTitle>
            <DialogDescription>
              Ajouter la carte <code className="font-mono text-foreground">{selectedRegistration?.cardNumber ?? ""}</code> à la file d'impression.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Design selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Modèle de carte</label>
              {!cardDesigns || cardDesigns.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Aucun design disponible. Créez un modèle dans le Designer.
                </p>
              ) : (
                <select
                  value={selectedDesignId}
                  onChange={(e) => setSelectedDesignId(e.target.value)}
                  className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">— Choisir un modèle —</option>
                  {cardDesigns.map((d: any) => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Copies */}
            <div className="flex items-center gap-4">
              <div className="space-y-1.5 flex-1">
                <label className="text-sm font-medium text-foreground">Copies</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={printCopies}
                  onChange={(e) => setPrintCopies(Math.max(1, Number(e.target.value)))}
                  className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="space-y-1.5 flex-1">
                <label className="text-sm font-medium text-foreground">Priorité</label>
                <select
                  value={printPriority}
                  onChange={(e) => setPrintPriority(e.target.value as any)}
                  className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="normal">Normale</option>
                  <option value="high">Haute</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPrintDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSendToPrintQueue}
              disabled={!selectedDesignId || isSendingToPrint}
            >
              <Printer className="h-4 w-4 mr-2" />
              {isSendingToPrint ? "Envoi..." : "Envoyer à la file"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Sheet */}
      <Sheet open={showProfileSheet} onOpenChange={setShowProfileSheet}>
        <SheetContent className="!w-[70vw] !max-w-5xl p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b shrink-0">
            <SheetTitle>{t("profile.profileDetails", "Profil du demandeur")}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {selectedProfileId ? (
              <ProfileDetailView profileId={selectedProfileId} />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <User className="h-16 w-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">{t("common.error", "Erreur")}</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

