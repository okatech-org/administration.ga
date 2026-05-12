"use client";

/**
 * Page Rejoindre une Reunion -- Citoyen.
 *
 * Accessible via /my-space/meetings?join=<meetingId>
 * Affiche un pre-join puis connecte au LiveKit.
 * Le citoyen ne peut pas creer de reunion, seulement rejoindre.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import "@livekit/components-styles";
import {
	CalendarPlus,
	Check,
	ClipboardCopy,
	Loader2,
	PhoneOff,
	Users,
	Video,
} from "lucide-react";
import { Suspense, useCallback, useState } from "react";
import { useConvex } from "convex/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMeeting } from "@/hooks/use-meeting";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { FlatCard } from "@/components/my-space/flat-card";
import { PageHeader } from "@/components/my-space/page-header";

const LiveKitRoom = dynamic(
	() => import("@livekit/components-react").then((mod) => mod.LiveKitRoom),
	{ ssr: false },
);

const CitizenAudioCallView = dynamic(
	() =>
		import("@/components/meetings/CitizenAudioCallView").then(
			(mod) => mod.CitizenAudioCallView,
		),
	{ ssr: false },
);

const MeetingStageView = dynamic(
	() =>
		import("@/components/meetings/MeetingStageView").then(
			(mod) => mod.MeetingStageView,
		),
	{ ssr: false },
);

type ViewState = "prejoin" | "incall" | "empty";

function MeetingsPageContent() {
	const { t } = useTranslation();
	const searchParams = useSearchParams();
	const meetingIdParam = searchParams.get("join") ?? undefined;
	const meetingId = meetingIdParam as Id<"meetings"> | undefined;

	const [view, setView] = useState<ViewState>(meetingId ? "prejoin" : "empty");
	const [copiedLink, setCopiedLink] = useState(false);

	// Donnees reunion
	const { data: meeting } = useAuthenticatedConvexQuery(
		api.functions.meetings.get,
		meetingId ? { meetingId } : "skip",
	);

	// Hook LiveKit
	const {
		token,
		wsUrl,
		isConnecting,
		error: meetingError,
		connect,
		disconnect,
	} = useMeeting(meetingId);

	const handleJoin = async () => {
		if (!meetingId) return;
		try {
			await connect(meetingId);
			setView("incall");
		} catch (e: any) {
			toast.error(e?.message ?? t("meetings.unableToJoin"));
		}
	};

	const handleLeave = async () => {
		if (meetingId) await disconnect(meetingId);
		setView("empty");
	};

	const handleCopyLink = () => {
		if (!meetingId) return;
		navigator.clipboard.writeText(`${window.location.origin}/my-space/meetings?join=${meetingId}`);
		setCopiedLink(true);
		toast.success(t("meetings.linkCopied"));
		setTimeout(() => setCopiedLink(false), 2000);
	};

	// Téléchargement iCal : query on-demand + blob download.
	const convex = useConvex();
	const handleExportIcs = useCallback(async () => {
		if (!meetingId) return;
		try {
			const result = await convex.query(api.functions.meetings.exportIcs, {
				meetingId,
			});
			const blob = new Blob([result.ics], { type: "text/calendar;charset=utf-8" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = result.filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (e: any) {
			toast.error(e?.message ?? "Export impossible");
		}
	}, [convex, meetingId]);

	// -- Vue en appel --
	if (view === "incall" && token && wsUrl) {
		const isMeeting = (meeting as any)?.type === "meeting";
		const isVideoSession =
			(meeting as any)?.mediaType !== "audio" || isMeeting;

		return (
			<div className="flex flex-col h-[calc(100vh-4rem)] bg-zinc-950 rounded-xl overflow-hidden">
				{!isMeeting && (
					<div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
						<div className="flex items-center gap-2">
							<Badge className="text-[9px] bg-red-500/15 text-red-400">● {t("meetings.live")}</Badge>
							<span className="text-xs text-zinc-400">{(meeting as any)?.title ?? t("meetings.meeting")}</span>
						</div>
						<Button variant="destructive" size="sm" onClick={handleLeave} className="h-7 text-[10px] gap-1">
							<PhoneOff className="h-3 w-3" /> {t("meetings.leave")}
						</Button>
					</div>
				)}
				<LiveKitRoom
					token={token}
					serverUrl={wsUrl}
					connect={true}
					audio={true}
					video={isVideoSession}
					onDisconnected={handleLeave}
					className="flex flex-col flex-1"
				>
					{isMeeting ? (
						<MeetingStageView
							meetingTitle={(meeting as any)?.title ?? t("meetings.meeting", "Réunion")}
							onHangUp={handleLeave}
						/>
					) : (
						<CitizenAudioCallView
							onHangUp={handleLeave}
							title={(meeting as any)?.title}
						/>
					)}
				</LiveKitRoom>
			</div>
		);
	}

	// -- Vue pre-join --
	if (view === "prejoin" && meetingId) {
		return (
			<div className="p-4 max-w-md mx-auto">
				<FlatCard>
					<div className="flex flex-col items-center text-center p-6">
						<div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
							<Video className="h-8 w-8 text-emerald-500" />
						</div>
						<h2 className="text-lg font-semibold mb-1">
							{(meeting as any)?.title ?? t("meetings.meeting")}
						</h2>
						<p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
							<Users className="h-3.5 w-3.5" />
							{t("meetings.participants", { count: (meeting as any)?.participants?.length ?? 0 })}
						</p>

						{/* Lien de partage + export .ics */}
						<div className="flex items-center gap-3 mb-4">
							<button
								type="button"
								onClick={handleCopyLink}
								className="text-xs text-primary hover:underline flex items-center gap-1"
							>
								{copiedLink ? <Check className="h-3 w-3" /> : <ClipboardCopy className="h-3 w-3" />}
								{copiedLink ? t("meetings.copied") : t("meetings.copyLink")}
							</button>
							<button
								type="button"
								onClick={handleExportIcs}
								className="text-xs text-primary hover:underline flex items-center gap-1"
							>
								<CalendarPlus className="h-3 w-3" />
								{t("meetings.exportIcs", "Ajouter au calendrier")}
							</button>
						</div>

						{meetingError && (
							<p className="text-xs text-destructive bg-destructive/10 px-3 py-1.5 rounded-lg mb-3">
								{meetingError}
							</p>
						)}

						<div className="flex gap-3 mt-2">
							<Button variant="outline" onClick={() => setView("empty")} disabled={isConnecting}>
								{t("common.cancel")}
							</Button>
							<Button onClick={handleJoin} disabled={isConnecting} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
								{isConnecting ? (
									<><Loader2 className="h-4 w-4 animate-spin" /> {t("meetings.connecting")}</>
								) : (
									<><Video className="h-4 w-4" /> {t("meetings.join")}</>
								)}
							</Button>
						</div>
					</div>
				</FlatCard>
			</div>
		);
	}

	// -- Vue vide --
	return (
		<div className="p-4">
			<PageHeader title={t("meetings.title")} subtitle={t("meetings.subtitle")} />
			<FlatCard className="mt-4">
				<div className="flex flex-col items-center py-12 text-center">
					<Video className="h-12 w-12 text-muted-foreground/20 mb-3" />
					<h3 className="text-sm font-semibold mb-1">{t("meetings.noActiveMeeting")}</h3>
					<p className="text-xs text-muted-foreground max-w-xs">
						{t("meetings.useInvitationLink")}
					</p>
				</div>
			</FlatCard>
		</div>
	);
}

export default function MeetingsPage() {
	return (
		<Suspense fallback={null}>
			<MeetingsPageContent />
		</Suspense>
	);
}
