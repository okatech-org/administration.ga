"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ServiceCategory } from "@convex/lib/constants";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  BookOpenCheck,
  Check,
  Clock,
  FileCheck,
  FileText,
  Globe,
  type LucideIcon,
  Loader2,
  Plus,
  Search,
  Settings2,
  ShieldAlert,
  SlidersHorizontal,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { useOrg } from "@/components/org/org-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FlatCard } from "@/components/my-space/flat-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { getLocalizedValue } from "@/lib/i18n-utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";


// ─── Category configuration ──────────────────────────────────────────────────
const CATEGORIES: {
  id: string;
  icon: LucideIcon;
  labelKey: string;
  fallback: string;
}[] = [
  {
    id: "ALL",
    icon: SlidersHorizontal,
    labelKey: "services.category.all",
    fallback: "Tous",
  },
  {
    id: ServiceCategory.Identity,
    icon: FileText,
    labelKey: "services.category.identity",
    fallback: "Identité",
  },
  {
    id: ServiceCategory.Passport,
    icon: BookOpenCheck,
    labelKey: "services.category.passport",
    fallback: "Passeports",
  },
  {
    id: ServiceCategory.Visa,
    icon: Globe,
    labelKey: "services.category.visa",
    fallback: "Visas",
  },
  {
    id: ServiceCategory.CivilStatus,
    icon: FileText,
    labelKey: "services.category.civilStatus",
    fallback: "État Civil",
  },
  {
    id: ServiceCategory.Registration,
    icon: BookOpen,
    labelKey: "services.category.registration",
    fallback: "Inscription",
  },
  {
    id: ServiceCategory.Certification,
    icon: FileCheck,
    labelKey: "services.category.certification",
    fallback: "Administratif",
  },
  {
    id: ServiceCategory.Assistance,
    icon: ShieldAlert,
    labelKey: "services.category.assistance",
    fallback: "Assistance",
  },
  {
    id: ServiceCategory.TravelDocument,
    icon: Globe,
    labelKey: "services.category.travelDocument",
    fallback: "Titres de Voyage",
  },
  {
    id: ServiceCategory.Transcript,
    icon: FileText,
    labelKey: "services.category.transcript",
    fallback: "Relevés",
  },
  {
    id: ServiceCategory.Other,
    icon: SlidersHorizontal,
    labelKey: "services.category.other",
    fallback: "Autre",
  },
];

