/**
 * Enrichit quelques représentations diplomatiques avec les nouvelles données
 * publiques (contacts multiples, accessInfo, regionalRole, operationalMode,
 * tags, photos staff, documents publics téléchargeables).
 *
 * Idempotent : ne touche que les orgs ciblées par slug, et :
 *   - patch `contacts` / `identityExtended` / `branding.accessInfo` à chaque run
 *     (les enrichit pour garantir un état complet, écrase si présent)
 *   - documents publics : skip si même titre déjà inséré
 *
 * Usage :
 *   bunx convex run seeds/seedOrgDetails:seedOrgDetails
 */
import { v } from "convex/values";
import { mutation } from "../_generated/server";

type SeedDoc = {
  title: string;
  category:
    | "checklist"
    | "form"
    | "brochure"
    | "pricing"
    | "access"
    | "other";
  sizeBytes: number;
  mimeType: string;
};

type OrgSeed = {
  slug: string;
  contacts: Array<{
    kind:
      | "phone_main"
      | "phone_emergency"
      | "phone_visas"
      | "phone_consular"
      | "email_main"
      | "email_visas"
      | "email_consular"
      | "email_press"
      | "fax"
      | "other";
    value: string;
    label?: string;
    available247?: boolean;
    order: number;
  }>;
  regionalRole?:
    | "regional_seat_europe"
    | "regional_seat_africa"
    | "regional_seat_americas"
    | "regional_seat_asia_oceania"
    | "regional_seat_middle_east";
  operationalMode?:
    | "full_exercise"
    | "limited_exercise"
    | "honorary"
    | "antenna";
  tags?: string[];
  accessInfo?: {
    transportFr?: string;
    walkingTimeMinutes?: number;
    parkingNotesFr?: string;
    accessibilityNotesFr?: string;
  };
  publicDescriptionFr?: string;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    youtube?: string;
  };
  jurisdictionNotes?: string;
  staffCount?: number;
  documents?: SeedDoc[];
};

