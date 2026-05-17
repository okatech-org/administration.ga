import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { backofficeQuery, superadminQuery, superadminMutation, backofficeMutation } from "../lib/customFunctions";
import { error, ErrorCode } from "../lib/errors";
import { getEffectiveRole } from "../lib/auth";
import { UserRole } from "../lib/constants";
import { components } from "../_generated/api";
import { logCortexAction } from "../lib/neocortex";
import { SIGNAL_TYPES, CATEGORIES_ACTION, CORTEX } from "../lib/types";
import {
  globalCounts,
  requestsByOrg,
  requestsGlobal,
  orgsGlobal,
  servicesGlobal,
  associationsGlobal,
  companiesGlobal,
} from "../lib/aggregates";

// Role hierarchy rank (higher = more privileged)
const ROLE_RANK: Record<string, number> = {
  [UserRole.User]: 0,
  [UserRole.SousAdmin]: 1,
  [UserRole.Admin]: 2,
  [UserRole.AdminSystem]: 3,
  [UserRole.SuperAdmin]: 4,
};

// Types d'orgs considérés comme "représentation diplomatique" pour les
// agrégations du widget "Top représentations" et les compteurs `deployment.*`.
// Exclut explicitement Ministry (tutelle, ex: MAE Libreville), IntelligenceAgency
// (cloisonné) et ThirdParty (partenaires externes). Inclut les types legacy
// tolérés par `orgTypeValidator`.
const REPRESENTATION_TYPES = new Set<string>([
  "embassy",
  "high_representation",
  "general_consulate",
  "high_commission",
  "permanent_mission",
  "consulate",
  "honorary_consulate",
]);

// Helper to enrich user with profile + membership data
async function enrichUser(ctx: any, user: any) {
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q: any) => q.eq("userId", user._id))
    .unique();

  // Fetch all memberships for this user (prefix match on userId)
  const allMemberships = await ctx.db
    .query("memberships")
    .withIndex("by_user_org", (q: any) => q.eq("userId", user._id))
    .collect();
  const activeMemberships = allMemberships.filter((m: any) => !m.deletedAt);

  // Enrich first membership with org + position info
  let membershipInfo = null;
  if (activeMemberships.length > 0) {
    const m = activeMemberships[0];
    const org = await ctx.db.get(m.orgId);
    let positionTitle = null;
    if (m.positionId) {
      const position = await ctx.db.get(m.positionId);
      // position.title is LocalizedString { fr, en } — resolve to string
      if (position?.title) {
        positionTitle = typeof position.title === "string"
          ? position.title
          : position.title.fr || position.title.en || null;
      }
    }
    membershipInfo = {
      orgName: org?.name ?? "—",
      orgSlug: org?.slug,
      positionTitle,
      totalMemberships: activeMemberships.length,
    };
  }

  return {
    ...user,
    role: getEffectiveRole(user),
    phone: profile?.contacts?.phone,
    nationality: profile?.identity?.nationality,
    residenceCountry: profile?.addresses?.residence?.country,
    createdAt: user._creationTime,
    isVerified: !!user.authId,
    profileId: profile?._id,
    hasMembership: activeMemberships.length > 0,
    membershipInfo,
  };
}

/**
 * List all users with enriched data (paginated)
 */
export const listUsers = backofficeQuery({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const paginatedResult = await ctx.db
      .query("users")
      .order("desc")
      .paginate(args.paginationOpts);

    // Enrich with profile data for the current page only
    const enrichedPage = await Promise.all(
      paginatedResult.page.map((user) => enrichUser(ctx, user)),
    );

    return {
      ...paginatedResult,
      page: enrichedPage,
    };
  },
});

/**
 * Fetch users in chunks (paginated), returning enriched data.
 * Used by Super Admin dashboard for progressive loading of all users.
 */
export const listAllUsersChunk = backofficeQuery({
  args: {
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    // 1) Fetch paginated users (300 per chunk keeps profile/membership reads well below 4096 limit)
    const paginated = await ctx.db
      .query("users")
      .order("desc")
      .paginate({ cursor: args.cursor, numItems: 300 });

    // 2) Fetch active memberships globally for this execution to save N queries
    const allMemberships = await ctx.db.query("memberships").collect();
    const activeMemberships = allMemberships.filter((m) => !m.deletedAt);
    
    // Group memberships by user
    const membershipsByUserId = new Map<string, any[]>();
    for (const m of activeMemberships) {
      if (!membershipsByUserId.has(m.userId)) membershipsByUserId.set(m.userId, []);
      membershipsByUserId.get(m.userId)!.push(m);
    }

    // Prepare global maps for orgs and positions to avoid N+1 inside map
    const orgIds = new Set<string>();
    const posIds = new Set<string>();
    for (const m of activeMemberships) {
      orgIds.add(m.orgId);
      if (m.positionId) posIds.add(m.positionId);
    }
    const [allOrgs, allPositions] = await Promise.all([
      Promise.all(Array.from(orgIds).map(id => ctx.db.get(id as any))),
      Promise.all(Array.from(posIds).map(id => ctx.db.get(id as any))),
    ]);
    const orgsMap = new Map((allOrgs.filter(Boolean) as any[]).map(o => [o._id, o]));
    const posMap = new Map((allPositions.filter(Boolean) as any[]).map(p => [p._id, p]));

    const enrichedPage = await Promise.all(
      paginated.page.map(async (user) => {
        // Fetch profile explicitly (1 read per user)
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q: any) => q.eq("userId", user._id))
          .unique();

        const userMemberships = membershipsByUserId.get(user._id) || [];
        
        let membershipInfo = null;
        if (userMemberships.length > 0) {
          const m = userMemberships[0];
          const org = orgsMap.get(m.orgId);
          let positionTitle = null;
          if (m.positionId) {
            const position = posMap.get(m.positionId);
            if (position?.title) {
              positionTitle = typeof position.title === "string"
                ? position.title
                : position.title.fr || position.title.en || null;
            }
          }
          membershipInfo = {
            orgName: org?.name ?? "—",
            orgSlug: org?.slug,
            orgCountry: org?.country,
            positionTitle,
            totalMemberships: userMemberships.length,
          };
        }

        return {
          ...user,
          role: getEffectiveRole(user),
          phone: profile?.contacts?.phone,
          nationality: profile?.identity?.nationality,
          countryOfResidence: profile?.countryOfResidence,
          residenceCountry: profile?.countryOfResidence || profile?.addresses?.residence?.country || profile?.identity?.nationality || membershipInfo?.orgCountry,
          createdAt: user._creationTime,
          isVerified: !!user.authId,
          profileId: profile?._id,
          hasMembership: userMemberships.length > 0,
          membershipInfo,
          deletedAt: (user as any).deletedAt ?? null,
        };
      })
    );

    return {
      page: enrichedPage,
      isDone: paginated.isDone,
      continueCursor: paginated.continueCursor,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// /users page — server-side paginated + faceted user listing.
//
// Replaces the previous "fetch ALL users in a while-loop then filter/count in
// the browser" pattern. Two queries:
//
//   listUsersPaged(filters, paginationOpts) → enriched, filtered, paginated
//   getUserFacets()                         → counts only (small payload)
//
// Filtering happens AFTER enrichment because population/country require joins
// with profiles + memberships. The page can be smaller than `numItems` when
// filters reject rows — that's expected with cursor pagination, the client
// just calls loadMore until it has enough.
// ─────────────────────────────────────────────────────────────────────────────

const BACKOFFICE_ROLES_FOR_FILTER = ["super_admin", "admin_system", "admin", "sous_admin"] as const;
const AGENT_ROLES_FOR_FILTER = ["intel_agent", "education_agent"] as const;

type Population = "all" | "backoffice" | "corps" | "agents" | "users" | "inactive";

function populationOfUser(
  role: string | undefined,
  isActive: boolean,
  deletedAt: number | undefined | null,
  hasMembership: boolean,
): Exclude<Population, "all"> {
  if (!isActive && !deletedAt) return "inactive";
  if (role && (BACKOFFICE_ROLES_FOR_FILTER as readonly string[]).includes(role)) return "backoffice";
  if (role && (AGENT_ROLES_FOR_FILTER as readonly string[]).includes(role)) return "agents";
  if (hasMembership) return "corps";
  return "users";
}

// ISO 3166-1 alpha-2 → continent. Mirrors the client-side map in
// apps/backoffice-web/src/lib/country-utils.ts so the back-end can derive
// continent filters without a client round-trip.
const COUNTRY_CONTINENT_SERVER: Record<string, string> = {
  ZA: "africa", DZ: "africa", AO: "africa", BJ: "africa", BW: "africa",
  BF: "africa", BI: "africa", CV: "africa", CM: "africa", CF: "africa",
  TD: "africa", KM: "africa", CG: "africa", CD: "africa", CI: "africa",
  DJ: "africa", EG: "africa", GQ: "africa", ER: "africa", SZ: "africa",
  ET: "africa", GA: "africa", GM: "africa", GH: "africa", GN: "africa",
  GW: "africa", KE: "africa", LS: "africa", LR: "africa", LY: "africa",
  MG: "africa", MW: "africa", ML: "africa", MR: "africa", MU: "africa",
  MA: "africa", MZ: "africa", NA: "africa", NE: "africa", NG: "africa",
  RW: "africa", ST: "africa", SN: "africa", SC: "africa", SL: "africa",
  SO: "africa", SS: "africa", SD: "africa", TZ: "africa", TG: "africa",
  TN: "africa", UG: "africa", ZM: "africa", ZW: "africa",
  AL: "europe", AD: "europe", AT: "europe", BY: "europe", BE: "europe",
  BA: "europe", BG: "europe", HR: "europe", CY: "europe", CZ: "europe",
  DK: "europe", EE: "europe", FI: "europe", FR: "europe", DE: "europe",
  GR: "europe", HU: "europe", IS: "europe", IE: "europe", IT: "europe",
  XK: "europe", LV: "europe", LI: "europe", LT: "europe", LU: "europe",
  MT: "europe", MD: "europe", MC: "europe", ME: "europe", NL: "europe",
  MK: "europe", NO: "europe", PL: "europe", PT: "europe", RO: "europe",
  RU: "europe", SM: "europe", RS: "europe", SK: "europe", SI: "europe",
  ES: "europe", SE: "europe", CH: "europe", UA: "europe", GB: "europe",
  VA: "europe",
  AG: "americas", AR: "americas", BS: "americas", BB: "americas", BZ: "americas",
  BO: "americas", BR: "americas", CA: "americas", CL: "americas", CO: "americas",
  CR: "americas", CU: "americas", DM: "americas", DO: "americas", EC: "americas",
  SV: "americas", GD: "americas", GT: "americas", GY: "americas", HT: "americas",
  HN: "americas", JM: "americas", MX: "americas", NI: "americas", PA: "americas",
  PY: "americas", PE: "americas", KN: "americas", LC: "americas", VC: "americas",
  SR: "americas", TT: "americas", US: "americas", UY: "americas", VE: "americas",
  AF: "asia", BD: "asia", BT: "asia", BN: "asia", KH: "asia",
  CN: "asia", FJ: "asia", IN: "asia", ID: "asia", JP: "asia",
  KZ: "asia", KG: "asia", LA: "asia", MY: "asia", MV: "asia",
  MN: "asia", MM: "asia", NP: "asia", NZ: "asia", PK: "asia",
  PH: "asia", SG: "asia", KR: "asia", LK: "asia", TW: "asia",
  TJ: "asia", TH: "asia", TL: "asia", TM: "asia", UZ: "asia",
  VN: "asia", AU: "asia",
  BH: "middle_east", IR: "middle_east", IQ: "middle_east", IL: "middle_east",
  JO: "middle_east", KW: "middle_east", LB: "middle_east", OM: "middle_east",
  PS: "middle_east", QA: "middle_east", SA: "middle_east", SY: "middle_east",
  TR: "middle_east", AE: "middle_east", YE: "middle_east",
};

const filtersValidator = v.object({
  population: v.optional(v.union(
    v.literal("all"),
    v.literal("backoffice"),
    v.literal("corps"),
    v.literal("agents"),
    v.literal("users"),
    v.literal("inactive"),
  )),
  role: v.optional(v.string()),
  continent: v.optional(v.string()),
  country: v.optional(v.string()),
  status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  search: v.optional(v.string()),
});

// Enrich a single user with profile + first membership + derived fields.
// Pulled out so both the fast (aggregate) and the slow (filtered scan) paths
// produce identical row shapes.
async function enrichUserForListing(ctx: any, user: any) {
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q: any) => q.eq("userId", user._id))
    .unique();

  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_user_org", (q: any) => q.eq("userId", user._id))
    .collect();
  const activeMemberships = memberships.filter((m: any) => !m.deletedAt);

  let membershipInfo: any = null;
  if (activeMemberships.length > 0) {
    const m = activeMemberships[0];
    const org = await ctx.db.get(m.orgId);
    let positionTitle: string | null = null;
    if (m.positionId) {
      const position = await ctx.db.get(m.positionId);
      if (position && (position as any).title) {
        const title = (position as any).title;
        positionTitle = typeof title === "string"
          ? title
          : title.fr || title.en || null;
      }
    }
    membershipInfo = {
      orgName: (org as any)?.name ?? "—",
      orgSlug: (org as any)?.slug,
      orgCountry: (org as any)?.country,
      positionTitle,
      totalMemberships: activeMemberships.length,
    };
  }

  return {
    ...user,
    role: getEffectiveRole(user),
    phone: profile?.contacts?.phone,
    nationality: profile?.identity?.nationality,
    countryOfResidence: profile?.countryOfResidence,
    residenceCountry:
      profile?.countryOfResidence ||
      profile?.addresses?.residence?.country ||
      profile?.identity?.nationality ||
      membershipInfo?.orgCountry,
    createdAt: user._creationTime,
    isVerified: !!user.authId,
    profileId: profile?._id,
    hasMembership: activeMemberships.length > 0,
    membershipInfo,
    deletedAt: (user as any).deletedAt ?? null,
  };
}

