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
	Check,
	ClipboardCopy,
	Loader2,
	PhoneOff,
	Users,
	Video,
} from "lucide-react";
import { useState } from "react";
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

const CustomCallUI = dynamic(
	() => import("@/components/meetings/custom-call-ui").then((mod) => mod.CustomCallUI),
	{ ssr: false },
);

type ViewState = "prejoin" | "incall" | "empty";

export default function MeetingsPage() {
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
			toast.error(e?.message ?? "Impossible de rejoindre");
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
		toast.success("Lien copie !");
		setTimeout(() => setCopiedLink(false), 2000);
	};

	// -- Vue en appel --
	if (view === "incall" && token && wsUrl) {
		return (
			<div className="flex flex-col h-[calc(100vh-4rem)] bg-zinc-950 rounded-xl overflow-hidden">
				<div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
					<div className="flex items-center gap-2">
						<Badge className="text-[9px] bg-red-500/15 text-red-400">● En direct</Badge>
						<span className="text-xs text-zinc-400">{(meeting as any)?.title ?? "Reunion"}</span>
					</div>
					<Button variant="destructive" size="sm" onClick={handleLeave} className="h-7 text-[10px] gap-1">
						<PhoneOff className="h-3 w-3" /> Quitter
					</Button>
				</div>
				<LiveKitRoom
					token={token}
					serverUrl={wsUrl}
					connect={true}
					audio={true}
					video={(meeting as any)?.mediaType !== "audio"}
					onDisconnected={handleLeave}
					className="flex flex-col flex-1"
				>
					<CustomCallUI onHangUp={handleLeave} />
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
							{(meeting as any)?.title ?? "Reunion"}
						</h2>
						<p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
							<Users className="h-3.5 w-3.5" />
							{(meeting as any)?.participants?.length ?? 0} participant(s)
						</p>

						{/* Lien de partage */}
						<button
							type="button"
							onClick={handleCopyLink}
							className="text-xs text-primary hover:underline flex items-center gap-1 mb-4"
						>
							{copiedLink ? <Check className="h-3 w-3" /> : <ClipboardCopy className="h-3 w-3" />}
							{copiedLink ? "Copie !" : "Copier le lien"}
						</button>

						{meetingError && (
							<p className="text-xs text-destructive bg-destructive/10 px-3 py-1.5 rounded-lg mb-3">
								{meetingError}
							</p>
						)}

						<div className="flex gap-3 mt-2">
							<Button variant="outline" onClick={() => setView("empty")} disabled={isConnecting}>
								Annuler
							</Button>
							<Button onClick={handleJoin} disabled={isConnecting} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
								{isConnecting ? (
									<><Loader2 className="h-4 w-4 animate-spin" /> Connexion...</>
								) : (
									<><Video className="h-4 w-4" /> Rejoindre</>
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
			<PageHeader title="Reunions" description="Rejoignez une reunion via un lien d'invitation" />
			<FlatCard className="mt-4">
				<div className="flex flex-col items-center py-12 text-center">
					<Video className="h-12 w-12 text-muted-foreground/20 mb-3" />
					<h3 className="text-sm font-semibold mb-1">Aucune reunion active</h3>
					<p className="text-xs text-muted-foreground max-w-xs">
						Utilisez un lien d'invitation envoye par un agent pour rejoindre une reunion.
					</p>
				</div>
			</FlatCard>
		</div>
	);
}
