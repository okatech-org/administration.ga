/**
 * iCorrespondance — Envoi email
 *
 * Action Convex qui envoie une correspondance par email via Resend.
 * Utilisé pour les correspondances destinées à des organisations externes
 * (hors de la plateforme gabon-diplomatie).
 */

import { v } from "convex/values";
import { internalAction, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { resend } from "./notifications";
import { getPlatformConfig, fromEmail } from "../lib/platform";
import { emailLayout } from "../lib/emailTemplates";

// ═════════════════════════════════════════════════════════════════════════════
// TEMPLATES EMAIL
// ═════════════════════════════════════════════════════════════════════════════

/** Labels lisibles des types de correspondance */
const TYPE_LABELS: Record<string, string> = {
  note_verbale: "Note Verbale",
  lettre_officielle: "Lettre Officielle",
  circulaire: "Circulaire",
  telegramme: "Télégramme",
  memorandum: "Mémorandum",
  communique: "Communiqué",
};

/** Labels des niveaux de priorité */
const PRIORITY_LABELS: Record<string, string> = {
  normal: "Normal",
  urgent: "URGENT",
  confidentiel: "CONFIDENTIEL",
};

/**
 * Génère le HTML de l'email de correspondance diplomatique.
 */
function buildCorrespondanceEmail(args: {
  reference: string;
  title: string;
  type: string;
  priority: string;
  senderName: string;
  senderOrg: string;
  recipientName: string;
  comment?: string;
  hasAttachments: boolean;
  attachmentCount: number;
}) {
  const platform = getPlatformConfig("agent");
  const typeLabel = TYPE_LABELS[args.type] ?? args.type;
  const priorityLabel = PRIORITY_LABELS[args.priority] ?? args.priority;

  const priorityBadge =
    args.priority === "urgent"
      ? '<span style="background: #ef4444; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">URGENT</span>'
      : args.priority === "confidentiel"
        ? '<span style="background: #8b5cf6; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">CONFIDENTIEL</span>'
        : "";

  const content = `
    <div class="info-box">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0; font-weight: 600; color: #6b7280; width: 140px;">Référence</td>
          <td style="padding: 4px 0; font-weight: 700;">${args.reference}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-weight: 600; color: #6b7280;">Type</td>
          <td style="padding: 4px 0;">${typeLabel} ${priorityBadge}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-weight: 600; color: #6b7280;">Expéditeur</td>
          <td style="padding: 4px 0;">${args.senderName}${args.senderOrg ? ` — ${args.senderOrg}` : ""}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-weight: 600; color: #6b7280;">Destinataire</td>
          <td style="padding: 4px 0;">${args.recipientName}</td>
        </tr>
      </table>
    </div>

    <h3 style="margin-top: 20px;">${args.title}</h3>

    ${args.comment ? `<p style="color: #374151;">${args.comment}</p>` : ""}

    ${
      args.hasAttachments
        ? `<div class="warning-box">
        <strong>📎 ${args.attachmentCount} pièce(s) jointe(s)</strong>
        <p style="margin: 5px 0 0; font-size: 14px; color: #92400e;">
          Les documents sont disponibles sur la plateforme diplomatique.
          Connectez-vous pour les consulter et télécharger.
        </p>
      </div>`
        : ""
    }

    <p style="text-align: center; margin-top: 30px;">
      <a href="#" class="button">Consulter sur la plateforme</a>
    </p>

    <p style="font-size: 12px; color: #9ca3af; margin-top: 20px; text-align: center;">
      Ce message est généré automatiquement par le système iCorrespondance.
      Merci de ne pas répondre directement à cet email.
    </p>
  `;

  const subject =
    args.priority === "urgent"
      ? `[URGENT] ${typeLabel} — ${args.reference}`
      : `${typeLabel} — ${args.reference}`;

  return {
    subject,
    html: emailLayout("Correspondance Diplomatique", content, platform, "fr"),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// ACTION D'ENVOI
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Envoyer une correspondance par email via Resend.
 *
 * Appelé depuis correspondanceCore.ts après l'envoi effectif,
 * uniquement si le destinataire a un email configuré.
 */
export const sendCorrespondanceEmail = internalAction({
  args: {
    recipientEmail: v.string(),
    reference: v.string(),
    title: v.string(),
    type: v.string(),
    priority: v.string(),
    senderName: v.string(),
    senderOrg: v.string(),
    recipientName: v.string(),
    comment: v.optional(v.string()),
    hasAttachments: v.boolean(),
    attachmentCount: v.number(),
    // Pour le log
    itemId: v.id("correspondanceItems"),
  },
  handler: async (ctx, args) => {
    const { recipientEmail, itemId, ...emailData } = args;

    const email = buildCorrespondanceEmail(emailData);

    try {
      const platform = getPlatformConfig("agent");
      await resend.sendEmail(ctx, {
        from: fromEmail(platform),
        to: recipientEmail,
        subject: email.subject,
        html: email.html,
      });

      // Log succès via mutation interne
      await ctx.runMutation(
        internal.functions.correspondanceEmail.logEmailSent,
        {
          itemId,
          recipientEmail,
          status: "sent",
        },
      );
    } catch (err: any) {
      console.error("[correspondanceEmail] Erreur envoi:", err);

      // Log échec
      await ctx.runMutation(
        internal.functions.correspondanceEmail.logEmailSent,
        {
          itemId,
          recipientEmail,
          status: "failed",
          errorMessage: err?.message ?? "Erreur inconnue",
        },
      );
    }
  },
});

/**
 * Logger le résultat de l'envoi email dans le workflow.
 */
export const logEmailSent = internalMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    recipientEmail: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const comment =
      args.status === "sent"
        ? `Email envoyé à ${args.recipientEmail}`
        : `Échec envoi email à ${args.recipientEmail} : ${args.errorMessage}`;

    await ctx.db.insert("correspondanceWorkflowSteps", {
      itemId: args.itemId,
      stepType: "SENT_EMAIL",
      actorId: (await ctx.db.query("users").first())?._id as any, // système
      actorName: "Système",
      comment,
      isRead: false,
      createdAt: now,
    });
  },
});