function matchesFilters(u: any, f: any): boolean {
  if (f.population && f.population !== "all") {
    const pop = populationOfUser(u.role, u.isActive, u.deletedAt, u.hasMembership);
    if (pop !== f.population) return false;
  }
  if (f.role && u.role !== f.role) return false;

  const country: string | undefined =
    u.membershipInfo?.orgCountry || u.residenceCountry;
  if (f.country && country !== f.country) return false;
  if (f.continent) {
    const c = country ? COUNTRY_CONTINENT_SERVER[country.toUpperCase()] : undefined;
    if (c !== f.continent) return false;
  }

  if (f.status === "active" && !u.isActive) return false;
  if (f.status === "inactive" && (u.isActive || u.deletedAt)) return false;

  if (f.search && f.search.trim().length > 0) {
    const s = f.search.trim().toLowerCase();
    const haystack = [u.name, u.email, u.phone, u.firstName, u.lastName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(s)) return false;
  }

  return true;
}

/**
 * Offset-based paginated user listing for the /users page Comptes view.
 *
 * Returns `{ rows, total }` so the table can show a real "Page N sur M"
 * pagination with jump-to-page.
 *
 * Two paths:
 *   - **Unfiltered:** uses the `globalCounts` TableAggregate for an O(log n)
 *     total + boundary lookup (no full scan). Then `take(pageSize)` from the
 *     users table using the by_creation_time index. Page change cost:
 *     `O(log n + pageSize)` reads, regardless of table size.
 *
 *   - **Filtered:** scans every user once (filters depend on profile +
 *     membership joins that aren't covered by aggregates today), enriches,
 *     filters, slices to the page. Cost: `O(n)` per query — acceptable
 *     because Convex caches by exact args, and filtered views narrow data
 *     significantly.
 *
 * @see https://stack.convex.dev/efficient-count-sum-max-with-the-aggregate-component
 * @see https://docs.convex.dev/database/pagination
 */
export const listUsersPage = backofficeQuery({
  args: {
    filters: filtersValidator,
    page: v.number(),     // 0-indexed
    pageSize: v.number(), // bounded client-side; server clamps to [1, 100]
  },
  handler: async (ctx, args) => {
    const pageSize = Math.max(1, Math.min(100, Math.floor(args.pageSize)));
    const page = Math.max(0, Math.floor(args.page));
    const f = args.filters;

    const hasFilters =
      (!!f.population && f.population !== "all") ||
      !!f.role ||
      !!f.country ||
      !!f.continent ||
      !!f.status ||
      !!(f.search && f.search.trim().length > 0);

    // ─── Fast path: no filters → aggregate-driven O(log n) pagination ───
    if (!hasFilters) {
      const total = await globalCounts.count(ctx, {});
      const start = page * pageSize;
      if (start >= total) {
        return { rows: [], total };
      }

      // Aggregate sortKey is _creationTime ascending. We display descending
      // (most recent first), so the i-th displayed row corresponds to
      // aggregate offset `-1 - i` (negative offsets count from the end —
      // `at(-1)` is the largest key, i.e. the most recent user).
      const startItem = await globalCounts.at(ctx, -1 - start, {});
      const boundaryTime = startItem.key as number;

      // Take the page starting at the boundary creation time, descending.
      // Tie-breaking on identical _creationTime is best-effort here — the
      // built-in by_creation_time index orders by (_creationTime, _id) and
      // ms-precision collisions are rare in practice.
      const docs = await ctx.db
        .query("users")
        .withIndex("by_creation_time", (q) =>
          q.lte("_creationTime", boundaryTime),
        )
        .order("desc")
        .take(pageSize);

      const rows = await Promise.all(docs.map((d) => enrichUserForListing(ctx, d)));
      return { rows, total };
    }

    // ─── Slow path: filters active → scan + filter + slice ───
    // Bulk-load memberships + orgs + profiles once, then enrich users
    // without the per-user round-trips of `enrichUserForListing`.
    const [users, memberships, profiles] = await Promise.all([
      ctx.db.query("users").order("desc").collect(),
      ctx.db.query("memberships").collect(),
      ctx.db.query("profiles").collect(),
    ]);

    const activeMembs = memberships.filter((m: any) => !m.deletedAt);
    const firstMembershipByUser = new Map<string, any>();
    const membershipCountByUser = new Map<string, number>();
    for (const m of activeMembs) {
      if (!firstMembershipByUser.has(m.userId)) firstMembershipByUser.set(m.userId, m);
      membershipCountByUser.set(m.userId, (membershipCountByUser.get(m.userId) ?? 0) + 1);
    }

    const orgIds = new Set<string>(activeMembs.map((m: any) => m.orgId));
    const positionIds = new Set<string>(
      activeMembs.filter((m: any) => m.positionId).map((m: any) => m.positionId!),
    );
    const [orgs, positions] = await Promise.all([
      Promise.all(Array.from(orgIds).map((id) => ctx.db.get(id as any))),
      Promise.all(Array.from(positionIds).map((id) => ctx.db.get(id as any))),
    ]);
    const orgsMap = new Map<string, any>(
      (orgs.filter(Boolean) as any[]).map((o) => [o._id, o]),
    );
    const posMap = new Map<string, any>(
      (positions.filter(Boolean) as any[]).map((p) => [p._id, p]),
    );

    const profileByUser = new Map<string, any>();
    for (const p of profiles) profileByUser.set(p.userId, p);

    const enriched = users.map((user: any) => {
      const profile = profileByUser.get(user._id);
      const m = firstMembershipByUser.get(user._id);
      const totalMemberships = membershipCountByUser.get(user._id) ?? 0;

      let membershipInfo: any = null;
      if (m) {
        const org = orgsMap.get(m.orgId);
        let positionTitle: string | null = null;
        if (m.positionId) {
          const position = posMap.get(m.positionId);
          if (position?.title) {
            positionTitle = typeof position.title === "string"
              ? position.title
              : position.title.fr || position.title.en || null;
          }
        }
        membershipInfo = {
          orgName: org?.name ?? "—",
          orgSlug: org?.slug,
          orgCountry: org?.country,
          positionTitle,
          totalMemberships,
        };
      }

      return {
        ...user,
        role: getEffectiveRole(user),
        phone: profile?.contacts?.phone,
        nationality: profile?.identity?.nationality,
        countryOfResidence: profile?.countryOfResidence,
        residenceCountry:
          profile?.countryOfResidence ||
          profile?.addresses?.residence?.country ||
          profile?.identity?.nationality ||
          membershipInfo?.orgCountry,
        createdAt: user._creationTime,
        isVerified: !!user.authId,
        profileId: profile?._id,
        hasMembership: totalMemberships > 0,
        membershipInfo,
        deletedAt: (user as any).deletedAt ?? null,
      };
    });

    const filtered = enriched.filter((u: any) => matchesFilters(u, f));
    const total = filtered.length;
    const start = page * pageSize;
    return { rows: filtered.slice(start, start + pageSize), total };
  },
});

/**
 * Aggregate counts for the /users page filter dropdowns. Scans users +
 * profiles + memberships server-side, returns only numbers. Previously these
 * counts were computed in the browser after transferring every user record —
 * this query keeps the heavy data on the server and ships ~few KB instead.
 *
 * Future optimization: replace the full scan with TableAggregates
 * (usersByRole, usersByCountry) for O(log n) counts — requires denormalizing
 * country onto the users table + triggers when profile.countryOfResidence
 * changes.
 *
 * @see https://www.convex.dev/components/aggregate
 */
export const getUserFacets = backofficeQuery({
  args: {},
  handler: async (ctx) => {
    const [users, memberships, profiles] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("memberships").collect(),
      ctx.db.query("profiles").collect(),
    ]);

    const activeMemberships = memberships.filter((m: any) => !m.deletedAt);
    const userHasMembership = new Set<string>();
    const firstMembershipByUser = new Map<string, any>();
    for (const m of activeMemberships) {
      userHasMembership.add(m.userId);
      if (!firstMembershipByUser.has(m.userId)) {
        firstMembershipByUser.set(m.userId, m);
      }
    }

    // Resolve orgs only for those that have at least one membership.
    const orgIds = new Set<string>(activeMemberships.map((m: any) => m.orgId));
    const orgs = await Promise.all(
      Array.from(orgIds).map((id) => ctx.db.get(id as any)),
    );
    const orgsMap = new Map<string, any>(
      (orgs.filter(Boolean) as any[]).map((o) => [o._id, o]),
    );

    const profileByUser = new Map<string, any>();
    for (const p of profiles) profileByUser.set(p.userId, p);

    const populations: Record<Exclude<Population, "all">, number> = {
      backoffice: 0, corps: 0, agents: 0, users: 0, inactive: 0,
    };
    const roles: Record<string, number> = {};
    const countries: Record<string, number> = {};
    const continents: Record<string, number> = {};
    const statuses = { active: 0, inactive: 0 };

    for (const u of users) {
      const role = getEffectiveRole(u);
      const has = userHasMembership.has(u._id);
      const deletedAt = (u as any).deletedAt ?? null;

      const pop = populationOfUser(role, u.isActive, deletedAt, has);
      populations[pop]++;

      if (role) roles[role] = (roles[role] ?? 0) + 1;

      if (u.isActive) statuses.active++;
      else if (!deletedAt) statuses.inactive++;

      const profile = profileByUser.get(u._id);
      const m = firstMembershipByUser.get(u._id);
      const orgCountry = m ? orgsMap.get(m.orgId)?.country : undefined;
      const country: string | undefined =
        orgCountry ||
        profile?.countryOfResidence ||
        profile?.addresses?.residence?.country ||
        profile?.identity?.nationality;
      if (country) {
        const code = country.toUpperCase();
        countries[code] = (countries[code] ?? 0) + 1;
        const continent = COUNTRY_CONTINENT_SERVER[code];
        if (continent) continents[continent] = (continents[continent] ?? 0) + 1;
      }
    }

    return {
      total: users.length,
      populations,
      roles,
      countries,
      continents,
      statuses,
    };
  },
});

/**
 * Fetch users in chunks with their profession + CV skills, for the
 * /users?view=skills back-office aggregation. Aggregation happens client-side
 * to avoid materialising the full cross-product server-side.
 */
export const listSkillsChunk = backofficeQuery({
  args: {
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const paginated = await ctx.db
      .query("users")
      .order("desc")
      .paginate({ cursor: args.cursor, numItems: 300 });

    const rows = await Promise.all(
      paginated.page.map(async (u) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q: any) => q.eq("userId", u._id))
          .unique();
        const cv = await ctx.db
          .query("cv")
          .withIndex("by_user", (q: any) => q.eq("userId", u._id))
          .unique();

        return {
          _id: u._id,
          firstName: u.firstName ?? null,
          lastName: u.lastName ?? null,
          email: u.email ?? null,
          role: getEffectiveRole(u),
          residenceCountry:
            profile?.countryOfResidence ||
            profile?.addresses?.residence?.country ||
            profile?.identity?.nationality ||
            null,
          profession: profile?.profession ?? null,
          skills: cv?.skills ?? [],
          cvTitle: cv?.title ?? null,
          isActive: u.isActive,
          deletedAt: (u as any).deletedAt ?? null,
        };
      }),
    );

    return {
      page: rows,
      isDone: paginated.isDone,
      continueCursor: paginated.continueCursor,
    };
  },
});

/**
 * Get single enriched user
 */
export const getUser = backofficeQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    return await enrichUser(ctx, user);
  },
});

/**
 * List all organizations.
 *
 * Par défaut filtre les organismes en corbeille (deletedAt set). Passe
 * `mode: "trash"` pour ne récupérer QUE les soft-deleted, ou `mode: "all"`
 * pour tout voir (compat anciennes vues).
 */
export const listOrgs = backofficeQuery({
  args: {
    mode: v.optional(v.union(v.literal("active"), v.literal("trash"), v.literal("all"))),
  },
  handler: async (ctx, args) => {
    const mode = args.mode ?? "active";
    const all = await ctx.db.query("orgs").take(500);
    if (mode === "all") return all.slice(0, 200);
    if (mode === "trash") return all.filter((o) => !!o.deletedAt).slice(0, 200);
    return all.filter((o) => !o.deletedAt).slice(0, 200);
  },
});

/**
 * List all diplomatic members (corps administratif) with enriched profiles.
 * Returns memberships that have a positionId (= staff, not citizens).
 */
export const listDiplomaticMembers = backofficeQuery({
  args: {},
  handler: async (ctx) => {
    // Récupérer toutes les memberships actives avec un poste
    const allMemberships = await ctx.db
      .query("memberships")
      .collect();

    const activeMemberships = allMemberships.filter(
      (m) => !m.deletedAt && m.positionId,
    );

    // Batch lookup: users, positions, orgs
    const userIds = [...new Set(activeMemberships.map((m) => m.userId))];
    const positionIds = [...new Set(activeMemberships.map((m) => m.positionId!))];
    const orgIds = [...new Set(activeMemberships.map((m) => m.orgId))];

    const [users, positions, orgs] = await Promise.all([
      Promise.all(userIds.map((id) => ctx.db.get(id))),
      Promise.all(positionIds.map((id) => ctx.db.get(id))),
      Promise.all(orgIds.map((id) => ctx.db.get(id))),
    ]);

    const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u!]));
    const positionMap = new Map(positions.filter(Boolean).map((p) => [p!._id, p!]));
    const orgMap = new Map(orgs.filter(Boolean).map((o) => [o!._id, o!]));

    return activeMemberships.map((m) => {
      const user = userMap.get(m.userId);
      const position = m.positionId ? positionMap.get(m.positionId) : null;
      const org = orgMap.get(m.orgId);

      return {
        membershipId: m._id,
        orgId: m.orgId,
        diplomaticProfile: (m as any).diplomaticProfile ?? null,
        isPublicContact: m.isPublicContact,
        user: user
          ? {
              _id: user._id,
              name: user.name,
              email: user.email,
              firstName: (user as any).firstName,
              lastName: (user as any).lastName,
              avatarUrl: (user as any).avatarUrl,
            }
          : null,
        position: position
          ? {
              code: position.code,
              title: position.title,
              grade: position.grade,
              level: position.level,
            }
          : null,
        org: org
          ? {
              _id: org._id,
              name: org.name,
              type: org.type,
              country: org.country,
              slug: org.slug,
            }
          : null,
      };
    }).filter((m) => m.user !== null);
  },
});

/**
 * Get user memberships
 */
