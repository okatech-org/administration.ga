/**
 * Migration : normalisation des module codes legacy → canoniques
 *
 * À lancer une seule fois en prod après le déploiement du code qui
 * élargit `moduleCodeValidator` (canonical + legacy). Une fois le rapport
 * validé, narrow le validator aux 13 canoniques uniquement et redéploie.
 *
 * Tables couvertes :
 *   - orgs.modules                : v.array(moduleCodeValidator)
 *   - orgs.orgModuleConfig        : v.array({ moduleCode, enabled, capabilities? })
 *   - users.allowedModules        : v.array(moduleCodeValidator)
 *   - positions.moduleAccess      : v.array({ moduleCode, accessLevel })
 *   - orgRoleTemplates.moduleAccess : idem
 *
 * Comportement :
 *   - Codes canoniques → laissés tels quels
 *   - Codes legacy     → remplacés par leur canonique parent
 *   - `digital_mail`   → entrée retirée (pas de remplaçant)
 *   - Codes inconnus   → préservés verbatim, comptés dans `unknownCodes`
 *
 * Dédup : si plusieurs codes legacy résolvent vers le même canonique
 * (ex. passports + visas + civil_status → consular_affairs), on garde une
 * seule entrée. accessLevel = max (admin > editor > reader),
 * enabled = OR, capabilities = union.
 *
 * Idempotente : un second run renvoie tous les compteurs `*Updated` à 0.
 *
 * Invocation (dashboard Convex) :
 *   internal.migrations.normalizeModuleCodes.run
 */

import { internalMutation } from "../_generated/server";
import type { ModuleCodeValue, ModuleAccessLevel } from "../lib/moduleCodes";

const CANONICAL_CODES = new Set<string>([
  "profile",
  "diplomatic_affairs",
  "consular_affairs",
  "news",
  "community",
  "correspondence",
  "documents",
  "calendar",
  "messaging",
  "team",
  "payments",
  "statistics",
  "settings",
]);

const LEGACY_ALIASES: Record<string, ModuleCodeValue> = {
  iprofil: "profile",
  intelligence: "diplomatic_affairs",
  requests: "consular_affairs",
  communication: "news",
  correspondance: "correspondence",
  appointments: "calendar",
  passports: "consular_affairs",
  visas: "consular_affairs",
  civil_status: "consular_affairs",
  consular_registrations: "consular_affairs",
  consular_notifications: "consular_affairs",
  consular_cards: "consular_affairs",
  cv: "diplomatic_affairs",
  tutorials: "news",
  associations: "community",
  companies: "community",
  community_events: "community",
  meetings: "messaging",
  ai_assistant: "messaging",
  roles: "team",
  permissions: "team",
  profiles: "team",
  citizen_profiles: "team",
  finance: "payments",
  analytics: "statistics",
  monitoring: "statistics",
  org_config: "settings",
  services_config: "settings",
  platform_settings: "settings",
};

const REMOVED_CODES = new Set<string>(["digital_mail"]);

function resolveCanonical(code: string): ModuleCodeValue | null {
  if (CANONICAL_CODES.has(code)) return code as ModuleCodeValue;
  return LEGACY_ALIASES[code] ?? null;
}

const ACCESS_RANK: Record<ModuleAccessLevel, number> = {
  reader: 1,
  editor: 2,
  admin: 3,
};

function highestAccess(a: ModuleAccessLevel, b: ModuleAccessLevel): ModuleAccessLevel {
  return ACCESS_RANK[a] >= ACCESS_RANK[b] ? a : b;
}

interface MigrationStats {
  orgsScanned: number;
  orgsUpdated: number;
  orgModulesNormalized: number;
  orgModuleConfigNormalized: number;
  usersScanned: number;
  usersUpdated: number;
  positionsScanned: number;
  positionsUpdated: number;
  positionTasksPurged: number;
  templatesScanned: number;
  templatesUpdated: number;
  unknownCodes: Record<string, number>;
  droppedRemovedCodes: number;
}

/** Préfixes de tasks legacy à purger (modules supprimés sans remplaçant). */
const REMOVED_TASK_PREFIXES = ["digital_mail."];

