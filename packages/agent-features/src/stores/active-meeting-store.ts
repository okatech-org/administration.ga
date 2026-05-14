"use client";

import type { Id } from "@convex/_generated/dataModel";
import { useSyncExternalStore } from "react";

export type ActiveMeetingStatus = "idle" | "connecting" | "connected" | "error";

export interface ActiveMeetingState {
	meetingId: Id<"meetings"> | null;
	token: string | null;
	wsUrl: string | null;
	mediaType: "audio" | "video" | null;
	status: ActiveMeetingStatus;
	error: string | null;
}

const initialState: ActiveMeetingState = {
	meetingId: null,
	token: null,
	wsUrl: null,
	mediaType: null,
	status: "idle",
	error: null,
};

let state: ActiveMeetingState = initialState;
let snapshot: ActiveMeetingState = state;
const listeners = new Set<() => void>();

function emit() {
	snapshot = { ...state };
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

export const activeMeetingStore = {
	getState(): ActiveMeetingState {
		return snapshot;
	},

	beginConnecting(meetingId: Id<"meetings">) {
		state = {
			meetingId,
			token: null,
			wsUrl: null,
			mediaType: null,
			status: "connecting",
			error: null,
		};
		emit();
	},

	setCredentials(args: {
		meetingId: Id<"meetings">;
		token: string;
		wsUrl: string;
		mediaType: "audio" | "video";
	}) {
		if (state.meetingId !== args.meetingId) return;
		state = {
			...state,
			token: args.token,
			wsUrl: args.wsUrl,
			mediaType: args.mediaType,
			status: "connected",
			error: null,
		};
		emit();
	},

	setError(meetingId: Id<"meetings">, message: string) {
		if (state.meetingId !== meetingId) return;
		state = { ...state, status: "error", error: message };
		emit();
	},

	reset() {
		state = { ...initialState };
		emit();
	},
};

export function useActiveMeetingStore() {
	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