export const getUserMemberships = backofficeQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) => q.eq("userId", args.userId))
      .collect();

    const orgIds = memberships.map((m) => m.orgId);

    const orgs = await Promise.all(orgIds.map((id) => ctx.db.get(id)));
    const orgMap = new Map(orgs.filter(Boolean).map((o) => [o!._id, o!]));

    return memberships.map((m) => ({
      ...m,
      org: orgMap.get(m.orgId),
      joinedAt: m._creationTime,
    }));
  },
});

/**
 * Get user audit logs
 */
export const getUserAuditLogs = backofficeQuery({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_actor", (q) => q.eq("actorId", args.userId))
      .order("desc")
      .take(args.limit || 10);

    return events.map((e) => ({
      _id: e._id,
      action: e.type,
      details: JSON.stringify(e.data),
      timestamp: e._creationTime,
    }));
  },
});

/**
 * Get global stats for dashboard — uses Aggregate for users count.
 * Superadmin-only, called rarely, so lightweight DB scans for other tables are acceptable.
 * Returns enriched data for KPI cards, status chart, recent requests table,
 * PLUS strategic intelligence: deployment progress, performance metrics, security alerts.
 */
export const getStats = backofficeQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    // All counts via aggregates (O(log n) each)
    const [
      totalUsers,
      totalOrgs,
      activeServices,
      totalRequests,
      totalAssociations,
      totalCompanies,
    ] = await Promise.all([
      globalCounts.count(ctx, {}),
      orgsGlobal.count(ctx, {}),
      servicesGlobal.count(ctx, { bounds: { lower: { key: 1, inclusive: true }, upper: { key: 1, inclusive: true } } }),
      requestsGlobal.count(ctx, {}),
      associationsGlobal.count(ctx, {}),
      companiesGlobal.count(ctx, {}),
    ]);

    // Request status breakdown via aggregates
    const statuses = ["draft", "submitted", "pending", "pending_completion", "edited", "under_review", "processing", "in_production", "validated", "appointment_scheduled", "ready_for_pickup", "completed", "cancelled", "rejected"];
    const statusBreakdown: Record<string, number> = {};
    for (const status of statuses) {
      const count = await requestsGlobal.count(ctx, { bounds: { prefix: [status] } });
      if (count > 0) statusBreakdown[status] = count;
    }

    // Registrations + appointments counts — bounded queries (no global aggregate yet)
    const [registrationsDocs, appointmentsDocs] = await Promise.all([
      ctx.db.query("consularRegistrations").take(5000),
      ctx.db.query("appointments").take(5000),
    ]);
    const registrationsCount = registrationsDocs.length;

    // Recent 10 requests (most recent first) — lightweight targeted query
    const sortedRequests = await ctx.db
      .query("requests")
      .order("desc")
      .take(10);

    // Batch-fetch related entities for the recent requests
    const userIds = [...new Set(sortedRequests.map((r) => r.userId))];
    const orgIds = [...new Set(sortedRequests.map((r) => r.orgId))];
    const orgServiceIds = [
      ...new Set(sortedRequests.map((r) => r.orgServiceId)),
    ];

    const [users, orgsForReqs, orgServices] = await Promise.all([
      Promise.all(userIds.map((id) => ctx.db.get(id))),
      Promise.all(orgIds.map((id) => ctx.db.get(id))),
      Promise.all(orgServiceIds.map((id) => ctx.db.get(id))),
    ]);

    const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u!]));
    const orgMap = new Map(
      orgsForReqs.filter(Boolean).map((o) => [o!._id, o!]),
    );
    const orgServiceMap = new Map(
      orgServices.filter(Boolean).map((os) => [os!._id, os!]),
    );

    // Fetch services for the orgServices
    const serviceIds = [
      ...new Set(orgServices.filter(Boolean).map((os) => os!.serviceId)),
    ];
    const services = await Promise.all(serviceIds.map((id) => ctx.db.get(id)));
    const serviceMap = new Map(
      services.filter(Boolean).map((s) => [s!._id, s!]),
    );

    const recentRequests = sortedRequests.map((r) => {
      const user = userMap.get(r.userId);
      const org = orgMap.get(r.orgId);
      const orgService = orgServiceMap.get(r.orgServiceId);
      const service = orgService
        ? serviceMap.get(orgService.serviceId)
        : null;
      return {
        _id: r._id,
        reference: r.reference,
        status: r.status,
        priority: r.priority,
        createdAt: r._creationTime,
        submittedAt: r.submittedAt,
        userName: user?.name ?? "—",
        orgName: org?.name ?? "—",
        serviceName: service?.name ?? "—",
      };
    });

    // Upcoming appointments (future only)
    const upcomingAppointments = appointmentsDocs.filter(
      (a: any) => typeof a.date === "string" && new Date(a.date).getTime() > now,
    ).length;

    // ══════════════════════════════════════════════════════════════════════
    // STRATEGIC INTELLIGENCE — Deployment, Performance, Security
    // ══════════════════════════════════════════════════════════════════════

    // ── 1. Deployment Progress ──────────────────────────────────────────
    const allOrgs = await ctx.db
      .query("orgs")
      .take(500);
    const nonDeletedOrgs = allOrgs.filter((o) => !o.deletedAt);
    // Sous-ensemble "représentation diplomatique" : tous les compteurs
    // `deployment.*` exposés au widget "Top représentations" doivent porter sur
    // ce périmètre (exclut ministères, agences, partenaires tiers).
    const representationOrgs = nonDeletedOrgs.filter((o) =>
      REPRESENTATION_TYPES.has(o.type),
    );
    const activeRepresentations = representationOrgs.filter((o) => o.isActive);

    // Breakdown by type (all non-deleted orgs for visibility)
    const orgsByType: Record<string, number> = {};
    for (const org of nonDeletedOrgs) {
      orgsByType[org.type] = (orgsByType[org.type] ?? 0) + 1;
    }

    // Breakdown by country — représentations diplomatiques uniquement
    const orgsByCountry: Record<string, { count: number; names: string[] }> = {};
    for (const org of representationOrgs) {
      if (!orgsByCountry[org.country]) {
        orgsByCountry[org.country] = { count: 0, names: [] };
      }
      orgsByCountry[org.country].count++;
      orgsByCountry[org.country].names.push(org.name);
    }

    // Countries covered via jurisdiction (représentations seulement)
    const allJurisdictionCountries = new Set<string>();
    for (const org of representationOrgs) {
      if (org.jurisdictionCountries) {
        for (const c of org.jurisdictionCountries) {
          allJurisdictionCountries.add(c);
        }
      }
    }

    // Orgs with head of mission assigned (représentations seulement)
    const orgsWithHom = representationOrgs.filter((o) => o.headOfMission).length;

    // Total staff count (représentations seulement)
    const totalStaff = representationOrgs.reduce((sum, o) => sum + (o.staffCount ?? 0), 0);

    // ── 2. Performance Metrics ──────────────────────────────────────────
    const completedCount = statusBreakdown["completed"] ?? 0;
    const cancelledCount = statusBreakdown["cancelled"] ?? 0;
    const rejectedCount = statusBreakdown["rejected"] ?? 0;
    const totalTerminal = completedCount + cancelledCount + rejectedCount;
    const completionRate = totalRequests > 0 ? Math.round((completedCount / totalRequests) * 100) : 0;

    // Urgent/critical requests pending
    const urgentRequests = sortedRequests.filter(
      (r) => (r.priority === "urgent" || r.priority === "critical") &&
        !["completed", "cancelled", "rejected"].includes(r.status)
    ).length;

    // In-progress pipeline counts
    const pipelineCounts = {
      draft: statusBreakdown["draft"] ?? 0,
      submitted: statusBreakdown["submitted"] ?? 0,
      pending: statusBreakdown["pending"] ?? 0,
      underReview: (statusBreakdown["under_review"] ?? 0) + (statusBreakdown["processing"] ?? 0),
      inProduction: statusBreakdown["in_production"] ?? 0,
      validated: statusBreakdown["validated"] ?? 0,
      readyForPickup: (statusBreakdown["ready_for_pickup"] ?? 0) + (statusBreakdown["appointment_scheduled"] ?? 0),
      completed: completedCount,
      cancelled: cancelledCount,
      rejected: rejectedCount,
    };

    // ── 3. Engagement Trends ────────────────────────────────────────────
    // Users created in last 7d/30d (scan recent users)
    const recentUsers = await ctx.db
      .query("users")
      .order("desc")
      .take(500);
    const users7d = recentUsers.filter((u) => u._creationTime >= sevenDaysAgo).length;
    const users30d = recentUsers.filter((u) => u._creationTime >= thirtyDaysAgo).length;

    // Registration breakdown by status
    const registrationsByStatus: Record<string, number> = {};
    for (const reg of registrationsDocs) {
      const s = (reg as any).status ?? "unknown";
      registrationsByStatus[s] = (registrationsByStatus[s] ?? 0) + 1;
    }

    // ── 4. Security Alerts ──────────────────────────────────────────────
    // CRITICAL signals in last 24h
    const criticalSignals = await ctx.db
      .query("signaux")
      .withIndex("by_timestamp", (q) => q.gt("timestamp", twentyFourHoursAgo))
      .order("desc")
      .take(50);
    const criticalAlerts = criticalSignals
      .filter((s) => s.priorite === "CRITICAL")
      .map((s) => ({
        _id: s._id,
        type: s.type,
        source: s.source,
        message: (s.payload as any)?.message ?? s.type,
        timestamp: s.timestamp,
        priorite: s.priorite,
      }));

    // SECURITE actions in last 24h
    const securityActions = await ctx.db
      .query("historiqueActions")
      .withIndex("by_categorie", (q) => q.eq("categorie", "SECURITE").gt("timestamp", twentyFourHoursAgo))
      .order("desc")
      .take(20);
    const securityEvents = securityActions.map((a) => ({
      _id: a._id,
      action: a.action,
      entiteType: a.entiteType,
      userId: a.userId,
      timestamp: a.timestamp,
    }));

    // Untreated signals queue depth
    const untreatedSignals = await ctx.db
      .query("signaux")
      .withIndex("by_non_traite", (q) => q.eq("traite", false))
      .take(200);
    const queueDepth = untreatedSignals.length;

    // System health status
    const systemHealth = queueDepth > 100 ? "CRITICAL" : queueDepth > 50 ? "DEGRADED" : "HEALTHY";

    return {
      users: { total: totalUsers },
      orgs: { total: totalOrgs },
      services: { active: activeServices },
      requests: {
        total: totalRequests,
        statusBreakdown,
      },
      registrations: { total: registrationsCount },
      appointments: { upcoming: upcomingAppointments },
      associations: { total: totalAssociations },
      companies: { total: totalCompanies },
      recentRequests,
      // ── Strategic Intelligence ──
      deployment: {
        activeOrgs: activeRepresentations.length,
        totalOrgs: representationOrgs.length,
        activationRate:
          representationOrgs.length > 0
            ? Math.round(
                (activeRepresentations.length / representationOrgs.length) * 100,
              )
            : 0,
        byType: orgsByType,
        byCountry: orgsByCountry,
        countriesCovered: allJurisdictionCountries.size,
        orgsWithHeadOfMission: orgsWithHom,
        totalStaff,
      },
      performance: {
        completionRate,
        urgentPending: urgentRequests,
        pipeline: pipelineCounts,
        totalTerminal,
      },
      engagement: {
        newUsers7d: users7d,
        newUsers30d: users30d,
        registrationsByStatus,
      },
      security: {
        criticalAlerts,
        securityEvents,
        queueDepth,
        systemHealth,
        totalAlerts24h: criticalAlerts.length,
        totalSecurityEvents24h: securityEvents.length,
      },
    };
  },
});

/**
 * Period-windowed deltas for the dashboard KPI strip.
 *
 * Returns the number of documents created since `Date.now() - sinceMs` for
 * each KPI tile. Used to power the 24h/7j/30j/90j/année filter on the
 * Centre de Commandement — totals stay global, only the delta line updates.
 */
export const getStatsDelta = backofficeQuery({
  args: { sinceMs: v.number() },
  handler: async (ctx, { sinceMs }) => {
    const since = Date.now() - sinceMs;
    const lower = { lower: { key: since, inclusive: true } } as const;

    const [usersDelta, orgsDelta, associationsDelta, companiesDelta] =
      await Promise.all([
        globalCounts.count(ctx, { bounds: lower }),
        orgsGlobal.count(ctx, { bounds: lower }),
        associationsGlobal.count(ctx, { bounds: lower }),
        companiesGlobal.count(ctx, { bounds: lower }),
      ]);

    // requestsGlobal has sortKey [status, _creationTime] — fan out by status.
    const statuses = ["draft", "submitted", "pending", "pending_completion", "edited", "under_review", "processing", "in_production", "validated", "appointment_scheduled", "ready_for_pickup", "completed", "cancelled", "rejected"];
    const requestsPerStatus = await Promise.all(
      statuses.map((status) =>
        requestsGlobal.count(ctx, {
          bounds: {
            lower: { key: [status, since], inclusive: true },
            upper: { key: [status, Number.MAX_SAFE_INTEGER], inclusive: true },
          },
        })
      )
    );
    const requestsDelta = requestsPerStatus.reduce((s, n) => s + n, 0);

    // Registrations: no global aggregate yet — bounded scan (cheap, ≤ 5000).
    const registrationsDocs = await ctx.db.query("consularRegistrations").take(5000);
    const registrationsDelta = registrationsDocs.filter(
      (r: any) => r._creationTime >= since
    ).length;

    return {
      usersDelta,
      orgsDelta,
      requestsDelta,
      registrationsDelta,
      associationsDelta,
      companiesDelta,
    };
  },
});

export const getStatsDev = backofficeQuery({
  args: {},
  handler: async (ctx) => {
    return {
      users: await globalCounts.count(ctx, {})
    };
  }
});

/**
 * Get global audit logs (paginated)
 */
