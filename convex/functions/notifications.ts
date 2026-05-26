import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { components } from "../_generated/api";
import { Resend } from "@convex-dev/resend";
import { internalAction, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { authQuery, authMutation } from "../lib/customFunctions";
import { notificationTypeValidator } from "../lib/validators";
import { getPlatformConfig, fromEmail } from "../lib/platform";
import type { PlatformConfig } from "../lib/platform";
import { emailLayout } from "../lib/emailTemplates";
import { sendSms } from "../lib/bird";
import { dispatchAppointmentNotification } from "../lib/appointmentNotify";

// Resend — testMode TOUJOURS false dans Convex.
// Le runtime Convex (V8 isolé) ne garantit PAS process.env.NODE_ENV.
// On ne peut pas se fier à NODE_ENV pour décider d'envoyer ou non des emails.
// En testMode: true, @convex-dev/resend refuse tout email qui n'est pas @resend.dev.
export const resend = new Resend(components.resend, {
  testMode: false,
});

// ============================================================================
// EMAIL TEMPLATES CONTENT
// ============================================================================

export const emailTemplates = {
  // New message notification
  newMessage: (data: {
    userName: string;
    requestRef: string;
    senderName: string;
    messagePreview: string;
    requestUrl: string;
  }, platform?: PlatformConfig) => ({
    subject: `Nouveau message - Demande ${data.requestRef}`,
    html: emailLayout(
      "Nouveau Message",
      `
			<p>Bonjour ${data.userName},</p>
			<p>Vous avez reçu un nouveau message concernant votre demande <strong>${data.requestRef}</strong>.</p>
			<div class="info-box">
				<p><strong>De :</strong> ${data.senderName}</p>
				<p style="margin: 0;">${data.messagePreview}</p>
			</div>
			<p style="text-align: center; margin-top: 25px;">
				<a href="${data.requestUrl}" class="button">Voir la conversation</a>
			</p>
		`,
      platform,
    ),
  }),

  // Request status update
  statusUpdate: (data: {
    userName: string;
    requestRef: string;
    serviceName: string;
    newStatus: string;
    statusLabel: string;
    requestUrl: string;
  }, platform?: PlatformConfig) => ({
    subject: `Mise à jour - Demande ${data.requestRef}`,
    html: emailLayout(
      "Mise à jour de votre demande",
      `
			<p>Bonjour ${data.userName},</p>
			<p>Le statut de votre demande <strong>${data.requestRef}</strong> a été mis à jour.</p>
			<div class="info-box">
				<p><strong>Service :</strong> ${data.serviceName}</p>
				<p><strong>Nouveau statut :</strong> ${data.statusLabel}</p>
			</div>
			<p style="text-align: center; margin-top: 25px;">
				<a href="${data.requestUrl}" class="button">Voir ma demande</a>
			</p>
		`,
      platform,
    ),
  }),

  // Appointment reminder
  appointmentReminder: (data: {
    userName: string;
    requestRef: string;
    serviceName: string;
    appointmentDate: string;
    appointmentTime: string;
    address: string;
  }, platform?: PlatformConfig) => ({
    subject: `Rappel RDV - ${data.appointmentDate}`,
    html: emailLayout(
      "Rappel de Rendez-vous",
      `
			<p>Bonjour ${data.userName},</p>
			<p>Ceci est un rappel pour votre rendez-vous de demain.</p>
			<div class="warning-box">
				<p><strong>Date :</strong> ${data.appointmentDate}</p>
				<p><strong>Heure :</strong> ${data.appointmentTime}</p>
				<p><strong>Lieu :</strong> ${data.address}</p>
				<p><strong>Service :</strong> ${data.serviceName}</p>
			</div>
			<p><strong>Documents à apporter :</strong></p>
			<ul>
				<li>Pièce d'identité valide</li>
				<li>Tous les documents demandés pour votre dossier</li>
			</ul>
			<p style="font-size: 14px; color: #6b7280;">
				En cas d'empêchement, veuillez nous contacter dès que possible.
			</p>
		`,
      platform,
    ),
  }),


  // Action required
  actionRequired: (data: {
    userName: string;
    requestRef: string;
    actionMessage: string;
    deadline?: string;
    requestUrl: string;
  }, platform?: PlatformConfig) => ({
    subject: `Action requise - ${data.requestRef}`,
    html: emailLayout(
      "Action Requise",
      `
			<p>Bonjour ${data.userName},</p>
			<p>Une action de votre part est nécessaire pour la demande <strong>${data.requestRef}</strong>.</p>
			<div class="warning-box">
				<p><strong>Action demandée :</strong></p>
				<p>${data.actionMessage}</p>
				${data.deadline ? `<p><strong>Délai :</strong> ${data.deadline}</p>` : ""}
			</div>
			<p style="text-align: center; margin-top: 25px;">
				<a href="${data.requestUrl}" class="button">Compléter ma demande</a>
			</p>
		`,
      platform,
    ),
  }),

  // Request completed
  requestCompleted: (data: {
    userName: string;
    requestRef: string;
    serviceName: string;
    requestUrl: string;
  }, platform?: PlatformConfig) => ({
    subject: `Demande traitée - ${data.requestRef}`,
    html: emailLayout(
      "Demande Traitée",
      `
			<p>Bonjour ${data.userName},</p>
			<p>Bonne nouvelle ! Votre demande <strong>${data.requestRef}</strong> a été traitée avec succès.</p>
			<div class="info-box">
				<p><strong>Service :</strong> ${data.serviceName}</p>
				<p><strong>Statut :</strong> Terminé</p>
			</div>
			<p>Vous pouvez consulter votre demande et télécharger les documents disponibles.</p>
			<p style="text-align: center; margin-top: 25px;">
				<a href="${data.requestUrl}" class="button">Voir ma demande</a>
			</p>
		`,
      platform,
    ),
  }),
};

// ============================================================================
// SEND EMAIL ACTIONS
// ============================================================================

/**
 * Generic sender for appointment multi-channel dispatcher.
 * Accepts pre-rendered subject + html (locale/platform handled upstream).
 */
export const sendAppointmentEmail = internalAction({
  args: {
    to: v.string(),
    from: v.string(),
    subject: v.string(),
    html: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      await resend.sendEmail(ctx, {
        from: args.from,
        to: args.to,
        subject: args.subject,
        html: args.html,
      });
      return { success: true };
    } catch (error: any) {
      console.error("[appointments] email send failed:", error);
      return { success: false, error: error?.message ?? "unknown" };
    }
  },
});

