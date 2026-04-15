"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useConvex } from "convex/react";
import { api } from "@convex/_generated/api";
import { DataTable } from "@/components/ui/data-table";
import { columns, corpsAdminColumns } from "@/components/admin/users-columns";
import { ProfilesView } from "@/components/admin/profiles-view";
import { DiplomaticProfilesView } from "@/components/admin/diplomatic-profiles-view";
import { Badge } from "@/components/ui/badge";
import { Crown, Shield, Users as UsersIcon } from "lucide-react";
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

type ViewMode = "accounts" | "profiles" | "diplomatic";

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
];

export default function UsersPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const view = (searchParams.get("view") as ViewMode) || "accounts";
  const convex = useConvex();

  const [activeTab, setActiveTab] = useState<UserTab>("all");
  const [activeContinent, setActiveContinent] = useState<Continent | null>(null);
  const [activeBackOfficeRole, setActiveBackOfficeRole] = useState<string | null>(null);

  // Drill-down states for "Corps Administratif"
  const [activeCorpsCountry, setActiveCorpsCountry] = useState<string | null>(null);
  const [activeCorpsOrg, setActiveCorpsOrg] = useState<string | null>(null);

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
          const res = await convex.query(api.functions.admin.listAllUsersChunk, { cursor });
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

  // Tab filtering + tri intelligent
  const tabFilteredUsers = useMemo(() => {
    if (!users) return [];
    switch (activeTab) {
      case "backoffice":
        // Filtrer + trier par hierarchie (Super Admin en premier)
        return users
          .filter((u: any) => BACKOFFICE_ROLES.includes(u.role))
          .sort((a: any, b: any) => (ROLE_RANK[b.role] ?? 0) - (ROLE_RANK[a.role] ?? 0));
      case "corps":
        // Filtrer + trier par representation (orgName) pour regrouper visuellement
        return users
          .filter((u: any) => u.hasMembership)
          .sort((a: any, b: any) => {
            const orgA = a.membershipInfo?.orgName ?? "";
            const orgB = b.membershipInfo?.orgName ?? "";
            return orgA.localeCompare(orgB, "fr");
          });
      case "agents":
        return users.filter((u: any) => AGENT_ROLES.includes(u.role));
      case "users":
        return users.filter((u: any) => !PRIVILEGED_ROLES.includes(u.role) && !u.hasMembership && u.isActive);
      case "inactive":
        return users.filter((u: any) => !u.isActive && !u.deletedAt);
      default:
        return users;
    }
  }, [users, activeTab]);

  // Sub-filtering: Back-Office / Agent role filter
  const roleFilteredUsers = useMemo(() => {
    if ((activeTab !== "backoffice" && activeTab !== "agents") || !activeBackOfficeRole) return tabFilteredUsers;
    return tabFilteredUsers.filter((u: any) => u.role === activeBackOfficeRole);
  }, [tabFilteredUsers, activeTab, activeBackOfficeRole]);

  // Continent filtering (on "all", "corps" and "agents" tabs)
  const usersFilteredByContinent = useMemo(() => {
    const source = activeTab === "backoffice" || activeTab === "agents" ? roleFilteredUsers : tabFilteredUsers;
    if ((activeTab !== "all" && activeTab !== "corps" && activeTab !== "agents") || !activeContinent) return source;
    return source.filter((u: any) => {
      const country = activeTab === "corps" ? (u.membershipInfo?.orgCountry || u.residenceCountry) : u.residenceCountry;
      return country && getContinent(country) === activeContinent;
    });
  }, [roleFilteredUsers, tabFilteredUsers, activeTab, activeContinent]);

  // Country filtering (only on "corps" tab)
  const usersFilteredByCountry = useMemo(() => {
    if (activeTab !== "corps" || !activeCorpsCountry) return usersFilteredByContinent;
    return usersFilteredByContinent.filter((u: any) => {
      const country = u.membershipInfo?.orgCountry || u.residenceCountry;
      return country === activeCorpsCountry;
    });
  }, [usersFilteredByContinent, activeTab, activeCorpsCountry]);

  // Org filtering (final step for "corps" tab)
  const filteredUsers = useMemo(() => {
    if (activeTab !== "corps" || !activeCorpsOrg) return usersFilteredByCountry;
    return usersFilteredByCountry.filter((u: any) => u.membershipInfo?.orgName === activeCorpsOrg);
  }, [usersFilteredByCountry, activeTab, activeCorpsOrg]);

  // Tab counts
  const counts = useMemo(() => {
    if (!users) return { all: 0, backoffice: 0, corps: 0, agents: 0, users: 0, inactive: 0 };
    const bo = users.filter((u: any) => BACKOFFICE_ROLES.includes(u.role));
    const corps = users.filter((u: any) => u.hasMembership);
    const agents = users.filter((u: any) => AGENT_ROLES.includes(u.role));
    const standard = users.filter((u: any) => !PRIVILEGED_ROLES.includes(u.role) && !u.hasMembership && u.isActive);
    const inactive = users.filter((u: any) => !u.isActive && !u.deletedAt);
    return {
      all: users.length,
      backoffice: bo.length,
      corps: corps.length,
      agents: agents.length,
      users: standard.length,
      inactive: inactive.length,
    };
  }, [users]);

  // Back-office role counts
  const backOfficeCounts = useMemo(() => {
    if (!users) return {} as Record<string, number>;
    const result: Record<string, number> = {};
    for (const role of BACKOFFICE_ROLES) {
      result[role] = users.filter((u: any) => u.role === role).length;
    }
    return result;
  }, [users]);

  // Agent role counts
  const agentCounts = useMemo(() => {
    if (!users) return {} as Record<string, number>;
    const result: Record<string, number> = {};
    for (const role of AGENT_ROLES) {
      result[role] = users.filter((u: any) => u.role === role).length;
    }
    return result;
  }, [users]);

  // Continent data (for "all", "corps" & "agents" tabs)
  const continentData = useMemo(() => {
    const source = activeTab === "corps" || activeTab === "agents" ? tabFilteredUsers : users;
    if (!source) return { continents: [] as Continent[], counts: {} as Record<Continent, number> };
    const countryCodes = source
      .map((u: any) => activeTab === "corps" ? (u.membershipInfo?.orgCountry || u.residenceCountry) : u.residenceCountry)
      .filter(Boolean) as string[];
    const continents = getActiveContinents(countryCodes);
    const counts = {} as Record<Continent, number>;
    for (const code of countryCodes) {
      const c = getContinent(code);
      if (c) counts[c] = (counts[c] || 0) + 1;
    }
    return { continents, counts };
  }, [users, tabFilteredUsers, activeTab]);

  // Country data (for "corps" tab)
  const corpsCountryData = useMemo(() => {
    if (activeTab !== "corps") return { countries: [], counts: {} as Record<string, number> };
    const source = usersFilteredByContinent;
    const countries = new Set<string>();
    const counts: Record<string, number> = {};
    for (const u of source) {
      const c = u.membershipInfo?.orgCountry || u.residenceCountry;
      if (c) {
        countries.add(c);
        counts[c] = (counts[c] || 0) + 1;
      }
    }
    return {
      countries: Array.from(countries).sort((a, b) => getCountryName(a).localeCompare(getCountryName(b))),
      counts,
    };
  }, [usersFilteredByContinent, activeTab]);

  // Org data (for "corps" tab)
  const corpsOrgData = useMemo(() => {
    if (activeTab !== "corps") return { orgs: [], counts: {} as Record<string, number> };
    const source = usersFilteredByCountry;
    const orgs = new Set<string>();
    const counts: Record<string, number> = {};
    for (const u of source) {
      const o = u.membershipInfo?.orgName;
      if (o && o !== "—") {
        orgs.add(o);
        counts[o] = (counts[o] || 0) + 1;
      }
    }
    return {
      orgs: Array.from(orgs).sort((a, b) => a.localeCompare(b)),
      counts,
    };
  }, [usersFilteredByCountry, activeTab]);

  // Dynamic country filter options
  const countryOptions = useMemo(() => {
    if (!filteredUsers || filteredUsers.length === 0) return [];
    const countries = new Map<string, string>();
    for (const user of filteredUsers) {
      const country = (user as any).residenceCountry;
      if (country && !countries.has(country)) {
        countries.set(
          country,
          `${getCountryFlag(country)} ${getCountryName(country)}`,
        );
      }
    }
    return [...countries.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredUsers]);

  const filterableColumns = [
    ...(activeTab === "all"
      ? [
          {
            id: "role",
            title: "Tous les rôles",
            options: [
              { label: "Utilisateur", value: "user" },
              { label: "Super Admin", value: "super_admin" },
              { label: "Admin Système", value: "admin_system" },
              { label: "Admin", value: "admin" },
              { label: "Agent Intel", value: "intel_agent" },
              { label: "Agent Éducation", value: "education_agent" },
            ],
          },
        ]
      : []),
    ...(countryOptions.length > 1
      ? [
          {
            id: "residenceCountry",
            title: "Tous les pays",
            options: countryOptions,
          },
        ]
      : []),
    {
      id: "isActive",
      title: "Statut",
      options: [
        { label: "Actif", value: "true" },
        { label: "Inactif", value: "false" },
      ],
    },
  ];

  const showContinentTabs = (activeTab === "all" || activeTab === "corps" || activeTab === "agents") && continentData.continents.length > 1;
  const activeColumns = activeTab === "corps" ? corpsAdminColumns : columns;

  // Construire le sous-titre dynamique selon la vue active
  const subtitleByView: Record<ViewMode, string> = {
    accounts: "Gestion des comptes de la plateforme",
    profiles: "Profils consulaires des citoyens et ressortissants",
    diplomatic: "Profils diplomatiques du corps administratif",
  };

  // Tabs pour le switcher de vue principale
  const viewModeTabs = VIEW_MODES.map((mode) => ({
    key: mode.id,
    label: mode.label,
    icon: mode.icon,
  }));

  // Tabs pour les roles utilisateur (onglet comptes)
  const userRoleTabs = TABS.map((tab) => ({
    key: tab.id,
    label: tab.label,
    count: counts[tab.id],
  }));

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

      {/* ── Vue Comptes (existant) ── */}
      {view === "accounts" && <>

      {/* Main Tabs */}
      <TabSwitcher
        tabs={userRoleTabs}
        activeTab={activeTab}
        onTabChange={(key) => {
          setActiveTab(key as UserTab);
          setActiveContinent(null);
          setActiveBackOfficeRole(null);
          setActiveCorpsCountry(null);
          setActiveCorpsOrg(null);
        }}
        className="flex-wrap"
      />

      {/* Continent Sub-Tabs (on "Tous", "Corps Admin" & "Agents" tabs) */}
      {showContinentTabs && (
        <div className="flex flex-wrap gap-1 px-1">
          <button
            type="button"
            onClick={() => {
              setActiveContinent(null);
              setActiveCorpsCountry(null);
              setActiveCorpsOrg(null);
            }}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
              !activeContinent
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
            )}
          >
            <span></span>
            <span>Tous</span>
            <span className="text-[10px] opacity-70 ml-0.5">
              {activeTab !== "all" ? tabFilteredUsers.length : users?.length ?? 0}
            </span>
          </button>
          {continentData.continents.map((continent) => {
            const meta = CONTINENT_META[continent];
            return (
              <button
                key={continent}
                type="button"
                onClick={() => {
                  setActiveContinent(continent);
                  setActiveCorpsCountry(null);
                  setActiveCorpsOrg(null);
                }}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                  activeContinent === continent
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
                )}
              >
                <span>{meta.emoji}</span>
                <span>{meta.label}</span>
                <span className="text-[10px] opacity-70 ml-0.5">
                  {continentData.counts[continent] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Country Sub-Tabs (only on "Corps Admin") */}
      {activeTab === "corps" && corpsCountryData.countries.length > 0 && (
        <div className="flex flex-wrap gap-1 px-1">
          <button
            type="button"
            onClick={() => {
              setActiveCorpsCountry(null);
              setActiveCorpsOrg(null);
            }}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
              !activeCorpsCountry
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
            )}
          >
            <span></span>
            <span>Tous les pays</span>
            <span className="text-[10px] opacity-70 ml-0.5">
              {usersFilteredByContinent.length}
            </span>
          </button>

          {corpsCountryData.countries.map((country) => (
            <button
              key={country}
              type="button"
              onClick={() => {
                setActiveCorpsCountry(country);
                setActiveCorpsOrg(null);
              }}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                activeCorpsCountry === country
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
              )}
            >
              <span>{getCountryFlag(country)}</span>
              <span>{getCountryName(country)}</span>
              <span className="text-[10px] opacity-70 ml-0.5">
                {corpsCountryData.counts[country] ?? 0}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Organizations Sub-Tabs (only on "Corps Admin" when a country is selected) */}
      {activeTab === "corps" && activeCorpsCountry && corpsOrgData.orgs.length > 0 && (
        <div className="flex flex-wrap gap-1 px-1">
          <button
            type="button"
            onClick={() => setActiveCorpsOrg(null)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
              !activeCorpsOrg
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
            )}
          >
            <span></span>
            <span>Toutes les représentations</span>
            <span className="text-[10px] opacity-70 ml-0.5">
              {usersFilteredByCountry.length}
            </span>
          </button>

          {corpsOrgData.orgs.map((org) => (
            <button
              key={org}
              type="button"
              onClick={() => setActiveCorpsOrg(org)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all max-w-[200px]",
                activeCorpsOrg === org
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
              )}
            >
              <span className="truncate">{org}</span>
              <span className="text-[10px] opacity-70 ml-0.5 shrink-0">
                {corpsOrgData.counts[org] ?? 0}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Back-Office Sub-Role Filters (clickable badges) */}
      {activeTab === "backoffice" && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveBackOfficeRole(null)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all",
              !activeBackOfficeRole
                ? "bg-primary/10 text-primary border-primary/30"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
          >
            <span></span>
            <span className="font-medium">Tous</span>
            <Badge variant="outline" className="h-5 min-w-[20px] px-1.5 text-[10px]">
              {counts.backoffice}
            </Badge>
          </button>
          {BACKOFFICE_ROLES.map((role) => {
            const meta = ROLE_META[role];
            const isActive = activeBackOfficeRole === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => setActiveBackOfficeRole(isActive ? null : role)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all",
                  isActive
                    ? cn(meta.color)
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                <span>{meta.emoji}</span>
                <span className="font-medium">{meta.label}</span>
                <Badge variant="outline" className="h-5 min-w-[20px] px-1.5 text-[10px]">
                  {backOfficeCounts[role]}
                </Badge>
              </button>
            );
          })}
        </div>
      )}

      {/* Agents Sub-Role Filters */}
      {activeTab === "agents" && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveBackOfficeRole(null)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all",
              !activeBackOfficeRole
                ? "bg-primary/10 text-primary border-primary/30"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
          >
            <span></span>
            <span className="font-medium">Tous</span>
            <Badge variant="outline" className="h-5 min-w-[20px] px-1.5 text-[10px]">
              {counts.agents}
            </Badge>
          </button>
          {AGENT_ROLES.map((role) => {
            const meta = ROLE_META[role];
            const isActive = activeBackOfficeRole === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => setActiveBackOfficeRole(isActive ? null : role)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all",
                  isActive
                    ? cn(meta.color)
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                <span>{meta.emoji}</span>
                <span className="font-medium">{meta.label}</span>
                <Badge variant="outline" className="h-5 min-w-[20px] px-1.5 text-[10px]">
                  {agentCounts[role]}
                </Badge>
              </button>
            );
          })}
        </div>
      )}

      <FlatCard>
        <div className="p-3 lg:p-4">
          <DataTable
            columns={activeColumns}
            data={filteredUsers}
            searchKeys={["name", "email", "phone", "residenceCountry"]}
            searchPlaceholder={t("superadmin.users.filters.searchPlaceholder")}
            filterableColumns={filterableColumns}
            isLoading={isPending}
          />
        </div>
      </FlatCard>

      </>}
    </div>
  );
}