function normalizeFlatList(
  codes: readonly string[],
  unknown: Record<string, number>,
): { next: ModuleCodeValue[]; changed: boolean; dropped: number } {
  const set = new Set<ModuleCodeValue>();
  let dropped = 0;
  let touchedAny = false;

  for (const code of codes) {
    const canonical = resolveCanonical(code);
    if (canonical === null) {
      if (REMOVED_CODES.has(code)) {
        dropped++;
        touchedAny = true;
        continue;
      }
      unknown[code] = (unknown[code] ?? 0) + 1;
      set.add(code as ModuleCodeValue);
      continue;
    }
    if (canonical !== code) touchedAny = true;
    set.add(canonical);
  }

  const next = Array.from(set);
  const changed = touchedAny || next.length !== codes.length;
  return { next, changed, dropped };
}

function normalizeOrgModuleConfig(
  config: ReadonlyArray<{ moduleCode: string; enabled: boolean; capabilities?: string[] }>,
  unknown: Record<string, number>,
): {
  next: Array<{ moduleCode: ModuleCodeValue; enabled: boolean; capabilities?: string[] }>;
  changed: boolean;
  dropped: number;
} {
  const map = new Map<
    string,
    { moduleCode: ModuleCodeValue; enabled: boolean; capabilities: Set<string> }
  >();
  let dropped = 0;
  let touchedAny = false;

  for (const entry of config) {
    const canonical = resolveCanonical(entry.moduleCode);
    if (canonical === null) {
      if (REMOVED_CODES.has(entry.moduleCode)) {
        dropped++;
        touchedAny = true;
        continue;
      }
      unknown[entry.moduleCode] = (unknown[entry.moduleCode] ?? 0) + 1;
      const key = entry.moduleCode;
      const bucket = map.get(key);
      const caps = new Set(entry.capabilities ?? []);
      if (bucket) {
        bucket.enabled = bucket.enabled || entry.enabled;
        for (const c of caps) bucket.capabilities.add(c);
      } else {
        map.set(key, {
          moduleCode: entry.moduleCode as ModuleCodeValue,
          enabled: entry.enabled,
          capabilities: caps,
        });
      }
      continue;
    }

    if (canonical !== entry.moduleCode) touchedAny = true;
    const bucket = map.get(canonical);
    const caps = new Set(entry.capabilities ?? []);
    if (bucket) {
      bucket.enabled = bucket.enabled || entry.enabled;
      for (const c of caps) bucket.capabilities.add(c);
      touchedAny = true;
    } else {
      map.set(canonical, {
        moduleCode: canonical,
        enabled: entry.enabled,
        capabilities: caps,
      });
    }
  }

  const next = Array.from(map.values()).map((b) => {
    const out: { moduleCode: ModuleCodeValue; enabled: boolean; capabilities?: string[] } = {
      moduleCode: b.moduleCode,
      enabled: b.enabled,
    };
    if (b.capabilities.size > 0) out.capabilities = Array.from(b.capabilities);
    return out;
  });

  const changed = touchedAny || next.length !== config.length;
  return { next, changed, dropped };
}

