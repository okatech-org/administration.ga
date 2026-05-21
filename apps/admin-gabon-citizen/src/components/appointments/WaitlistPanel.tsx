"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import Link from "next/link";
import { Clock, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/my-space/flat-card";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";

const STATUS_BADGE: Record<string, { fr: string; en: string; tone: string }> = {
	waiting: { fr: "En attente", en: "Waiting", tone: "bg-amber-500/10 text-amber-700" },
	offered: { fr: "Créneau proposé", en: "Slot offered", tone: "bg-emerald-500/10 text-emerald-700" },
	claimed: { fr: "Confirmé", en: "Claimed", tone: "bg-blue-500/10 text-blue-700" },
	expired: { fr: "Expiré", en: "Expired", tone: "bg-muted text-muted-foreground" },
	cancelled: { fr: "Annulé", en: "Cancelled", tone: "bg-muted text-muted-foreground" },
};

/**
 * Panneau "Ma liste d'attente" — utilisé comme onglet de iAgenda citoyen.
 * Montre les inscriptions waitlist du citoyen avec actions quitter / voir offre.
 */
export function WaitlistPanel() {
	const { i18n } = useTranslation();
	const lang = i18n.language?.startsWith("fr") ? "fr" : "en";

	const { data: entries, isPending } = useAuthenticatedConvexQuery(
		api.functions.appointmentWaitlist.listMyWaitlist,
		{},
	);

	const { mutateAsync: leaveWaitlist } = useConvexMutationQuery(
		api.functions.appointmentWaitlist.leaveWaitlist,
	);

	const handleLeave = async (entryId: Id<"appointmentWaitlist">) => {
		try {
			await leaveWaitlist({ entryId });
			toast.success(lang === "fr" ? "Retiré de la liste" : "Removed from waitlist");
		} catch {
			toast.error(lang === "fr" ? "Erreur" : "Error");
		}
	};

	if (isPending) {
		return (
			<FlatCard>
				<div className="p-6 text-sm text-muted-foreground">
					{lang === "fr" ? "Chargement…" : "Loading…"}
				</div>
			</FlatCard>
		);
	}

	if (!entries || entries.length === 0) {
		return (
			<FlatCard>
				<div className="p-8 text-center text-sm text-muted-foreground">
					{lang === "fr"
						? "Vous n'êtes inscrit sur aucune liste d'attente."
						: "You are not on any waitlist."}
				</div>
			</FlatCard>
		);
	}

	return (
		<div className="space-y-3">
			{entries.map((e: any) => {
				const badge = STATUS_BADGE[e.status] ?? STATUS_BADGE.waiting;
				const offerExpiresIn =
					e.status === "offered" && e.offerExpiresAt
						? Math.max(0, Math.round((e.offerExpiresAt - Date.now()) / 60000))
						: null;
				return (
					<FlatCard key={e._id}>
						<div className="p-3 md:p-4 flex flex-col gap-2">
							<div className="flex items-center justify-between gap-2">
								<div className="font-medium truncate">{e.serviceName}</div>
								<Badge className={`text-[10px] ${badge.tone}`}>
									{lang === "fr" ? badge.fr : badge.en}
								</Badge>
							</div>
							<div className="text-xs text-muted-foreground">{e.orgName}</div>
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<Clock className="h-3 w-3" />
								{lang === "fr" ? "Fenêtre :" : "Window:"} {e.earliestDate} → {e.latestDate}
							</div>
							{offerExpiresIn !== null && (
								<div className="text-xs text-emerald-700">
									{lang === "fr"
										? `Créneau à confirmer dans les ${offerExpiresIn} min`
										: `Claim within ${offerExpiresIn} min`}
								</div>
							)}
							{(e.status === "waiting" || e.status === "offered") && (
								<div className="flex gap-2 pt-1">
									{e.status === "offered" && e.offeredAppointmentId && (
										<Button size="sm" asChild>
											<Link href={`/my-space/appointments/${e.offeredAppointmentId}`}>
												{lang === "fr" ? "Voir le créneau" : "View slot"}
											</Link>
										</Button>
									)}
									<Button size="sm" variant="outline" onClick={() => handleLeave(e._id)}>
										<Trash2 className="h-3 w-3 mr-1" />
										{lang === "fr" ? "Quitter" : "Leave"}
									</Button>
								</div>
							)}
						</div>
					</FlatCard>
				);
			})}
		</div>
	);
}
