"use client";

/**
 * GlobalQueuePill — drawer flottant bottom-LEFT, viewport-ancré.
 *
 * Affiché systématiquement hors /icom dès qu'il y a 1+ appel en attente.
 * L'agent peut :
 *   - Cliquer le bouton Bell → toggle mute des notifications (sonnerie).
 *     Persistant via la même clé que IAstedPage : `call-center-ringtone-muted`.
 *   - Cliquer le bouton Minimize → masque le drawer, devient une petite
 *     pastille flottante avec le badge du nombre d'appels en attente. Click
 *     sur la pastille = ré-expand.
 *
 * Maquette : `agent-desktop.jsx > AgQueuePill` (bottom-left, 280px).
 */

import {
	Bell,
	BellOff,
	ChevronUp,
	Loader2,
	Minus,
	Phone,
	PhoneOff,
} from "lucide-react";
import { usePathname, useRouter } from "@workspace/routing";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { useCallCenter } from "../hooks/use-call-center";
import { useRingtoneMutedPref } from "../hooks/use-ringtone-muted-pref";

const MAX_VISIBLE = 4;

type QueueItem = {
	_id: string;
	_creationTime: number;
	priority?: string | null;
	lineLabel?: string | null;
	caller?: { userId?: string; name?: string };
};

export function GlobalQueuePill() {
	const { t } = useTranslation();
	const router = useRouter();
	const pathname = usePathname();
	const { queue, pickup, decline } = useCallCenter();

	const isOnIcom = !!pathname && pathname.startsWith("/icom");

	// Préférences persistées
	const [collapsed, setCollapsed] = useState(false);
	const { muted: ringtoneMuted, toggle: toggleRingtoneMuted } =
		useRingtoneMutedPref();

	if (isOnIcom) return null;
	if (!queue || queue.length === 0) return null;

	const visible = (queue as QueueItem[]).slice(0, MAX_VISIBLE);
	const overflow = queue.length - visible.length;

	// État replié — petite pastille flottante avec compteur
	if (collapsed) {
		return (
			<button
				type="button"
				onClick={() => setCollapsed(false)}
				className="pointer-events-auto fixed bottom-6 left-6 z-40 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
				aria-label={t(
					"callCenter.globalQueuePill.expand",
					"Afficher la file d'appels",
				)}
				title={t(
					"callCenter.globalQueuePill.expand",
					"Afficher la file d'appels",
				)}
			>
				<Phone className="h-5 w-5" />
				<span className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground border-2 border-background">
					{queue.length}
				</span>
			</button>
		);
	}

	return (
		<div className="pointer-events-auto fixed bottom-6 left-6 z-40 w-[320px] rounded-2xl border bg-card shadow-lg p-2.5 flex flex-col gap-2">
			<div className="flex items-center justify-between gap-1 px-1">
				<div className="flex items-center gap-2 text-[12px] font-semibold min-w-0">
					<span className="h-2 w-2 rounded-full bg-primary call-blink shrink-0" />
					<span className="truncate">
						{queue.length}{" "}
						{queue.length > 1
							? t(
									"callCenter.globalQueuePill.titleMany",
									"appels en attente",
								)
							: t(
									"callCenter.globalQueuePill.titleOne",
									"appel en attente",
								)}
					</span>
				</div>
				<div className="flex items-center gap-0.5 shrink-0">
					<button
						type="button"
						onClick={toggleRingtoneMuted}
						className="h-6 w-6 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground flex items-center justify-center"
						aria-pressed={ringtoneMuted}
						aria-label={
							ringtoneMuted
								? t("callCenter.ringtone.unmute", "Réactiver la sonnerie")
								: t("callCenter.ringtone.mute", "Couper la sonnerie")
						}
						title={
							ringtoneMuted
								? t("callCenter.ringtone.unmute", "Réactiver la sonnerie")
								: t("callCenter.ringtone.mute", "Couper la sonnerie")
						}
					>
						{ringtoneMuted ? (
							<BellOff className="h-3.5 w-3.5" />
						) : (
							<Bell className="h-3.5 w-3.5" />
						)}
					</button>
					<button
						type="button"
						onClick={() => setCollapsed(true)}
						className="h-6 w-6 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground flex items-center justify-center"
						aria-label={t("callCenter.globalQueuePill.collapse", "Réduire")}
						title={t("callCenter.globalQueuePill.collapse", "Réduire")}
					>
						<Minus className="h-3.5 w-3.5" />
					</button>
					<Button
						variant="ghost"
						size="sm"
						className="h-6 px-2 text-[11px]"
						onClick={() => router.push("/icom?tab=icall")}
					>
						{t("callCenter.globalQueuePill.viewAll", "Voir tout")}
					</Button>
				</div>
			</div>

			<div className="flex flex-col gap-0.5">
				{visible.map((item) => (
					<QueueRow
						key={item._id}
						item={item}
						onPickup={async () => {
							await pickup(item._id as Id<"meetings">);
							router.push("/icom?tab=icall");
						}}
						onDecline={() => decline(item._id as Id<"meetings">)}
					/>
				))}
			</div>

			{overflow > 0 && (
				<button
					type="button"
					onClick={() => router.push("/icom?tab=icall")}
					className="text-[11px] text-muted-foreground hover:text-foreground text-center py-1.5 hover:bg-muted/40 rounded-md transition-colors"
				>
					+{overflow}{" "}
					{t("callCenter.globalQueuePill.more", "autres en attente")}
				</button>
			)}
		</div>
	);
}

