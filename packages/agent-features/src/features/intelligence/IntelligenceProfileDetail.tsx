"use client";

import { api } from "@convex/_generated/api";
import { ArrowLeft, Info, Loader2 } from "lucide-react";
import { Link } from "@workspace/routing";

import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { Button } from "@workspace/ui/components/button";

import { FlatCard } from "../../components/my-space/flat-card";
import { PageHeader } from "../../components/my-space/page-header";
import { useOrg } from "../../shell/org-provider";

import { AddToWatchlistButton } from "./AddToWatchlistButton";
import { IntelligenceBriefingButton } from "./IntelligenceBriefingButton";
import { IntelligenceLinksPanel } from "./IntelligenceLinksPanel";
import { IntelligenceNotesPanel } from "./IntelligenceNotesPanel";

type IntelTargetType = "profile" | "child_profile" | "diplomatic_target" | "agent";

const TYPE_LABELS: Record<IntelTargetType, string> = {
	profile: "Citoyen",
	child_profile: "Mineur",
	diplomatic_target: "Contact diplomatique",
	agent: "Agent",
};

interface Props {
	targetType: IntelTargetType;
	targetId: string;
}

function describeTarget(targetType: IntelTargetType, target: any): {
	title: string;
	subtitle?: string;
} {
	if (!target) return { title: "Cible inconnue" };

	switch (targetType) {
		case "profile": {
			const fn = target.identity?.firstName ?? "";
			const ln = target.identity?.lastName ?? "";
			return {
				title: `${fn} ${ln}`.trim() || "(sans nom)",
				subtitle: [target.matricule, target.countryOfResidence]
					.filter(Boolean)
					.join(" · "),
			};
		}
		case "child_profile":
			return {
				title:
					`${target.firstName ?? ""} ${target.lastName ?? ""}`.trim() ||
					"(sans nom)",
			};
		case "diplomatic_target":
			return {
				title: target.name ?? "(sans nom)",
				subtitle: [target.sector, target.country].filter(Boolean).join(" · "),
			};
		case "agent":
			return {
				title:
					`${target.firstName ?? ""} ${target.lastName ?? ""}`.trim() ||
					target.email ||
					"(agent)",
				subtitle: target.email,
			};
	}
}

export default function IntelligenceProfileDetail({ targetType, targetId }: Props) {
	const { activeOrgId } = useOrg();

	const { data, isPending } = useAuthenticatedConvexQuery(
		api.functions.intelligence.getProfileWithNotes,
		activeOrgId ? { orgId: activeOrgId, targetType, targetId } : "skip",
	);

	const { title, subtitle } = describeTarget(targetType, data?.target);

	return (
		<div className="flex flex-1 flex-col gap-4 p-3 md:p-4 max-w-4xl mx-auto w-full">
			<div className="flex items-center gap-2 flex-wrap">
				<Link href="/intelligence/profiles">
					<Button variant="ghost" size="sm">
						<ArrowLeft className="h-4 w-4 mr-1" /> Retour
					</Button>
				</Link>
				<div className="ml-auto flex items-center gap-2">
					<AddToWatchlistButton targetType={targetType} targetId={targetId} />
					<IntelligenceBriefingButton targetType={targetType} targetId={targetId} />
				</div>
			</div>

			<PageHeader
				icon={<Info className="h-5 w-5 text-rose-500" />}
				title={title}
				subtitle={`${TYPE_LABELS[targetType]}${subtitle ? ` · ${subtitle}` : ""}`}
			/>

			{targetType === "child_profile" && (
				<FlatCard className="p-3 text-xs border-l-4 border-l-amber-500">
					<p className="font-medium text-amber-700 dark:text-amber-400">
						Profil mineur — usage encadré
					</p>
					<p className="text-muted-foreground mt-1">
						Toute consultation et annotation de ce profil est tracée dans
						l'audit log. Conformité au cadre éthique requise.
					</p>
				</FlatCard>
			)}

			{isPending ? (
				<div className="flex items-center justify-center py-12 text-muted-foreground">
					<Loader2 className="h-5 w-5 animate-spin mr-2" />
					Chargement…
				</div>
			) : !data?.target ? (
				<FlatCard className="p-8 text-center text-sm text-muted-foreground">
					Cible introuvable.
				</FlatCard>
			) : (
				<>
					<IntelligenceNotesPanel targetType={targetType} targetId={targetId} />
					<IntelligenceLinksPanel targetType={targetType} targetId={targetId} />
				</>
			)}
		</div>
	);
}
