/**
 * Notifications PNPE / TRAVAIL.GA.
 *
 * Trois templates email pour les evenements critiques :
 *   - `notifyOffrePubliee` : envoyee a l'employeur quand son offre est
 *     validee (statut PUBLIEE) ;
 *   - `notifyCandidatureRecue` : envoyee a l'employeur quand un D.E
 *     ou citoyen postule a son offre ;
 *   - `notifyRdvConfirme` : envoyee au D.E quand le conseiller confirme
 *     un rendez-vous d'accompagnement.
 *
 * Toutes les actions sont internal et appelees par les mutations PNPE
 * via `ctx.scheduler.runAfter(0, internal.functions.pnpe.notifications.X, ...)`.
 */
import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import { resend } from "../notifications";

const FROM_PNPE = `PNPE.GA <${
  process.env.RESEND_FROM_PNPE ?? "no-reply@updates.administration.ga"
}>`;
const APP_PNPE = process.env.NEXT_PUBLIC_DOMAIN_PNPE
  ? `https://${process.env.NEXT_PUBLIC_DOMAIN_PNPE}`
  : "https://emploi.administration.ga";
const APP_TRAVAIL = "https://travail.ga";

function shell(content: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f4;color:#1c1917;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="background:#0072B9;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0;">
      <div style="font-weight:900;font-size:20px;letter-spacing:-0.02em;">
        PNPE<span style="color:#10b981;">.GA</span>
      </div>
      <div style="font-size:12px;opacity:0.85;margin-top:4px;">
        Pole National de Promotion de l'Emploi — Republique Gabonaise
      </div>
    </div>
    <div style="background:#fff;border:1px solid #e7e5e4;border-top:0;border-radius:0 0 12px 12px;padding:24px;">
      ${content}
    </div>
    <div style="text-align:center;color:#78716c;font-size:12px;margin-top:16px;">
      PNPE — Ministere du Travail, du Plein Emploi, du Dialogue Social et de la Formation Professionnelle.<br/>
      Cet email vous est envoye dans le cadre de votre activite sur ${APP_PNPE}.
    </div>
  </div>
</body>
</html>`;
}

// ─── 1. Offre publiee (employeur) ───────────────────────────────

export const notifyOffrePubliee = internalAction({
  args: {
    to: v.string(),
    offreReference: v.string(),
    offreTitre: v.string(),
    employeurNom: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const link = `${APP_PNPE}/employeur/offres/${args.offreReference}`;
    const html = shell(
      `
        <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;">
          Votre offre est publiee !
        </h1>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
          ${args.employeurNom ? `Bonjour ${args.employeurNom},` : "Bonjour,"}
          le conseiller PNPE vient de valider votre annonce.
        </p>
        <div style="background:#f5f5f4;border-radius:8px;padding:16px;margin:0 0 16px;">
          <div style="font-weight:600;font-size:16px;">${args.offreTitre}</div>
          <div style="font-size:12px;color:#78716c;margin-top:4px;">
            Reference : ${args.offreReference}
          </div>
        </div>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
          Elle est desormais visible sur <a href="${APP_TRAVAIL}" style="color:#0072B9;">TRAVAIL.GA</a>
          et les candidatures qualifiees vous seront notifiees par email.
        </p>
        <a href="${link}" style="display:inline-block;background:#0072B9;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px;">
          Voir mon offre
        </a>
      `,
      "Offre publiee — PNPE.GA",
    );

    try {
      await resend.sendEmail(ctx, {
        from: FROM_PNPE,
        to: args.to,
        subject: `[PNPE] Offre publiee — ${args.offreTitre}`,
        html,
      });
      return { success: true };
    } catch (err) {
      console.error("[pnpe.notifications] notifyOffrePubliee failed:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "unknown",
      };
    }
  },
});

// ─── 2. Candidature recue (employeur) ───────────────────────────

export const notifyCandidatureRecue = internalAction({
  args: {
    to: v.string(),
    offreReference: v.string(),
    offreTitre: v.string(),
    candidatPrenoms: v.string(),
    candidatNom: v.string(),
    typeCandidature: v.union(
      v.literal("DEMANDEUR_INSCRIT"),
      v.literal("CITOYEN_ORDINAIRE"),
    ),
    employeurNom: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const link = `${APP_PNPE}/employeur/offres/${args.offreReference}/candidatures`;
    const typeLabel =
      args.typeCandidature === "DEMANDEUR_INSCRIT"
        ? "Demandeur d'Emploi inscrit"
        : "Citoyen (compte basique)";

    const html = shell(
      `
        <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;">
          Nouvelle candidature recue
        </h1>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
          ${args.employeurNom ? `Bonjour ${args.employeurNom},` : "Bonjour,"}
          un candidat vient de postuler a votre offre.
        </p>
        <div style="background:#f5f5f4;border-radius:8px;padding:16px;margin:0 0 16px;">
          <div style="font-size:13px;color:#78716c;">Candidat</div>
          <div style="font-weight:600;font-size:16px;margin-top:2px;">
            ${args.candidatPrenoms} ${args.candidatNom}
          </div>
          <div style="font-size:12px;color:#78716c;margin-top:6px;">
            Profil : ${typeLabel}
          </div>
          <div style="font-size:12px;color:#78716c;margin-top:12px;">
            Offre : <strong>${args.offreTitre}</strong> (${args.offreReference})
          </div>
        </div>
        <a href="${link}" style="display:inline-block;background:#0072B9;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px;">
          Voir les candidatures
        </a>
      `,
      "Nouvelle candidature — PNPE.GA",
    );

    try {
      await resend.sendEmail(ctx, {
        from: FROM_PNPE,
        to: args.to,
        subject: `[PNPE] Nouvelle candidature — ${args.offreTitre}`,
        html,
      });
      return { success: true };
    } catch (err) {
      console.error("[pnpe.notifications] notifyCandidatureRecue failed:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "unknown",
      };
    }
  },
});

// ─── 3. Rendez-vous confirme (D.E) ──────────────────────────────

export const notifyRdvConfirme = internalAction({
  args: {
    to: v.string(),
    candidatPrenoms: v.string(),
    dateRdv: v.number(), // timestamp
    antenneVille: v.string(),
    conseillerNom: v.optional(v.string()),
    rdvUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const dateStr = new Date(args.dateRdv).toLocaleString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const link = args.rdvUrl ?? `${APP_PNPE}/demandeur/rendez-vous`;

    const html = shell(
      `
        <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;">
          Rendez-vous confirme
        </h1>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
          Bonjour ${args.candidatPrenoms}, votre rendez-vous avec ${
            args.conseillerNom ?? "le conseiller PNPE"
          } est confirme.
        </p>
        <div style="background:#f0f9ff;border-left:3px solid #0072B9;border-radius:8px;padding:16px;margin:0 0 16px;">
          <div style="font-weight:600;font-size:16px;">${dateStr}</div>
          <div style="font-size:13px;color:#78716c;margin-top:4px;">
            Antenne PNPE — ${args.antenneVille}
          </div>
        </div>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
          Merci de vous presenter 10 minutes avant l'horaire avec votre piece
          d'identite et votre CV a jour.
        </p>
        <a href="${link}" style="display:inline-block;background:#0072B9;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px;">
          Voir mes rendez-vous
        </a>
      `,
      "Rendez-vous confirme — PNPE.GA",
    );

    try {
      await resend.sendEmail(ctx, {
        from: FROM_PNPE,
        to: args.to,
        subject: `[PNPE] Rendez-vous confirme — ${dateStr}`,
        html,
      });
      return { success: true };
    } catch (err) {
      console.error("[pnpe.notifications] notifyRdvConfirme failed:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "unknown",
      };
    }
  },
});