const SEED: OrgSeed[] = [
  {
    slug: "fr-ambassade-paris",
    contacts: [
      { kind: "phone_main", value: "+33 1 42 24 79 60", order: 1 },
      {
        kind: "phone_emergency",
        value: "+33 6 47 88 02 12",
        available247: true,
        order: 2,
      },
      {
        kind: "email_main",
        value: "contact@ambassade-gabon.fr",
        order: 10,
      },
      {
        kind: "email_visas",
        value: "visas@ambassade-gabon.fr",
        order: 11,
      },
      { kind: "fax", value: "+33 1 42 24 79 61", order: 20 },
    ],
    regionalRole: "regional_seat_europe",
    operationalMode: "full_exercise",
    tags: ["Plein exercice", "Siège régional · Europe"],
    accessInfo: {
      transportFr: "Métro Ranelagh (ligne 9) — 8 min à pied",
      walkingTimeMinutes: 8,
      parkingNotesFr: "Stationnement résidentiel limité. Parking public à 250 m.",
      accessibilityNotesFr:
        "Accès PMR par l'entrée principale, rampe et ascenseur.",
    },
    publicDescriptionFr:
      "L'Ambassade du Gabon à Paris est le premier poste diplomatique d'Europe. Elle couvre la France métropolitaine, les DROM-COM, Monaco et Andorre.",
    socialLinks: {
      facebook: "https://facebook.com/AmbassadeGabonFrance",
      twitter: "https://twitter.com/GabonFranceAmb",
      linkedin: "https://linkedin.com/company/ambassade-gabon-france",
    },
    jurisdictionNotes:
      "Compétence : France métropolitaine, DROM-COM, Monaco, Andorre.",
    staffCount: 28,
    documents: [
      {
        title: "Liste des pièces — Passeport biométrique",
        category: "checklist",
        sizeBytes: 124_000,
        mimeType: "application/pdf",
      },
      {
        title: "Formulaire d'inscription consulaire",
        category: "form",
        sizeBytes: 87_000,
        mimeType: "application/pdf",
      },
      {
        title: "Tarifs consulaires 2026",
        category: "pricing",
        sizeBytes: 62_000,
        mimeType: "application/pdf",
      },
      {
        title: "Plan d'accès & transports",
        category: "access",
        sizeBytes: 410_000,
        mimeType: "application/pdf",
      },
    ],
  },
  {
    slug: "be-ambassade-bruxelles",
    contacts: [
      { kind: "phone_main", value: "+32 2 340 62 00", order: 1 },
      {
        kind: "phone_emergency",
        value: "+32 472 11 22 33",
        available247: true,
        order: 2,
      },
      { kind: "email_main", value: "ambassade@gabon-be.org", order: 10 },
      { kind: "email_consular", value: "consulat@gabon-be.org", order: 11 },
    ],
    operationalMode: "full_exercise",
    tags: ["Mission auprès de l'Union Européenne"],
    accessInfo: {
      transportFr: "Métro Boitsfort — 5 min à pied",
      walkingTimeMinutes: 5,
      accessibilityNotesFr: "Accès PMR par l'entrée latérale.",
    },
    publicDescriptionFr:
      "L'Ambassade du Gabon à Bruxelles assure aussi la mission auprès de l'Union Européenne et du Benelux.",
    jurisdictionNotes:
      "Compétence : Belgique, Luxembourg, Pays-Bas + mission auprès de l'UE.",
    staffCount: 18,
    documents: [
      {
        title: "Liste des pièces — Visa Schengen",
        category: "checklist",
        sizeBytes: 98_000,
        mimeType: "application/pdf",
      },
      {
        title: "Tarifs consulaires 2026",
        category: "pricing",
        sizeBytes: 62_000,
        mimeType: "application/pdf",
      },
    ],
  },
  {
    slug: "ca-ambassade-ottawa",
    contacts: [
      { kind: "phone_main", value: "+1 613 232 5301", order: 1 },
      {
        kind: "phone_emergency",
        value: "+1 613 614 9911",
        available247: true,
        order: 2,
      },
      { kind: "email_main", value: "ambagabon@bellnet.ca", order: 10 },
    ],
    regionalRole: "regional_seat_americas",
    operationalMode: "full_exercise",
    tags: ["Siège régional · Amériques"],
    accessInfo: {
      transportFr: "Métro O-Train — Bayview (15 min)",
      walkingTimeMinutes: 12,
    },
    publicDescriptionFr:
      "Ambassade du Gabon à Ottawa couvrant le Canada et accréditée auprès du Mexique.",
    jurisdictionNotes: "Compétence : Canada, Mexique.",
    staffCount: 12,
    documents: [
      {
        title: "Liste des pièces — Passeport",
        category: "checklist",
        sizeBytes: 124_000,
        mimeType: "application/pdf",
      },
      {
        title: "Formulaire d'inscription consulaire",
        category: "form",
        sizeBytes: 87_000,
        mimeType: "application/pdf",
      },
    ],
  },
  {
    slug: "sn-ambassade-dakar",
    contacts: [
      { kind: "phone_main", value: "+221 33 869 35 58", order: 1 },
      {
        kind: "phone_emergency",
        value: "+221 77 555 12 12",
        available247: true,
        order: 2,
      },
      { kind: "email_main", value: "ambagabondakar@gmail.com", order: 10 },
    ],
    regionalRole: "regional_seat_africa",
    operationalMode: "full_exercise",
    tags: ["Plein exercice", "Siège régional · Afrique de l'Ouest"],
    accessInfo: {
      transportFr: "Quartier Fann — Bus Dakar Dem Dikk lignes 7 et 25",
      accessibilityNotesFr: "Accès PMR par l'entrée principale.",
    },
    publicDescriptionFr:
      "Ambassade du Gabon à Dakar couvrant le Sénégal, la Gambie et la Mauritanie.",
    jurisdictionNotes: "Compétence : Sénégal, Gambie, Mauritanie.",
    staffCount: 14,
    documents: [
      {
        title: "Tarifs consulaires 2026",
        category: "pricing",
        sizeBytes: 62_000,
        mimeType: "application/pdf",
      },
    ],
  },
  {
    slug: "cn-ambassade-pekin",
    contacts: [
      { kind: "phone_main", value: "+86 10 6532 2810", order: 1 },
      { kind: "email_main", value: "ambagabonchine@gmail.com", order: 10 },
    ],
    regionalRole: "regional_seat_asia_oceania",
    operationalMode: "full_exercise",
    tags: ["Siège régional · Asie-Pacifique"],
    accessInfo: {
      transportFr: "Subway Line 1/10 — Guomao (10 min en taxi)",
    },
    publicDescriptionFr:
      "Ambassade du Gabon à Pékin couvrant la Chine, le Japon et la Corée du Sud.",
    jurisdictionNotes: "Compétence : Chine, Japon, Corée du Sud.",
    staffCount: 8,
    documents: [
      {
        title: "Liste des pièces — Visa pour le Gabon",
        category: "checklist",
        sizeBytes: 110_000,
        mimeType: "application/pdf",
      },
    ],
  },
];

