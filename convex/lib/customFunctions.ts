import {
  query,
  mutation as rawMutation,
  internalMutation as rawInternalMutation,
  action,
} from "../_generated/server";
import {
  customQuery,
  customMutation,
  customAction,
  customCtx,
} from "convex-helpers/server/customFunctions";
import { internal } from "../_generated/api";
import { requireAuth, requireSuperadmin, requireBackOfficeAccess } from "./auth";
import triggers from "../triggers";

/**
 * Base mutation wrapped with triggers.
 * All mutations go through this so that aggregate + audit triggers fire automatically.
 */
export const mutation = customMutation(rawMutation, customCtx(triggers.wrapDB));

/**
 * Internal mutation wrapped with triggers.
 * Use instead of raw internalMutation when triggers must fire (e.g. internalSubmit).
 */
export const triggeredInternalMutation = customMutation(
  rawInternalMutation,
  customCtx(triggers.wrapDB),
);

/**
 * Custom query that requires authentication.
 * The current user is available in ctx.user
 */
export const authQuery = customQuery(
  query,
  customCtx(async (ctx) => {
    const user = await requireAuth(ctx);
    return { user };
  }),
);

/**
 * Custom query that requires superadmin role.
 */
export const superadminQuery = customQuery(
  query,
  customCtx(async (ctx) => {
    const user = await requireSuperadmin(ctx);
    return { user };
  }),
);

/**
 * Custom query that requires back-office access (SuperAdmin or AdminSystem).
 */
export const backofficeQuery = customQuery(
  query,
  customCtx(async (ctx) => {
    const user = await requireBackOfficeAccess(ctx);
    return { user };
  }),
);

/**
 * Custom mutation that requires authentication.
 * The current user is available in ctx.user
 * Uses triggers-wrapped mutation for aggregate sync.
 */
export const authMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    const user = await requireAuth(ctx);
    return { user };
  }),
);

/**
 * Custom mutation that requires superadmin role.
 * Uses triggers-wrapped mutation for aggregate sync.
 */
export const superadminMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    const user = await requireSuperadmin(ctx);
    return { user };
  }),
);

/**
 * Custom mutation that requires back-office access (SuperAdmin or AdminSystem).
 * Uses triggers-wrapped mutation for aggregate sync.
 */
export const backofficeMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    const user = await requireBackOfficeAccess(ctx);
    return { user };
  }),
);

/**
 * Custom action that requires authentication.
 * Only provides identity (actions don't have direct DB access)
 */
export const authAction = customAction(
  action,
  customCtx(async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("NOT_AUTHENTICATED");
    }
    return { identity };
  }),
);

/**
 * Custom action that requires superadmin role.
 * Since actions don't have ctx.db, we verify the role via an internalQuery.
 */
export const superadminAction = customAction(
  action,
  customCtx(async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("NOT_AUTHENTICATED");
    }
    const isSuperadmin = await ctx.runQuery(
      internal.lib.auth.checkSuperadminBySubject,
      { subject: identity.subject },
    );
    if (!isSuperadmin) {
      throw new Error("INSUFFICIENT_PERMISSIONS");
    }
    return { identity };
  }),
);
