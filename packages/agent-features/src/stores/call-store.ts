import type { Id } from "@convex/_generated/dataModel";
import { useSyncExternalStore } from "react";

/**
 * Centre d'Appels — store multi-call.
 *
 * Avant : un seul appel actif à la fois (globalActiveMeetingId scalaire).
 * Après : Map<meetingId, CallSlot> avec au plus 1 slot `active` (contrainte audio)
 *         et N slots `held` (Sprint 2+).
 *
 * Sprint 1 : le store tient surtout le slot actif + les slots entrants optimistes.
 * Sprint 2 : ajout réel des statuts held/resume, synchronisation stricte Convex.
 */

export type CallSlotStatus =
  | "incoming"
  | "connecting"
  | "active"
  | "held"
  | "ended";

export interface CallSlot {
  meetingId: Id<"meetings">;
  status: CallSlotStatus;
  // Optionnel — hydraté après pickup réussi
  token?: string | null;
  wsUrl?: string | null;
  roomName?: string | null;
  joinedAt?: number | null;
  heldSince?: number | null;
}

interface CallStoreState {
  slots: Map<Id<"meetings">, CallSlot>;
  activeSlotId: Id<"meetings"> | null;
}

const state: CallStoreState = {
  slots: new Map(),
  activeSlotId: null,
};

const listeners = new Set<() => void>();

/** Un snapshot immuable est nécessaire pour useSyncExternalStore. */
let snapshot: {
  slots: ReadonlyArray<CallSlot>;
  activeSlotId: Id<"meetings"> | null;
  activeMeetingId: Id<"meetings"> | null; // alias rétrocompat
} = {
  slots: [],
  activeSlotId: null,
  activeMeetingId: null,
};

function rebuildSnapshot() {
  snapshot = {
    slots: Array.from(state.slots.values()),
    activeSlotId: state.activeSlotId,
    activeMeetingId: state.activeSlotId,
  };
}

function emit() {
  rebuildSnapshot();
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

export const callStore = {
  /**
   * Ajoute ou met à jour un slot.
   * Si `status: "active"`, tout autre slot actif bascule en "held" (Sprint 2+)
   * ou reste tel quel (Sprint 1 : on termine l'actif précédent côté serveur).
   */
  upsertSlot(slot: CallSlot) {
    const existing = state.slots.get(slot.meetingId);
    state.slots.set(slot.meetingId, { ...existing, ...slot });

    if (slot.status === "active") {
      if (
        state.activeSlotId &&
        state.activeSlotId !== slot.meetingId
      ) {
        const prev = state.slots.get(state.activeSlotId);
        if (prev && prev.status === "active") {
          // En Sprint 1, l'actif précédent est terminé côté serveur par pickupCall.
          // On retire le slot du store pour rester cohérent côté client.
          state.slots.delete(state.activeSlotId);
        }
      }
      state.activeSlotId = slot.meetingId;
    }
    emit();
  },

  /** Supprime un slot (appel terminé, refusé ou annulé). */
  removeSlot(meetingId: Id<"meetings">) {
    state.slots.delete(meetingId);
    if (state.activeSlotId === meetingId) {
      state.activeSlotId = null;
    }
    emit();
  },

  /** Définit explicitement le slot actif (swap — Sprint 2+). */
  setActiveSlot(meetingId: Id<"meetings"> | null) {
    if (meetingId === null) {
      state.activeSlotId = null;
      emit();
      return;
    }
    if (!state.slots.has(meetingId)) return;
    state.activeSlotId = meetingId;
    emit();
  },

  /** Accès read-only aux slots courants. */
  getSlots(): ReadonlyArray<CallSlot> {
    return snapshot.slots;
  },

  /** Slot actif (audio live). */
  getActiveSlotId(): Id<"meetings"> | null {
    return state.activeSlotId;
  },

  // ─── Rétrocompatibilité — API scalaire historique ──────────────
  // Ces méthodes restent en place pour ne pas casser GlobalCallAlert,
  // CallButton, ActiveCallBanner, etc. pendant la migration.
  setGlobalMeetingId(id: Id<"meetings"> | null) {
    if (id === null) {
      if (state.activeSlotId) {
        state.slots.delete(state.activeSlotId);
      }
      state.activeSlotId = null;
      emit();
      return;
    }
    const existing = state.slots.get(id);
    state.slots.set(id, {
      ...existing,
      meetingId: id,
      status: existing?.status ?? "active",
    });
    state.activeSlotId = id;
    emit();
  },
  getGlobalMeetingId(): Id<"meetings"> | null {
    return state.activeSlotId;
  },
};

/** Hook principal — expose l'état complet du store et les actions usuelles. */
export function useCallStore() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    slots: current.slots,
    activeSlotId: current.activeSlotId,
    // Rétrocompat : certains composants historiques consomment ce nom.
    globalActiveMeetingId: current.activeMeetingId,
    setGlobalMeetingId: callStore.setGlobalMeetingId,
    upsertSlot: callStore.upsertSlot,
    removeSlot: callStore.removeSlot,
    setActiveSlot: callStore.setActiveSlot,
  };
}