export const sendAppointmentSms = internalAction({
  args: {
    phone: v.string(),
    text: v.string(),
  },
  handler: async (_ctx, args) => {
    if (!args.phone) return { success: false, error: "No phone" };
    if (!process.env.BIRD_API_KEY) {
      return { success: false, error: "Bird not configured" };
    }
    const result = await sendSms(args.phone, args.text);
    return result;
  },
});

export const sendNotificationEmail = internalAction({
  args: {
    to: v.string(),
    template: v.string(),
    data: v.any(),
    platform: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const templateFn =
      emailTemplates[args.template as keyof typeof emailTemplates];
    if (!templateFn) {
      console.error("Unknown email template:", args.template);
      return { success: false, error: "Unknown template" };
    }

    const platformConfig = getPlatformConfig(args.platform);
    const email = templateFn(args.data, platformConfig);

    try {
      await resend.sendEmail(ctx, {
        from: fromEmail(platformConfig),
        to: args.to,
        subject: email.subject,
        html: email.html,
      });
      return { success: true };
    } catch (error: any) {
      console.error("Failed to send email:", error);
      return { success: false, error: error.message };
    }
  },
});

// ============================================================================
// NOTIFICATION TRIGGERS
// ============================================================================

/**
 * Send notification for new message
 */
export const notifyNewMessage = internalMutation({
  args: {
    requestId: v.id("requests"),
    senderId: v.id("users"),
    messagePreview: v.string(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) return;

    const user = await ctx.db.get(request.userId);
    const sender = await ctx.db.get(args.senderId);
    if (!user?.email) return;

    // Don't notify if sender is the recipient
    if (args.senderId === request.userId) return;

    const appUrl = process.env.APP_URL || "https://consulat.ga";
    const userName = user.name || "Cher(e) usager";
    const senderName = sender?.name || "Agent consulaire";

    await ctx.scheduler.runAfter(
      0,
      internal.functions.notifications.sendNotificationEmail,
      {
        to: user.email,
        template: "newMessage",
        data: {
          userName,
          requestRef: request.reference,
          senderName,
          messagePreview: args.messagePreview.substring(0, 200),
          requestUrl: `${appUrl}/my-space/requests/${request.reference}`,
        },
      },
    );


  },
});

/**
 * Send notification for status update
 */
