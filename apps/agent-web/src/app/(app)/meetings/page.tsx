"use client";

import MeetingsPage from "@workspace/agent-features/features/meetings";
import { MeetingRoom, PreJoinScreen } from "@/components/meetings/meeting-room";

export default function Page() {
	return <MeetingsPage MeetingRoom={MeetingRoom} PreJoinScreen={PreJoinScreen} />;
}
