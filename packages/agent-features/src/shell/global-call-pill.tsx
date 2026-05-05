"use client";

/**
 * GlobalCallPill — pill flottant bottom-right persistant tant qu'un appel
 * est actif, visible sur TOUTES les routes (Dashboard, iDocument, iAgenda…).
 *
 * Click sur le corps → navigate vers /icom?tab=icall pour ramener l'agent
 * sur la vue d'appel complète. Le bouton Raccrocher reste indépendant
 * (n'ouvre pas iCom, raccroche seulement).
 *
 * Remplace l'ancien pill local `fixed bottom-6 right-6` qui vivait dans
 * `CallCenterShell` et disparaissait à la navigation.
 */

import { PhoneOff, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePathname, useRouter } from "@workspace/routing";
import { Button } from "@workspace/ui/components/button";
import { useCallCenter } from "../hooks/use-call-center";

export function GlobalCallPill() {
	const { t } = useTranslation();
	const router = useRouter();
	const pathname = usePathname();
	const { activeSlotId, activeCalls, hangup } = useCallCenter();

	if (!activeSlotId || activeCalls.length === 0) return null;

	const active = (activeCalls as Array<{ _id: string; callerName?: string | null }>).find(
		(c) => c._id === (activeSlotId as unknown as string),
	);
	const callerName = active?.callerName ?? null;

	const isOnIcomCall =
		!!pathname && pathname.startsWith("/icom");

	const handleOpen = () => {
		if (isOnIcomCall) return;
		router.push("/icom?tab=icall");
	};

	return (
		<div className="pointer-events-auto fixed bottom-6 right-6 z-50 flex items-center gap-1 rounded-full border bg-card pl-1 pr-1 py-1 shadow-lg">
			<button
				type="button"
				onClick={handleOpen}
				disabled={isOnIcomCall}
				aria-label={t("callCenter.action.openInCallCenter", "Ouvrir l'appel")}
				className="flex items-center gap-2 rounded-full px-3 py-1.5 text-left transition-colors hover:bg-muted/60 disabled:cursor-default disabled:hover:bg-transparent"
			>
				<span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
					<Phone className="h-3.5 w-3.5 text-emerald-600" />
					<span className="absolute inset-0 animate-ping rounded-full border border-emerald-500/60" />
				</span>
				<span className="flex flex-col leading-tight">
					<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
						{t("callCenter.activeBar.title")}
					</span>
					{callerName && (
						<span className="max-w-[160px] truncate text-xs font-semibold">
							{callerName}
						</span>
					)}
				</span>
			</button>
			<Button
				size="sm"
				variant="destructive"
				className="h-8 gap-1.5 rounded-full"
				onClick={() => hangup(activeSlotId)}
			>
				<PhoneOff className="h-3.5 w-3.5" />
				{t("callCenter.action.end")}
			</Button>
		</div>
	);
}
