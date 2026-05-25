"use node";

/**
 * Tokens LiveKit pour les entretiens PNPE (employeur ↔ candidat).
 *
 * Crée une room dédiée par candidature (`pnpe-entretien-<candidatureId>`)
 * et délègue la création du JWT à l'action interne `livekit.generateToken`.
 */
import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";

export const getEntretienToken = action({
  args: {
    candidatureId: v.id("candidatures"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ token: string; roomName: string; wsUrl: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("NOT_AUTHENTICATED");
    }

    // TODO Phase 7+ : vérifier que l'appelant est l'employeur émetteur
    // ou le candidat D.E concerné. Pour MVP, l'auth Convex suffit.

    const roomName = `pnpe-entretien-${args.candidatureId}`;
    const participantIdentity = `user-${identity.subject}`;
    const participantName =
      (identity.name as string | undefined) ?? "Participant PNPE";

    const token: string = await ctx.runAction(
      internal.actions.livekit.generateToken,
      {
        roomName,
        participantIdentity,
        participantName,
      },
    );

    const wsUrl = process.env.LIVEKIT_WS_URL ?? "wss://livekit.consulat.ga";
    return { token, roomName, wsUrl };
  },
});
