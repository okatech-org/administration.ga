"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useConvex } from "convex/react";
import { api } from "@convex/_generated/api";
import { DataTable } from "@/components/ui/data-table";
import { columns, corpsAdminColumns } from "@/components/admin/users-columns";
import dynamic from "next/dynamic";
import { ProfilesView } from "@/components/admin/profiles-view";
import { DiplomaticProfilesView } from "@/components/admin/diplomatic-profiles-view";
import { SkillsView } from "@/components/admin/skills-view";
import { Badge } from "@/components/ui/badge";

// Mapbox-GL touches `window` / WebGL at module load and breaks Next's SSR
// analysis even from a "use client" file — load the map view client-only,
// same pattern as citizen-web's WorldMapSection (apps/citizen-web/src/app/(public)/page.tsx:12).
const UsersMapView = dynamic(
  () =>
    import("@/components/admin/users-map-view").then((m) => ({
      default: m.UsersMapView,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Chargement de la carte…
      </div>
    ),
  },
);
import { Crown, Map as MapIcon, Shield, Sparkles, Users as UsersIcon, X } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  getCountryFlag,
  getCountryName,
  getContinent,
  getActiveContinents,
  CONTINENT_META,
  type Continent,
} from "@/lib/country-utils";
import { PageHeader } from "@/components/design-system/page-header";
import { TabSwitcher } from "@/components/design-system/tab-switcher";
import { FlatCard } from "@/components/design-system/flat-card";
import { Combobox, type ComboboxOption } from "@workspace/ui/components/combobox";
import { Button } from "@workspace/ui/components/button";

type ViewMode = "accounts" | "profiles" | "diplomatic" | "map" | "skills";

type UserTab = "all" | "backoffice" | "corps" | "agents" | "users" | "inactive";

const TABS: { id: UserTab; label: string; emoji: string }[] = [
  { id: "all", label: "Tous", emoji: "" },
  { id: "backoffice", label: "Back-Office", emoji: "" },
  { id: "corps", label: "Corps Administratif", emoji: "" },
  { id: "agents", label: "Agents Spéciaux", emoji: "" },
  { id: "users", label: "Utilisateurs", emoji: "" },
  { id: "inactive", label: "Inactifs", emoji: "" },
];

const BACKOFFICE_ROLES = ["super_admin", "admin_system", "admin", "sous_admin"] as const;
const AGENT_ROLES = ["intel_agent", "education_agent"] as const;
const PRIVILEGED_ROLES = [...BACKOFFICE_ROLES, ...AGENT_ROLES] as const;

const ROLE_META: Record<string, { label: string; emoji: string; color: string }> = {
  super_admin: { label: "Super Admin", emoji: "", color: "bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-400" },
  admin_system: { label: "Admin Système", emoji: "", color: "bg-violet-500/10 text-violet-700 border-violet-300 dark:text-violet-400" },
  admin: { label: "Admin", emoji: "", color: "bg-blue-500/10 text-blue-700 border-blue-300 dark:text-blue-400" },
  sous_admin: { label: "Sous-Admin", emoji: "", color: "bg-cyan-500/10 text-cyan-700 border-cyan-300 dark:text-cyan-400" },
  intel_agent: { label: "Agent Intel", emoji: "", color: "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-400" },
  education_agent: { label: "Agent Éducation", emoji: "", color: "bg-teal-500/10 text-teal-700 border-teal-300 dark:text-teal-400" },
};

const VIEW_MODES: { id: ViewMode; label: string; icon: React.ElementType }[] = [
  { id: "accounts", label: "Comptes", icon: UsersIcon },
  { id: "profiles", label: "Profils Consulaires", icon: Crown },
  { id: "diplomatic", label: "Corps Diplomatique", icon: Shield },
  { id: "skills", label: "Compétences", icon: Sparkles },
  { id: "map", label: "Carte des utilisateurs", icon: MapIcon },
];

