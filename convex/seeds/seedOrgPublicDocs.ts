/**
 * Seed des documents publics téléchargeables pour quelques orgs.
 *
 * Strategie : on ne peut pas uploader un binaire depuis une mutation, mais
 * Convex permet de stocker un Blob via `ctx.storage.store(blob)` côté action.
 * On utilise donc une internalAction qui génère un PDF minimal en mémoire
 * puis appelle une internalMutation pour persister l'entrée.
 *
 * Usage :
 *   bunx convex run seeds/seedOrgPublicDocs:seedOrgPublicDocs
 */
import { v } from "convex/values";
import { action, internalMutation } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

// PDF minimal valide (8 ko, vide avec juste une page A4 + titre).
// Généré comme une chaîne UTF-8 que l'on encode ensuite en bytes.
function makeMinimalPdf(title: string): Uint8Array {
  const safe = title.replace(/[()\\]/g, "");
  const body = [
    "%PDF-1.4",
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    "4 0 obj << /Length 100 >>",
    "stream",
    "BT /F1 24 Tf 50 780 Td (Consulat.ga) Tj ET",
    `BT /F1 14 Tf 50 740 Td (${safe}) Tj ET`,
    "BT /F1 10 Tf 50 700 Td (Document officiel — Republique Gabonaise) Tj ET",
    "endstream",
    "endobj",
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    "xref",
    "0 6",
    "0000000000 65535 f",
    "0000000010 00000 n",
    "0000000060 00000 n",
    "0000000115 00000 n",
    "0000000225 00000 n",
    "0000000400 00000 n",
    "trailer << /Size 6 /Root 1 0 R >>",
    "startxref",
    "470",
    "%%EOF",
  ].join("\n");
  return new TextEncoder().encode(body);
}

type DocSeed = {
  orgSlug: string;
  title: string;
  category:
    | "checklist"
    | "form"
    | "brochure"
    | "pricing"
    | "access"
    | "other";
  order: number;
};

const DOCS: DocSeed[] = [
  { orgSlug: "fr-ambassade-paris", title: "Liste des pièces — Passeport biométrique", category: "checklist", order: 1 },
  { orgSlug: "fr-ambassade-paris", title: "Formulaire d'inscription consulaire", category: "form", order: 2 },
  { orgSlug: "fr-ambassade-paris", title: "Tarifs consulaires 2026", category: "pricing", order: 3 },
  { orgSlug: "fr-ambassade-paris", title: "Plan d'accès & transports", category: "access", order: 4 },

  { orgSlug: "be-ambassade-bruxelles", title: "Liste des pièces — Visa Schengen", category: "checklist", order: 1 },
  { orgSlug: "be-ambassade-bruxelles", title: "Tarifs consulaires 2026", category: "pricing", order: 2 },

  { orgSlug: "ca-ambassade-ottawa", title: "Liste des pièces — Passeport", category: "checklist", order: 1 },
  { orgSlug: "ca-ambassade-ottawa", title: "Formulaire d'inscription consulaire", category: "form", order: 2 },

  { orgSlug: "sn-ambassade-dakar", title: "Tarifs consulaires 2026", category: "pricing", order: 1 },

  { orgSlug: "cn-ambassade-pekin", title: "Liste des pièces — Visa pour le Gabon", category: "checklist", order: 1 },
];

export const insertDoc = internalMutation({
  args: {
    orgSlug: v.string(),
    title: v.string(),
    category: v.union(
      v.literal("checklist"),
      v.literal("form"),
      v.literal("brochure"),
      v.literal("pricing"),
      v.literal("access"),
      v.literal("other"),
    ),
    order: v.number(),
    storageId: v.id("_storage"),
    sizeBytes: v.number(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", args.orgSlug))
      .first();
    if (!org) return { skipped: true, reason: "org-not-found" };

    // Idempotence : skip si même (orgId, title) déjà présent et actif
    const existing = await ctx.db
      .query("orgPublicDocuments")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .collect();
    if (existing.some((d) => d.title === args.title && !d.deletedAt)) {
      return { skipped: true, reason: "already-exists" };
    }

    const now = Date.now();
    await ctx.db.insert("orgPublicDocuments", {
      orgId: org._id,
      title: args.title,
      category: args.category,
      storageId: args.storageId,
      mimeType: "application/pdf",
      sizeBytes: args.sizeBytes,
      order: args.order,
      isActive: true,
      publishedAt: now,
      updatedAt: now,
    });
    return { created: true };
  },
});

export const seedOrgPublicDocs = action({
  args: {},
  handler: async (ctx): Promise<{ created: number; skipped: number }> => {
    let created = 0;
    let skipped = 0;

    for (const doc of DOCS) {
      const pdfBytes = makeMinimalPdf(doc.title);
      const blob = new Blob([new Uint8Array(pdfBytes)], {
        type: "application/pdf",
      });
      const storageId: Id<"_storage"> = await ctx.storage.store(blob);
      const result = await ctx.runMutation(
        internal.seeds.seedOrgPublicDocs.insertDoc,
        {
          orgSlug: doc.orgSlug,
          title: doc.title,
          category: doc.category,
          order: doc.order,
          storageId,
          sizeBytes: pdfBytes.byteLength,
        },
      );
      if (result.created) created++;
      else skipped++;
    }
    return { created, skipped };
  },
});
