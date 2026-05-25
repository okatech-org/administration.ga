/**
 * Comptes démo du corps PNPE.
 *
 * 23 staff PNPE rattachés à l'org `pnpe` (Pôle National de Promotion de
 * l'Emploi) avec leur rôle et leurs modules métier :
 *
 *   - 1 Direction Générale PNPE (national)
 *   - 1 Admin Ministère du Travail (tutelle)
 *   - 7 Chefs d'antenne (1 par antenne opérationnelle)
 *   - 14 Conseillers PNPE (2 par antenne)
 *
 * Chaque compte est créé avec :
 *   - email pattern `<slot>@<antenne-code>.demo.pnpe.administration.ga`
 *   - membership active sur org `pnpe` (gating auth shell)
 *   - assignment dans `pnpeStaffAssignments` : rôle PNPE, modules métier,
 *     antenne de rattachement, fonction affichée
 *
 * Prérequis : seedAntennesPnpe + seedDevAuthUsers + l'org `pnpe`.
 *
 * INVOCATION
 *   bunx convex run seeds/pnpe/staffAccountsPnpe:run
 *
 * Idempotent : skip si une membership active existe déjà pour le couple
 * (user, pnpe).
 */
import { internalMutation } from "../../_generated/server";
import { MemberRole } from "../../lib/constants";
import { PNPE_MODULES_BY_ROLE } from "../../lib/pnpeModules";

type StaffSlot = {
  slot: string;
  antenneSlug: string; // "national" pour DG + admin ministère
  role: string;
  nom: string;
  prenoms: string;
  fonctionAffichee: string;
};

const NATIONAL_STAFF: StaffSlot[] = [
  {
    slot: "dg",
    antenneSlug: "national",
    role: MemberRole.DirectionPnpe,
    nom: "EDZANG",
    prenoms: "Anicet",
    fonctionAffichee: "Directeur Général PNPE",
  },
  {
    slot: "admin-min-travail",
    antenneSlug: "national",
    role: MemberRole.AdminMinistereTravail,
    nom: "ILOGUE",
    prenoms: "Jacqueline",
    fonctionAffichee: "Cabinet Ministre du Travail",
  },
];

/** 7 antennes opérationnelles. Lambaréné ouvre en février 2026. */
const ANTENNES_OPERATIONNELLES = [
  {
    slug: "antenne-libreville",
    code: "libreville",
    chef: { nom: "MBA", prenoms: "Marie" },
    conseiller1: { nom: "NGUEMA", prenoms: "Jean" },
    conseiller2: { nom: "OBAME", prenoms: "Sophie" },
  },
  {
    slug: "antenne-franceville",
    code: "franceville",
    chef: { nom: "MOUKEGNI", prenoms: "Paul" },
    conseiller1: { nom: "OBIANG", prenoms: "Léa" },
    conseiller2: { nom: "ONDIMBA", prenoms: "Pierre" },
  },
  {
    slug: "antenne-lambarene",
    code: "lambarene",
    chef: { nom: "BONGO", prenoms: "Sylvie" },
    conseiller1: { nom: "MBA", prenoms: "André" },
    conseiller2: { nom: "OBAME", prenoms: "Lucie" },
  },
  {
    slug: "antenne-koulamoutou",
    code: "koulamoutou",
    chef: { nom: "NTOUTOUME", prenoms: "Henri" },
    conseiller1: { nom: "NGUEMA", prenoms: "Claire" },
    conseiller2: { nom: "ONDIMBA", prenoms: "Marc" },
  },
  {
    slug: "antenne-port-gentil",
    code: "port-gentil",
    chef: { nom: "MOUKEGNI", prenoms: "Christelle" },
    conseiller1: { nom: "OBIANG", prenoms: "Sébastien" },
    conseiller2: { nom: "MBA", prenoms: "Pauline" },
  },
  {
    slug: "antenne-tchibanga",
    code: "tchibanga",
    chef: { nom: "NGUEMA", prenoms: "Daniel" },
    conseiller1: { nom: "BONGO", prenoms: "Isabelle" },
    conseiller2: { nom: "OBAME", prenoms: "Olivier" },
  },
  {
    slug: "antenne-oyem",
    code: "oyem",
    chef: { nom: "NTOUTOUME", prenoms: "Aline" },
    conseiller1: { nom: "MOUKEGNI", prenoms: "Bertrand" },
    conseiller2: { nom: "OBIANG", prenoms: "Nadia" },
  },
] as const;

