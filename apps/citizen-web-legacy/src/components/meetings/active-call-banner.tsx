import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	LiveKitRoom,
} from "@livekit/components-react";
import { CustomCallUI } from "@/components/meetings/custom-call-ui";
import { Loader2, Phone } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";

import { useMeeting } from "@/hooks/use-meeting";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRingtone } from "@/hooks/use-ringtone";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { useCallStore } from "@/stores/call-store";

interface ActiveCallBannerProps {
	requestId: Id<"requests">;
}

/**
 * A pulsing banner that appears inside a request view when there is an active call
 * associated with this request.
 */
export function ActiveCallBanner({ requestId }: ActiveCallBannerProps) {
	const { t } = useTranslation();
	const isMobile = useIsMobile();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [activeMeetingId, setActiveMeetingId] = useState<Id<"meetings"> | null>(
		null,
	);
	const { globalActiveMeetingId, setGlobalMeetingId } = useCallStore();
	const isBusyGlobally = globalActiveMeetingId !== null;

	// Find the first active meeting attached to this request
	const { data: requestMeetings } = useAuthenticatedConvexQuery(
		api.functions.meetings.listByRequest,
		{ requestId },
	);

	const activeMeeting = requestMeetings?.find((m) => m.status === "active");

	const { token, wsUrl, isConnecting, connect, disconnect } = useMeeting(
		activeMeeting?._id,
	);

	// Play ringing sound continuously when there is an active call we haven't answered yet, and we aren't in another call
	useRingtone(!!activeMeeting && !dialogOpen && !isBusyGlobally);

	const handleJoin = useCallback(async () => {
		if (!activeMeeting) return;
		setActiveMeetingId(activeMeeting._id);
		setGlobalMeetingId(activeMeeting._id);
		setDialogOpen(true);
		await connect(activeMeeting._id);
	}, [activeMeeting, connect, setGlobalMeetingId]);

	const handleHangUp = useCallback(async () => {
		if (activeMeetingId) {
			await disconnect(activeMeetingId);
		}
		setDialogOpen(false);
		setActiveMeetingId(null);
		setGlobalMeetingId(null);
	}, [activeMeetingId, disconnect, setGlobalMeetingId]);

	if (!activeMeeting || (isBusyGlobally && !dialogOpen)) return null;

	const callContent = (
		<div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
			{token && wsUrl ? (
				<LiveKitRoom
					token={token}
					serverUrl={wsUrl}
					connect={true}
					audio={true}
					onDisconnected={handleHangUp}
					className="flex-1 min-h-0 flex flex-col"
					style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}
				>
					<CustomCallUI onHangUp={handleHangUp} title={meeting?.title} />
				</LiveKitRoom>
			) : (
				<div className="h-full flex items-center justify-center">
					<Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
				</div>
			)}
		</div>
	);

	return (
		<>
			{/* Pulsing banner */}
			<div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-rose-500/40 bg-rose-500/10 animate-pulse-subtle">
				<div className="flex items-center gap-3">
					<div className="relative">
						<Phone className="w-5 h-5 text-rose-500" />
						<span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
					</div>
					<div>
						<p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
							{t("meetings.activeCall")}
						</p>
						<p className="text-xs text-muted-foreground">
							{t("meetings.agentCalling")}
						</p>
					</div>
				</div>
				<Button
					size="sm"
					onClick={handleJoin}
					disabled={isConnecting}
					className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5 shrink-0"
				>
					{isConnecting ? (
						<Loader2 className="w-4 h-4 animate-spin" />
					) : (
						<Phone className="w-4 h-4" />
					)}
					{t("meetings.join")}
				</Button>
			</div>

			{/* Call Dialog/Sheet */}
			{isMobile ? (
				<Sheet open={dialogOpen} onOpenChange={(o) => !o && handleHangUp()}>
					<SheetContent
						side="bottom"
						className="p-0 h-[100dvh] w-full bg-zinc-950 border-none rounded-none focus:outline-none flex flex-col pt-10"
					>
						{callContent}
					</SheetContent>
				</Sheet>
			) : (
				<Dialog
					open={dialogOpen}
					onOpenChange={(open) => {
						if (!open) handleHangUp();
					}}
				>
					<DialogContent
						autoFocus={false}
						className="max-w-5xl sm:max-w-5xl w-full h-[80vh] p-0 flex flex-col overflow-hidden bg-zinc-950 border-zinc-800"
					>
						{callContent}
					</DialogContent>
				</Dialog>
			)}
		</>
	);
}
