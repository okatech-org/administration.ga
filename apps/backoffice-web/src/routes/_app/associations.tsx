import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { AssociationType } from "@convex/lib/constants";
import { createFileRoute } from "@tanstack/react-router";
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
} from "lucide-react";
import { useMemo, useState } from "react";
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

export const Route = createFileRoute("/_app/associations")({
  component: AssociationManagementPage,
});

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

function AssociationManagementPage() {
  const { t } = useTranslation();

  const { data: claims } = useAuthenticatedConvexQuery(
    api.functions.associationClaims.listClaims,
    {},
  );

  const pendingClaimsCount = claims?.length ?? 0;

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

      <Tabs defaultValue="associations">
        <TabsList className="bg-[#F4F3ED] dark:bg-[#171616]">
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

        <TabsContent value="associations" className="mt-4">
          <AssociationsTab />
        </TabsContent>

        <TabsContent value="claims" className="mt-4">
          <ClaimsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 1 — ASSOCIATIONS LIST
// ═══════════════════════════════════════════════════════════════

function AssociationsTab() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAssociation, setSelectedAssociation] = useState<any | null>(null);

  const { data: associations, isPending } = useAuthenticatedConvexQuery(
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

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("admin.associations.searchPlaceholder", "Rechercher une association...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
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
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.allStatuses", "Tous")}</SelectItem>
            <SelectItem value="active">{t("common.active", "Actif")}</SelectItem>
            <SelectItem value="inactive">{t("common.inactive", "Inactif")}</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">
          {filtered.length} {t("admin.associations.results", "résultat(s)")}
        </div>
      </div>

      {/* Table */}
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
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    {t("admin.associations.colName", "Nom")}
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    {t("admin.associations.colType", "Type")}
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    {t("admin.associations.colCountry", "Pays")}
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                    {t("admin.associations.colMembers", "Membres")}
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    {t("admin.associations.colPresident", "Président")}
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                    {t("admin.associations.colStatus", "Statut")}
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    {t("admin.associations.colCreated", "Créée le")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((assoc) => {
                  const typeInfo = ASSOCIATION_TYPE_LABELS[assoc.associationType];
                  const presidentName =
                    assoc.president?.firstName && assoc.president?.lastName
                      ? `${assoc.president.firstName} ${assoc.president.lastName}`
                      : assoc.president?.name ?? "—";

                  return (
                    <tr
                      key={assoc._id}
                      className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => setSelectedAssociation(assoc)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm shrink-0">
                            {typeInfo?.emoji ?? ""}
                          </div>
                          <span className="font-medium truncate max-w-[200px]">
                            {assoc.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-xs">
                          {typeInfo?.label ?? assoc.associationType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-base">{getCountryFlag(assoc.country)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{assoc.memberCount}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground truncate max-w-[140px] block">
                          {presidentName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {assoc.isActive && !assoc.deletedAt ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                            {t("common.active", "Actif")}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs text-muted-foreground">
                            {t("common.inactive", "Inactif")}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                        {new Date(assoc._creationTime).toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
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