export default function UsersPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const view = (searchParams.get("view") as ViewMode) || "accounts";
  const convex = useConvex();

  // ── Filter state (Comptes view) ────────────────────────────────
  // Five independent filters now drive the table — replaces the previous
  // population / continent / country / org navigation bars.
  const [activeTab, setActiveTab] = useState<UserTab>("all");
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [activeContinent, setActiveContinent] = useState<Continent | null>(null);
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<"active" | "inactive" | null>(null);

  const [users, setUsers] = useState<any[] | undefined>(undefined);
  const [isPending, setIsPending] = useState(true);

  // Fetch all users in chunks to avoid Convex 4096 read limit
  useEffect(() => {
    let active = true;
    async function fetchAll() {
      try {
        let cursor = null;
        let isDone = false;
        const all: any[] = [];

        while (!isDone && active) {
          const res: { page: any[]; continueCursor: string; isDone: boolean } = await convex.query(api.functions.admin.listAllUsersChunk, { cursor });
          all.push(...res.page);
          cursor = res.continueCursor;
          isDone = res.isDone;

          // Optimistically update UI so user sees progress
          if (active) {
            setUsers([...all]);
          }
        }

        if (active) {
          setIsPending(false);
        }
      } catch (e) {
        console.error("Failed to load users", e);
        if (active) setIsPending(false);
      }
    }

    // reset state before fetching
    setIsPending(true);
    fetchAll();

    return () => { active = false; };
  }, [convex]);

  // Rang hierarchique pour le tri par role
  const ROLE_RANK: Record<string, number> = {
    super_admin: 4, admin_system: 3, admin: 2, sous_admin: 1, user: 0,
    intel_agent: 1, education_agent: 1,
  };

  // ── Helper: classify a user into a population bucket ─────────
  // Mirrors what the previous "Tous / Back-Office / Corps / Agents / Utilisateurs / Inactifs"
  // navigation bar encoded.
  const populationOf = (u: any): UserTab => {
    if (!u.isActive && !u.deletedAt) return "inactive";
    if (BACKOFFICE_ROLES.includes(u.role)) return "backoffice";
    if (AGENT_ROLES.includes(u.role)) return "agents";
    if (u.hasMembership) return "corps";
    return "users";
  };

  // Pick the country to use for geo filters. For corps members we prefer the
  // org country (where they're posted); otherwise residenceCountry.
  const countryOf = (u: any): string | undefined =>
    u.membershipInfo?.orgCountry || u.residenceCountry;

  // ── Filter chain ────────────────────────────────────────────
  // Apply filters sequentially. Each filter narrows the result.
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    let out: any[] = users;
    if (activeTab !== "all") out = out.filter((u) => populationOf(u) === activeTab);
    if (activeRole) out = out.filter((u: any) => u.role === activeRole);
    if (activeContinent) {
      out = out.filter((u: any) => {
        const c = countryOf(u);
        return c ? getContinent(c) === activeContinent : false;
      });
    }
    if (activeCountry) out = out.filter((u: any) => countryOf(u) === activeCountry);
    if (activeStatus === "active") out = out.filter((u: any) => u.isActive);
    if (activeStatus === "inactive") out = out.filter((u: any) => !u.isActive && !u.deletedAt);

    // Smart sort: backoffice → role hierarchy; corps → org name; else creation order
    if (activeTab === "backoffice") {
      out = [...out].sort((a, b) => (ROLE_RANK[b.role] ?? 0) - (ROLE_RANK[a.role] ?? 0));
    } else if (activeTab === "corps") {
      out = [...out].sort((a, b) =>
        (a.membershipInfo?.orgName ?? "").localeCompare(b.membershipInfo?.orgName ?? "", "fr"),
      );
    }
    return out;
  }, [users, activeTab, activeRole, activeContinent, activeCountry, activeStatus]);

  // ── Counts per filter option (computed against the FULL user list) ──
  const populationCounts = useMemo(() => {
    const result: Record<UserTab, number> = {
      all: users?.length ?? 0,
      backoffice: 0,
      corps: 0,
      agents: 0,
      users: 0,
      inactive: 0,
    };
    for (const u of users ?? []) result[populationOf(u)]++;
    return result;
  }, [users]);

  const roleCounts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const u of users ?? []) {
      if (!u.role) continue;
      result[u.role] = (result[u.role] ?? 0) + 1;
    }
    return result;
  }, [users]);

  const continentData = useMemo(() => {
    const codes = (users ?? [])
      .map((u: any) => countryOf(u))
      .filter(Boolean) as string[];
    const continents = getActiveContinents(codes);
    const counts = {} as Record<Continent, number>;
    for (const code of codes) {
      const c = getContinent(code);
      if (c) counts[c] = (counts[c] ?? 0) + 1;
    }
    return { continents, counts };
  }, [users]);

  // Country options follow the active continent (cascading filter UX).
  const countryOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of users ?? []) {
      const c = countryOf(u);
      if (!c) continue;
      if (activeContinent && getContinent(c) !== activeContinent) continue;
      map.set(c, (map.get(c) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([code, count]) => ({
        value: code,
        label: `${getCountryFlag(code)} ${getCountryName(code)}`,
        count,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [users, activeContinent]);

  const statusCounts = useMemo(() => {
    const result = { active: 0, inactive: 0 };
    for (const u of users ?? []) {
      if (u.isActive) result.active++;
      else if (!u.deletedAt) result.inactive++;
    }
    return result;
  }, [users]);

  // True when at least one filter narrows the data — used to render a "Reset" button.
  const hasActiveFilter =
    activeTab !== "all" ||
    activeRole !== null ||
    activeContinent !== null ||
    activeCountry !== null ||
    activeStatus !== null;

  // Reset country if its continent no longer matches.
  useEffect(() => {
    if (activeCountry && activeContinent && getContinent(activeCountry) !== activeContinent) {
      setActiveCountry(null);
    }
  }, [activeContinent, activeCountry]);

  const activeColumns = activeTab === "corps" ? corpsAdminColumns : columns;

  // Construire le sous-titre dynamique selon la vue active
  const subtitleByView: Record<ViewMode, string> = {
    accounts: "Gestion des comptes de la plateforme",
    profiles: "Profils consulaires des citoyens et ressortissants",
    diplomatic: "Profils diplomatiques du corps administratif",
    skills: "Recherche et répartition des compétences et métiers",
    map: "Vision géographique : citoyens et agents répartis dans le monde",
  };

  // Tabs pour le switcher de vue principale
  const viewModeTabs = VIEW_MODES.map((mode) => ({
    key: mode.id as string,
    label: mode.label,
    icon: mode.icon as import("lucide-react").LucideIcon,
  }));

  // ── Filter row options (with counts) ────────────────────────
  const populationOptions: ComboboxOption<UserTab>[] = TABS.map((tab) => ({
    value: tab.id,
    label: `${tab.label} (${populationCounts[tab.id]})`,
  }));

  const allRoles = [
    "super_admin", "admin_system", "admin", "sous_admin",
    "intel_agent", "education_agent", "user",
  ] as const;
  const roleOptions: ComboboxOption<string>[] = allRoles
    .filter((r) => (roleCounts[r] ?? 0) > 0)
    .map((r) => ({
      value: r,
      label: `${ROLE_META[r]?.label ?? r} (${roleCounts[r] ?? 0})`,
    }));

  const continentOptions: ComboboxOption<Continent>[] = continentData.continents.map(
    (c) => ({
      value: c,
      label: `${CONTINENT_META[c].label} (${continentData.counts[c] ?? 0})`,
    }),
  );

  const countryComboboxOptions: ComboboxOption<string>[] = countryOptions.map(
    (opt) => ({
      value: opt.value,
      label: `${opt.label} (${opt.count})`,
    }),
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 md:p-4">
      <PageHeader
        icon={<UsersIcon className="h-5 w-5" />}
        title="Comptes & Profils"
        subtitle={subtitleByView[view]}
      />

      {/* ── View Toggle (3 vues principales) ── */}
      <TabSwitcher
        tabs={viewModeTabs}
        activeTab={view}
        onTabChange={(key) => router.push(`/users?view=${key}`)}
        className="w-fit"
      />

      {/* ── Vue Profils Consulaires ── */}
      {view === "profiles" && <ProfilesView />}

      {/* ── Vue Corps Diplomatique ── */}
      {view === "diplomatic" && <DiplomaticProfilesView />}

      {/* ── Vue Compétences (agrégation skills + métiers) ── */}
      {view === "skills" && <SkillsView />}

      {/* ── Vue Carte (répartition géographique) ── */}
      {view === "map" && <UsersMapView />}

      {/* ── Vue Comptes (existant) ── */}
      {view === "accounts" && <>

      {/* Filter row — single Combobox primitive used for all 5 filters so
          they share the exact same trigger button, height, padding, hover
          and chevron styling. The "all" sentinel is the first option in each
          list and clears the filter when picked. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
        <FilterField label="Population">
          <Combobox
            options={[
              {
                value: "__all__",
                label: `Tous (${populationCounts.all})`,
              },
              ...populationOptions
                .filter((o) => o.value !== "all")
                .map((o) => ({ value: o.value, label: o.label })),
            ]}
            value={activeTab === "all" ? "__all__" : activeTab}
            onValueChange={(v) => {
              setActiveTab(v === "__all__" ? "all" : (v as UserTab));
              setActiveRole(null);
            }}
            placeholder="Population"
            searchPlaceholder="Filtrer…"
            emptyText="Aucune option."
            className="h-9"
          />
        </FilterField>

        <FilterField label="Rôle">
          <Combobox
            options={[
              { value: "__all__", label: `Tous les rôles (${users?.length ?? 0})` },
              ...roleOptions,
            ]}
            value={activeRole ?? "__all__"}
            onValueChange={(v) => setActiveRole(v === "__all__" ? null : v)}
            placeholder="Tous les rôles"
            searchPlaceholder="Filtrer…"
            emptyText="Aucun rôle."
            className="h-9"
          />
        </FilterField>

        <FilterField label="Continent">
          <Combobox
            options={[
              { value: "__all__", label: "Tous les continents" },
              ...continentOptions,
            ]}
            value={activeContinent ?? "__all__"}
            onValueChange={(v) =>
              setActiveContinent(v === "__all__" ? null : (v as Continent))
            }
            placeholder="Tous les continents"
            searchPlaceholder="Filtrer…"
            emptyText="Aucun continent."
            className="h-9"
          />
        </FilterField>

        <FilterField label="Pays">
          <Combobox
            options={[
              { value: "__all__", label: "Tous les pays" },
              ...countryComboboxOptions,
            ]}
            value={activeCountry ?? "__all__"}
            onValueChange={(v) => setActiveCountry(v === "__all__" ? null : v)}
            placeholder="Tous les pays"
            searchPlaceholder="Rechercher un pays…"
            emptyText="Aucun pays."
            className="h-9"
          />
        </FilterField>

        <FilterField label="Statut">
          <Combobox
            options={[
              { value: "__all__", label: "Tous statuts" },
              { value: "active", label: `Actif (${statusCounts.active})` },
              { value: "inactive", label: `Inactif (${statusCounts.inactive})` },
            ]}
            value={activeStatus ?? "__all__"}
            onValueChange={(v) =>
              setActiveStatus(
                v === "__all__" ? null : (v as "active" | "inactive"),
              )
            }
            placeholder="Tous statuts"
            searchPlaceholder="Filtrer…"
            emptyText="—"
            className="h-9"
          />
        </FilterField>

        <FilterField label={hasActiveFilter ? "Action" : " "}>
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-full font-normal"
            disabled={!hasActiveFilter}
            onClick={() => {
              setActiveTab("all");
              setActiveRole(null);
              setActiveContinent(null);
              setActiveCountry(null);
              setActiveStatus(null);
            }}
          >
            <X className="mr-1.5 h-3.5 w-3.5" />
            Réinitialiser
          </Button>
        </FilterField>
      </div>

      <FlatCard>
        <div className="p-3 lg:p-4">
          <DataTable
            columns={activeColumns}
            data={filteredUsers}
            searchKeys={["name", "email", "phone", "residenceCountry"]}
            searchPlaceholder={t("superadmin.users.filters.searchPlaceholder")}
            isLoading={isPending}
          />
        </div>
      </FlatCard>

      </>}
    </div>
  );
}

/** Small label + control wrapper used by the Comptes filter row. */
function FilterField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}
