import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMemo } from "react";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";

/**
 * useCompletionScore — Calcule un score de complétude par section pour une représentation
 *
 * Heuristiques basées sur des champs « critiques » par section. Un score < 50 % est rouge,
 * 50-99 % est orange, 100 % est vert.
 *
 * Usage :
 *   const { sections, global } = useCompletionScore(orgId);
 *   sections["identity"] → { score: 66, missing: ["officialName"], status: "partial" }
 *   global → { score: 73, status: "partial" }
 */

export type CompletionStatus = "complete" | "partial" | "empty";

export interface SectionScore {
  score: number; // 0-100
  filled: number;
  total: number;
  missing: string[];
  status: CompletionStatus;
}

export type SectionKey =
  | "identity"
  | "protocol"
  | "addresses"
  | "jurisdiction"
  | "calendar"
  | "calls"
  | "iboite"
  | "correspondance"
  | "notifications"
  | "chats"
  | "contacts"
  | "iasted"
  | "services"
  | "branding";

export interface UseCompletionScoreResult {
  sections: Record<SectionKey, SectionScore>;
  global: { score: number; status: CompletionStatus; criticalMissing: string[] };
  isLoading: boolean;
}

function computeStatus(score: number): CompletionStatus {
  if (score === 0) return "empty";
  if (score >= 100) return "complete";
  return "partial";
}

function evalChecks(
  checks: Array<{ key: string; ok: boolean }>,
): SectionScore {
  const total = checks.length;
  const filled = checks.filter((c) => c.ok).length;
  const score = total === 0 ? 0 : Math.round((filled / total) * 100);
  return {
    score,
    filled,
    total,
    missing: checks.filter((c) => !c.ok).map((c) => c.key),
    status: computeStatus(score),
  };
}

