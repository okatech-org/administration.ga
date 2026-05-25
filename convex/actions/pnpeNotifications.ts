/**
 * Notifications PNPE / TRAVAIL.GA — 3 canaux.
 *
 * **Gradation par criticité** :
 *  - **Email** (Resend, gratuit) : confirmation candidature, statut,
 *    rappels non urgents. Systématique.
 *  - **WhatsApp** (Twilio peu cher au Gabon) : événements importants
 *    (validation D.E, candidature retenue, RDV confirmé J-7).
 *  - **SMS** (Twilio coûteux) : critiques uniquement (RDV J-1, urgence).
 *
 * Helper `notifyMulti` permet d'envoyer sur plusieurs canaux d'un coup.
 *
 * Mode mock activé par `PNPE_MOCK_INTEGRATIONS=1` — logs en console
 * sans appel réseau.
 */
"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";

const isMock = (): boolean => process.env.PNPE_MOCK_INTEGRATIONS === "1";

// ─── Helpers HTTP ─────────────────────────────────────────────

async function sendEmailViaResend(args: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ sent: boolean; source: string; messageId?: string }> {
  if (isMock()) {
    console.log(`[MOCK Resend]\n  To: ${args.to}\n  Subject: ${args.subject}\n  Text: ${args.text}`);
    return { sent: true, source: "mock" };
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, source: "not_configured" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM ?? "PNPE <no-reply@pnpe.ga>",
      to: args.to,
      subject: args.subject,
      text: args.text,
      html: args.html ?? args.text,
    }),
  });
  if (!res.ok) {
    return { sent: false, source: `resend_error_${res.status}` };
  }
  const data = (await res.json()) as { id?: string };
  return { sent: true, source: "resend", messageId: data.id };
}

async function sendSmsViaTwilio(args: {
  to: string;
  body: string;
}): Promise<{ sent: boolean; source: string }> {
  if (isMock()) {
    console.log(`[MOCK Twilio SMS]\n  To: ${args.to}\n  Body: ${args.body}`);
    return { sent: true, source: "mock" };
  }
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_SMS_FROM;
  if (!sid || !token || !from) return { sent: false, source: "not_configured" };

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: from,
        To: args.to,
        Body: args.body,
      }).toString(),
    },
  );
  return { sent: res.ok, source: res.ok ? "twilio_sms" : `twilio_error_${res.status}` };
}

async function sendWhatsappViaTwilio(args: {
  to: string;
  body: string;
}): Promise<{ sent: boolean; source: string }> {
  if (isMock()) {
    console.log(`[MOCK Twilio WhatsApp]\n  To: ${args.to}\n  Body: ${args.body}`);
    return { sent: true, source: "mock" };
  }
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !from) return { sent: false, source: "not_configured" };

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
        To: args.to.startsWith("whatsapp:") ? args.to : `whatsapp:${args.to}`,
        Body: args.body,
      }).toString(),
    },
  );
  return { sent: res.ok, source: res.ok ? "twilio_whatsapp" : `twilio_error_${res.status}` };
}

// ─── Actions Convex exposées ─────────────────────────────────

/**
 * Helper multi-canal. Envoie sur EMAIL, WHATSAPP et/ou SMS selon les
 * canaux demandés. Renvoie un statut par canal.
 */
export const notifyMulti = action({
  args: {
    email: v.optional(v.string()),
    telephone: v.optional(v.string()),
    subject: v.string(),
    body: v.string(),
    channels: v.array(
      v.union(v.literal("email"), v.literal("sms"), v.literal("whatsapp")),
    ),
    htmlBody: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const results: Record<string, { sent: boolean; source: string }> = {};

    if (args.channels.includes("email") && args.email) {
      results.email = await sendEmailViaResend({
        to: args.email,
        subject: args.subject,
        text: args.body,
        html: args.htmlBody,
      });
    }
    if (args.channels.includes("whatsapp") && args.telephone) {
      results.whatsapp = await sendWhatsappViaTwilio({
        to: args.telephone,
        body: args.body,
      });
    }
    if (args.channels.includes("sms") && args.telephone) {
      results.sms = await sendSmsViaTwilio({
        to: args.telephone,
        body: args.body,
      });
    }
    return results;
  },
});

// ─── Use-cases applicatifs ───────────────────────────────────

