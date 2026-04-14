/**
 * SMS Notifications via Bird
 *
 * Internal action that sends SMS notifications to users
 * for appointment reminders and action-required alerts.
 */

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { sendSms } from "../lib/bird";

// ============================================================================
// SMS TEXT BUILDERS
// ============================================================================

const smsTexts = {
  appointment_reminder: (data: {
    userName: string;
    appointmentDate: string;
    appointmentTime: string;
    address: string;
  }) =>
    `Consulat.ga — Rappel: RDV le ${data.appointmentDate} a ${data.appointmentTime}, ${data.address}. Munissez-vous de vos documents.`,

  action_required: (data: {
    userName: string;
    requestRef: string;
    actionMessage: string;
  }) =>
    `Consulat.ga — Action requise pour votre demande ${data.requestRef}: ${data.actionMessage}. Connectez-vous sur consulat.ga`,
};

// ============================================================================
// INTERNAL ACTION — Send SMS notification
// ============================================================================

export const sendSmsNotification = internalAction({
  args: {
    phone: v.string(),
    template: v.union(
      v.literal("appointment_reminder"),
      v.literal("action_required"),
    ),
    data: v.any(),
  },
  handler: async (_ctx, args) => {
    const { phone, template, data } = args;

    // Skip if no phone number
    if (!phone) {
      return { success: false, error: "No phone number" };
    }

    // Skip if Bird is not configured (dev environments)
    if (!process.env.BIRD_API_KEY) {
      return { success: false, error: "Bird not configured" };
    }

    const textBuilder = smsTexts[template];
    if (!textBuilder) {
      console.error(`[SMS] Unknown template: ${template}`);
      return { success: false, error: `Unknown template: ${template}` };
    }

    const text = textBuilder(data);
    const result = await sendSms(phone, text);

    return result;
  },
});