export function useCompletionScore(
  orgId: Id<"orgs">,
): UseCompletionScoreResult {
  const { data: org, isPending: orgPending } = useAuthenticatedConvexQuery(
    api.functions.orgs.getById,
    { orgId },
  );

  const { data: members } = useAuthenticatedConvexQuery(
    api.functions.orgs.getMembers,
    { orgId },
  );

  const { data: orgServices } = useAuthenticatedConvexQuery(
    api.functions.services.listByOrg,
    { orgId },
  );

  const { data: orgCalendar } = useAuthenticatedConvexQuery(
    api.functions.orgCalendar.getByOrg,
    { orgId },
  );

  const { data: callLines } = useAuthenticatedConvexQuery(
    api.functions.callLines.listByOrg,
    { orgId },
  );

  const { data: iAstedConfig } = useAuthenticatedConvexQuery(
    api.functions.orgIAstedConfig.getByOrgId,
    { orgId },
  );

  const result = useMemo<UseCompletionScoreResult>(() => {
    const empty: SectionScore = {
      score: 0,
      filled: 0,
      total: 0,
      missing: [],
      status: "empty",
    };

    const sections: Record<SectionKey, SectionScore> = {
      identity: empty,
      protocol: empty,
      addresses: empty,
      jurisdiction: empty,
      calendar: empty,
      calls: empty,
      iboite: empty,
      correspondance: empty,
      notifications: empty,
      chats: empty,
      contacts: empty,
      iasted: empty,
      services: empty,
      branding: empty,
    };

    if (!org) {
      return {
        sections,
        global: { score: 0, status: "empty", criticalMissing: [] },
        isLoading: orgPending,
      };
    }

    const id = org.identityExtended;
    const proto = org.protocol;
    const addr = org.addresses;
    const juri = org.jurisdiction;
    const branding = org.branding;
    const settings = org.settings;
    const corr = settings?.correspondanceConfig;
    const internalMail = (settings as { internalMail?: { defaultSignature?: unknown; replyTemplates?: unknown[] } } | undefined)?.internalMail;
    const notif = (settings as { notifications?: { channels?: unknown; events?: unknown[] } } | undefined)?.notifications;

    sections.identity = evalChecks([
      { key: "name", ok: Boolean(org.name) },
      { key: "officialName", ok: Boolean(id?.officialName) },
      { key: "status", ok: Boolean(id?.status) },
    ]);

    sections.protocol = evalChecks([
      { key: "headOfMissionUserId", ok: Boolean(proto?.headOfMissionUserId) },
      { key: "headOfMissionGrade", ok: Boolean(proto?.headOfMissionGrade) },
    ]);

    sections.addresses = evalChecks([
      {
        key: "physical.street",
        ok: Boolean(addr?.physical?.street ?? org.address?.street),
      },
      {
        key: "physical.city",
        ok: Boolean(addr?.physical?.city ?? org.address?.city),
      },
      {
        key: "physical.country",
        ok: Boolean(addr?.physical?.country ?? org.address?.country),
      },
    ]);

    sections.jurisdiction = evalChecks([
      {
        key: "primary",
        ok:
          (juri?.primary?.length ?? 0) > 0 ||
          (org.jurisdictionCountries?.length ?? 0) > 0,
      },
    ]);

    sections.calendar = evalChecks([
      { key: "exists", ok: Boolean(orgCalendar) },
      {
        key: "serviceHours",
        ok: (orgCalendar?.serviceHours?.length ?? 0) > 0,
      },
    ]);

    sections.calls = evalChecks([
      { key: "atLeastOneLine", ok: (callLines?.length ?? 0) > 0 },
    ]);

    sections.iboite = evalChecks([
      {
        key: "configured",
        ok: Boolean(internalMail?.defaultSignature) ||
          (Array.isArray(internalMail?.replyTemplates) &&
            (internalMail?.replyTemplates?.length ?? 0) > 0),
      },
    ]);

    sections.correspondance = evalChecks([
      { key: "isEnabled", ok: corr?.isEnabled === true },
      {
        key: "typesActifs",
        ok: corr?.isEnabled !== true || (corr?.typesActifs?.length ?? 0) > 0,
      },
    ]);

    sections.notifications = evalChecks([
      { key: "channels", ok: Boolean(notif?.channels) },
      { key: "events", ok: (notif?.events?.length ?? 0) > 0 },
    ]);

    sections.chats = evalChecks([
      // Chats config est entièrement optionnel — toujours considéré "complet" par défaut
      { key: "n/a", ok: true },
    ]);

    sections.contacts = evalChecks([
      {
        key: "atLeastOnePublic",
        ok: (members ?? []).some(
          (m) => (m as { isPublicContact?: boolean }).isPublicContact === true,
        ),
      },
    ]);

    sections.iasted = evalChecks([
      { key: "exists", ok: Boolean(iAstedConfig) },
      { key: "isActive", ok: iAstedConfig?.isActive === true },
    ]);

    sections.services = evalChecks([
      {
        key: "atLeastOneActive",
        ok: (orgServices ?? []).some(
          (s: { isActive?: boolean }) => s.isActive === true,
        ),
      },
    ]);

    sections.branding = evalChecks([
      { key: "colors", ok: Boolean(branding?.colors?.primary) },
      { key: "publicDescription", ok: Boolean(branding?.publicDescription?.fr) },
    ]);

    // Score global = moyenne pondérée
    const sectionScores = Object.values(sections);
    const total = sectionScores.reduce((acc, s) => acc + s.total, 0);
    const filled = sectionScores.reduce((acc, s) => acc + s.filled, 0);
    const globalScore = total === 0 ? 0 : Math.round((filled / total) * 100);

    // Manques critiques : sections vides essentielles
    const criticalSections: SectionKey[] = [
      "identity",
      "addresses",
      "jurisdiction",
      "calendar",
    ];
    const criticalMissing = criticalSections.filter(
      (k) => sections[k].status === "empty",
    );

    return {
      sections,
      global: {
        score: globalScore,
        status: computeStatus(globalScore),
        criticalMissing,
      },
      isLoading: orgPending,
    };
  }, [
    org,
    members,
    orgServices,
    orgCalendar,
    callLines,
    iAstedConfig,
    orgPending,
  ]);

  return result;
}
