"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	LiveKitRoom,
} from "@livekit/components-react";
import { CustomCallUI } from "@/components/meetings/custom-call-ui";
import { Loader2, Phone, PhoneOff, ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useMeeting } from "@/hooks/use-meeting";
import { useIsMobile } from "@/hooks/use-mobile";
import { useConvexMutationQuery, useConvexQuery } from "@/integrations/convex/hooks";

interface OrgCallButtonProps {
	orgId: Id<"orgs">;
	orgName: string;
	className?: string;
	variant?: ComponentProps<typeof Button>["variant"];
	label?: string;
}

/**
 * OrgCallButton — Allows a citizen to call an organization.
 * If the org has multiple call lines, shows a line selector first.
 * Creates an inbound org call and opens the LiveKit interface.
 */
export function OrgCallButton({
	orgId,
	orgName,
	className,
	variant = "default",
	label,
}: OrgCallButtonProps) {
	const { t } = useTranslation();
	const isMobile = useIsMobile();
	const [activeMeetingId, setActiveMeetingId] = useState<Id<"meetings"> | null>(
		null,
	);
	const [showLineSelector, setShowLineSelector] = useState(false);

	// Fetch call lines for this org
	const { data: callLines } = useConvexQuery(
		api.functions.callLines.listByOrg,
		{ orgId },
	);

	const callOrgMutation = useConvexMutationQuery(
		api.functions.meetings.callOrganization,
	);

	const { token, wsUrl, connect, disconnect } = useMeeting(
		activeMeetingId ?? undefined,
	);

	const initiateCall = useCallback(async (callLineId?: Id<"callLines">) => {
		try {
			setShowLineSelector(false);
			const result = await callOrgMutation.mutateAsync({
				orgId,
				callLineId,
			});
			setActiveMeetingId(result.meetingId);
			await connect(result.meetingId);
		} catch (err) {
			console.error("Failed to call organization:", err);
		}
	}, [orgId, callOrgMutation, connect]);

	const handleCall = useCallback(async () => {
		// If there are multiple active lines, show selector
		const activeLines = callLines?.filter((l) => l.isActive) ?? [];
		if (activeLines.length > 1) {
			setShowLineSelector(true);
			return;
		}
		// If exactly 1 line, call it directly. If 0, call without line.
		const singleLine = activeLines.length === 1 ? activeLines[0] : undefined;
		await initiateCall(singleLine?._id);
	}, [callLines, initiateCall]);

	const handleHangUp = useCallback(async () => {
		if (activeMeetingId) {
			await disconnect(activeMeetingId);
		}
		setActiveMeetingId(null);
	}, [activeMeetingId, disconnect]);

	const isInCall = activeMeetingId !== null;
	const activeLines = callLines?.filter((l) => l.isActive) ?? [];

	const callContent = (
		<div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
			{token && wsUrl ? (
				<LiveKitRoom
					token={token}
					serverUrl={wsUrl}
					connect={true}
					audio={true}
					video={false}
					onDisconnected={handleHangUp}
					className="flex-1 min-h-0 flex flex-col"
					style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}
				>
					<CustomCallUI onHangUp={handleHangUp} title={orgName} />
				</LiveKitRoom>
			) : (
				<div className="h-full flex flex-col items-center justify-center gap-4 text-white">
					<Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
					<p className="text-sm text-zinc-400">
						{t("meetings.waitingForAgent", "En attente d'un agent...")}
					</p>
				</div>
			)}
		</div>
	);

	return (
		<>
			<Button
				onClick={handleCall}
				disabled={callOrgMutation.isPending || isInCall}
				className={className}
				variant={variant}
			>
				{callOrgMutation.isPending ? (
					<Loader2 className="w-4 h-4 mr-2 animate-spin" />
				) : (
					<Phone className="w-4 h-4 mr-2" />
				)}
				{label || t("meetings.callOrg", "Appeler")}
				{activeLines.length > 1 && (
					<ChevronDown className="w-3 h-3 ml-1 opacity-60" />
				)}
			</Button>

			{/* Line Selector Dialog */}
			<Dialog open={showLineSelector} onOpenChange={setShowLineSelector}>
				<DialogContent className="sm:max-w-sm">
					<DialogTitle className="flex items-center gap-2 text-lg font-semibold">
						<Phone className="w-5 h-5 text-primary" />
						{t("meetings.selectLine", "Choisir une ligne")}
					</DialogTitle>
					<DialogDescription className="border-b pb-3 text-sm text-muted-foreground">
						{t("meetings.selectLineDesc", "Sur quelle ligne souhaitez-vous appeler ?")}
					</DialogDescription>
					<div className="flex flex-col gap-4">
						<div className="space-y-2">
							{activeLines.map((line) => {
								const isPersonal = line.type === "personal";
								return (
									<button
										type="button"
										key={line._id}
										onClick={() => initiateCall(line._id)}
										disabled={callOrgMutation.isPending}
										className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] ${
											isPersonal
												? "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800"
												: "border-primary/20 bg-primary/5 hover:bg-primary/10"
										}`}
									>
										<div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
											isPersonal ? "bg-zinc-200 dark:bg-zinc-700" : "bg-primary/10"
										}`}>
											<Phone className={`w-4 h-4 ${isPersonal ? "text-zinc-600 dark:text-zinc-300" : "text-primary"}`} />
										</div>
										<div className="flex-1 text-left min-w-0">
											<p className="text-sm font-medium truncate">{line.label}</p>
											{line.description && (
												<p className="text-xs text-muted-foreground truncate">{line.description}</p>
											)}
										</div>
										{isPersonal && (
											<span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700 shrink-0">
												{t("meetings.directLine", "Direct")}
											</span>
										)}
									</button>
								);
							})}
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Call interface */}
			{isInCall && isMobile ? (
				<Sheet open={isInCall} onOpenChange={(o) => !o && handleHangUp()}>
					<SheetContent
						side="bottom"
						className="p-0 h-[100dvh] w-full bg-zinc-950 border-none rounded-none focus:outline-none flex flex-col pt-10"
					>
						{callContent}
					</SheetContent>
				</Sheet>
			) : isInCall && !isMobile ? (
				<Dialog open={isInCall} onOpenChange={(o) => !o && handleHangUp()}>
					<DialogContent
						autoFocus={false}
						className="max-w-5xl sm:max-w-5xl w-full h-[80vh] p-0 flex flex-col overflow-hidden bg-zinc-950 border-zinc-800"
					>
						<DialogTitle className="sr-only">
							{orgName || t("meetings.callInProgress", "Appel en cours")}
						</DialogTitle>
						<DialogDescription className="sr-only">
							{t(
								"meetings.callDialogDescription",
								"Interface d'appel active. Utilisez les commandes pour poursuivre la conversation ou raccrocher.",
							)}
						</DialogDescription>
						{callContent}
					</DialogContent>
				</Dialog>
			) : null}
		</>
	);
}
