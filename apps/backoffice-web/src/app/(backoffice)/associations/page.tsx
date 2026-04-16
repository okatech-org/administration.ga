"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { AssociationType } from "@convex/lib/constants";
import {
  Building2,
  Check,
  Clock,
  Crown,
  Globe,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Power,
  PowerOff,
  Search,
  Users,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { getCountryFlag } from "@/lib/country-utils";


// ─── Type labels ────────────────────────────────────────
const ASSOCIATION_TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  [AssociationType.Cultural]: { label: "Culturelle", emoji: "" },
  [AssociationType.Sports]: { label: "Sportive", emoji: "" },
  [AssociationType.Religious]: { label: "Religieuse", emoji: "" },
  [AssociationType.Professional]: { label: "Professionnelle", emoji: "" },
  [AssociationType.Solidarity]: { label: "Solidarité", emoji: "" },
  [AssociationType.Education]: { label: "Éducation", emoji: "" },
  [AssociationType.Youth]: { label: "Jeunesse", emoji: "" },
  [AssociationType.Women]: { label: "Femmes", emoji: "" },
  [AssociationType.Student]: { label: "Étudiante", emoji: "" },
  [AssociationType.Other]: { label: "Autre", emoji: "" },
};

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function AssociationManagementPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("associations");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: claims } = useAuthenticatedConvexQuery(
    api.functions.associationClaims.listClaims,
    {},
  );
  const pendingClaimsCount = claims?.length ?? 0;

  const { data: associations, isPending: isAssociationsPending } = useAuthenticatedConvexQuery(
    api.functions.associations.listAllAdmin,
    {},
  );

  const filtered = useMemo(() => {
    if (!associations) return [];
    return associations.filter((a) => {
      // Search
      if (search && !a.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      // Type filter
      if (typeFilter !== "all" && a.associationType !== typeFilter) {
        return false;
      }
      // Status filter
      if (statusFilter === "active" && !a.isActive) return false;
      if (statusFilter === "inactive" && a.isActive) return false;
      return true;
    });
  }, [associations, search, typeFilter, statusFilter]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 md:p-4">
      <PageHeader
        icon={<Building2 className="h-5 w-5" />}
        title={t("admin.associations.title", "Gestion des Associations")}
        subtitle={t(
          "admin.associations.description",
          "Gérez les associations de la diaspora et examinez les réclamations",
        )}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <TabsList className="w-fit shrink-0">
            <TabsTrigger value="associations" className="gap-2">
              <Building2 className="h-4 w-4" />
              {t("admin.associations.tabAssociations", "Associations")}
            </TabsTrigger>
            <TabsTrigger value="claims" className="gap-2">
              <Crown className="h-4 w-4" />
              {t("admin.associations.tabClaims", "Réclamations")}
              {pendingClaimsCount > 0 && (
                <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0 h-5 min-w-5 flex items-center justify-center">
                  {pendingClaimsCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {activeTab === "associations" && (
            <div className="flex flex-wrap items-center xl:justify-end gap-3 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("admin.associations.searchPlaceholder", "Rechercher une association...")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all", "Tous les types")}</SelectItem>
                  {Object.entries(ASSOCIATION_TYPE_LABELS).map(([value, { label, emoji }]) => (
                    <SelectItem key={value} value={value}>
                      {emoji} {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.allStatuses", "Tous")}</SelectItem>
                  <SelectItem value="active">{t("common.active", "Actif")}</SelectItem>
                  <SelectItem value="inactive">{t("common.inactive", "Inactif")}</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                {filtered.length} {t("admin.associations.results", "résultat(s)")}
              </div>
            </div>
          )}
        </div>

        <TabsContent value="associations" className="mt-0 border-none outline-none">
          <AssociationsTab 
            filtered={filtered} 
            isPending={isAssociationsPending} 
            searchDeps={`${search}-${typeFilter}-${statusFilter}`} 
          />
        </TabsContent>

        <TabsContent value="claims" className="mt-0 border-none outline-none">
          <ClaimsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 1 — ASSOCIATIONS LIST
// ═══════════════════════════════════════════════════════════════

function AssociationsTab({ 
  filtered, 
  isPending, 
  searchDeps 
}: { 
  filtered: any[]; 
  isPending: boolean; 
  searchDeps: string; 
}) {
  const { t } = useTranslation();
  const [selectedAssociation, setSelectedAssociation] = useState<any | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchDeps]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Grid Component */}
      {filtered.length === 0 ? (
        <FlatCard>
          <div className="p-3 lg:p-4 flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">
              {t("admin.associations.empty", "Aucune association trouvée")}
            </p>
          </div>
        </FlatCard>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {filtered
              .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
              .map((assoc) => {
                const typeInfo = ASSOCIATION_TYPE_LABELS[assoc.associationType];
                const presidentName =
                  assoc.president?.firstName && assoc.president?.lastName
                    ? `${assoc.president.firstName} ${assoc.president.lastName}`
                    : assoc.president?.name ?? "—";

                return (
                  <FlatCard
                    key={assoc._id}
                    className="cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden flex flex-col h-full"
                    onClick={() => setSelectedAssociation(assoc)}
                  >
                    <div className="p-2.5 flex flex-col h-full gap-2">
                      {/* Header: Status, Icon, Title */}
                      <div className="flex items-start gap-2.5">
                        <div className="h-8 w-8 flex shrink-0 items-center justify-center rounded bg-primary/10 text-base">
                          {typeInfo?.emoji || "🏢"}
                        </div>
                        <div className="flex-1 min-w-0 mt-0.5">
                          <h3 className="font-medium text-sm line-clamp-2 leading-snug">
                            {assoc.name}
                          </h3>
                        </div>
                        <div className="shrink-0 pt-1">
                          {assoc.isActive && !assoc.deletedAt ? (
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" title={t("common.active", "Actif")} />
                          ) : (
                            <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground" title={t("common.inactive", "Inactif")} />
                          )}
                        </div>
                      </div>

                      <div className="flex-1" />

                      {/* Footer: Details */}
                      <div className="pt-2 flex items-center justify-between gap-1.5 border-t border-border/50 text-[10px] text-muted-foreground mt-auto">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span title={assoc.country} className="text-sm leading-none shrink-0">
                            {getCountryFlag(assoc.country)}
                          </span>
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-normal bg-muted/60 truncate">
                            {typeInfo?.label ?? assoc.associationType}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 shrink-0" />
                            <span>{assoc.memberCount} M.</span>
                          </div>
                          <span className="text-[9px]">
                            {new Date(assoc._creationTime).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </FlatCard>
                );
              })}
          </div>

          {/* Pagination Controls */}
          {Math.ceil(filtered.length / ITEMS_PER_PAGE) > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2 pb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {t("common.previous", "Précédent")}
              </Button>
              <div className="text-xs font-medium text-muted-foreground">
                Page {currentPage} sur {Math.ceil(filtered.length / ITEMS_PER_PAGE)}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(Math.ceil(filtered.length / ITEMS_PER_PAGE), p + 1))}
                disabled={currentPage === Math.ceil(filtered.length / ITEMS_PER_PAGE)}
              >
                {t("common.next", "Suivant")}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Detail Dialog */}
      {selectedAssociation && (
        <AssociationDetailDialog
          association={selectedAssociation}
          onClose={() => setSelectedAssociation(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DETAIL DIALOG
// ═══════════════════════════════════════════════════════════════

function AssociationDetailDialog({
  association,
  onClose,
}: {
  association: any;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const typeInfo = ASSOCIATION_TYPE_LABELS[association.associationType];

  const { mutate: toggleActive, isPending: isToggling } = useConvexMutationQuery(
    api.functions.associations.adminToggleActive,
  );

  const handleToggle = () => {
    toggleActive(
      {
        id: association._id as Id<"associations">,
        isActive: !association.isActive,
      },
      {
        onSuccess: () => {
          toast.success(
            association.isActive
              ? t("admin.associations.deactivated", "Association désactivée")
              : t("admin.associations.activated", "Association activée"),
          );
          onClose();
        },
        onError: (err: Error) => {
          toast.error(err.message);
        },
      },
    );
  };

  const presidentName =
    association.president?.firstName && association.president?.lastName
      ? `${association.president.firstName} ${association.president.lastName}`
      : association.president?.name ?? "—";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg">
              {typeInfo?.emoji ?? ""}
            </div>
            <div>
              <DialogTitle className="text-lg">{association.name}</DialogTitle>
              <DialogDescription>
                <Badge variant="secondary" className="text-xs mt-1">
                  {typeInfo?.label ?? association.associationType}
                </Badge>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Description */}
          {association.description && (
            <p className="text-sm text-muted-foreground">{association.description}</p>
          )}

          {/* Info Grid */}
          <div className="grid gap-3">
            <InfoRow
              icon={Globe}
              label={t("admin.associations.country", "Pays")}
              value={`${getCountryFlag(association.country)} ${association.country}`}
            />
            <InfoRow
              icon={Users}
              label={t("admin.associations.members", "Membres")}
              value={`${association.memberCount} membre(s)`}
            />
            <InfoRow
              icon={Crown}
              label={t("admin.associations.president", "Président")}
              value={presidentName}
            />
            {association.email && (
              <InfoRow
                icon={Mail}
                label={t("common.email", "Email")}
                value={association.email}
              />
            )}
            {association.phone && (
              <InfoRow
                icon={Phone}
                label={t("common.phone", "Téléphone")}
                value={association.phone}
              />
            )}
          </div>

          {/* Status & Controls */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t("admin.associations.status", "Statut")} :</span>
              {association.isActive && !association.deletedAt ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  {t("common.active", "Actif")}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-muted-foreground">
                  {t("common.inactive", "Inactif")}
                </Badge>
              )}
            </div>
            <Button
              size="sm"
              variant={association.isActive ? "destructive" : "default"}
              onClick={handleToggle}
              disabled={isToggling}
              className="gap-1.5"
            >
              {isToggling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : association.isActive ? (
                <PowerOff className="h-4 w-4" />
              ) : (
                <Power className="h-4 w-4" />
              )}
              {association.isActive
                ? t("admin.associations.deactivate", "Désactiver")
                : t("admin.associations.activate", "Activer")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 2 — CLAIMS
// ═══════════════════════════════════════════════════════════════

function ClaimsTab() {
  const { t } = useTranslation();
  const { data: claims, isPending: isLoading } = useAuthenticatedConvexQuery(
    api.functions.associationClaims.listClaims,
    {},
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!claims || claims.length === 0) {
    return (
      <FlatCard>
        <div className="p-3 lg:p-4 flex flex-col items-center justify-center py-12">
          <Check className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">
            {t("admin.claims.empty")}
          </p>
        </div>
      </FlatCard>
    );
  }

  return (
    <div className="grid gap-4">
      {claims.map((claim: any) => (
        <ClaimCard key={claim._id} claim={claim} />
      ))}
    </div>
  );
}

function ClaimCard({ claim }: { claim: any }) {
  const { t } = useTranslation();
  const [reviewNote, setReviewNote] = useState("");
  const [showReviewNote, setShowReviewNote] = useState(false);

  const { mutate: respond, isPending } = useConvexMutationQuery(
    api.functions.associationClaims.respondToClaim,
  );

  const handleRespond = (approve: boolean) => {
    respond(
      {
        claimId: claim._id,
        approve,
        reviewNote: reviewNote.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(
            approve
              ? t(
                  "admin.claims.approved",
                  "Demande approuvée — l'utilisateur est maintenant président",
                )
              : t("admin.claims.rejected"),
          );
        },
        onError: (err: Error) => {
          toast.error(err.message);
        },
      },
    );
  };

  const displayName =
    claim.profile?.firstName && claim.profile?.lastName
      ? `${claim.profile.firstName} ${claim.profile.lastName}`
      : (claim.user?.name ?? claim.user?.email ?? "—");

  return (
    <FlatCard>
      <div className="p-3 lg:p-4">
        <div className="flex items-start justify-between gap-4 pb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {claim.user?.avatarUrl && (
                <AvatarImage src={claim.user.avatarUrl} />
              )}
              <AvatarFallback>
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-base font-semibold">{displayName}</p>
              {claim.user?.email && (
                <p className="text-sm text-muted-foreground">{claim.user.email}</p>
              )}
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0">
            <Clock className="h-3 w-3 mr-1" />
            {new Date(claim.createdAt).toLocaleDateString("fr-FR")}
          </Badge>
        </div>
        <div className="space-y-3">
        {/* Association info */}
        <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium">
            {claim.association?.name ?? "Association supprimée"}
          </span>
        </div>

        {/* Claim message */}
        {claim.message && (
          <div className="flex items-start gap-2 p-2 rounded-md border">
            <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">{claim.message}</p>
          </div>
        )}

        {/* Review note */}
        {showReviewNote && (
          <Textarea
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder={t(
              "admin.claims.reviewNotePlaceholder",
              "Note de revue (optionnelle)...",
            )}
            rows={2}
          />
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReviewNote(!showReviewNote)}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            {t("admin.claims.addNote")}
          </Button>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-destructive"
              onClick={() => handleRespond(false)}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-1" />
              )}
              {t("common.reject")}
            </Button>
            <Button
              size="sm"
              onClick={() => handleRespond(true)}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              {t("common.approve")}
            </Button>
          </div>
        </div>
        </div>
      </div>
    </FlatCard>
  );
}
