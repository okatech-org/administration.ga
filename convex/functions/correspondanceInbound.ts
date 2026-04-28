/**
 * iCorrespondance — Ingestion d'emails entrants (email-to-correspondance)
 *
 * Crée un dossier de correspondance « reçu » à partir d'un email parsé par
 * un service externe (Resend Inbound, Postmark, SendGrid Inbound Parse,
 * relais SMTP custom). Le webhook HTTP est dans `convex/http.ts`.
 *
 * Mécanique :
 *   1. Le webhook valide un secret partagé (CORRESPONDANCE_INBOUND_SECRET)
 *   2. Le payload générique est passé en argument à `ingestInboundEmail`
 *   3. La mutation crée un correspondanceItem avec status="received",
 *      direction="incoming", isCopy=false, dans l'org cible
 *   4. Les pièces jointes (base64) sont stockées dans Convex storage
 *   5. Une entrée digitalMail est aussi créée pour le badge non-lu
 *   6. Dédup via messageId si fourni
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { MailFolder, MailOwnerType, MailSenderType, MailType } from "../lib/constants";
import {
  buildCorrespondanceSearchText,
  generateArrivalReference,
  generateSequentialReference,
} from "../lib/correspondanceHelpers";

/**
 * Pièces jointes pré-uploadées dans Convex storage par l'httpAction.
 * (storage.store n'est dispo que dans les actions, pas dans les mutations.)
 */
const ATTACHMENT_VALIDATOR = v.object({
  storageId: v.id("_storage"),
  filename: v.string(),
  mimeType: v.string(),
  sizeBytes: v.number(),
});

/**
 * Trouve une org par son inboundEmailAddress configurée dans org.settings.
 * Retourne null si aucune correspondance.
 */
async function resolveOrgFromInboundAddress(
  ctx: { db: any },
  toEmail: string,
): Promise<any | null> {
  const normalized = toEmail.trim().toLowerCase();
  const orgs = await ctx.db
    .query("orgs")
    .filter((q: any) =>
      q.and(q.eq(q.field("isActive"), true), q.eq(q.field("deletedAt"), undefined)),
    )
    .collect();

  for (const org of orgs) {
    const inbound = (org.settings as any)?.correspondanceConfig?.inboundEmailAddress;
    if (typeof inbound === "string" && inbound.trim().toLowerCase() === normalized) {
      return org;
    }
  }
  return null;
}

/**
 * Ingère un email entrant et crée un dossier de correspondance reçu.
 *
 * Routing :
 *   - Si `orgId` est fourni, l'utiliser directement.
 *   - Sinon résoudre via `to.email` → org.settings.correspondanceConfig.inboundEmailAddress.
 *   - Sinon retourner une erreur (pas de routing possible).
 *
 * Dédup :
 *   - Si `messageId` est fourni et qu'un dossier avec le même messageId
 *     existe déjà dans la même org (cherche dans tags), on ignore.
 */