export const getAuditLogs = backofficeQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const paginatedResult = await ctx.db
      .query("events")
      .order("desc")
      .paginate(args.paginationOpts);

    // Provide user details for each event on the current page
    const enrichedPage = await Promise.all(
      paginatedResult.page.map(async (e) => {
        let user = null;
        if (e.actorId) {
          user = await ctx.db.get(e.actorId);
        }
        return {
          _id: e._id,
          action: e.type,
          details: JSON.stringify(e.data),
          timestamp: e._creationTime,
          createdAt: e._creationTime,
          _creationTime: e._creationTime,
          userId: e.actorId,
          targetType: e.targetType,
          targetId: e.targetId,
          user:
            user ?
              {
                _id: user._id,
                email: user.email || "",
                firstName: user.name.split(" ")[0],
                lastName: user.name.split(" ").slice(1).join(" ") || "",
              }
            : null,
        };
      }),
    );

    return {
      ...paginatedResult,
      page: enrichedPage,
    };
  },
});

/**
 * Update user role (global/admin)
 * Accessible by SuperAdmin and AdminSystem via backofficeMutation.
 * Rules:
 * - Cannot change own role
 * - Cannot assign super_admin (it's unique)
 * - Cannot change SuperAdmin's role
 * - AdminSystem cannot promote above their own level
 */
export const updateUserRole = backofficeMutation({
  args: {
    userId: v.id("users"),
    role: v.union(
      v.literal(UserRole.User),
      v.literal(UserRole.SousAdmin),
      v.literal(UserRole.Admin),
      v.literal(UserRole.AdminSystem),
    ),
  },
  handler: async (ctx, args) => {
    // Prevent changing own role
    if (ctx.user._id === args.userId) {
      throw error(ErrorCode.CANNOT_REMOVE_SELF);
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw error(ErrorCode.USER_NOT_FOUND);

    // Cannot change SuperAdmin's role
    if (targetUser.isSuperadmin || targetUser.role === UserRole.SuperAdmin) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    // AdminSystem cannot promote to admin_system (only SuperAdmin can)
    const callerRole = getEffectiveRole(ctx.user);
    const callerRank = ROLE_RANK[callerRole] ?? 0;
    const targetRank = ROLE_RANK[args.role] ?? 0;
    if (targetRank >= callerRank) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    const { userId, role } = args;
    await ctx.db.patch(userId, { role, isSuperadmin: false });
    return true;
  },
});

/**
 * Disable user
 * Back-office users can disable users they outrank.
 */
export const disableUser = backofficeMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    if (ctx.user._id === args.userId) {
      throw error(ErrorCode.CANNOT_REMOVE_SELF);
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw error(ErrorCode.USER_NOT_FOUND);

    // Cannot disable SuperAdmin
    if (targetUser.isSuperadmin || targetUser.role === UserRole.SuperAdmin) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    // Caller must outrank target
    const callerRank = ROLE_RANK[getEffectiveRole(ctx.user)] ?? 0;
    const targetRank = ROLE_RANK[getEffectiveRole(targetUser)] ?? 0;
    if (targetRank >= callerRank) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    await ctx.db.patch(args.userId, { isActive: false } as any);
  },
});

/**
 * Enable user
 * Back-office users can enable users they outrank.
 */
export const enableUser = backofficeMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw error(ErrorCode.USER_NOT_FOUND);

    // Caller must outrank target
    const callerRank = ROLE_RANK[getEffectiveRole(ctx.user)] ?? 0;
    const targetRank = ROLE_RANK[getEffectiveRole(targetUser)] ?? 0;
    if (targetRank >= callerRank) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    await ctx.db.patch(args.userId, { isActive: true, deletedAt: undefined } as any);
  },
});

/**
 * Soft-delete user (move to trash)
 * Back-office users can trash users they outrank.
 */
export const softDeleteUser = backofficeMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    if (ctx.user._id === args.userId) {
      throw error(ErrorCode.CANNOT_REMOVE_SELF);
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw error(ErrorCode.USER_NOT_FOUND);

    // Cannot trash SuperAdmin
    if (targetUser.isSuperadmin || targetUser.role === UserRole.SuperAdmin) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    // Caller must outrank target
    const callerRank = ROLE_RANK[getEffectiveRole(ctx.user)] ?? 0;
    const targetRank = ROLE_RANK[getEffectiveRole(targetUser)] ?? 0;
    if (targetRank >= callerRank) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    await ctx.db.patch(args.userId, {
      isActive: false,
      deletedAt: Date.now(),
    } as any);
  },
});

/**
 * Restore user from trash
 * Back-office users can restore users they outrank.
 */
export const restoreUser = backofficeMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw error(ErrorCode.USER_NOT_FOUND);

    // Caller must outrank target
    const callerRank = ROLE_RANK[getEffectiveRole(ctx.user)] ?? 0;
    const targetRank = ROLE_RANK[getEffectiveRole(targetUser)] ?? 0;
    if (targetRank >= callerRank) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    await ctx.db.patch(args.userId, {
      isActive: true,
      deletedAt: undefined,
    } as any);
  },
});

// ─── Helpers for user data collection ────────────────────────
// Collect all entity IDs linked to a user for preview or deletion.

async function collectUserEntities(ctx: any, userId: any) {
  // 1. Profile & child profiles
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .unique();

  const childProfiles = await ctx.db
    .query("childProfiles")
    .withIndex("by_author", (q: any) => q.eq("authorUserId", userId))
    .collect();

  // 2. Requests
  const requests = await ctx.db
    .query("requests")
    .withIndex("by_user_status", (q: any) => q.eq("userId", userId))
    .collect();
  const requestIds = requests.map((r: any) => r._id);

  // 3. Documents — owned by user, profile, or child profiles
  const ownerIds = [
    userId,
    ...(profile ? [profile._id] : []),
    ...childProfiles.map((cp: any) => cp._id),
  ];
  const allDocuments = [];
  for (const ownerId of ownerIds) {
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_owner", (q: any) => q.eq("ownerId", ownerId))
      .collect();
    allDocuments.push(...docs);
  }
  // Also collect documents referenced in requests (may have different ownerId)
  const requestDocIds = new Set<string>();
  for (const req of requests) {
    for (const docId of req.documents ?? []) {
      requestDocIds.add(docId);
    }
  }
  // Fetch request-referenced docs not already collected
  const existingDocIds = new Set(allDocuments.map((d: any) => d._id));
  for (const docId of requestDocIds) {
    if (!existingDocIds.has(docId)) {
      const doc = await ctx.db.get(docId);
      if (doc) allDocuments.push(doc);
    }
  }

  // 4. Events related to user's requests
  const events = [];
  for (const rid of requestIds) {
    const evts = await ctx.db
      .query("events")
      .withIndex("by_target", (q: any) =>
        q.eq("targetType", "request").eq("targetId", rid as unknown as string),
      )
      .collect();
    events.push(...evts);
  }

  // 5. Agent notes on user's requests
  const agentNotes = [];
  for (const rid of requestIds) {
    const notes = await ctx.db
      .query("agentNotes")
      .withIndex("by_request", (q: any) => q.eq("requestId", rid))
      .collect();
    agentNotes.push(...notes);
  }

  // 6. Simple userId-linked tables
  const collectByUser = async (table: string, indexName: string, field: string) => {
    try {
      return await ctx.db
        .query(table)
        .withIndex(indexName, (q: any) => q.eq(field, userId))
        .collect();
    } catch {
      // If index doesn't exist, fall back to filter
      return await ctx.db
        .query(table)
        .filter((q: any) => q.eq(q.field(field), userId))
        .collect();
    }
  };

  const memberships = await collectByUser("memberships", "by_user_org", "userId");
  const notifications = await collectByUser("notifications", "by_user", "userId");
  const meetings = await collectByUser("meetings", "by_createdBy", "createdBy");
  const cv = await collectByUser("cv", "by_user", "userId");
  const digitalMail = await collectByUser("digitalMail", "by_user", "userId");
  const deliveryPackages = await collectByUser("deliveryPackages", "by_user", "userId");
  const associationMembers = await collectByUser("associationMembers", "by_user", "userId");
  const associationClaims = await collectByUser("associationClaims", "by_user", "userId");
  const companyMembers = await collectByUser("companyMembers", "by_user", "userId");
  const conversations = await collectByUser("conversations", "by_user", "userId");
  const callLines = await collectByUser("callLines", "by_user", "userId");
  const tickets = await collectByUser("tickets", "by_user", "userId");
  const messages = await collectByUser("messages", "by_sender", "senderId");
  const pushSubscriptions = await collectByUser("pushSubscriptions", "by_user", "userId");

  // 7. Consular registrations — indexed by profileId + childProfileId
  const consularRegistrations: any[] = [];
  if (profile) {
    const regs = await ctx.db
      .query("consularRegistrations")
      .withIndex("by_profile", (q: any) => q.eq("profileId", profile._id))
      .collect();
    consularRegistrations.push(...regs);
  }
  for (const cp of childProfiles) {
    const regs = await ctx.db
      .query("consularRegistrations")
      .withIndex("by_childProfile", (q: any) => q.eq("childProfileId", cp._id))
      .collect();
    consularRegistrations.push(...regs);
  }

  // 8. Consular notifications — indexed by profileId (parent only; schema forbids childProfileId)
  const consularNotifications: any[] = [];
  if (profile) {
    const notifs = await ctx.db
      .query("consularNotifications")
      .withIndex("by_profile", (q: any) => q.eq("profileId", profile._id))
      .collect();
    consularNotifications.push(...notifs);
  }

  // 9. Print jobs — no userId/profileId index exists, full scan. Rare purge op.
  const childProfileIdSet = new Set(childProfiles.map((cp: any) => String(cp._id)));
  const profileIdStr = profile ? String(profile._id) : null;
  const allPrintJobs = await ctx.db.query("printJobs").collect();
  const printJobs = allPrintJobs.filter((job: any) =>
    job.createdBy === userId ||
    (profileIdStr && job.profileId && String(job.profileId) === profileIdStr) ||
    (job.childProfileId && childProfileIdSet.has(String(job.childProfileId))),
  );

  return {
    profile,
    childProfiles,
    requests,
    documents: allDocuments,
    events,
    agentNotes,
    memberships,
    notifications,
    meetings,
    cv,
    digitalMail,
    deliveryPackages,
    associationMembers,
    associationClaims,
    companyMembers,
    conversations,
    callLines,
    tickets,
    messages,
    pushSubscriptions,
    consularRegistrations,
    consularNotifications,
    printJobs,
  };
}

/**
 * Preview what will be deleted when permanently deleting a user.
 * Returns counts for each entity type so the admin can confirm.
 */
export const getUserDeletionPreview = backofficeQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.userId);
    if (!target) throw error(ErrorCode.NOT_FOUND);

    const entities = await collectUserEntities(ctx, args.userId);

    const counts: Record<string, number> = {
      profile: entities.profile ? 1 : 0,
      childProfiles: entities.childProfiles.length,
      requests: entities.requests.length,
      documents: entities.documents.length,
      events: entities.events.length,
      agentNotes: entities.agentNotes.length,
      memberships: entities.memberships.length,
      notifications: entities.notifications.length,
      meetings: entities.meetings.length,
      cv: entities.cv.length,
      digitalMail: entities.digitalMail.length,
      deliveryPackages: entities.deliveryPackages.length,
      associationMembers: entities.associationMembers.length,
      associationClaims: entities.associationClaims.length,
      companyMembers: entities.companyMembers.length,
      conversations: entities.conversations.length,
      callLines: entities.callLines.length,
      tickets: entities.tickets.length,
      messages: entities.messages.length,
      pushSubscriptions: entities.pushSubscriptions.length,
      consularRegistrations: entities.consularRegistrations.length,
      consularNotifications: entities.consularNotifications.length,
      printJobs: entities.printJobs.length,
    };

    const totalItems = Object.values(counts).reduce((a, b) => a + b, 0);

    // Count storage files that will be cleaned up
    let storageFileCount = 0;
    for (const doc of entities.documents) {
      storageFileCount += doc.files?.length ?? 0;
    }

    return { counts, totalItems, storageFileCount, userName: target.name || target.email };
  },
});

/**
 * Permanently delete user and ALL associated data.
 * Back-office users can permanently delete users they outrank.
 * Cascade deletes: profile, child profiles, requests, documents (+ storage),
 * events, agent notes, memberships, notifications, meetings, cv,
 * digital mail, delivery packages, association/company members, conversations,
 * call lines, tickets, messages.
 */