function QueueRow({
	item,
	onPickup,
	onDecline,
}: {
	item: QueueItem;
	onPickup: () => void | Promise<void>;
	onDecline: () => void | Promise<void>;
}) {
	const [busy, setBusy] = useState<"pickup" | "decline" | null>(null);
	const callerName = item.caller?.name ?? "Appelant inconnu";
	const initials =
		callerName
			.split(/\s+/)
			.map((w) => w[0])
			.filter(Boolean)
			.slice(0, 2)
			.join("")
			.toUpperCase() || "?";
	const isUrgent = item.priority === "urgent";
	const elapsedSec = Math.max(
		0,
		Math.floor((Date.now() - item._creationTime) / 1000),
	);
	const elapsedLabel =
		elapsedSec < 60
			? `${elapsedSec}s`
			: `${Math.floor(elapsedSec / 60)}m${String(elapsedSec % 60).padStart(2, "0")}`;

	const handle = async (action: "pickup" | "decline") => {
		if (busy) return;
		setBusy(action);
		try {
			if (action === "pickup") await onPickup();
			else await onDecline();
		} finally {
			setBusy(null);
		}
	};

	return (
		<div className="grid grid-cols-[28px_1fr_24px_24px] items-center gap-2 p-1 rounded-md hover:bg-muted/40">
			<span
				className={cn(
					"h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold",
					isUrgent
						? "bg-destructive/15 text-destructive"
						: "bg-secondary text-foreground",
				)}
				aria-hidden
			>
				{initials}
			</span>
			<div className="min-w-0">
				<p className="text-[12px] font-medium truncate leading-tight">
					{callerName}
				</p>
				<p className="text-[10.5px] text-muted-foreground truncate">
					{item.lineLabel ?? ""}
					{item.lineLabel && " · "}
					{elapsedLabel}
				</p>
			</div>
			<button
				type="button"
				onClick={() => handle("decline")}
				disabled={!!busy}
				aria-label="Refuser"
				title="Refuser"
				className="h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60 flex items-center justify-center transition-colors"
			>
				{busy === "decline" ? (
					<Loader2 className="h-3 w-3 animate-spin" />
				) : (
					<PhoneOff className="h-3 w-3" />
				)}
			</button>
			<button
				type="button"
				onClick={() => handle("pickup")}
				disabled={!!busy}
				aria-label="Décrocher"
				title="Décrocher"
				className="h-6 w-6 rounded-full bg-success text-white hover:bg-success/90 disabled:opacity-60 flex items-center justify-center transition-colors"
			>
				{busy === "pickup" ? (
					<Loader2 className="h-3 w-3 animate-spin" />
				) : (
					<Phone className="h-3 w-3" />
				)}
			</button>
		</div>
	);
}
