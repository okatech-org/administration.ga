import type { GenericMutationCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { NotificationType } from "./constants";
import { emailLayout } from "./emailTemplates";
import { getPlatformConfig, fromEmail } from "./platform";
import type { PlatformConfig } from "./platform";

type Ctx = GenericMutationCtx<DataModel>;

export type AppointmentEvent =
  | "created"
  | "confirmed"
  | "cancelled"
  | "rescheduled"
  | "completed"
  | "noShow"
  | "reminder";

type AppointmentPayload = {
  userName: string;
  appointmentDate: string;
  appointmentTime: string;
  orgName: string;
  address: string;
  serviceName: string;
  reason?: string;
  appUrl: string;
  link: string;
};

function buildEmail(event: AppointmentEvent, data: AppointmentPayload, platform: PlatformConfig) {
  switch (event) {
    case "created":
    case "confirmed":
      return {
        subject: `RDV ${event === "created" ? "enregistré" : "confirmé"} — ${data.appointmentDate}`,
        html: emailLayout(
          event === "created" ? "Rendez-vous enregistré" : "Rendez-vous confirmé",
          `
            <p>Bonjour ${data.userName},</p>
            <p>Votre rendez-vous a été ${event === "created" ? "enregistré" : "confirmé"}.</p>
            <div class="info-box">
              <p><strong>Service :</strong> ${data.serviceName}</p>
              <p><strong>Date :</strong> ${data.appointmentDate}</p>
              <p><strong>Heure :</strong> ${data.appointmentTime}</p>
              <p><strong>Lieu :</strong> ${data.orgName} — ${data.address}</p>
            </div>
            <p style="text-align: center; margin-top: 25px;">
              <a href="${data.link}" class="button">Voir mon rendez-vous</a>
            </p>
          `,
          platform,
        ),
      };
    case "cancelled":
      return {
        subject: `RDV annulé — ${data.appointmentDate}`,
        html: emailLayout(
          "Rendez-vous annulé",
          `
            <p>Bonjour ${data.userName},</p>
            <p>Votre rendez-vous du <strong>${data.appointmentDate}</strong> à ${data.appointmentTime} a été annulé.</p>
            ${data.reason ? `<div class="info-box"><p><strong>Motif :</strong> ${data.reason}</p></div>` : ""}
            <p style="text-align: center; margin-top: 25px;">
              <a href="${data.appUrl}/my-space/appointments" class="button">Prendre un nouveau rendez-vous</a>
            </p>
          `,
          platform,
        ),
      };
    case "rescheduled":
      return {
        subject: `RDV reprogrammé — nouveau créneau ${data.appointmentDate}`,
        html: emailLayout(
          "Rendez-vous reprogrammé",
          `
            <p>Bonjour ${data.userName},</p>
            <p>Votre rendez-vous a été reprogrammé.</p>
            <div class="info-box">
              <p><strong>Nouvelle date :</strong> ${data.appointmentDate}</p>
              <p><strong>Nouvelle heure :</strong> ${data.appointmentTime}</p>
              <p><strong>Lieu :</strong> ${data.orgName} — ${data.address}</p>
            </div>
            ${data.reason ? `<p><em>Motif : ${data.reason}</em></p>` : ""}
            <p style="text-align: center; margin-top: 25px;">
              <a href="${data.link}" class="button">Voir mon rendez-vous</a>
            </p>
          `,
          platform,
        ),
      };
    case "completed":
      return {
        subject: `RDV terminé — merci de votre visite`,
        html: emailLayout(
          "Rendez-vous terminé",
          `<p>Bonjour ${data.userName},</p><p>Votre rendez-vous du ${data.appointmentDate} est marqué comme terminé. Merci de votre visite.</p>`,
          platform,
        ),
      };
    case "noShow":
      return {
        subject: `RDV manqué — ${data.appointmentDate}`,
        html: emailLayout(
          "Rendez-vous manqué",
          `<p>Bonjour ${data.userName},</p><p>Vous n'avez pas pu vous présenter à votre rendez-vous du ${data.appointmentDate}. Vous pouvez en prendre un nouveau depuis votre espace.</p>`,
          platform,
        ),
      };
    case "reminder":
      return {
        subject: `Rappel — RDV ${data.appointmentDate}`,
        html: emailLayout(
          "Rappel de rendez-vous",
          `
            <p>Bonjour ${data.userName},</p>
            <p>Ceci est un rappel pour votre rendez-vous à venir.</p>
            <div class="warning-box">
              <p><strong>Date :</strong> ${data.appointmentDate}</p>
              <p><strong>Heure :</strong> ${data.appointmentTime}</p>
              <p><strong>Lieu :</strong> ${data.orgName} — ${data.address}</p>
              <p><strong>Service :</strong> ${data.serviceName}</p>
            </div>
            <p>Pensez à vous munir de vos documents.</p>
            <p style="text-align: center; margin-top: 25px;">
              <a href="${data.link}" class="button">Voir mon rendez-vous</a>
            </p>
          `,
          platform,
        ),
      };
  }
}

function buildSms(event: AppointmentEvent, data: AppointmentPayload): string {
  const head = "Consulat.ga —";
  switch (event) {
    case "created":
      return `${head} RDV enregistré le ${data.appointmentDate} à ${data.appointmentTime} (${data.orgName}).`;
    case "confirmed":
      return `${head} RDV confirmé le ${data.appointmentDate} à ${data.appointmentTime} (${data.orgName}).`;
    case "cancelled":
      return `${head} RDV annulé (${data.appointmentDate} à ${data.appointmentTime}). Reservez à nouveau sur consulat.ga`;
    case "rescheduled":
      return `${head} RDV reprogrammé au ${data.appointmentDate} à ${data.appointmentTime}.`;
    case "completed":
      return `${head} RDV terminé — merci de votre visite.`;
    case "noShow":
      return `${head} RDV manqué le ${data.appointmentDate}. Reservez à nouveau.`;
    case "reminder":
      return `${head} Rappel: RDV le ${data.appointmentDate} à ${data.appointmentTime}, ${data.orgName}.`;
  }
}

function buildInApp(event: AppointmentEvent, data: AppointmentPayload) {
  switch (event) {
    case "created":
      return {
        type: NotificationType.AppointmentConfirmation,
        title: "Rendez-vous enregistré",
        body: `${data.appointmentDate} à ${data.appointmentTime} — ${data.orgName}`,
      };
    case "confirmed":
      return {
        type: NotificationType.AppointmentConfirmation,
        title: "Rendez-vous confirmé",
        body: `${data.appointmentDate} à ${data.appointmentTime} — ${data.orgName}`,
      };
    case "cancelled":
      return {
        type: NotificationType.AppointmentCancellation,
        title: "Rendez-vous annulé",
        body: `${data.appointmentDate} à ${data.appointmentTime}${data.reason ? ` — ${data.reason}` : ""}`,
      };
    case "rescheduled":
      return {
        type: NotificationType.AppointmentRescheduled,
        title: "Rendez-vous reprogrammé",
        body: `Nouveau créneau : ${data.appointmentDate} à ${data.appointmentTime}`,
      };
    case "completed":
      return {
        type: NotificationType.AppointmentConfirmation,
        title: "Rendez-vous terminé",
        body: `${data.appointmentDate} — merci de votre visite`,
      };
    case "noShow":
      return {
        type: NotificationType.AppointmentCancellation,
        title: "Rendez-vous manqué",
        body: `${data.appointmentDate} à ${data.appointmentTime}`,
      };
    case "reminder":
      return {
        type: NotificationType.AppointmentReminder,
        title: "Rappel de rendez-vous",
        body: `${data.appointmentDate} à ${data.appointmentTime} — ${data.orgName}`,
      };
  }
}

/**
 * Central multi-channel dispatcher for appointment events.
 *
 * Routes an event to all enabled channels based on user preferences:
 * - In-app notification (always)
 * - Email (if user.preferences.emailNotifications !== false)
 * - SMS (if user.phone + user.preferences.smsNotifications !== false)
 * - Web Push (if user.preferences.pushNotifications !== false)
 *
 * Best-effort: individual channel failures are logged but don't throw.
 */
export async function dispatchAppointmentNotification(
  ctx: Ctx,
  args: {
    appointmentId: Id<"appointments">;
    event: AppointmentEvent;
    reason?: string;
  },
): Promise<void> {
  const appointment = await ctx.db.get(args.appointmentId);
  if (!appointment) return;

  const profile = await ctx.db.get(appointment.attendeeProfileId);
  if (!profile) return;
  const user = await ctx.db.get(profile.userId);
  if (!user) return;

  const [org, orgService] = await Promise.all([
    ctx.db.get(appointment.orgId),
    appointment.orgServiceId ? ctx.db.get(appointment.orgServiceId) : Promise.resolve(null),
  ]);
  const service = orgService ? await ctx.db.get(orgService.serviceId) : null;

  const serviceName =
    service?.name
      ? typeof service.name === "object"
        ? service.name.fr
        : service.name
      : "Service";

  const appUrl = process.env.APP_URL || "https://consulat.ga";
  const formattedDate = new Date(appointment.date + "T00:00:00").toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const address = org?.address
    ? [org.address.street, org.address.city, org.address.country].filter(Boolean).join(", ")
    : "";
  const orgName = org?.name ?? "Consulat";
  const userName = user.name || "Cher(e) usager";
  const link = `${appUrl}/my-space/appointments/${appointment._id}`;

  const data: AppointmentPayload = {
    userName,
    appointmentDate: formattedDate,
    appointmentTime: appointment.time,
    orgName,
    address,
    serviceName,
    reason: args.reason,
    appUrl,
    link,
  };

  // 1. In-app (always)
  const inApp = buildInApp(args.event, data);
  await ctx.scheduler.runAfter(0, internal.functions.notifications.createNotification, {
    userId: user._id,
    type: inApp.type,
    title: inApp.title,
    body: inApp.body,
    link: `/my-space/appointments/${appointment._id}`,
    relatedId: appointment._id,
    relatedType: "appointment",
  });

  // 2. Email
  if (user.preferences?.emailNotifications !== false && user.email) {
    const platform = getPlatformConfig("citizen");
    const email = buildEmail(args.event, data, platform);
    await ctx.scheduler.runAfter(0, internal.functions.notifications.sendAppointmentEmail, {
      to: user.email,
      from: fromEmail(platform),
      subject: email.subject,
      html: email.html,
    });
  }

  // 3. SMS
  if (user.preferences?.smsNotifications !== false && user.phone) {
    const smsText = buildSms(args.event, data);
    await ctx.scheduler.runAfter(0, internal.functions.notifications.sendAppointmentSms, {
      phone: user.phone,
      text: smsText,
    });
  }

  // 4. Web Push
  if (user.preferences?.pushNotifications !== false) {
    const inAppForPush = buildInApp(args.event, data);
    await ctx.scheduler.runAfter(0, internal.actions.push.sendPushNotification, {
      userId: user._id,
      payload: {
        title: inAppForPush.title,
        body: inAppForPush.body,
        url: `/my-space/appointments/${appointment._id}`,
        tag: `appointment-${appointment._id}`,
      },
    });
  }
}
