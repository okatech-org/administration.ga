/**
 * Recherche unifiée iCorrespondance + iDocument (Phase 5 — alignement).
 *
 * Interroge en parallèle les deux searchIndex (`correspondanceItems.search_all`
 * et `documents.search_all`) et retourne un agrégat normalisé pour la barre
 * de recherche globale d'agent-web.
 *
 * Les deux côtés appliquent leurs propres règles d'autorisation (membership +
 * confidentialité), donc on s'appuie sur les query existantes pour ne pas
 * réimplémenter la sécurité.
 */

import { v } from "convex/values";
import { authQuery } from "../lib/customFunctions";
import { filterByConfidentialityClearance } from "../lib/correspondanceHelpers";

export const search = authQuery({
  args: {
    orgId: v.id("orgs"),
    searchText: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const trimmed = args.searchText.trim();
    if (!trimmed)
      return {
        correspondance: [] as any[],
        documents: [] as any[],
        total: 0,
      };

    const max = args.limit ?? 30;

    // ── Correspondance ──
    const correspondanceRaw = await ctx.db
      .query("correspondanceItems")
      .withSearchIndex("search_all", (q) =>
        q.search("searchText", trimmed).eq("copyOwnerOrgId", args.orgId),
      )
      .take(max * 2);
    const correspondanceVisible = correspondanceRaw.filter((i) => !i.deletedAt);
    const correspondance = (
      await filterByConfidentialityClearance(ctx, ctx.user, correspondanceVisible)
    )
      .slice(0, max)
      .map((i) => ({
        _id: i._id,
        kind: "correspondance" as const,
        reference: i.reference,
        title: i.title,
        senderName: i.senderName,
        recipientName: i.recipientName,
        status: i.status,
        updatedAt: i.updatedAt,
      }));

    // ── Documents (utilise le searchIndex `search_all` côté documents) ──
    const documentsRaw = await ctx.db
      .query("documents")
      .withSearchIndex("search_all", (q) =>
        q.search("searchText", trimmed).eq("ownerId", args.orgId),
      )
      .take(max * 2);
    const documents = documentsRaw
      .filter((d) => !d.deletedAt)
      .slice(0, max)
      .map((d) => ({
        _id: d._id,
        kind: "document" as const,
        label: d.label ?? d.files?.[0]?.filename ?? "Document",
        category: d.category,
        status: d.status,
        linkedCorrespondanceItemId: d.linkedCorrespondanceItemId,
        originType: d.origin?.type,
        updatedAt: d.updatedAt ?? (d as any)._creationTime,
      }));

    return {
      correspondance,
      documents,
      total: correspondance.length + documents.length,
    };
  },
});