export const permanentlyDeleteUser = backofficeMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    if (ctx.user._id === args.userId) {
      throw error(ErrorCode.CANNOT_REMOVE_SELF);
    }
    const target = await ctx.db.get(args.userId);
    if (!target) throw error(ErrorCode.NOT_FOUND);

    // Cannot delete SuperAdmin
    if (target.isSuperadmin || target.role === UserRole.SuperAdmin) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    // Caller must outrank target
    const callerRank = ROLE_RANK[getEffectiveRole(ctx.user)] ?? 0;
    const targetRank = ROLE_RANK[getEffectiveRole(target)] ?? 0;
    if (targetRank >= callerRank) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    // Collect all linked entities
    const entities = await collectUserEntities(ctx, args.userId);

    // ── Delete in leaf-to-root order ──

    // 1. Events (linked to requests)
    for (const evt of entities.events) {
      await ctx.db.delete(evt._id);
    }

    // 2. Agent notes (linked to requests)
    for (const note of entities.agentNotes) {
      await ctx.db.delete(note._id);
    }

    // 3. Messages
    for (const msg of entities.messages) {
      await ctx.db.delete(msg._id);
    }

    // 4. Documents — delete storage files, then documents
    for (const doc of entities.documents) {
      if (doc.files) {
        for (const file of doc.files) {
          try {
            await ctx.storage.delete(file.storageId);
          } catch {
            // Storage file may already be gone — continue
          }
        }
      }
      await ctx.db.delete(doc._id);
    }

    // 4b. Print jobs — before profiles/child profiles (FK references)
    for (const job of entities.printJobs) {
      await ctx.db.delete(job._id);
    }

    // 4c. Consular registrations — before profile/child profiles (FK references)
    for (const reg of entities.consularRegistrations) {
      await ctx.db.delete(reg._id);
    }

    // 4d. Consular notifications — before profile (FK reference)
    for (const notif of entities.consularNotifications) {
      await ctx.db.delete(notif._id);
    }

    // 5. Requests
    for (const req of entities.requests) {
      await ctx.db.delete(req._id);
    }

    // 6. Child profiles
    for (const cp of entities.childProfiles) {
      await ctx.db.delete(cp._id);
    }

    // 7. Profile
    if (entities.profile) {
      await ctx.db.delete(entities.profile._id);
    }

    // 8. Memberships
    for (const m of entities.memberships) {
      await ctx.db.delete(m._id);
    }

    // 9. Secondary tables
    const secondaryEntities = [
      ...entities.notifications,
      ...entities.meetings,
      ...entities.cv,
      ...entities.digitalMail,
      ...entities.deliveryPackages,
      ...entities.associationMembers,
      ...entities.associationClaims,
      ...entities.companyMembers,
      ...entities.conversations,
      ...entities.callLines,
      ...entities.tickets,
      ...entities.pushSubscriptions,
    ];
    for (const entity of secondaryEntities) {
      await ctx.db.delete(entity._id);
    }

    // 10. Clean up Better Auth data (user, accounts, sessions, verifications)
    const baUsersResult = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      where: [{ field: "userId", value: args.userId as unknown as string }],
      paginationOpts: { numItems: 10, cursor: null },
    });
    const baUsers = ((baUsersResult as any)?.page ?? baUsersResult ?? []) as any[];

    for (const baUser of baUsers) {
      const baUserId = String(baUser._id ?? baUser.id);

      // Delete all accounts (credential, oauth, etc.)
      await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
        input: {
          model: "account",
          where: [{ field: "userId", value: baUserId }],
        },
        paginationOpts: { numItems: 100, cursor: null },
      } as any);

      // Delete all sessions
      await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
        input: {
          model: "session",
          where: [{ field: "userId", value: baUserId }],
        },
        paginationOpts: { numItems: 100, cursor: null },
      } as any);

      // Delete the Better Auth user record
      await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
        input: {
          model: "user",
          where: [{ field: "_id", value: baUserId }],
        },
      } as any);
    }

    // Delete verifications tied to user's email (OTP codes, password reset tokens, etc.)
    if (target.email) {
      await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
        input: {
          model: "verification",
          where: [{ field: "identifier", value: target.email }],
        },
        paginationOpts: { numItems: 100, cursor: null },
      } as any);
    }

    // 11. Hard delete Convex user
    await ctx.db.delete(args.userId);

    // 12. Audit trail — log the destructive action for traceability
    await logCortexAction(ctx, {
      action: "user.permanentDelete",
      categorie: CATEGORIES_ACTION.SECURITE,
      entiteType: "users",
      entiteId: args.userId as unknown as string,
      userId: ctx.user._id as unknown as string,
      avant: {
        email: target.email,
        name: target.name,
        role: target.role,
        linkedEntitiesSummary: {
          profile: entities.profile ? 1 : 0,
          childProfiles: entities.childProfiles.length,
          requests: entities.requests.length,
          documents: entities.documents.length,
          consularRegistrations: entities.consularRegistrations.length,
          consularNotifications: entities.consularNotifications.length,
        },
      },
      apres: null,
      signalType: SIGNAL_TYPES.TYPE_SUPPRIME,
      destination: CORTEX.HIPPOCAMPE,
      priorite: "HIGH",
    });
  },
});

// ─── Child profile deletion (cascade) ─────────────────────────

async function collectChildProfileEntities(ctx: any, childId: any) {
  const child = await ctx.db.get(childId);
  if (!child) return null;

  // Documents owned by this child profile
  const documents = await ctx.db
    .query("documents")
    .withIndex("by_owner", (q: any) => q.eq("ownerId", childId))
    .collect();

  // Consular registrations indexed by child profile
  const consularRegistrations = await ctx.db
    .query("consularRegistrations")
    .withIndex("by_childProfile", (q: any) => q.eq("childProfileId", childId))
    .collect();

  // Requests where profileId points to this child (requests.profileId is a union
  // of profiles | childProfiles, so we need a filter — no dedicated index).
  const requests = await ctx.db
    .query("requests")
    .filter((q: any) => q.eq(q.field("profileId"), childId))
    .collect();
  const requestIds = requests.map((r: any) => r._id);

  // Documents referenced by those requests (may have different ownerId)
  const existingDocIds = new Set(documents.map((d: any) => d._id));
  for (const req of requests) {
    for (const docId of req.documents ?? []) {
      if (!existingDocIds.has(docId)) {
        const doc = await ctx.db.get(docId);
        if (doc) documents.push(doc);
      }
    }
  }

  // Events + agent notes linked to those requests
  const events: any[] = [];
  const agentNotes: any[] = [];
  for (const rid of requestIds) {
    const evts = await ctx.db
      .query("events")
      .withIndex("by_target", (q: any) =>
        q.eq("targetType", "request").eq("targetId", rid as unknown as string),
      )
      .collect();
    events.push(...evts);
    const notes = await ctx.db
      .query("agentNotes")
      .withIndex("by_request", (q: any) => q.eq("requestId", rid))
      .collect();
    agentNotes.push(...notes);
  }

  // Print jobs referencing this child (no index — full scan, rare op)
  const allPrintJobs = await ctx.db.query("printJobs").collect();
  const printJobs = allPrintJobs.filter(
    (j: any) => j.childProfileId && String(j.childProfileId) === String(childId),
  );

  return { child, documents, consularRegistrations, requests, events, agentNotes, printJobs };
}

/**
 * Preview what will be deleted when permanently deleting a child profile.
 */
export const getChildProfileDeletionPreview = backofficeQuery({
  args: { childId: v.id("childProfiles") },
  handler: async (ctx, args) => {
    const entities = await collectChildProfileEntities(ctx, args.childId);
    if (!entities) throw error(ErrorCode.NOT_FOUND);

    const counts: Record<string, number> = {
      documents: entities.documents.length,
      consularRegistrations: entities.consularRegistrations.length,
      requests: entities.requests.length,
      events: entities.events.length,
      agentNotes: entities.agentNotes.length,
      printJobs: entities.printJobs.length,
    };

    const totalItems = Object.values(counts).reduce((a, b) => a + b, 0);

    let storageFileCount = 0;
    for (const doc of entities.documents) {
      storageFileCount += doc.files?.length ?? 0;
    }

    const childName =
      `${entities.child.identity?.firstName ?? ""} ${entities.child.identity?.lastName ?? ""}`.trim() ||
      "Enfant";

    return { counts, totalItems, storageFileCount, childName };
  },
});

/**
 * Permanently delete a child profile and all its related data.
 * Back-office users with permission to manage the parent author can do this.
 * Cascade: documents (+ storage), consularRegistrations, requests, events,
 * agent notes, print jobs.
 *
 * Note: unlike `childProfiles.remove` (citizen-facing), this admin mutation
 * forces deletion even if consular registrations or a registration request
 * exist. It is the super-admin recovery tool for stuck/orphaned records.
 */
export const permanentlyDeleteChildProfile = backofficeMutation({
  args: { childId: v.id("childProfiles") },
  handler: async (ctx, args) => {
    const entities = await collectChildProfileEntities(ctx, args.childId);
    if (!entities) throw error(ErrorCode.NOT_FOUND);

    // Outrank check against the parent (author) user
    const parent = (await ctx.db.get(entities.child.authorUserId)) as any;
    if (parent) {
      const callerRank = ROLE_RANK[getEffectiveRole(ctx.user)] ?? 0;
      const targetRank = ROLE_RANK[getEffectiveRole(parent)] ?? 0;
      if (targetRank >= callerRank) {
        throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
      }
    }

    // Leaf-to-root deletion order
    for (const evt of entities.events) {
      await ctx.db.delete(evt._id);
    }
    for (const note of entities.agentNotes) {
      await ctx.db.delete(note._id);
    }
    for (const doc of entities.documents) {
      if (doc.files) {
        for (const file of doc.files) {
          try {
            await ctx.storage.delete(file.storageId);
          } catch {
            // file may already be gone
          }
        }
      }
      await ctx.db.delete(doc._id);
    }
    for (const job of entities.printJobs) {
      await ctx.db.delete(job._id);
    }
    for (const reg of entities.consularRegistrations) {
      await ctx.db.delete(reg._id);
    }
    for (const req of entities.requests) {
      await ctx.db.delete(req._id);
    }

    await ctx.db.delete(args.childId);

    // Audit trail
    await logCortexAction(ctx, {
      action: "childProfile.permanentDelete",
      categorie: CATEGORIES_ACTION.SECURITE,
      entiteType: "childProfiles",
      entiteId: args.childId as unknown as string,
      userId: ctx.user._id as unknown as string,
      avant: {
        firstName: entities.child.identity?.firstName,
        lastName: entities.child.identity?.lastName,
        authorUserId: entities.child.authorUserId,
        linkedEntitiesSummary: {
          documents: entities.documents.length,
          consularRegistrations: entities.consularRegistrations.length,
          requests: entities.requests.length,
        },
      },
      apres: null,
      signalType: SIGNAL_TYPES.TYPE_SUPPRIME,
      destination: CORTEX.HIPPOCAMPE,
      priorite: "HIGH",
    });
  },
});

/**
 * List child profiles authored by a given user. Used by the backoffice user
 * detail page to surface children with inline delete actions.
 */
export const listChildProfilesByUser = backofficeQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const children = await ctx.db
      .query("childProfiles")
      .withIndex("by_author", (q: any) => q.eq("authorUserId", args.userId))
      .collect();

    return children.map((c: any) => ({
      _id: c._id,
      firstName: c.identity?.firstName ?? "",
      lastName: c.identity?.lastName ?? "",
      status: c.status,
      hasRegistrationRequest: !!c.registrationRequestId,
      nipCode: c.nipCode,
      updatedAt: c.updatedAt,
    }));
  },
});

/**
 * Disable organization
 */
export const disableOrg = superadminMutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    // Check if trying to disable own org? No, superadmin can disable any.
    await ctx.db.patch(args.orgId, { isActive: false });
  },
});

/**
 * Enable organization
 */
export const enableOrg = superadminMutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orgId, { isActive: true, deletedAt: undefined });
  },
});

// ─── Org deletion (super-admin only) ────────────────────────────────────────
// Flux 2-temps :
//   1) softDeleteOrg → met deletedAt + isActive=false sur l'org et ses memberships.
//      Bloqué si des données opérationnelles "actives" existent encore.
//   2) hardDeleteOrg → purge cascade définitive (org doit déjà être en corbeille).

const TERMINAL_REQUEST_STATUSES = ["completed", "cancelled", "rejected"] as const;
const TERMINAL_DOSSIER_STATUSES = ["clos", "archive", "rejete"] as const;
const TERMINAL_INTEL_STATUSES = ["closed", "archived"] as const;
const TERMINAL_CORRESPONDANCE_STATUSES = ["archived", "rejected"] as const;

async function computeOrgDeletionImpact(ctx: any, orgId: any) {
  // Memberships actifs (non soft-deleted)
  const activeMemberships = await ctx.db
    .query("memberships")
    .withIndex("by_org_deletedAt", (q: any) =>
      q.eq("orgId", orgId).eq("deletedAt", undefined),
    )
    .collect();

  // Requests non terminales
  const allRequests = await ctx.db
    .query("requests")
    .withIndex("by_org_status", (q: any) => q.eq("orgId", orgId))
    .collect();
  const openRequests = allRequests.filter(
    (r: any) => !TERMINAL_REQUEST_STATUSES.includes(r.status),
  );

  // Dossiers non terminaux
  const allDossiers = await ctx.db
    .query("dossierProcedures")
    .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
    .collect();
  const openDossiers = allDossiers.filter(
    (d: any) => !TERMINAL_DOSSIER_STATUSES.includes(d.status),
  );

  // Intelligence cases non terminaux
  const allIntelCases = await ctx.db
    .query("intelligenceCases")
    .withIndex("by_org_status", (q: any) => q.eq("orgId", orgId))
    .collect();
  const openIntelCases = allIntelCases.filter(
    (c: any) => !TERMINAL_INTEL_STATUSES.includes(c.status),
  );

  // Correspondance non archivée
  const allCorrespondance = await ctx.db
    .query("correspondanceItems")
    .withIndex("by_org_status", (q: any) => q.eq("orgId", orgId))
    .collect();
  const openCorrespondance = allCorrespondance.filter(
    (c: any) => !TERMINAL_CORRESPONDANCE_STATUSES.includes(c.status),
  );

  const blockers = {
    activeMemberships: activeMemberships.length,
    openRequests: openRequests.length,
    openDossiers: openDossiers.length,
    openIntelCases: openIntelCases.length,
    openCorrespondance: openCorrespondance.length,
  };
  const totalBlockers =
    blockers.activeMemberships +
    blockers.openRequests +
    blockers.openDossiers +
    blockers.openIntelCases +
    blockers.openCorrespondance;

  // Volumes (informatif, pas bloquant) — comptés tous statuts confondus
  const volumes = {
    requestsTotal: allRequests.length,
    dossiersTotal: allDossiers.length,
    correspondanceTotal: allCorrespondance.length,
    intelCasesTotal: allIntelCases.length,
  };

  return { blockers, totalBlockers, volumes };
}

/**
 * Query d'impact — appelée par la modale de suppression pour afficher
 * ce qui bloque ou ce qui va être affecté.
 */
export const getOrgDeletionImpact = superadminQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, { orgId }) => {
    const org = await ctx.db.get(orgId);
    if (!org) throw error(ErrorCode.ORG_NOT_FOUND);
    const impact = await computeOrgDeletionImpact(ctx, orgId);
    return {
      org: {
        _id: org._id,
        name: org.name,
        slug: org.slug,
        deletedAt: org.deletedAt,
        isActive: org.isActive,
      },
      ...impact,
    };
  },
});

/**
 * Déposer un organisme à la corbeille (soft-delete).
 * Bloqué si des données actives subsistent.
 */