/** Validation inscription D.E (WhatsApp + email). */
export const sendValidationDemandeur = action({
  args: {
    email: v.string(),
    telephoneWhatsApp: v.optional(v.string()),
    nom: v.string(),
  },
  handler: async (_ctx, args) => {
    const subject = "PNPE — Votre inscription est en cours de validation";
    const text = `Bonjour ${args.nom},\n\nVotre inscription au PNPE est en cours de validation. Un conseiller vous contactera sous 48h.\n\nCordialement,\nL'équipe PNPE`;

    const email = await sendEmailViaResend({
      to: args.email,
      subject,
      text,
    });
    const whatsapp = args.telephoneWhatsApp
      ? await sendWhatsappViaTwilio({
          to: args.telephoneWhatsApp,
          body: text,
        })
      : { sent: false, source: "skipped" };

    return { email, whatsapp };
  },
});

/**
 * Confirmation candidature envoyée (email systématique pour TOUS — D.E
 * et citoyens ordinaires).
 */
export const sendCandidatureConfirmation = action({
  args: {
    email: v.string(),
    nom: v.string(),
    titreOffre: v.string(),
    referenceOffre: v.string(),
    emetteurNom: v.string(),
  },
  handler: async (_ctx, args) => {
    const subject = `Candidature envoyée — ${args.titreOffre}`;
    const text = `Bonjour ${args.nom},\n\nVotre candidature pour le poste "${args.titreOffre}" (réf. ${args.referenceOffre}) chez ${args.emetteurNom} a bien été envoyée.\n\nL'employeur vous recontactera s'il souhaite donner suite.\n\nSuivez l'avancement sur travail.ga/mon-compte/candidatures\n\nCordialement,\nL'équipe TRAVAIL.GA`;

    return await sendEmailViaResend({
      to: args.email,
      subject,
      text,
    });
  },
});

/** Candidature retenue (email + WhatsApp). */
export const sendCandidatureRetenue = action({
  args: {
    email: v.string(),
    telephoneWhatsApp: v.optional(v.string()),
    nom: v.string(),
    titreOffre: v.string(),
  },
  handler: async (_ctx, args) => {
    const subject = `🎉 Candidature retenue — ${args.titreOffre}`;
    const text = `Bonjour ${args.nom},\n\nBonne nouvelle : votre candidature pour "${args.titreOffre}" a été RETENUE !\n\nL'employeur vous contactera prochainement pour la suite.\n\nFélicitations !\nL'équipe TRAVAIL.GA / PNPE`;

    const email = await sendEmailViaResend({
      to: args.email,
      subject,
      text,
    });
    const whatsapp = args.telephoneWhatsApp
      ? await sendWhatsappViaTwilio({
          to: args.telephoneWhatsApp,
          body: text,
        })
      : { sent: false, source: "skipped" };

    return { email, whatsapp };
  },
});

/** Rappel RDV J-1 (SMS — critique). */
export const sendRdvReminder = action({
  args: {
    email: v.string(),
    telephone: v.string(),
    dateRdv: v.number(),
    lieu: v.string(),
  },
  handler: async (_ctx, args) => {
    const dateStr = new Date(args.dateRdv).toLocaleString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    const subject = "PNPE — Rappel rendez-vous demain";
    const text = `Rappel PNPE : RDV ${dateStr} à ${args.lieu}. Merci de confirmer votre présence.`;

    const email = await sendEmailViaResend({
      to: args.email,
      subject,
      text,
    });
    const sms = await sendSmsViaTwilio({ to: args.telephone, body: text });

    return { email, sms };
  },
});

/**
 * Invitation à migrer vers D.E (déclenchée à la 3e candidature en 30j).
 * Email + WhatsApp.
 */
export const sendInvitationMigrationDe = action({
  args: {
    email: v.string(),
    telephone: v.optional(v.string()),
    nom: v.string(),
    nbCandidatures: v.number(),
  },
  handler: async (_ctx, args) => {
    const subject = "Profitez de l'accompagnement PNPE";
    const text = `Bonjour ${args.nom},\n\nVous avez déjà postulé à ${args.nbCandidatures} offres sur TRAVAIL.GA. Devenez Demandeur d'Emploi PNPE pour bénéficier :\n  • d'un conseiller personnel\n  • d'alertes d'offres ciblées\n  • de formations BMC (Auto-Emploi)\n  • d'un suivi de placement\n\nMigration en 2 minutes : travail.ga/mon-compte/migrer-vers-de\n\nVos candidatures actuelles seront automatiquement migrées.\n\nL'équipe PNPE`;

    const email = await sendEmailViaResend({
      to: args.email,
      subject,
      text,
    });
    const whatsapp = args.telephone
      ? await sendWhatsappViaTwilio({
          to: args.telephone,
          body: `PNPE : avec ${args.nbCandidatures} candidatures, devenez D.E pour un accompagnement personnalisé. travail.ga/mon-compte/migrer-vers-de`,
        })
      : { sent: false, source: "skipped" };

    return { email, whatsapp };
  },
});