function normalizeModuleAccess(
  access: ReadonlyArray<{ moduleCode: string; accessLevel: ModuleAccessLevel }>,
  unknown: Record<string, number>,
): {
  next: Array<{ moduleCode: ModuleCodeValue; accessLevel: ModuleAccessLevel }>;
  changed: boolean;
  dropped: number;
} {
  const map = new Map<string, { moduleCode: ModuleCodeValue; accessLevel: ModuleAccessLevel }>();
  let dropped = 0;
  let touchedAny = false;

  for (const entry of access) {
    const canonical = resolveCanonical(entry.moduleCode);
    if (canonical === null) {
      if (REMOVED_CODES.has(entry.moduleCode)) {
        dropped++;
        touchedAny = true;
        continue;
      }
      unknown[entry.moduleCode] = (unknown[entry.moduleCode] ?? 0) + 1;
      const existing = map.get(entry.moduleCode);
      if (existing) {
        existing.accessLevel = highestAccess(existing.accessLevel, entry.accessLevel);
      } else {
        map.set(entry.moduleCode, {
          moduleCode: entry.moduleCode as ModuleCodeValue,
          accessLevel: entry.accessLevel,
        });
      }
      continue;
    }

    if (canonical !== entry.moduleCode) touchedAny = true;
    const existing = map.get(canonical);
    if (existing) {
      const merged = highestAccess(existing.accessLevel, entry.accessLevel);
      if (merged !== existing.accessLevel) existing.accessLevel = merged;
      touchedAny = true;
    } else {
      map.set(canonical, { moduleCode: canonical, accessLevel: entry.accessLevel });
    }
  }

  const next = Array.from(map.values());
  const changed = touchedAny || next.length !== access.length;
  return { next, changed, dropped };
}

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const stats: MigrationStats = {
      orgsScanned: 0,
      orgsUpdated: 0,
      orgModulesNormalized: 0,
      orgModuleConfigNormalized: 0,
      usersScanned: 0,
      usersUpdated: 0,
      positionsScanned: 0,
      positionsUpdated: 0,
      positionTasksPurged: 0,
      templatesScanned: 0,
      templatesUpdated: 0,
      unknownCodes: {},
      droppedRemovedCodes: 0,
    };

    const orgs = await ctx.db.query("orgs").collect();
    for (const org of orgs) {
      stats.orgsScanned++;
      const patch: { modules?: ModuleCodeValue[]; orgModuleConfig?: typeof org.orgModuleConfig } = {};
      let touched = false;

      if (org.modules && org.modules.length > 0) {
        const result = normalizeFlatList(org.modules as string[], stats.unknownCodes);
        stats.droppedRemovedCodes += result.dropped;
        if (result.changed) {
          patch.modules = result.next;
          stats.orgModulesNormalized++;
          touched = true;
        }
      }

      if (org.orgModuleConfig && org.orgModuleConfig.length > 0) {
        const result = normalizeOrgModuleConfig(
          org.orgModuleConfig as Array<{ moduleCode: string; enabled: boolean; capabilities?: string[] }>,
          stats.unknownCodes,
        );
        stats.droppedRemovedCodes += result.dropped;
        if (result.changed) {
          patch.orgModuleConfig = result.next;
          stats.orgModuleConfigNormalized++;
          touched = true;
        }
      }

      if (touched) {
        await ctx.db.patch(org._id, patch);
        stats.orgsUpdated++;
      }
    }

    const users = await ctx.db.query("users").collect();
    for (const user of users) {
      stats.usersScanned++;
      if (!user.allowedModules || user.allowedModules.length === 0) continue;
      const result = normalizeFlatList(user.allowedModules as string[], stats.unknownCodes);
      stats.droppedRemovedCodes += result.dropped;
      if (result.changed) {
        await ctx.db.patch(user._id, { allowedModules: result.next });
        stats.usersUpdated++;
      }
    }

    const positions = await ctx.db.query("positions").collect();
    for (const position of positions) {
      stats.positionsScanned++;
      const patch: { moduleAccess?: typeof position.moduleAccess; tasks?: string[] } = {};
      let touched = false;

      if (position.moduleAccess && position.moduleAccess.length > 0) {
        const result = normalizeModuleAccess(
          position.moduleAccess as Array<{ moduleCode: string; accessLevel: ModuleAccessLevel }>,
          stats.unknownCodes,
        );
        stats.droppedRemovedCodes += result.dropped;
        if (result.changed) {
          patch.moduleAccess = result.next;
          touched = true;
        }
      }

      // Purge les tasks legacy associées à des modules supprimés (digital_mail.*)
      if (position.tasks && position.tasks.length > 0) {
        const tasks = position.tasks as string[];
        const filtered = tasks.filter(
          (t) => !REMOVED_TASK_PREFIXES.some((prefix) => t.startsWith(prefix)),
        );
        if (filtered.length !== tasks.length) {
          patch.tasks = filtered;
          stats.positionTasksPurged += tasks.length - filtered.length;
          touched = true;
        }
      }

      if (touched) {
        // biome-ignore lint/suspicious/noExplicitAny: patch type narrowing
        await ctx.db.patch(position._id, patch as any);
        stats.positionsUpdated++;
      }
    }

    const templates = await ctx.db.query("orgRoleTemplates").collect();
    for (const template of templates) {
      stats.templatesScanned++;
      if (!template.moduleAccess || template.moduleAccess.length === 0) continue;
      const result = normalizeModuleAccess(
        template.moduleAccess as Array<{ moduleCode: string; accessLevel: ModuleAccessLevel }>,
        stats.unknownCodes,
      );
      stats.droppedRemovedCodes += result.dropped;
      if (result.changed) {
        await ctx.db.patch(template._id, { moduleAccess: result.next });
        stats.templatesUpdated++;
      }
    }

    return stats;
  },
});
