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

/**
 * Bug 9 (Ronde 2) — slice « fenêtre d'appel sortant global ».
 *
 * Quand un appel SORTANT est lancé (manuellement via `call-button.tsx` OU
 * vocalement via `launch_call_with_contact`), un Dialog doit s'ouvrir chez
 * l'appelant pour montrer la sonnerie + `DirectCallView` une fois connecté.
 *
 * Avant : ce Dialog vivait UNIQUEMENT dans `call-button.tsx` (local). La voix
 * ne pouvait pas l'ouvrir → divergence UX (appel créé côté serveur mais
 * aucune fenêtre côté appelant).
 *
 * Après : un slice global est posé par les deux chemins (manuel + vocal),
 * et `<GlobalOutgoingCallWindow>` monté dans l'AppShell rend le Dialog
 * partagé (`OutgoingCallDialog`). Voix et manuel ouvrent EXACTEMENT le
 * même composant.
 */
export interface OutgoingCallWindowState {
  meetingId: Id<"meetings">;
  participantUserId: Id<"users">;
  mediaType: "audio" | "video";
  startedAt: number;
}

interface CallStoreState {
  slots: Map<Id<"meetings">, CallSlot>;
  activeSlotId: Id<"meetings"> | null;
  /**
   * Intent utilisateur de mute manuel pour le slot actif.
   * Reset à `false` à chaque nouveau slot actif (décrochage / swap / resume).
   */
  micMuted: boolean;
  /**
   * Intent utilisateur d'activation caméra pour le slot actif.
   * Reset à `false` à chaque nouveau slot actif — chaque appel démarre
   * caméra coupée, l'agent active à la volée s'il veut passer en visio.
   */
  cameraEnabled: boolean;
  /**
   * Fenêtre d'appel sortant globalement visible (cf. doc OutgoingCallWindowState).
   * `null` quand aucun appel sortant n'est en cours d'affichage.
   */
  outgoingCallWindow: OutgoingCallWindowState | null;
}

const state: CallStoreState = {
  slots: new Map(),
  activeSlotId: null,
  micMuted: false,
  cameraEnabled: false,
  outgoingCallWindow: null,
};

const listeners = new Set<() => void>();

/** Un snapshot immuable est nécessaire pour useSyncExternalStore. */
let snapshot: {
  slots: ReadonlyArray<CallSlot>;
  activeSlotId: Id<"meetings"> | null;
  activeMeetingId: Id<"meetings"> | null; // alias rétrocompat
  micMuted: boolean;
  cameraEnabled: boolean;
  outgoingCallWindow: OutgoingCallWindowState | null;
} = {
  slots: [],
  activeSlotId: null,
  activeMeetingId: null,
  micMuted: false,
  cameraEnabled: false,
  outgoingCallWindow: null,
};