export const softDeleteOrg = superadminMutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, { orgId }) => {
    const org = await ctx.db.get(orgId);
    if (!org) throw error(ErrorCode.ORG_NOT_FOUND);
    if (org.deletedAt) {
      throw error(ErrorCode.VALIDATION_ERROR, "Organisme déjà à la corbeille");
    }

    // Re-check côté serveur (le client peut être obsolète)
    const { totalBlockers, blockers } = await computeOrgDeletionImpact(ctx, orgId);
    if (totalBlockers > 0) {
      throw error(
        ErrorCode.VALIDATION_ERROR,
        `BLOCKERS:${JSON.stringify(blockers)}`,
      );
    }

    const now = Date.now();
    await ctx.db.patch(orgId, { deletedAt: now, isActive: false });

    // Cascade soft sur memberships : verrouille les sessions backoffice de l'org
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_org_deletedAt", (q: any) =>
        q.eq("orgId", orgId).eq("deletedAt", undefined),
      )
      .collect();
    for (const m of memberships) {
      await ctx.db.patch(m._id, { deletedAt: now });
    }

    await logCortexAction(ctx, {
      action: "org.softDelete",
      categorie: CATEGORIES_ACTION.SECURITE,
      entiteType: "orgs",
      entiteId: orgId as unknown as string,
      userId: ctx.user._id as unknown as string,
      avant: { name: org.name, slug: org.slug },
      apres: { deletedAt: now, membershipsRevoked: memberships.length },
      signalType: SIGNAL_TYPES.TYPE_SUPPRIME,
      destination: CORTEX.HIPPOCAMPE,
      priorite: "HIGH",
    });

    return { ok: true, membershipsRevoked: memberships.length };
  },
});

/**
 * Restaurer un organisme depuis la corbeille.
 * Ne ré-active PAS automatiquement les memberships (l'admin re-invite explicitement).
 */
export const restoreOrg = superadminMutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, { orgId }) => {
    const org = await ctx.db.get(orgId);
    if (!org) throw error(ErrorCode.ORG_NOT_FOUND);
    if (!org.deletedAt) {
      throw error(ErrorCode.VALIDATION_ERROR, "Organisme déjà actif");
    }
    await ctx.db.patch(orgId, { deletedAt: undefined, isActive: true });

    await logCortexAction(ctx, {
      action: "org.restore",
      categorie: CATEGORIES_ACTION.SECURITE,
      entiteType: "orgs",
      entiteId: orgId as unknown as string,
      userId: ctx.user._id as unknown as string,
      avant: { deletedAt: org.deletedAt },
      apres: { deletedAt: null },
      signalType: SIGNAL_TYPES.TYPE_MODIFIE,
      destination: CORTEX.HIPPOCAMPE,
      priorite: "NORMAL",
    });

    return { ok: true };
  },
});

// Helper : supprime toutes les rangées d'une table indexées par orgId.
async function purgeByOrgIndex(
  ctx: any,
  table: string,
  index: string,
  orgId: any,
) {
  const rows = await ctx.db
    .query(table)
    .withIndex(index, (q: any) => q.eq("orgId", orgId))
    .collect();
  for (const r of rows) await ctx.db.delete(r._id);
  return rows.length;
}

// Helper : version filtre (pour tables sans index by_org).
async function purgeByOrgFilter(ctx: any, table: string, orgId: any) {
  const rows = await ctx.db
    .query(table)
    .filter((q: any) => q.eq(q.field("orgId"), orgId))
    .collect();
  for (const r of rows) await ctx.db.delete(r._id);
  return rows.length;
}

/**
 * Purge définitive d'un organisme (hard-delete cascade).
 * Pré-requis : org doit être en corbeille (deletedAt set) et le slug confirmé.
 *
 * Cascade sélective :
 *   - SUPPRIME : toutes les données opérationnelles scopées à l'org.
 *   - PRÉSERVE : intelligenceAuditLog (rétention légale).
 *   - NULLIFIE : profiles.managedByOrgId/signaledToOrgId, users.allowedOrgs[].
 */
export const hardDeleteOrg = superadminMutation({
  args: {
    orgId: v.id("orgs"),
    confirmSlug: v.string(),
  },
  handler: async (ctx, { orgId, confirmSlug }) => {
    const org = await ctx.db.get(orgId);
    if (!org) throw error(ErrorCode.ORG_NOT_FOUND);
    if (!org.deletedAt) {
      throw error(
        ErrorCode.VALIDATION_ERROR,
        "Soft-delete requis avant la purge définitive",
      );
    }
    if (org.slug !== confirmSlug) {
      throw error(ErrorCode.VALIDATION_ERROR, "Slug de confirmation invalide");
    }

    const counts: Record<string, number> = {};

    // ── 1a. Children-first : collecter les parents puis nettoyer leurs enfants
    //        avant de supprimer les parents eux-mêmes.

    // Dossiers + sous-tables
    const dossiers = await ctx.db
      .query("dossierProcedures")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();
    for (const dossier of dossiers) {
      for (const subTable of [
        "dossierPieces",
        "dossierTransitions",
        "copiesPassage",
        "journalActions",
      ]) {
        const children = await ctx.db
          .query(subTable as any)
          .withIndex("by_dossier", (q: any) => q.eq("dossierId", dossier._id))
          .collect();
        for (const c of children) await ctx.db.delete(c._id);
        counts[subTable] = (counts[subTable] ?? 0) + children.length;
      }
      await ctx.db.delete(dossier._id);
    }
    counts.dossierProcedures = dossiers.length;

    // Correspondance items + sous-tables
    const corrItems = await ctx.db
      .query("correspondanceItems")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();
    for (const item of corrItems) {
      for (const subTable of [
        "correspondanceWorkflowSteps",
        "correspondanceRecipients",
        "correspondanceApprovalSteps",
        "correspondanceSignatures",
        "correspondanceAnnotations",
      ]) {
        const children = await ctx.db
          .query(subTable as any)
          .withIndex("by_item", (q: any) => q.eq("itemId", item._id))
          .collect();
        for (const c of children) await ctx.db.delete(c._id);
        counts[subTable] = (counts[subTable] ?? 0) + children.length;
      }
      await ctx.db.delete(item._id);
    }
    counts.correspondanceItems = corrItems.length;

    // Intelligence cases + sous-tables (caseEntities, caseEvents)
    const intelCases = await ctx.db
      .query("intelligenceCases")
      .withIndex("by_org_status", (q: any) => q.eq("orgId", orgId))
      .collect();
    for (const c of intelCases) {
      const ents = await ctx.db
        .query("intelligenceCaseEntities")
        .withIndex("by_case", (q: any) => q.eq("caseId", c._id))
        .collect();
      for (const e of ents) await ctx.db.delete(e._id);
      counts.intelligenceCaseEntities =
        (counts.intelligenceCaseEntities ?? 0) + ents.length;

      const events = await ctx.db
        .query("intelligenceCaseEvents")
        .withIndex("by_case_timestamp", (q: any) => q.eq("caseId", c._id))
        .collect();
      for (const ev of events) await ctx.db.delete(ev._id);
      counts.intelligenceCaseEvents =
        (counts.intelligenceCaseEvents ?? 0) + events.length;

      await ctx.db.delete(c._id);
    }
    counts.intelligenceCases = intelCases.length;

    // ── 1b. Tables purgées directement par orgId ─────────────────────
    // Tuples : [tableName, indexName | null]. null → utilise un filter.
    const orgScopedTables: Array<[string, string | null]> = [
      ["memberships", "by_org"],
      ["agentSchedules", "by_org"],
      ["agentPresence", "by_org"],
      ["aiAgentPresence", "by_org"],
      ["aiCapabilityConfig", "by_org"],
      ["aiSuggestions", "by_org_status"],
      ["aiActivityLog", "by_org"],
      ["userAIPreferences", "by_org"],
      ["appointments", "by_org_date"],
      ["appointmentWaitlist", "by_org_service_status"],
      ["callLines", "by_org"],
      ["callNotes", "by_org_updated"],
      ["callRecordings", "by_org_started"],
      ["missedCalls", "by_org"],
      ["voicemails", null],
      ["supervisionSessions", "by_org"],
      ["cardDesigns", "by_org"],
      ["printJobs", "by_org_status"],
      ["consularNotifications", "by_org_status"],
      ["consularRegistrations", "by_org_status"],
      ["correspondanceFolders", "by_org"],
      ["correspondanceTypeConfigs", "by_org"],
      ["diplomaticTargets", "by_org"],
      ["diplomaticLetters", "by_org"],
      ["diplomaticPlans", "by_org"],
      ["diplomaticReports", "by_org"],
      ["diplomaticProjects", "by_org"],
      ["diplomaticPriorities", "by_org"],
      ["diplomaticDocuments", "by_org"],
      ["typeDemarches", "by_org"],
      ["documents", "by_org"],
      ["documentVerifications", "by_org"],
      ["generatedDocuments", "by_org_status"],
      ["formTemplates", "by_org"],
      ["meetings", "by_org"],
      ["orgCalendar", "by_org"],
      ["orgEscalationPolicy", "by_org"],
      ["orgIAstedConfig", "by_org"],
      ["orgRoleTemplates", "by_org"],
      ["orgServices", "by_org_active"],
      ["intelligenceNotes", "by_org_severity"],
      ["intelligenceLinks", "by_org"],
      ["intelligenceBriefings", "by_org_target"],
      ["intelligenceWatchlists", "by_org"],
      ["intelligenceAlerts", "by_org_active"],
      ["intelligenceEnclaves", "by_org_snapshot"],
      ["archivePolicies", "by_org"],
      ["posts", null],
      ["guides", null],
    ];

    for (const [table, index] of orgScopedTables) {
      try {
        if (index) {
          counts[table] = await purgeByOrgIndex(ctx, table, index, orgId);
        } else {
          counts[table] = await purgeByOrgFilter(ctx, table, orgId);
        }
      } catch {
        // Fallback safety net
        try {
          counts[table] = await purgeByOrgFilter(ctx, table, orgId);
        } catch {
          counts[table] = 0;
        }
      }
    }

    // ── 2. Nullifier les pointeurs vers cet org (sans supprimer l'entité) ──

    // profiles.managedByOrgId / signaledToOrgId / workplace[].orgId
    const allProfiles = await ctx.db.query("profiles").collect();
    let profilesNullified = 0;
    for (const p of allProfiles) {
      const patch: Record<string, unknown> = {};
      if ((p as any).managedByOrgId === orgId) patch.managedByOrgId = undefined;
      if ((p as any).signaledToOrgId === orgId) patch.signaledToOrgId = undefined;
      const workplace = (p as any).workplace as
        | Array<{ orgId?: string }>
        | undefined;
      if (workplace?.some((w) => w.orgId === orgId)) {
        patch.workplace = workplace.filter((w) => w.orgId !== orgId);
      }
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(p._id, patch as any);
        profilesNullified++;
      }
    }
    counts.profilesNullified = profilesNullified;

    // users.allowedOrgs (retirer orgId du tableau)
    const allUsers = await ctx.db.query("users").collect();
    let usersUpdated = 0;
    for (const u of allUsers) {
      const allowed = (u as any).allowedOrgs as Array<string> | undefined;
      if (allowed?.includes(orgId as unknown as string)) {
        await ctx.db.patch(u._id, {
          allowedOrgs: allowed.filter((id) => id !== orgId),
        } as any);
        usersUpdated++;
      }
    }
    counts.usersAllowedOrgsCleaned = usersUpdated;

    // ── 3. Supprimer l'org elle-même ────────────────────────────────
    await ctx.db.delete(orgId);

    // ── 4. Audit ───────────────────────────────────────────────────
    await logCortexAction(ctx, {
      action: "org.hardDelete",
      categorie: CATEGORIES_ACTION.SECURITE,
      entiteType: "orgs",
      entiteId: orgId as unknown as string,
      userId: ctx.user._id as unknown as string,
      avant: { name: org.name, slug: org.slug, type: org.type },
      apres: { cascadeCounts: counts },
      signalType: SIGNAL_TYPES.TYPE_SUPPRIME,
      destination: CORTEX.HIPPOCAMPE,
      priorite: "CRITICAL",
    });

    return { ok: true, counts };
  },
});

/**
 * Create external user (wrapper for invite flow)
 * Following current architecture where we create a shadow user first.
 */
import { createInvitedUserHelper } from "../lib/users";
export const createExternalUser = superadminMutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
  },
  handler: async (ctx, args) => {
    const name = `${args.firstName} ${args.lastName}`;
    const userId = await createInvitedUserHelper(
      ctx,
      args.email,
      name,
      args.firstName,
      args.lastName,
    );
    return { userId };
  },
});

/**
 * Update allowed modules for a user.
 * Enforces role hierarchy:
 *   - SuperAdmin → can configure anyone except themselves
 *   - AdminSystem → can configure Admin, Corps Admin, Agents (not SuperAdmin or AdminSystem)
 *   - Admin → can configure Corps Admin and Agents only
 */
import { moduleCodeValidator, CORE_MODULE_CODES, ALL_MODULE_CODES, MODULE_REGISTRY, accessLevelValidator, type ModuleCodeValue, type ModuleAccessLevel } from "../lib/moduleCodes";

export const updateUserModules = backofficeMutation({
  args: {
    userId: v.id("users"),
    modules: v.array(moduleCodeValidator),
  },
  handler: async (ctx, args) => {
    // Cannot modify own modules
    if (ctx.user._id === args.userId) {
      throw error(ErrorCode.CANNOT_REMOVE_SELF);
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw error(ErrorCode.USER_NOT_FOUND);

    // Cannot modify SuperAdmin's modules
    if (targetUser.isSuperadmin || targetUser.role === UserRole.SuperAdmin) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    // Role hierarchy check: caller must outrank target
    const callerRole = getEffectiveRole(ctx.user);
    const callerRank = ROLE_RANK[callerRole] ?? 0;
    const targetRole = getEffectiveRole(targetUser);
    const targetRank = ROLE_RANK[targetRole] ?? 0;

    if (targetRank >= callerRank) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    // Use the exact modules the admin selected (no force-include)
    const moduleSet = new Set<string>(args.modules);

    await ctx.db.patch(args.userId, {
      allowedModules: Array.from(moduleSet) as any,
      updatedAt: Date.now(),
    });

    return true;
  },
});

/**
 * Get allowed modules for a user (plus registry metadata for the UI).
 */
export const getUserModules = backofficeQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    return {
      allowedModules: (user as any).allowedModules as ModuleCodeValue[] | undefined,
      allModules: ALL_MODULE_CODES,
      coreModules: CORE_MODULE_CODES,
    };
  },
});

// ============================================================================
// Modules par membership — override per-user dans une représentation
// ============================================================================

const membershipModuleAccessEntry = v.object({
  moduleCode: moduleCodeValidator,
  accessLevel: accessLevelValidator,
});

