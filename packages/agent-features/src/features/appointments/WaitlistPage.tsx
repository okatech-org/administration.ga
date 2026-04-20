"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Link } from "@workspace/routing";
import { ArrowLeft, Hourglass, Trash2, UserCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useOrg } from "../../shell/org-provider";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { FlatCard } from "../../components/my-space/flat-card";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";

const STATUS_BADGE: Record<string, { fr: string; en: string; tone: string }> = {
	waiting: { fr: "En attente", en: "Waiting", tone: "bg-amber-500/10 text-amber-700" },
	offered: { fr: "Proposé", en: "Offered", tone: "bg-emerald-500/10 text-emerald-700" },
	claimed: { fr: "Confirmé", en: "Claimed", tone: "bg-blue-500/10 text-blue-700" },
	expired: { fr: "Expiré", en: "Expired", tone: "bg-muted text-muted-foreground" },
	cancelled: { fr: "Annulé", en: "Cancelled", tone: "bg-muted text-muted-foreground" },
};

export default function AgentWaitlistPage() {
	const { i18n } = useTranslation();
	const lang = i18n.language === "fr" ? "fr" : "en";
	const { activeOrgId } = useOrg();
	const orgId = activeOrgId ?? undefined;

	const { data: entries, isPending } = useAuthenticatedConvexQuery(
		api.functions.appointmentWaitlist.listOrgWaitlist,
		orgId ? { orgId } : "skip",
	);

	const { mutateAsync: removeEntry } = useConvexMutationQuery(
		api.functions.appointmentWaitlist.leaveWaitlist,
	);

	const handleRemove = async (entryId: Id<"appointmentWaitlist">) => {
		try {
			await removeEntry({ entryId });
			toast.success(lang === "fr" ? "Entrée supprimée" : "Entry removed");
		} catch {
			toast.error(lang === "fr" ? "Erreur" : "Error");
		}
	};

	const waiting = (entries ?? []).filter((e: any) => e.status === "waiting");
	const offered = (entries ?? []).filter((e: any) => e.status === "offered");
	const others = (entries ?? []).filter(
		(e: any) => e.status !== "waiting" && e.status !== "offered",
	);

	return (
		<div className="flex flex-col gap-4 p-3 md:p-4">
			<div>
				<Button variant="ghost" size="sm" asChild>
					<Link href="/appointments">
						<ArrowLeft className="mr-2 h-4 w-4" />
						{lang === "fr" ? "Retour aux rendez-vous" : "Back to appointments"}
					</Link>
				</Button>
			</div>

			<div className="flex items-center gap-2">
				<Hourglass className="h-5 w-5" />
				<h1 className="text-lg font-semibold">
					{lang === "fr" ? "Liste d'attente" : "Waitlist"}
				</h1>
			</div>

			{isPending ? (
				<FlatCard>
					<div className="p-6 text-sm text-muted-foreground">
						{lang === "fr" ? "Chargement…" : "Loading…"}
					</div>
				</FlatCard>
			) : !entries || entries.length === 0 ? (
				<FlatCard>
					<div className="p-8 text-center text-sm text-muted-foreground">
						{lang === "fr"
							? "Aucune demande en liste d'attente."
							: "No waitlist entries."}
					</div>
				</FlatCard>
			) : (
				<>
					{offered.length > 0 && (
						<Section
							title={lang === "fr" ? "Offres en cours" : "Active offers"}
							entries={offered}
							lang={lang}
							onRemove={handleRemove}
						/>
					)}
					{waiting.length > 0 && (
						<Section
							title={lang === "fr" ? "En attente (FIFO)" : "Waiting (FIFO)"}
							entries={waiting}
							lang={lang}
							onRemove={handleRemove}
						/>
					)}
					{others.length > 0 && (
						<Section
							title={lang === "fr" ? "Historique" : "History"}
							entries={others}
							lang={lang}
							onRemove={handleRemove}
							readOnly
						/>
					)}
				</>
			)}
		</div>
	);
}

function Section({
	title,
	entries,
	lang,
	onRemove,
	readOnly,
}: {
	title: string;
	entries: any[];
	lang: "fr" | "en";
	onRemove: (id: Id<"appointmentWaitlist">) => void;
	readOnly?: boolean;
}) {
	return (
		<section className="space-y-2">
			<h2 className="text-sm font-medium text-muted-foreground">
				{title} · {entries.length}
			</h2>
			<FlatCard>
				<ul className="divide-y divide-border/40">
					{entries.map((e, i) => {
						const badge = STATUS_BADGE[e.status] ?? STATUS_BADGE.waiting;
						return (
							<li key={e._id} className="flex items-center gap-3 p-3">
								<div className="shrink-0 text-xs text-muted-foreground w-6 text-right tabular-nums">
									{i + 1}
								</div>
								<div className="flex-1 min-w-0">
									<div className="font-medium truncate">{e.attendeeName}</div>
									<div className="text-xs text-muted-foreground truncate">
										{e.serviceName} · {e.earliestDate} → {e.latestDate}
									</div>
									{e.notes && (
										<div className="text-xs text-muted-foreground italic truncate">
											{e.notes}
										</div>
									)}
								</div>
								<Badge className={`text-[10px] ${badge.tone}`}>
									{lang === "fr" ? badge.fr : badge.en}
								</Badge>
								{!readOnly && (
									<Button
										size="sm"
										variant="ghost"
										onClick={() => onRemove(e._id)}
										aria-label={lang === "fr" ? "Retirer" : "Remove"}
									>
										<Trash2 className="h-3.5 w-3.5" />
									</Button>
								)}
								{e.status === "offered" && e.offeredAppointmentId && (
									<Button size="sm" variant="outline" asChild>
										<Link href={`/appointments/${e.offeredAppointmentId}`}>
											<UserCheck className="h-3.5 w-3.5 mr-1" />
											{lang === "fr" ? "RDV" : "Appt"}
										</Link>
									</Button>
								)}
							</li>
						);
					})}
				</ul>
			</FlatCard>
		</section>
	);
}