function rebuildSnapshot() {
  snapshot = {
    slots: Array.from(state.slots.values()),
    activeSlotId: state.activeSlotId,
    activeMeetingId: state.activeSlotId,
    micMuted: state.micMuted,
    cameraEnabled: state.cameraEnabled,
    outgoingCallWindow: state.outgoingCallWindow,
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
      // Nouveau slot actif → mute reset (décrocher = parler) + caméra reset
      // (chaque appel démarre sans vidéo).
      if (state.activeSlotId !== slot.meetingId) {
        state.micMuted = false;
        state.cameraEnabled = false;
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
      state.micMuted = false;
      state.cameraEnabled = false;
    }
    emit();
  },

  /** Définit explicitement le slot actif (swap — Sprint 2+). */
  setActiveSlot(meetingId: Id<"meetings"> | null) {
    if (meetingId === null) {
      state.activeSlotId = null;
      state.micMuted = false;
      state.cameraEnabled = false;
      emit();
      return;
    }
    if (!state.slots.has(meetingId)) return;
    if (state.activeSlotId !== meetingId) {
      state.micMuted = false;
      state.cameraEnabled = false;
    }
    state.activeSlotId = meetingId;
    emit();
  },

  /** Intent de mute manuel sur le slot actif. */
  setMicMuted(muted: boolean) {
    if (state.micMuted === muted) return;
    state.micMuted = muted;
    emit();
  },

  /** Etat courant du mute manuel. */
  getMicMuted(): boolean {
    return state.micMuted;
  },

  /** Intent d'activation caméra sur le slot actif. */
  setCameraEnabled(enabled: boolean) {
    if (state.cameraEnabled === enabled) return;
    state.cameraEnabled = enabled;
    emit();
  },

  /** Etat courant d'activation caméra. */
  getCameraEnabled(): boolean {
    return state.cameraEnabled;
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
      state.micMuted = false;
      state.cameraEnabled = false;
      emit();
      return;
    }
    const existing = state.slots.get(id);
    state.slots.set(id, {
      ...existing,
      meetingId: id,
      status: existing?.status ?? "active",
    });
    if (state.activeSlotId !== id) {
      state.micMuted = false;
      state.cameraEnabled = false;
    }
    state.activeSlotId = id;
    emit();
  },
  getGlobalMeetingId(): Id<"meetings"> | null {
    return state.activeSlotId;
  },

  // ─── Bug 9 (Ronde 2) — Outgoing call window ────────────────
  /**
   * Ouvre la fenêtre d'appel sortant globalement. À appeler par :
   *   - `call-button.tsx` après la mutation `meetings.callUser`,
   *   - `useIAstedHost` après le tool vocal `launch_call_with_contact`.
   * Le composant `<GlobalOutgoingCallWindow>` réagit et monte le Dialog.
   *
   * Pose aussi le slot actif legacy via `setGlobalMeetingId` pour la
   * rétrocompatibilité avec les consumers qui lisent `activeSlotId`
   * (GlobalCallAlert filtre les appels où l'utilisateur est appelant via
   * cet ID, sinon il sonnerait sur l'appelant lui-même).
   */
  openOutgoingCall(window: OutgoingCallWindowState) {
    state.outgoingCallWindow = window;
    // Synchronise le slot actif legacy (évite la double sonnerie côté appelant).
    const existing = state.slots.get(window.meetingId);
    state.slots.set(window.meetingId, {
      ...existing,
      meetingId: window.meetingId,
      status: existing?.status ?? "connecting",
    });
    if (state.activeSlotId !== window.meetingId) {
      state.micMuted = false;
      state.cameraEnabled = false;
    }
    state.activeSlotId = window.meetingId;
    emit();
  },

  /** Ferme la fenêtre d'appel sortant globale (+ nettoie le slot legacy). */
  closeOutgoingCall() {
    if (state.outgoingCallWindow === null) return;
    const meetingId = state.outgoingCallWindow.meetingId;
    state.outgoingCallWindow = null;
    if (state.activeSlotId === meetingId) {
      state.slots.delete(meetingId);
      state.activeSlotId = null;
      state.micMuted = false;
      state.cameraEnabled = false;
    }
    emit();
  },

  /** Accès read-only à la fenêtre courante. */
  getOutgoingCallWindow(): OutgoingCallWindowState | null {
    return state.outgoingCallWindow;
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
    micMuted: current.micMuted,
    cameraEnabled: current.cameraEnabled,
    outgoingCallWindow: current.outgoingCallWindow,
    setGlobalMeetingId: callStore.setGlobalMeetingId,
    upsertSlot: callStore.upsertSlot,
    removeSlot: callStore.removeSlot,
    setActiveSlot: callStore.setActiveSlot,
    setMicMuted: callStore.setMicMuted,
    setCameraEnabled: callStore.setCameraEnabled,
    openOutgoingCall: callStore.openOutgoingCall,
    closeOutgoingCall: callStore.closeOutgoingCall,
  };
}