/**
 * Récupère l'override moduleAccess d'un membership + les modules activés sur
 * son org (pour filtrer la UI). `moduleAccess` peut être `null` (= hérite de
 * la position).
 */
export const getMembershipModuleAccess = backofficeQuery({
  args: { membershipId: v.id("memberships") },
  handler: async (ctx, args) => {
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) return null;

    const org = await ctx.db.get(membership.orgId);
    const orgModules = (org?.modules as ModuleCodeValue[] | undefined) ?? [];

    return {
      membershipId: membership._id,
      orgId: membership.orgId,
      userId: membership.userId,
      orgModules,
      moduleAccess:
        ((membership as any).moduleAccess as
          | Array<{ moduleCode: ModuleCodeValue; accessLevel: ModuleAccessLevel }>
          | undefined) ?? null,
      hasOverride: !!((membership as any).moduleAccess?.length),
    };
  },
});

/**
 * Définit (ou retire avec `null`) l'override moduleAccess d'un membership.
 *
 * Garde-fous :
 *   - Membership doit exister.
 *   - Pas d'édition du membership d'un SuperAdmin.
 *   - Pas d'auto-édition (cohérent avec updateUserModules).
 *   - Hiérarchie : caller doit outranker la cible.
 *   - Modules filtrés : ne garde que ceux activés sur `org.modules`
 *     (silencieusement ignorés sinon).
 */
export const setMembershipModuleAccess = backofficeMutation({
  args: {
    membershipId: v.id("memberships"),
    moduleAccess: v.union(v.null(), v.array(membershipModuleAccessEntry)),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) {
      throw error(ErrorCode.NOT_FOUND, "Membership introuvable");
    }

    if (ctx.user._id === membership.userId) {
      throw error(ErrorCode.CANNOT_REMOVE_SELF);
    }

    const targetUser = await ctx.db.get(membership.userId);
    if (!targetUser) throw error(ErrorCode.USER_NOT_FOUND);
    if (targetUser.isSuperadmin || targetUser.role === UserRole.SuperAdmin) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    const callerRank = ROLE_RANK[getEffectiveRole(ctx.user)] ?? 0;
    const targetRank = ROLE_RANK[getEffectiveRole(targetUser)] ?? 0;
    if (targetRank >= callerRank) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    // Retirer l'override → hérite de la position
    if (args.moduleAccess === null || args.moduleAccess.length === 0) {
      await ctx.db.patch(args.membershipId, { moduleAccess: undefined });
      return { membershipId: args.membershipId, applied: 0, skipped: 0 };
    }

    // Filtrage : ne garde que les modules activés sur l'org
    const org = await ctx.db.get(membership.orgId);
    const orgModules = new Set<string>((org?.modules as string[]) ?? []);
    const useOrgFilter = orgModules.size > 0;

    // Déduplication : une seule entrée par moduleCode (dernier gagne)
    const dedup = new Map<string, ModuleAccessLevel>();
    for (const entry of args.moduleAccess) {
      if (useOrgFilter && !orgModules.has(entry.moduleCode)) continue;
      dedup.set(entry.moduleCode, entry.accessLevel);
    }

    const filtered = Array.from(dedup, ([moduleCode, accessLevel]) => ({
      moduleCode: moduleCode as ModuleCodeValue,
      accessLevel,
    }));

    await ctx.db.patch(args.membershipId, { moduleAccess: filtered });

    return {
      membershipId: args.membershipId,
      applied: filtered.length,
      skipped: args.moduleAccess.length - filtered.length,
    };
  },
});

/**
 * Applique le même `moduleAccess` à un lot de memberships (corps diplomatique
 * bulk). Délègue à la même logique de garde-fous que
 * `setMembershipModuleAccess` pour chaque membership et renvoie un récap.
 */
export const bulkSetMembershipsModuleAccess = backofficeMutation({
  args: {
    membershipIds: v.array(v.id("memberships")),
    moduleAccess: v.array(membershipModuleAccessEntry),
  },
  handler: async (ctx, args) => {
    const callerRank = ROLE_RANK[getEffectiveRole(ctx.user)] ?? 0;
    const updated: string[] = [];
    const skipped: Array<{ membershipId: string; reason: string }> = [];

    for (const membershipId of args.membershipIds) {
      const membership = await ctx.db.get(membershipId);
      if (!membership) {
        skipped.push({ membershipId, reason: "Membership introuvable" });
        continue;
      }

      if (ctx.user._id === membership.userId) {
        skipped.push({ membershipId, reason: "Auto-édition interdite" });
        continue;
      }

      const targetUser = await ctx.db.get(membership.userId);
      if (!targetUser) {
        skipped.push({ membershipId, reason: "Utilisateur introuvable" });
        continue;
      }
      if (targetUser.isSuperadmin || targetUser.role === UserRole.SuperAdmin) {
        skipped.push({ membershipId, reason: "SuperAdmin protégé" });
        continue;
      }

      const targetRank = ROLE_RANK[getEffectiveRole(targetUser)] ?? 0;
      if (targetRank >= callerRank) {
        skipped.push({ membershipId, reason: "Rang insuffisant" });
        continue;
      }

      // Filtrage par org.modules pour ce membership
      const org = await ctx.db.get(membership.orgId);
      const orgModules = new Set<string>((org?.modules as string[]) ?? []);
      const useOrgFilter = orgModules.size > 0;

      const dedup = new Map<string, ModuleAccessLevel>();
      for (const entry of args.moduleAccess) {
        if (useOrgFilter && !orgModules.has(entry.moduleCode)) continue;
        dedup.set(entry.moduleCode, entry.accessLevel);
      }

      if (dedup.size === 0) {
        skipped.push({
          membershipId,
          reason: "Aucun module compatible avec cette représentation",
        });
        continue;
      }

      const filtered = Array.from(dedup, ([moduleCode, accessLevel]) => ({
        moduleCode: moduleCode as ModuleCodeValue,
        accessLevel,
      }));

      await ctx.db.patch(membershipId, { moduleAccess: filtered });
      updated.push(membershipId);
    }

    return {
      updatedCount: updated.length,
      skippedCount: skipped.length,
      skipped,
    };
  },
});

// ============================================================================
// Section métier "Agent" — performance d'un membership (KPIs)
// ============================================================================

/**
 * KPIs d'activité pour un membership donné (corps admin).
 *
 * Retourne le nombre de requests assignées (en cours / clôturées) sur les 90
 * derniers jours, et la date de dernière action consignée. Utilisable pour la
 * carte "Performance" de la page user back-office.
 */
export const getMembershipPerformance = backofficeQuery({
  args: { membershipId: v.id("memberships") },
  handler: async (ctx, args) => {
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) return null;

    const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
    const since = Date.now() - NINETY_DAYS_MS;

    // Requests assignées à ce membership (scan via index by_assigned)
    const assigned = await ctx.db
      .query("requests")
      .withIndex("by_assigned", (q) => q.eq("assignedTo", args.membershipId))
      .collect();

    const recentAssigned = assigned.filter((r) => (r._creationTime ?? 0) >= since);
    const closedStatuses = new Set(["completed", "approved", "rejected", "cancelled"]);
    const openCount = recentAssigned.filter((r) => !closedStatuses.has(r.status as string)).length;
    const closedCount = recentAssigned.filter((r) => closedStatuses.has(r.status as string)).length;

    // Dernière activité (last update sur une request assignée)
    const lastActivity = assigned.reduce((max, r) => {
      const t = (r as any).updatedAt ?? r._creationTime ?? 0;
      return t > max ? t : max;
    }, 0);

    return {
      assignedTotal: assigned.length,
      recentOpenCount: openCount,
      recentClosedCount: closedCount,
      lastActivityAt: lastActivity > 0 ? lastActivity : null,
      windowDays: 90,
    };
  },
});

// ============================================================================
// Sections métier "Ressortissant" — données consulaires d'un user
// ============================================================================

/**
 * Récupère l'inscription consulaire active (ou la plus récente) du user,
 * enrichie de l'organisation de rattachement, pour affichage back-office.
 */
export const getCitizenConsularRegistration = backofficeQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (!profile) return null;

    const registrations = await ctx.db
      .query("consularRegistrations")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .collect();

    if (registrations.length === 0) return null;

    // On préfère le statut actif > attente > terminé/expiré, à défaut la plus récente
    const STATUS_ORDER: Record<string, number> = {
      active: 0,
      pending: 1,
      validated: 2,
      expired: 3,
      rejected: 4,
    };
    const sorted = [...registrations].sort((a, b) => {
      const rankA = STATUS_ORDER[a.status as string] ?? 99;
      const rankB = STATUS_ORDER[b.status as string] ?? 99;
      if (rankA !== rankB) return rankA - rankB;
      return b._creationTime - a._creationTime;
    });
    const reg = sorted[0]!;

    const org = await ctx.db.get(reg.orgId);

    return {
      _id: reg._id,
      type: reg.type,
      status: reg.status,
      registeredAt: reg.registeredAt,
      activatedAt: reg.activatedAt,
      expiresAt: reg.expiresAt,
      cardNumber: reg.cardNumber,
      cardIssuedAt: reg.cardIssuedAt,
      cardExpiresAt: reg.cardExpiresAt,
      printedAt: reg.printedAt,
      duration: reg.duration,
      nip: profile.identity?.nip,
      org: org
        ? { _id: org._id, name: org.name, type: org.type, country: org.country, slug: org.slug }
        : null,
      totalCount: registrations.length,
    };
  },
});

/**
 * Liste les demandes consulaires d'un user (toutes statuts), enrichies du
 * service consulaire et de l'org. Retourne `limit` dernières par défaut.
 */
export const listCitizenRequests = backofficeQuery({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const requests = await ctx.db
      .query("requests")
      .withIndex("by_user_status", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    if (requests.length === 0) return [];

    const orgIds = [...new Set(requests.map((r) => r.orgId))];
    const serviceIds = [...new Set(requests.map((r) => r.orgServiceId))];
    const [orgs, services] = await Promise.all([
      Promise.all(orgIds.map((id) => ctx.db.get(id))),
      Promise.all(serviceIds.map((id) => ctx.db.get(id))),
    ]);
    const orgMap = new Map(orgs.filter(Boolean).map((o) => [o!._id, o!]));
    const serviceMap = new Map(services.filter(Boolean).map((s) => [s!._id, s!]));

    return requests.map((r) => {
      const org = orgMap.get(r.orgId);
      const service = serviceMap.get(r.orgServiceId);
      return {
        _id: r._id,
        reference: r.reference,
        status: r.status,
        priority: r.priority,
        submittedAt: r.submittedAt,
        updatedAt: r.updatedAt ?? r._creationTime,
        completedAt: r.completedAt,
        actionsRequiredCount: r.actionsRequired?.filter((a: any) => !a.completedAt).length ?? 0,
        org: org ? { _id: org._id, name: org.name, slug: org.slug } : null,
        service: service
          ? {
              _id: service._id,
              code: (service as any).serviceCode ?? (service as any).code,
              label: (service as any).label ?? null,
            }
          : null,
      };
    });
  },
});

/**
 * Liste les documents personnels d'un user (vault citoyen) pour affichage
 * back-office. Filtre uniquement les documents dont `ownerId === userId`.
 */
export const listCitizenDocuments = backofficeQuery({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
      .order("desc")
      .take(limit);

    return documents
      .filter((d) => !d.deletedAt)
      .map((d) => ({
        _id: d._id,
        label: d.label,
        category: d.category,
        documentType: d.documentType,
        status: d.status,
        validatedAt: d.validatedAt,
        expiresAt: d.expiresAt,
        archivedAt: d.archivedAt,
        archiveCategorySlug: d.archiveCategorySlug,
        fileCount: d.files?.length ?? 0,
        updatedAt: d.updatedAt ?? d._creationTime,
      }));
  },
});

/**
 * Récupère la carte consulaire active d'un user (dérivée de
 * `consularRegistrations.cardNumber`). Inclut le statut d'impression via la
 * dernière entrée `printJobs` associée.
 */
export const getCitizenConsularCard = backofficeQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (!profile) return null;

    const registrations = await ctx.db
      .query("consularRegistrations")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .collect();

    const withCard = registrations.filter((r) => r.cardNumber);
    if (withCard.length === 0) return null;

    // Préférer celle avec cardExpiresAt le plus grand (= la plus récente valide)
    const sorted = [...withCard].sort(
      (a, b) => (b.cardExpiresAt ?? 0) - (a.cardExpiresAt ?? 0),
    );
    const reg = sorted[0]!;

    const org = await ctx.db.get(reg.orgId);

    // Dernier print job lié à ce profile (printJobs n'a pas d'index by_profile,
    // on filtre via le scan complet — acceptable pour un affichage admin ponctuel).
    const allPrintJobs = await ctx.db
      .query("printJobs")
      .filter((q) => q.eq(q.field("profileId"), profile._id))
      .collect();
    const lastPrintJob =
      allPrintJobs.length > 0
        ? allPrintJobs.sort((a, b) => b._creationTime - a._creationTime)[0]!
        : null;

    return {
      registrationId: reg._id,
      cardNumber: reg.cardNumber,
      cardIssuedAt: reg.cardIssuedAt,
      cardExpiresAt: reg.cardExpiresAt,
      printedAt: reg.printedAt,
      duration: reg.duration,
      org: org ? { _id: org._id, name: org.name, slug: org.slug } : null,
      lastPrintJob: lastPrintJob
        ? {
            _id: lastPrintJob._id,
            status: lastPrintJob.status,
            queuedAt: lastPrintJob.queuedAt,
            completedAt: lastPrintJob.completedAt,
          }
        : null,
    };
  },
});

// ============================================================================
// PHASE 2 — Gestion visibilité contacts publics
// ============================================================================

/**
 * Toggle `isPublicContact` d'un membership (annuaire public de la représentation).
 * Permission : settings.manage sur l'org du membership.
 */
export const updateMembershipContactVisibility = backofficeMutation({
  args: {
    membershipId: v.id("memberships"),
    isPublicContact: v.boolean(),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) {
      throw error(ErrorCode.NOT_FOUND, "Membership introuvable");
    }

    await ctx.db.patch(args.membershipId, {
      isPublicContact: args.isPublicContact,
    });

    return args.membershipId;
  },
});