export const seedOrgDetails = mutation({
  args: {},
  handler: async (ctx) => {
    const stats = {
      orgsPatched: 0,
      orgsSkipped: 0,
      documentsCreated: 0,
      documentsSkipped: 0,
      errors: [] as string[],
    };
    const now = Date.now();

    for (const seed of SEED) {
      try {
        const org = await ctx.db
          .query("orgs")
          .withIndex("by_slug", (q) => q.eq("slug", seed.slug))
          .first();
        if (!org) {
          stats.orgsSkipped++;
          stats.errors.push(`${seed.slug}: org introuvable`);
          continue;
        }

        // Patch org : contacts + identityExtended + branding.accessInfo
        const existingBranding = org.branding ?? {};
        const existingIdentity = org.identityExtended ?? {};

        await ctx.db.patch(org._id, {
          contacts: { channels: seed.contacts },
          identityExtended: {
            ...existingIdentity,
            regionalRole: seed.regionalRole,
            operationalMode: seed.operationalMode,
            tags: seed.tags,
          },
          branding: {
            ...existingBranding,
            accessInfo: seed.accessInfo,
            publicDescription: {
              ...(existingBranding.publicDescription ?? {}),
              fr: seed.publicDescriptionFr,
            },
            socialLinks: {
              ...(existingBranding.socialLinks ?? {}),
              ...(seed.socialLinks ?? {}),
            },
          },
          jurisdictionNotes:
            seed.jurisdictionNotes ?? org.jurisdictionNotes,
          staffCount: seed.staffCount ?? org.staffCount,
          updatedAt: now,
        });
        stats.orgsPatched++;

        // Documents publics : on ne peut pas créer de Storage Id sans uploader
        // un fichier réel. On va donc skiper la création tant qu'on n'a pas
        // d'asset PDF — un message d'avertissement signale qu'il faut les
        // uploader via le backoffice ou un script séparé.
        if (seed.documents && seed.documents.length > 0) {
          // Marquer comme "à uploader" via les erreurs informatives
          for (const doc of seed.documents) {
            stats.documentsSkipped++;
            // Pas d'erreur, juste informatif :
            stats.errors.push(
              `INFO ${seed.slug}: document "${doc.title}" en attente d'upload (pas de Storage Id seed).`,
            );
          }
        }
      } catch (err) {
        stats.errors.push(
          `${seed.slug}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return stats;
  },
});

/**
 * Marquer un membership comme "publicContact" (apparait dans la liste publique
 * du personnel d'une org). Helper utilisé par les seeds dev pour produire un
 * staff de démo sans uploader de vraies photos officielles.
 */
export const publishStaffMembership = mutation({
  args: {
    membershipId: v.id("memberships"),
    publish: v.boolean(),
  },
  handler: async (ctx, args) => {
    const m = await ctx.db.get(args.membershipId);
    if (!m) throw new Error("Membership introuvable");
    await ctx.db.patch(args.membershipId, { isPublicContact: args.publish });
    return { ok: true };
  },
});

/**
 * Publie automatiquement les memberships rattachés à une org dont la position
 * est dans une liste blanche de codes (ambassadeur, conseillers, etc.).
 * Pratique pour avoir un staff démo sans intervention manuelle.
 */
export const autoPublishOrgStaff = mutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const ALLOWED_CODES = [
      "ambassadeur",
      "ambassador",
      "consul_general",
      "consul",
      "vice_consul",
      "first_counselor",
      "first_secretary",
      "economic_counselor",
      "social_counselor",
      "communication_counselor",
      "chancellor",
      "consular_affairs_officer",
    ];
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_org_deletedAt", (q) =>
        q.eq("orgId", args.orgId).eq("deletedAt", undefined),
      )
      .collect();
    let published = 0;
    for (const m of memberships) {
      if (!m.positionId) continue;
      const position = await ctx.db.get(m.positionId);
      if (!position) continue;
      if (!ALLOWED_CODES.includes(position.code)) continue;
      if (m.isPublicContact === true) continue;
      await ctx.db.patch(m._id, { isPublicContact: true });
      published++;
    }
    return { published };
  },
});
