/**
 * Trigger instance setup — separated from trigger registration
 * to avoid circular dependencies.
 *
 * The Triggers instance is imported by customFunctions.ts for wrapDB,
 * while the actual trigger handlers (which need `internal` from _generated/api)
 * are registered in triggers/index.ts.
 */
import { Triggers } from "convex-helpers/server/triggers";
import type { DataModel } from "../_generated/dataModel";

export const triggers = new Triggers<DataModel>();
export default triggers;