export const notifyStatusUpdate = internalMutation({
  args: {
    requestId: v.id("requests"),
    newStatus: v.string(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) return;

    const user = await ctx.db.get(request.userId);
    if (!user?.email) return;

    const orgService = await ctx.db.get(request.orgServiceId);
    const service = orgService ? await ctx.db.get(orgService.serviceId) : null;
    const serviceName =
      service?.name ?
        typeof service.name === "object" ?
          service.name.fr
        : service.name
      : "Service";

    const statusLabels: Record<string, string> = {
      pending: "En attente",
      processing: "En traitement",
      completed: "Terminé",
      cancelled: "Annulé",
    };

    const appUrl = process.env.APP_URL || "https://consulat.ga";
    const userName = user.name || "Cher(e) usager";
    const statusLabel = statusLabels[args.newStatus] || args.newStatus;

    // Use specific template for completed requests
    const template =
      args.newStatus === "completed" ? "requestCompleted" : "statusUpdate";

    await ctx.scheduler.runAfter(
      0,
      internal.functions.notifications.sendNotificationEmail,
      {
        to: user.email,
        template,
        data: {
          userName,
          requestRef: request.reference,
          serviceName,
          newStatus: args.newStatus,
          statusLabel,
          requestUrl: `${appUrl}/my-space/requests/${request.reference}`,
        },
      },
    );


  },
});

/**
 * Send action required notification
 */
export const notifyActionRequired = internalMutation({
  args: {
    requestId: v.id("requests"),
    message: v.string(),
    deadline: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) return;

    const user = await ctx.db.get(request.userId);
    if (!user?.email) return;

    const appUrl = process.env.APP_URL || "https://consulat.ga";
    const userName = user.name || "Cher(e) usager";

    await ctx.scheduler.runAfter(
      0,
      internal.functions.notifications.sendNotificationEmail,
      {
        to: user.email,
        template: "actionRequired",
        data: {
          userName,
          requestRef: request.reference,
          actionMessage: args.message,
          deadline:
            args.deadline ?
              new Date(args.deadline).toLocaleDateString("fr-FR")
            : undefined,
          requestUrl: `${appUrl}/my-space/requests/${request.reference}`,
        },
      },
    );

    // SMS via Bird (action requise = SMS important)
    if (user.phone && user.preferences?.smsNotifications !== false) {
      await ctx.scheduler.runAfter(
        0,
        internal.functions.smsNotifications.sendSmsNotification,
        {
          phone: user.phone,
          template: "action_required" as const,
          data: {
            userName,
            requestRef: request.reference,
            actionMessage: args.message,
          },
        },
      );
    }
  },
});

// ============================================================================
// CRON JOB HANDLERS
// ============================================================================

/**
 * Send appointment reminders for tomorrow's appointments
 * Called daily by cron job
 */
export const sendAppointmentReminders = internalMutation({
  handler: async (ctx) => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const appointments = await ctx.db
      .query("appointments")
      .filter((q) =>
        q.and(
          q.eq(q.field("date"), tomorrowStr),
          q.neq(q.field("status"), "cancelled"),
          q.neq(q.field("status"), "completed"),
          q.neq(q.field("status"), "no_show"),
          q.neq(q.field("status"), "rescheduled"),
        ),
      )
      .take(500);

    let sentCount = 0;
    for (const appointment of appointments) {
      await dispatchAppointmentNotification(ctx, {
        appointmentId: appointment._id,
        event: "reminder",
      });
      sentCount++;
    }

    return { sentCount };
  },
});

// ============================================================================
// IN-APP NOTIFICATIONS QUERIES & MUTATIONS
// ============================================================================

/**
 * List user notifications with pagination
 */
export const list = authQuery({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/**
 * Get unread notification count
 */
export const getUnreadCount = authQuery({
  args: {},
  handler: async (ctx) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", ctx.user._id).eq("isRead", false),
      )
      .take(200);

    return unread.length;
  },
});

/**
 * Mark a single notification as read
 */
export const markAsRead = authMutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);

    if (!notification || notification.userId !== ctx.user._id) {
      return { success: false };
    }

    if (!notification.isRead) {
      await ctx.db.patch(args.notificationId, {
        isRead: true,
        readAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Mark all notifications as read
 */
export const markAllAsRead = authMutation({
  args: {},
  handler: async (ctx) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", ctx.user._id).eq("isRead", false),
      )
      .take(200);

    const now = Date.now();
    await Promise.all(
      unread.map((n) => ctx.db.patch(n._id, { isRead: true, readAt: now })),
    );

    return { count: unread.length };
  },
});

/**
 * Create an in-app notification (internal use)
 */
export const createNotification = internalMutation({
  args: {
    userId: v.id("users"),
    type: notificationTypeValidator,
    title: v.string(),
    body: v.string(),
    link: v.optional(v.string()),
    relatedId: v.optional(v.string()),
    relatedType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      ...args,
      isRead: false,
      createdAt: Date.now(),
    });
  },
});
