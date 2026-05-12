import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { authQuery } from "../lib/customFunctions";

/**
 * Centre d'Appels — Contexte citoyen pour un appel donné.
 *
 * Aggrège en un seul aller-retour les informations dont l'agent a besoin
 * pour traiter efficacement un appel entrant : identité, dossiers en cours,
 * rendez-vous, historique d'appels, flags d'urgence.
 *
 * Sprint 1 : identité + dossiers + RDV + historique d'appels.
 * Sprint 2 : correspondance, dossier procedures multi-étapes, VIP flags.
 */

export const getCitizenContextForCall = authQuery({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return null;

    // Le "citoyen" à afficher dans le side panel est le CORRESPONDANT de
    // l'utilisateur connecté (qui regarde le side pane), pas un rôle fixe.
    //
    //  - Appel entrant (citoyen → org) : createdBy = citoyen → c'est lui.
    //  - Appel sortant (agent → citoyen via callUser/callBackRecent/
    //    callUserAsAdmin) : createdBy = agent ; le citoyen est le 1er
    //    autre participant.
    //
    // Sans cette distinction, le side panel affichait l'agent lui-même
    // quand il rappelait quelqu'un.
    let callerUserId: Id<"users">;
    if (meeting.createdBy === ctx.user._id) {
      const other = meeting.participants.find(
        (p) => p.userId !== ctx.user._id,
      );
      callerUserId = (other?.userId ?? meeting.createdBy) as Id<"users">;
    } else {
      callerUserId = meeting.createdBy as Id<"users">;
    }
    const caller = await ctx.db.get(callerUserId);
    if (!caller) return null;

    // Profile consulaire (facultatif — tous les citoyens n'en ont pas)
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", callerUserId))
      .first();

    // Demandes (requests) liées à l'appelant
    const allRequests = await ctx.db
      .query("requests")
      .withIndex("by_user_status", (q) => q.eq("userId", callerUserId))
      .collect();

    const TERMINAL = new Set(["completed", "cancelled", "rejected"]);
    const openRequests = allRequests.filter((r) => !TERMINAL.has(r.status));
    const closedRequests = allRequests.filter((r) => TERMINAL.has(r.status));

    // Résoudre les noms de service (orgServices)
    const serviceIds = new Set<string>(
      allRequests.map((r) => r.orgServiceId as string),
    );
    const serviceLabels = new Map<string, string>();
    for (const sid of serviceIds) {
      const s = await ctx.db.get(sid as Id<"orgServices">);
      if (!s) continue;
      // Les services peuvent porter un label localisé : on privilégie le FR.
      const label =
        (s as any)?.label?.fr ??
        (s as any)?.label?.en ??
        (s as any)?.name ??
        (s as any)?.code ??
        "Service";
      serviceLabels.set(sid, label);
    }

    // Rendez-vous : nécessite le profile (attendeeProfileId)
    let upcomingAppointments: Array<{
      _id: Id<"appointments">;
      date: string;
      time: string;
      status: string;
      appointmentType: string | null;
      requestId: Id<"requests"> | null;
    }> = [];
    let recentAppointments: typeof upcomingAppointments = [];

    if (profile) {
      const apts = await ctx.db
        .query("appointments")
        .withIndex("by_attendee", (q) => q.eq("attendeeProfileId", profile._id))
        .collect();
      const todayStr = new Date().toISOString().slice(0, 10);
      const mapApt = (a: Doc<"appointments">) => ({
        _id: a._id,
        date: a.date,
        time: a.time,
        status: a.status,
        appointmentType: a.appointmentType ?? null,
        requestId: a.requestId ?? null,
      });
      upcomingAppointments = apts
        .filter(
          (a) => a.date >= todayStr && a.status !== "cancelled",
        )
        .sort((x, y) =>
          x.date === y.date
            ? x.time.localeCompare(y.time)
            : x.date.localeCompare(y.date),
        )
        .slice(0, 5)
        .map(mapApt);
      recentAppointments = apts
        .filter((a) => a.date < todayStr)
        .sort((x, y) => y.date.localeCompare(x.date))
        .slice(0, 5)
        .map(mapApt);
    }

    // Historique d'appels avec ce citoyen
    const createdByThem = await ctx.db
      .query("meetings")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", callerUserId))
      .order("desc")
      .take(10);

    const recentCalls = createdByThem
      .filter((m) => m.type === "call" && m._id !== args.meetingId)
      .slice(0, 8)
      .map((m) => ({
        _id: m._id,
        _creationTime: m._creationTime,
        callStatus: m.callStatus ?? null,
        endReason: m.endReason ?? null,
        answeredAt: m.answeredAt ?? null,
        endedAt: m.endedAt ?? null,
        mediaType: m.mediaType ?? "audio",
        title: m.title,
      }));

    // Flags d'urgence : requests en priorité élevée non-terminées
    const urgentOpenCount = openRequests.filter(
      (r) => r.priority === "urgent" || r.priority === "critical",
    ).length;

    // Nom et identité consolidés
    const fullName =
      [caller.firstName, caller.lastName].filter(Boolean).join(" ").trim() ||
      caller.email ||
      "Usager";

    return {
      meetingId: args.meetingId,
      callLineId: meeting.callLineId ?? null,
      requestId: meeting.requestId ?? null,
      caller: {
        userId: caller._id,
        name: fullName,
        firstName: caller.firstName ?? null,
        lastName: caller.lastName ?? null,
        email: caller.email ?? null,
        phone: caller.phone ?? profile?.contacts?.phone ?? null,
        avatarUrl: caller.avatarUrl ?? null,
        nip: profile?.identity?.nip ?? null,
        nationality: profile?.identity?.nationality ?? null,
        birthDate: profile?.identity?.birthDate ?? null,
        countryOfResidence: profile?.countryOfResidence ?? null,
      },
      openRequests: openRequests
        .sort((a, b) => b._creationTime - a._creationTime)
        .slice(0, 10)
        .map((r) => ({
          _id: r._id,
          reference: r.reference,
          status: r.status,
          priority: r.priority,
          serviceLabel: serviceLabels.get(r.orgServiceId as string) ?? "Service",
          hasActions:
            Array.isArray(r.actionsRequired) && r.actionsRequired.length > 0,
          lastUpdateAt: r._creationTime,
        })),
      closedRequestsCount: closedRequests.length,
      upcomingAppointments,
      recentAppointments,
      recentCalls,
      flags: {
        urgentOpenCount,
        openRequestsCount: openRequests.length,
      },
    };
  },
});
