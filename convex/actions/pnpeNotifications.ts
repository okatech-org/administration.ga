/**
 * Notifications PNPE — Resend (email) + Twilio (SMS + WhatsApp Business).
 *
 * MVP Phase 7 : stubs qui loggent les envois en dev (PNPE_MOCK_INTEGRATIONS=1).
 * À brancher sur les vraies APIs en prod via fetch direct (pas de SDK Node
 * lourd côté Convex actions).
 */
"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";

/** Envoie un message WhatsApp de validation à un D.E. */
export const sendWhatsAppValidation = action({
  args: {
    to: v.string(), // ex: "+241000000000"
    demandeurNom: v.string(),
  },
  handler: async (_ctx, args) => {
    const mock = process.env.PNPE_MOCK_INTEGRATIONS === "1";
    const message = `Bonjour ${args.demandeurNom}, votre inscription au PNPE est en cours de validation. Un conseiller vous contactera sous 48h.`;
    if (mock) {
      console.log(`[MOCK WhatsApp] To: ${args.to}\n${message}`);
      return { sent: true, source: "mock" };
    }
    // TODO Prod : fetch Twilio WhatsApp Business API
    // const sid = process.env.TWILIO_ACCOUNT_SID;
    // const token = process.env.TWILIO_AUTH_TOKEN;
    // const from = process.env.TWILIO_WHATSAPP_FROM;
    // ...
    return { sent: false, source: "not_configured" };
  },
});

/** Rappel SMS pour un rendez-vous conseiller. */
export const sendSmsRdvReminder = action({
  args: {
    to: v.string(),
    dateRdv: v.number(),
    lieu: v.string(),
  },
  handler: async (_ctx, args) => {
    const mock = process.env.PNPE_MOCK_INTEGRATIONS === "1";
    const message = `PNPE : RDV prévu le ${new Date(args.dateRdv).toLocaleDateString("fr-FR")} à ${args.lieu}. Merci de confirmer.`;
    if (mock) {
      console.log(`[MOCK SMS] To: ${args.to}\n${message}`);
      return { sent: true, source: "mock" };
    }
    return { sent: false, source: "not_configured" };
  },
});

/** Email transactionnel — nouvelle offre matchant le profil. */
export const sendEmailNouvelleOffre = action({
  args: {
    to: v.string(),
    nomDemandeur: v.string(),
    titreOffre: v.string(),
    referenceOffre: v.string(),
  },
  handler: async (_ctx, args) => {
    const mock = process.env.PNPE_MOCK_INTEGRATIONS === "1";
    if (mock) {
      console.log(
        `[MOCK Resend] To: ${args.to}\nSubject: Nouvelle offre — ${args.titreOffre}\nRef: ${args.referenceOffre}`,
      );
      return { sent: true, source: "mock" };
    }
    // TODO Prod : Resend HTTP API
    // const key = process.env.RESEND_API_KEY;
    // ...
    return { sent: false, source: "not_configured" };
  },
});
