"use client";

import { api } from "@convex/_generated/api";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { FileText, Sparkles } from "lucide-react";
import { Link } from "@workspace/routing";

import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { FlatCard } from "../../components/my-space/flat-card";
import { PageHeader } from "../../components/my-space/page-header";
import { useOrg } from "../../shell/org-provider";

const CLASSIFICATION_LABELS: Record<string, string> = {
	internal: "Interne",
	restricted: "Restreint",
	secret: "Secret",
	top_secret: "Très Secret",
};

const TARGET_TYPE_LABELS: Record<string, string> = {
	profile: "Profil",
	child_profile: "Mineur",
	diplomatic_target: "Cible diplo.",
	agent: "Agent",
	case: "Dossier",
};

export default function IntelligenceBriefingsPage() {
	const { activeOrgId } = useOrg();

	const { data: briefings, isLoading } = useAuthenticatedConvexQuery(
		api.functions.intelligenceBriefings.listBriefings,
		activeOrgId ? { orgId: activeOrgId, limit: 100 } : "skip",
	);

	if (!activeOrgId) return null;

	return (
		<div className="flex flex-col gap-6 p-4 lg:p-6 overflow-y-auto citizen-scrollbar">
			<PageHeader
				icon={<Sparkles className="size-5" />}
				title="Briefings IA"
				subtitle="Synthèses générées par l'analyste IA depuis les profils et dossiers."
			/>

			{isLoading ? (
				<div className="flex flex-col gap-2">
					<Skeleton className="h-20 w-full" />
					<Skeleton className="h-20 w-full" />
				</div>
			) : !briefings || briefings.length === 0 ? (
				<FlatCard className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
					<FileText className="size-8 opacity-50" />
					<div>Aucun briefing pour l'instant.</div>
					<div className="text-xs">
						Lancez une génération depuis la fiche d'un profil ou d'un dossier.
					</div>
				</FlatCard>
			) : (
				<div className="flex flex-col gap-3">
					{briefings.map((b) => (
						<Link
							key={b._id}
							href={`/agence/briefings/${b._id}`}
							className="block"
						>
							<FlatCard className="flex flex-col gap-2 p-4 transition-colors hover:border-amber-500/40">
								<div className="flex flex-wrap items-center gap-2">
									<Badge variant="outline" className="text-[10px]">
										{TARGET_TYPE_LABELS[b.targetType] ?? b.targetType}
									</Badge>
									<Badge variant="outline" className="text-[10px]">
										{CLASSIFICATION_LABELS[b.classification] ?? b.classification}
									</Badge>
									<span className="text-xs text-muted-foreground">
										{formatDistanceToNow(b.generatedAt, {
											addSuffix: true,
											locale: fr,
										})}
									</span>
									<span className="text-xs text-muted-foreground">
										· {b.model}
									</span>
								</div>
								<div className="font-medium text-sm leading-tight">
									{b.title}
								</div>
								<div className="line-clamp-2 text-xs text-muted-foreground">
									{stripMarkdown(b.content)}
								</div>
							</FlatCard>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}

function stripMarkdown(s: string): string {
	return s
		.replace(/^>.*$/gm, "")
		.replace(/^#{1,6}\s+/gm, "")
		.replace(/\*\*/g, "")
		.replace(/_/g, "")
		.replace(/\n+/g, " ")
		.trim()
		.slice(0, 220);
}