/**
 * List all child profiles enriched with parent profile coordinates,
 * for plotting on the superadmin users map. Children inherit the parent's
 * residence GPS when they have no address of their own.
 */
export const listChildProfilesForMap = backofficeQuery({
  args: {},
  handler: async (ctx) => {
    const children = await ctx.db.query("childProfiles").collect();

    const parentIds = [...new Set(children.map((c) => c.authorUserId))];
    const parentProfiles = await Promise.all(
      parentIds.map(async (uid) =>
        ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", uid))
          .unique(),
      ),
    );

    const coordsByParent = new Map<string, { lat: number; lng: number } | null>();
    for (const p of parentProfiles) {
      if (!p) continue;
      const coords =
        p.addresses?.residence?.coordinates ??
        p.addresses?.homeland?.coordinates ??
        null;
      coordsByParent.set(p.userId as string, coords ?? null);
    }

    return children.map((c) => ({
      _id: c._id,
      authorUserId: c.authorUserId,
      firstName: c.identity?.firstName,
      lastName: c.identity?.lastName,
      gender: c.identity?.gender,
      birthDate: c.identity?.birthDate,
      countryOfResidence: c.countryOfResidence,
      coordinates: coordsByParent.get(c.authorUserId as string) ?? null,
    }));
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// /users?view=map — single bundled query for the world map.
//
// Replaces the previous three-query pattern:
//   searchProfiles (with auto-loadMore-until-done, loading every profile and
//                  every joined user / org / photo / childCount the map
//                  doesn't even use)
//   + listChildProfilesForMap
//   + listDiplomaticMembers
//
// Returns a flat list of `MapPoint`s with only the fields the map needs:
// coords, kind, gender, name, subtitle, country, userId. Filters are applied
// server-side so the payload shrinks when the user narrows the view.
// ─────────────────────────────────────────────────────────────────────────────

const mapFiltersValidator = v.object({
  population: v.optional(
    v.union(v.literal("all"), v.literal("citizens"), v.literal("agents")),
  ),
  gender: v.optional(
    v.union(v.literal("all"), v.literal("male"), v.literal("female")),
  ),
  age: v.optional(
    v.union(v.literal("all"), v.literal("adults"), v.literal("children")),
  ),
  continent: v.optional(v.string()),
  country: v.optional(v.string()),
});

const ADULT_AGE_MS = 18 * 365.25 * 24 * 60 * 60 * 1000;
function isMinorTs(birthDate?: number | null): boolean {
  if (!birthDate) return false;
  return Date.now() - birthDate < ADULT_AGE_MS;
}
function normalizeGenderTs(g?: string | null): "male" | "female" | "unknown" {
  if (g === "male" || g === "female") return g;
  return "unknown";
}

type ServerMapPoint = {
  id: string;
  kind: "citizen_adult" | "citizen_child" | "agent";
  gender: "male" | "female" | "unknown";
  name: string;
  subtitle?: string | null;
  // [lng, lat] — same convention as mapbox-gl.
  coords: [number, number];
  country?: string | null;
  userId?: string | null;
  // For agents only: localized position title is a LocalizedString. The
  // client resolves to the active locale to keep this query language-neutral.
  positionTitle?: { fr?: string | null; en?: string | null } | null;
  orgName?: string | null;
};

/**
 * Build the full list of map points for /users?view=map.
 *
 * Server-side filtering means we never ship rows the UI would throw away.
 * Coords-less rows are excluded entirely — the map can't render them anyway,
 * and the count is reported separately by `getMapFacets`.
 *
 * Bounded by the geo dataset (profiles + childProfiles + memberships with
 * positions). For tens of thousands of points this would warrant moving to
 * vector tiles or a paginated viewport-bounds query, but at the current
 * scale shipping the full set is fine.
 */
export const listMapPoints = backofficeQuery({
  args: {
    filters: mapFiltersValidator,
  },
  handler: async (ctx, args) => {
    const f = args.filters;
    const wantCitizens = !f.population || f.population === "all" || f.population === "citizens";
    const wantAgents = !f.population || f.population === "all" || f.population === "agents";

    const points: ServerMapPoint[] = [];

    // ── Citizen profiles (adults + minors with their own profile) ──
    if (wantCitizens) {
      const profiles = await ctx.db.query("profiles").collect();
      // Bulk-load users for the names that fall back to user.name when
      // identity firstName/lastName are blank.
      const userIds = [...new Set(profiles.map((p: any) => p.userId).filter(Boolean))];
      const users = await Promise.all(userIds.map((id) => ctx.db.get(id as any)));
      const userMap = new Map<string, any>(
        (users.filter(Boolean) as any[]).map((u) => [u._id, u]),
      );

      for (const p of profiles as any[]) {
        const coords =
          p.addresses?.residence?.coordinates ?? p.addresses?.homeland?.coordinates ?? null;
        if (!coords?.lat || !coords?.lng) continue;
        const minor = isMinorTs(p.identity?.birthDate);
        if (f.age === "adults" && minor) continue;
        if (f.age === "children" && !minor) continue;

        const gender = normalizeGenderTs(p.identity?.gender);
        if (f.gender && f.gender !== "all" && gender !== f.gender) continue;

        const country = p.countryOfResidence ?? p.addresses?.residence?.country;
        if (f.country && country !== f.country) continue;
        if (f.continent) {
          const c = country ? COUNTRY_CONTINENT_SERVER[String(country).toUpperCase()] : undefined;
          if (c !== f.continent) continue;
        }

        const u = p.userId ? userMap.get(p.userId) : null;
        const fullName = `${p.identity?.firstName ?? ""} ${p.identity?.lastName ?? ""}`.trim();
        points.push({
          id: `profile_${p._id}`,
          kind: minor ? "citizen_child" : "citizen_adult",
          gender,
          name: fullName || u?.name || "Profil",
          subtitle: u?.email ?? null,
          coords: [coords.lng, coords.lat],
          country,
          userId: p.userId ?? null,
        });
      }

      // ── Children (always tagged as minors) ──
      if (f.age !== "adults") {
        const children = await ctx.db.query("childProfiles").collect();
        // Reuse parent coords via the by_user index on profiles.
        const parentIds = [...new Set(children.map((c: any) => c.authorUserId))];
        const parentProfiles = await Promise.all(
          parentIds.map((uid) =>
            ctx.db.query("profiles").withIndex("by_user", (q: any) => q.eq("userId", uid)).unique(),
          ),
        );
        const coordsByParent = new Map<string, { lat: number; lng: number } | null>();
        for (const p of parentProfiles) {
          if (!p) continue;
          const coords =
            (p as any).addresses?.residence?.coordinates ??
            (p as any).addresses?.homeland?.coordinates ??
            null;
          coordsByParent.set(String((p as any).userId), coords ?? null);
        }

        for (const c of children as any[]) {
          const coords = coordsByParent.get(String(c.authorUserId)) ?? null;
          if (!coords?.lat || !coords?.lng) continue;

          const gender = normalizeGenderTs(c.identity?.gender);
          if (f.gender && f.gender !== "all" && gender !== f.gender) continue;

          const country = c.countryOfResidence;
          if (f.country && country !== f.country) continue;
          if (f.continent) {
            const cc = country ? COUNTRY_CONTINENT_SERVER[String(country).toUpperCase()] : undefined;
            if (cc !== f.continent) continue;
          }

          const fullName = `${c.identity?.firstName ?? ""} ${c.identity?.lastName ?? ""}`.trim();
          points.push({
            id: `child_${c._id}`,
            kind: "citizen_child",
            gender,
            name: fullName || "Enfant",
            subtitle: country ?? null,
            coords: [coords.lng, coords.lat],
            country: country ?? null,
            userId: c.authorUserId ?? null,
          });
        }
      }
    }

    // ── Diplomatic agents (positioned on the capital of their org country) ──
    if (wantAgents) {
      const memberships = (await ctx.db.query("memberships").collect()).filter(
        (m: any) => !m.deletedAt && m.positionId,
      );

      const userIds = [...new Set(memberships.map((m: any) => m.userId))];
      const positionIds = [...new Set(memberships.map((m: any) => m.positionId!))];
      const orgIds = [...new Set(memberships.map((m: any) => m.orgId))];
      const [users, positions, orgs] = await Promise.all([
        Promise.all(userIds.map((id) => ctx.db.get(id as any))),
        Promise.all(positionIds.map((id) => ctx.db.get(id as any))),
        Promise.all(orgIds.map((id) => ctx.db.get(id as any))),
      ]);
      const uMap = new Map<string, any>(
        (users.filter(Boolean) as any[]).map((u) => [u._id, u]),
      );
      const pMap = new Map<string, any>(
        (positions.filter(Boolean) as any[]).map((p) => [p._id, p]),
      );
      const oMap = new Map<string, any>(
        (orgs.filter(Boolean) as any[]).map((o) => [o._id, o]),
      );

      for (const m of memberships as any[]) {
        const org = oMap.get(m.orgId);
        const country = org?.country;
        if (!country) continue;
        if (f.country && country !== f.country) continue;
        if (f.continent) {
          const c = COUNTRY_CONTINENT_SERVER[String(country).toUpperCase()];
          if (c !== f.continent) continue;
        }

        const u = uMap.get(m.userId);
        const gender = normalizeGenderTs(m.diplomaticProfile?.gender ?? u?.gender);
        if (f.gender && f.gender !== "all" && gender !== f.gender) continue;

        // Age filter never matches agents (no birthDate concept here): skip
        // agents entirely when the user is filtering to a specific age bucket.
        if (f.age === "adults" || f.age === "children") continue;

        const position = m.positionId ? pMap.get(m.positionId) : null;
        const fullName = `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim();
        points.push({
          id: `agent_${m._id}`,
          kind: "agent",
          gender,
          name: fullName || u?.name || "Agent",
          subtitle: org?.name ?? null,
          // Capital coords are resolved client-side from
          // apps/backoffice-web/src/lib/country-capitals.ts to keep this
          // query small and avoid duplicating the table server-side.
          coords: [0, 0],
          country,
          userId: u?._id ?? null,
          positionTitle: position?.title ?? null,
          orgName: org?.name ?? null,
        });
      }
    }

    return points;
  },
});

/**
 * Aggregate counts for the map filter dropdowns. Same enrichment & filter
 * boundaries as `listMapPoints` (only points with resolvable coords count
 * for citizens; agents count when their org country resolves to a capital
 * client-side, which we treat as "always" here — the client will silently
 * skip any agent whose country lacks a capital).
 *
 * Also returns `withoutGps` — number of citizens with a profile but no
 * usable coordinates, surfaced as a "sans GPS" stat chip in the UI.
 */
export const getMapFacets = backofficeQuery({
  args: {},
  handler: async (ctx) => {
    const [profiles, children, memberships] = await Promise.all([
      ctx.db.query("profiles").collect(),
      ctx.db.query("childProfiles").collect(),
      ctx.db.query("memberships").collect(),
    ]);

    // Pre-resolve parent coords for child profiles
    const parentIds = [...new Set(children.map((c: any) => c.authorUserId))];
    const parentProfiles = await Promise.all(
      parentIds.map((uid) =>
        ctx.db.query("profiles").withIndex("by_user", (q: any) => q.eq("userId", uid)).unique(),
      ),
    );
    const coordsByParent = new Map<string, { lat: number; lng: number } | null>();
    for (const p of parentProfiles) {
      if (!p) continue;
      const coords =
        (p as any).addresses?.residence?.coordinates ??
        (p as any).addresses?.homeland?.coordinates ??
        null;
      coordsByParent.set(String((p as any).userId), coords ?? null);
    }

    // Pre-resolve org countries for memberships with a position
    const activeMembs = memberships.filter((m: any) => !m.deletedAt && m.positionId);
    const orgIds = [...new Set(activeMembs.map((m: any) => m.orgId))];
    const orgs = await Promise.all(orgIds.map((id) => ctx.db.get(id as any)));
    const orgCountryById = new Map<string, string>();
    for (const o of orgs) {
      if (o && (o as any).country) orgCountryById.set((o as any)._id, (o as any).country);
    }

    const populations = { citizens: 0, agents: 0 };
    const genders = { male: 0, female: 0 };
    const ages = { adults: 0, children: 0 };
    const continents: Record<string, number> = {};
    const countries: Record<string, number> = {};
    let withoutGps = 0;

    const bump = (country: string | undefined | null) => {
      if (!country) return;
      const code = String(country).toUpperCase();
      countries[code] = (countries[code] ?? 0) + 1;
      const c = COUNTRY_CONTINENT_SERVER[code];
      if (c) continents[c] = (continents[c] ?? 0) + 1;
    };

    for (const p of profiles as any[]) {
      const coords =
        p.addresses?.residence?.coordinates ?? p.addresses?.homeland?.coordinates ?? null;
      if (!coords?.lat || !coords?.lng) {
        withoutGps++;
        continue;
      }
      populations.citizens++;
      const minor = isMinorTs(p.identity?.birthDate);
      if (minor) ages.children++;
      else ages.adults++;
      const g = normalizeGenderTs(p.identity?.gender);
      if (g === "male") genders.male++;
      if (g === "female") genders.female++;
      bump(p.countryOfResidence ?? p.addresses?.residence?.country);
    }

    for (const c of children as any[]) {
      const coords = coordsByParent.get(String(c.authorUserId)) ?? null;
      if (!coords?.lat || !coords?.lng) {
        withoutGps++;
        continue;
      }
      populations.citizens++;
      ages.children++;
      const g = normalizeGenderTs(c.identity?.gender);
      if (g === "male") genders.male++;
      if (g === "female") genders.female++;
      bump(c.countryOfResidence);
    }

    for (const m of activeMembs as any[]) {
      const country = orgCountryById.get(m.orgId);
      if (!country) continue;
      populations.agents++;
      const user = await ctx.db.get(m.userId);
      const g = normalizeGenderTs(m.diplomaticProfile?.gender ?? (user as any)?.gender);
      if (g === "male") genders.male++;
      if (g === "female") genders.female++;
      bump(country);
    }

    return {
      total: populations.citizens + populations.agents,
      populations,
      genders,
      ages,
      continents,
      countries,
      withoutGps,
    };
  },
});