function buildAntenneStaff(): StaffSlot[] {
  const staff: StaffSlot[] = [];
  for (const a of ANTENNES_OPERATIONNELLES) {
    staff.push({
      slot: "chef",
      antenneSlug: a.slug,
      role: MemberRole.ChefAntennePnpe,
      nom: a.chef.nom,
      prenoms: a.chef.prenoms,
      fonctionAffichee: `Chef d'antenne — ${a.code}`,
    });
    staff.push({
      slot: "conseiller-1",
      antenneSlug: a.slug,
      role: MemberRole.ConseillerPnpe,
      nom: a.conseiller1.nom,
      prenoms: a.conseiller1.prenoms,
      fonctionAffichee: `Conseiller PNPE — ${a.code}`,
    });
    staff.push({
      slot: "conseiller-2",
      antenneSlug: a.slug,
      role: MemberRole.ConseillerPnpe,
      nom: a.conseiller2.nom,
      prenoms: a.conseiller2.prenoms,
      fonctionAffichee: `Conseiller PNPE — ${a.code}`,
    });
  }
  return staff;
}

function emailFor(slot: StaffSlot): string {
  const antenneCode =
    slot.antenneSlug === "national"
      ? "national"
      : slot.antenneSlug.replace("antenne-", "");
  return `${slot.slot}@${antenneCode}.demo.pnpe.administration.ga`;
}

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const results = {
      org: null as string | null,
      created: 0,
      skipped: 0,
      assignmentsCreated: 0,
      usersNotFound: [] as string[],
      antennesMissing: [] as string[],
      errors: [] as string[],
    };

    const orgPnpe = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", "pnpe"))
      .unique();
    if (!orgPnpe) {
      return {
        ...results,
        org: "MISSING",
        message:
          "Org 'pnpe' introuvable. Lancer seedEtablissementsPublics + renamePnpeSlug d'abord.",
      };
    }
    results.org = orgPnpe._id;

    const adminUser = await ctx.db.query("users").first();
    if (!adminUser) {
      return { ...results, message: "Aucun utilisateur en base." };
    }

    const allStaff = [...NATIONAL_STAFF, ...buildAntenneStaff()];

    for (const slot of allStaff) {
      const email = emailFor(slot);
      try {
        const user = await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", email))
          .unique();

        if (!user) {
          results.usersNotFound.push(email);
          continue;
        }

        // Skip si déjà membre actif
        const existingMemberships = await ctx.db
          .query("memberships")
          .withIndex("by_user_org", (q) =>
            q.eq("userId", user._id).eq("orgId", orgPnpe._id),
          )
          .collect();
        const activeMembership = existingMemberships.find((m) => !m.deletedAt);

        let membershipId = activeMembership?._id;
        if (!membershipId) {
          membershipId = await ctx.db.insert("memberships", {
            userId: user._id,
            orgId: orgPnpe._id,
          });
          results.created++;
        } else {
          results.skipped++;
        }

        // Skip assignment si déjà existant
        const existingAssign = await ctx.db
          .query("pnpeStaffAssignments")
          .withIndex("by_membership", (q) => q.eq("membershipId", membershipId))
          .unique();
        if (existingAssign) continue;

        // Cherche l'antenne si applicable
        let antenneId: string | undefined;
        if (slot.antenneSlug !== "national") {
          const antenne = await ctx.db
            .query("antennesPnpe")
            .withIndex("by_slug", (q) => q.eq("slug", slot.antenneSlug))
            .unique();
          if (!antenne) {
            results.antennesMissing.push(slot.antenneSlug);
          } else {
            antenneId = antenne._id;
          }
        }

        await ctx.db.insert("pnpeStaffAssignments", {
          userId: user._id,
          membershipId,
          pnpeRole: slot.role as never,
          antenneId: antenneId as never,
          modules: [...(PNPE_MODULES_BY_ROLE[slot.role] ?? [])],
          fonctionAffichee: slot.fonctionAffichee,
          nom: slot.nom,
          prenoms: slot.prenoms,
          isActive: true,
          createdByUserId: adminUser._id,
        });
        results.assignmentsCreated++;
      } catch (e) {
        results.errors.push(
          `${email}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    return results;
  },
});