export const ingestInboundEmail = internalMutation({
  args: {
    orgId: v.optional(v.id("orgs")),
    messageId: v.optional(v.string()),
    from: v.object({
      email: v.string(),
      name: v.optional(v.string()),
    }),
    to: v.object({
      email: v.string(),
      name: v.optional(v.string()),
    }),
    subject: v.string(),
    text: v.optional(v.string()),
    html: v.optional(v.string()),
    attachments: v.optional(v.array(ATTACHMENT_VALIDATOR)),
  },
  handler: async (ctx, args) => {
    // ─── 1. Routing org ────────────────────────────────────────
    let org: any = null;
    if (args.orgId) {
      org = await ctx.db.get(args.orgId);
    } else {
      org = await resolveOrgFromInboundAddress(ctx, args.to.email);
    }
    if (!org) {
      return {
        ok: false,
        reason: "no_routing",
        message: `Aucune org cible (to=${args.to.email}, orgId=${args.orgId ?? "n/a"}).`,
      };
    }
    if (org.modules && !org.modules.includes("correspondence")) {
      return { ok: false, reason: "module_disabled", orgId: org._id };
    }

    // ─── 2. Dédup par messageId (tag spécial) ──────────────────
    if (args.messageId) {
      const dedupTag = `inbound-msgid:${args.messageId}`;
      const existing = await ctx.db
        .query("correspondanceItems")
        .withIndex("by_owner_org" as any, (q: any) => q.eq("copyOwnerOrgId", org._id))
        .filter((q: any) => q.eq(q.field("deletedAt"), undefined))
        .take(50);
      const dup = existing.find((i: any) => (i.tags ?? []).includes(dedupTag));
      if (dup) {
        return { ok: true, deduped: true, itemId: dup._id };
      }
    }

    // ─── 3. Construction de la liste documents (PJ déjà uploadées) ────
    const incomingAttachments = args.attachments ?? [];
    const now = Date.now();
    const documents = incomingAttachments.map((att, i) => ({
      storageId: att.storageId,
      filename: att.filename,
      mimeType: att.mimeType,
      sizeBytes: att.sizeBytes,
      uploadedAt: now,
      ordre: i + 1,
      isMainDocument: i === 0,
      label: att.filename,
    }));

    // ─── 4. Construction du body ───────────────────────────────
    const body = args.text?.trim() || stripHtmlBasic(args.html ?? "") || "(corps vide)";

    // ─── 5. Génération des références ──────────────────────────
    const reference = await generateSequentialReference(ctx, "lettre_officielle");
    const arrivalReference = await generateArrivalReference(ctx, org._id);

    const senderName = args.from.name?.trim() || args.from.email;
    const senderOrg = extractDomainOrg(args.from.email);
    const recipientName = args.to.name?.trim() || org.name || args.to.email;

    const tags = ["email-entrant"];
    if (args.messageId) tags.push(`inbound-msgid:${args.messageId}`);

    // ─── 6. Création du dossier reçu ───────────────────────────
    const itemId = await ctx.db.insert("correspondanceItems", {
      orgId: org._id,
      copyOwnerOrgId: org._id,
      isCopy: false,
      createdBy: org._id as any, // pas d'auteur humain → on lie à l'org
      reference,
      title: args.subject.trim() || "(sans objet)",
      type: "lettre_officielle",
      priority: "normal",
      status: "received",
      direction: "incoming",
      senderName,
      senderOrg,
      senderEmail: args.from.email,
      recipientName,
      recipientOrg: org.name,
      recipientEmail: args.to.email,
      primaryRecipientOrgId: org._id,
      comment: body,
      tags,
      requiresApproval: false,
      documents,
      confidentialite: "standard",
      arrivalReference,
      arrivalDate: now,
      readByIds: [],
      searchText: buildCorrespondanceSearchText({
        title: args.subject,
        reference,
        senderName,
        senderOrg,
        recipientName,
        recipientOrg: org.name,
        comment: body,
        tags,
        arrivalReference,
      }),
      createdAt: now,
      updatedAt: now,
    });

    // ─── 7. Audit trail ────────────────────────────────────────
    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId,
      stepType: "REGISTERED",
      actorId: org._id as any,
      actorName: "Système (email entrant)",
      comment: `Email reçu de ${senderName} <${args.from.email}>. Enregistré sous ${arrivalReference}.`,
      isRead: false,
      createdAt: now,
    });

    // ─── 8. iBoîte cross-module (badge non-lu) ─────────────────
    await ctx.db.insert("digitalMail", {
      userId: org._id as any,
      ownerId: org._id,
      ownerType: MailOwnerType.Organization,
      type: MailType.Letter,
      folder: MailFolder.Inbox,
      sender: {
        name: senderName,
        type: MailSenderType.System,
        entityId: org._id,
        entityType: MailOwnerType.Organization,
      },
      subject: `[Email] ${args.subject}`.slice(0, 200),
      preview: body.slice(0, 200),
      content: body,
      isRead: false,
      isStarred: false,
      threadId: itemId,
      linkedCorrespondanceItemId: itemId,
      createdAt: now,
      updatedAt: now,
    });

    return { ok: true, itemId, reference, arrivalReference };
  },
});

/**
 * Strip HTML très basique (suppression des balises) pour fallback texte.
 * Pas un sanitizer complet — utilisé uniquement quand `text` est absent.
 */
function stripHtmlBasic(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extrait la partie organisation d'une adresse email (domaine sans TLD).
 * Exemple : "alice@mfa.gov.fr" → "Mfa.gov".
 */
function extractDomainOrg(email: string): string | undefined {
  const at = email.indexOf("@");
  if (at < 0) return undefined;
  const domain = email.slice(at + 1);
  const parts = domain.split(".");
  if (parts.length < 2) return domain;
  // Capitalise la première lettre du nom de domaine principal
  const main = parts.slice(0, parts.length - 1).join(".");
  return main.charAt(0).toUpperCase() + main.slice(1);
}