const CATEGORY_COLORS: Record<string, { color: string; bgColor: string }> = {
  [ServiceCategory.Identity]: {
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-500/10",
  },
  [ServiceCategory.Passport]: {
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  [ServiceCategory.Visa]: {
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-500/10",
  },
  [ServiceCategory.CivilStatus]: {
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-500/10",
  },
  [ServiceCategory.Registration]: {
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-500/10",
  },
  [ServiceCategory.Certification]: {
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-500/10",
  },
  [ServiceCategory.Assistance]: {
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-500/10",
  },
  [ServiceCategory.TravelDocument]: {
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-500/10",
  },
  [ServiceCategory.Transcript]: {
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-500/10",
  },
  [ServiceCategory.Other]: {
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-500/10",
  },
};

// ─── Types ───────────────────────────────────────────────────────────────────
type ActivationState = "active" | "inactive" | "not_activated";

interface MergedService {
  catalogId: string;
  slug: string;
  name: string | Record<string, string>;
  description: string | Record<string, string>;
  category: string;
  icon: string | undefined;
  estimatedDays: number;
  requiresAppointment: boolean;
  activationState: ActivationState;
  orgServiceId?: string;
  pricing?: { amount: number; currency: string };
  isActive?: boolean;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AdminServicesPage() {
  const { t, i18n } = useTranslation();
  const { activeOrgId } = useOrg();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<string>("");
  const [activationForm, setActivationForm] = useState({
    fee: 0,
    currency: "EUR",
    requiresAppointment: false,
    requiresAppointmentForPickup: false,
    instructions: "",
  });

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: catalogServices } = useAuthenticatedConvexQuery(
    api.functions.services.listCatalog,
    {},
  );

  const { data: orgServices } = useAuthenticatedConvexQuery(
    api.functions.services.listByOrg,
    activeOrgId ? { orgId: activeOrgId, activeOnly: false } : "skip",
  );

  // ── Mutations ────────────────────────────────────────────────────────────
  const { mutateAsync: toggleActive } = useConvexMutationQuery(
    api.functions.services.toggleOrgServiceActive,
  );
  const { mutateAsync: activateService } = useConvexMutationQuery(
    api.functions.services.activateForOrg,
  );

  // ── Merge catalog + org services ─────────────────────────────────────────
  const mergedServices = useMemo<MergedService[]>(() => {
    if (!catalogServices) return [];
    const orgMap = new Map((orgServices ?? []).map((os) => [os.serviceId, os]));

    return catalogServices.map((cs) => {
      const os = orgMap.get(cs._id);
      let activationState: ActivationState = "not_activated";
      if (os) {
        activationState = os.isActive ? "active" : "inactive";
      }
      return {
        catalogId: cs._id,
        slug: cs.slug,
        name: cs.name,
        description: cs.description,
        category: cs.category,
        icon: cs.icon,
        estimatedDays: cs.estimatedDays,
        requiresAppointment: cs.requiresAppointment,
        activationState,
        orgServiceId: os?._id,
        pricing: os?.pricing as
          | { amount: number; currency: string }
          | undefined,
        isActive: os?.isActive,
      };
    });
  }, [catalogServices, orgServices]);

  // Services not yet activated (for dialog dropdown)
  const availableForActivation = mergedServices.filter(
    (s) => s.activationState === "not_activated",
  );

  // ── Filtering ────────────────────────────────────────────────────────────
  const filteredServices = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return mergedServices.filter((service) => {
      const matchesCategory =
        selectedCategory === "ALL" || service.category === selectedCategory;
      const name = getLocalizedValue(service.name, i18n.language);
      const desc = getLocalizedValue(service.description, i18n.language);
      const matchesSearch =
        !query ||
        name.toLowerCase().includes(query) ||
        desc.toLowerCase().includes(query) ||
        service.category?.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [mergedServices, searchQuery, selectedCategory, i18n.language]);

  // ── Category counts ──────────────────────────────────────────────────────
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: mergedServices.length };
    for (const s of mergedServices) {
      counts[s.category] = (counts[s.category] ?? 0) + 1;
    }
    return counts;
  }, [mergedServices]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleToggle = async (service: MergedService) => {
    if (!service.orgServiceId) return;
    try {
      await toggleActive({
        orgServiceId: service.orgServiceId as Id<"orgServices">,
      });
      toast.success(t("dashboard.services.statusUpdated"));
    } catch {
      toast.error(t("dashboard.services.updateError"));
    }
  };

  const handleActivateService = async () => {
    if (!selectedService || !activeOrgId) return;
    try {
      await activateService({
        orgId: activeOrgId,
        serviceId: selectedService as Id<"services">,
        pricing: {
          amount: activationForm.fee,
          currency: activationForm.currency,
        },
        requiresAppointment: activationForm.requiresAppointment,
        requiresAppointmentForPickup:
          activationForm.requiresAppointmentForPickup,
        instructions: activationForm.instructions || undefined,
      });
      toast.success(t("dashboard.services.activated"));
      setAddDialogOpen(false);
      setSelectedService("");
      setActivationForm({
        fee: 0,
        currency: "EUR",
        requiresAppointment: false,
        requiresAppointmentForPickup: false,
        instructions: "",
      });
    } catch (error: any) {
      toast.error(error.message || t("dashboard.services.updateError"));
    }
  };

  const handleCardClick = (service: MergedService) => {
    if (service.orgServiceId) {
      router.push(`/services/${service.orgServiceId}/edit`);
    } else {
      // Pre-select in activation dialog
      setSelectedService(service.catalogId);
      setAddDialogOpen(true);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSelectedCategory("ALL");
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (!catalogServices) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex flex-col gap-6 p-4 lg:p-6 overflow-y-auto citizen-scrollbar">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("dashboard.services.title")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t(
                "dashboard.services.description",
                "Gérez les services disponibles pour votre organisme",
              )}
            </p>
          </div>
          <Button
            onClick={() => {
              setSelectedService("");
              setActivationForm({
                fee: 0,
                currency: "EUR",
                requiresAppointment: false,
                requiresAppointmentForPickup: false,
                instructions: "",
              });
              setAddDialogOpen(true);
            }}
            disabled={availableForActivation.length === 0}
            className="gap-2 active:scale-[0.97] transition-transform"
          >
            <Plus className="h-4 w-4" />
            {t("dashboard.services.activate")}
          </Button>
        </motion.div>

        {/* Search + Category Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="bg-card border border-border rounded-xl p-4 space-y-4"
        >
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder={t(
                "dashboard.services.searchPlaceholder",
                "Rechercher un service...",
              )}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-3 rounded-xl border border-border bg-background outline-none transition-all text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              const count = categoryCounts[cat.id] ?? 0;

              if (cat.id !== "ALL" && count === 0) return null;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                    isActive ?
                      "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{t(cat.labelKey, cat.fallback)}</span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "ml-1 h-4 min-w-4 flex items-center justify-center text-[10px]",
                      isActive ?
                        "bg-primary-foreground/20 text-primary-foreground"
                      : "",
                    )}
                  >
                    {count}
                  </Badge>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {filteredServices.length}
            </span>{" "}
            {t(
              "dashboard.services.servicesCount",
              "service(s) dans le catalogue",
            )}
            {searchQuery && (
              <span className="ml-1">
                {t("mySpace.screens.services.forQuery")} «
                <span className="text-primary font-medium">{searchQuery}</span>»
              </span>
            )}
          </p>
          {(searchQuery || selectedCategory !== "ALL") && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              {t("mySpace.screens.services.reset")}
            </button>
          )}
        </div>

        {/* Services Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          {filteredServices.length > 0 ?
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredServices.map((service) => (
                <ServiceAdminCard
                  key={service.catalogId}
                  service={service}
                  onCardClick={() => handleCardClick(service)}
                  onToggle={() => handleToggle(service)}
                  t={t}
                  lang={i18n.language}
                />
              ))}
            </div>
          : <div className="text-center py-12 rounded-xl bg-muted/30 border-2 border-dashed">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {t("dashboard.services.empty.title")}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t(
                  "dashboard.services.empty.description",
                  "Aucun service ne correspond à votre recherche.",
                )}
              </p>
              <Button onClick={handleClearSearch}>
                {t(
                  "mySpace.screens.services.viewAll",
                  "Voir tous les services",
                )}
              </Button>
            </div>
          }
        </motion.div>
      </div>

      {/* ── Activation Dialog ────────────────────────────────────────────── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("dashboard.services.dialog.title")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "dashboard.services.dialog.description",
                "Sélectionnez un service du catalogue à activer pour votre organisme.",
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Service selector — disabled when pre-selected from card */}
            <div className="space-y-2">
              <Label>
                {t("dashboard.services.dialog.selectService")}
              </Label>
              <Select
                value={selectedService}
                onValueChange={setSelectedService}
                disabled={!!selectedService}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t(
                      "dashboard.services.dialog.selectPlaceholder",
                      "Choisir un service…",
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableForActivation.length === 0 ?
                    <div className="p-2 text-center text-muted-foreground">
                      {t(
                        "dashboard.services.dialog.allActivated",
                        "Tous les services sont déjà activés",
                      )}
                    </div>
                  : availableForActivation.map((service) => (
                      <SelectItem
                        key={service.catalogId}
                        value={service.catalogId}
                      >
                        {getLocalizedValue(service.name, i18n.language)}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            {/* Fee + Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  {t("dashboard.services.dialog.fee")}
                </Label>
                <Input
                  type="number"
                  value={activationForm.fee}
                  onChange={(e) =>
                    setActivationForm({
                      ...activationForm,
                      fee: Number(e.target.value),
                    })
                  }
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  {t("dashboard.services.dialog.currency")}
                </Label>
                <Select
                  value={activationForm.currency}
                  onValueChange={(v) =>
                    setActivationForm({ ...activationForm, currency: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Appointment checkboxes */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="requiresAppointment"
                  checked={activationForm.requiresAppointment}
                  onCheckedChange={(checked) =>
                    setActivationForm({
                      ...activationForm,
                      requiresAppointment: !!checked,
                    })
                  }
                />
                <Label
                  htmlFor="requiresAppointment"
                  className="text-sm font-normal cursor-pointer"
                >
                  {t(
                    "dashboard.services.dialog.requiresAppointment",
                    "Rendez-vous requis pour le dépôt de la demande",
                  )}
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="requiresAppointmentForPickup"
                  checked={activationForm.requiresAppointmentForPickup}
                  onCheckedChange={(checked) =>
                    setActivationForm({
                      ...activationForm,
                      requiresAppointmentForPickup: !!checked,
                    })
                  }
                />
                <Label
                  htmlFor="requiresAppointmentForPickup"
                  className="text-sm font-normal cursor-pointer"
                >
                  {t(
                    "dashboard.services.dialog.requiresAppointmentForPickup",
                    "Rendez-vous requis pour le retrait",
                  )}
                </Label>
              </div>
            </div>

            {/* Custom Instructions */}
            <div className="space-y-2">
              <Label>
                {t(
                  "dashboard.services.dialog.instructions",
                  "Instructions personnalisées",
                )}
              </Label>
              <Textarea
                value={activationForm.instructions}
                onChange={(e) =>
                  setActivationForm({
                    ...activationForm,
                    instructions: e.target.value,
                  })
                }
                placeholder={t(
                  "dashboard.services.dialog.instructionsPlaceholder",
                  "Instructions spécifiques pour ce service dans votre organisme…",
                )}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              {t("superadmin.common.cancel")}
            </Button>
            <Button onClick={handleActivateService} disabled={!selectedService}>
              {t("dashboard.services.dialog.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Service Card Component ──────────────────────────────────────────────────
function ServiceAdminCard({
  service,
  onCardClick,
  onToggle,
  t,
  lang,
}: {
  service: MergedService;
  onCardClick: () => void;
  onToggle: () => void;
  t: (key: string, fallback?: string | Record<string, unknown>) => string;
  lang: string;
}) {
  const colors =
    CATEGORY_COLORS[service.category] ?? CATEGORY_COLORS[ServiceCategory.Other];
  const Icon =
    CATEGORIES.find((c) => c.id === service.category)?.icon ?? FileText;
  const name = getLocalizedValue(service.name, lang);
  const desc = getLocalizedValue(service.description, lang);
  const categoryLabel = t(
    `services.categoriesMap.${service.category}`,
    service.category,
  );

  const isActivated = service.activationState !== "not_activated";

  return (
    <FlatCard
      className={cn(
        "group relative transition-all duration-200 cursor-pointer",
        isActivated ?
          "hover:border-primary/30"
        : "border-dashed hover:border-primary/20 opacity-80 hover:opacity-100",
      )}
      onClick={onCardClick}
    >
      <div className="p-5">
        {/* Top row: icon + status */}
        <div className="flex items-start justify-between mb-3">
          <div
            className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center",
              colors.bgColor,
              colors.color,
            )}
          >
            <Icon className="w-5 h-5" />
          </div>

          {/* Activation badge */}
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {service.activationState === "active" && (
              <>
                <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 gap-1 text-[11px]">
                  <Check className="h-3 w-3" />
                  {t("dashboard.services.status.active")}
                </Badge>
                <Switch
                  checked={true}
                  onCheckedChange={onToggle}
                  className="scale-75"
                />
              </>
            )}
            {service.activationState === "inactive" && (
              <>
                <Badge
                  variant="outline"
                  className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800 gap-1 text-[11px]"
                >
                  {t("dashboard.services.status.inactive")}
                </Badge>
                <Switch
                  checked={false}
                  onCheckedChange={onToggle}
                  className="scale-75"
                />
              </>
            )}
            {service.activationState === "not_activated" && (
              <Badge
                variant="outline"
                className="gap-1 text-[11px] border-dashed text-muted-foreground"
              >
                <Plus className="h-3 w-3" />
                {t("dashboard.services.status.notActivated")}
              </Badge>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-foreground mb-1.5 line-clamp-1">
          {name}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">
          {desc}
        </p>

        {/* Footer: category + meta */}
        <div className="flex items-center justify-between text-sm">
          <Badge
            variant="secondary"
            className={cn("text-xs", colors.bgColor, colors.color)}
          >
            {categoryLabel}
          </Badge>

          <div className="flex items-center gap-3 text-muted-foreground text-xs">
            {service.estimatedDays > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {service.estimatedDays}j
              </span>
            )}
            {isActivated && service.pricing ?
              <span className="font-medium text-foreground">
                {service.pricing.amount === 0 ?
                  t("services.free")
                : `${service.pricing.amount} ${service.pricing.currency}`}
              </span>
            : !isActivated && (
                <span className="flex items-center gap-1 text-primary font-medium">
                  <Zap className="h-3 w-3" />
                  {t("dashboard.services.activate")}
                </span>
              )
            }
          </div>
        </div>

        {/* Hover: config link for activated services */}
        {isActivated && (
          <div className="absolute inset-x-0 bottom-0 px-5 pb-4 pt-8 bg-gradient-to-t from-secondary to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              <Settings2 className="h-4 w-4" />
              {t("dashboard.services.configure")}
            </span>
          </div>
        )}
      </div>
    </FlatCard>
  );
}
