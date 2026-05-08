"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ArrowLeft, Download, Sparkles } from "lucide-react";
import { Link } from "@workspace/routing";

import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { SafeMarkdown } from "@workspace/chat/safe-markdown";

import { FlatCard } from "../../components/my-space/flat-card";
import { useOrg } from "../../shell/org-provider";

const CLASSIFICATION_LABELS: Record<string, string> = {
	internal: "Interne",
	restricted: "Restreint",
	secret: "Secret",
	top_secret: "Très Secret",
};

interface Props {
	briefingId: Id<"intelligenceBriefings">;
}

export default function IntelligenceBriefingDetail({ briefingId }: Props) {
	const { activeOrgId } = useOrg();

	const { data: briefing, isLoading } = useAuthenticatedConvexQuery(
		api.functions.intelligenceBriefings.getBriefing,
		activeOrgId ? { orgId: activeOrgId, briefingId } : "skip",
	);

	if (!activeOrgId) return null;

	if (isLoading) {
		return (
			<div className="mx-auto max-w-3xl p-6">
				<Skeleton className="h-8 w-1/2 mb-4" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	if (!briefing) {
		return (
			<div className="mx-auto max-w-3xl p-6 text-sm text-muted-foreground">
				Briefing introuvable.
			</div>
		);
	}

	const handleDownload = () => {
		const blob = new Blob([briefing.content], {
			type: "text/markdown;charset=utf-8",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${briefing.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
			<div className="flex items-center justify-between gap-2">
				<Button variant="ghost" size="sm" asChild>
					<Link href="/agence/briefings">
						<ArrowLeft className="size-4" />
						Retour
					</Link>
				</Button>
				<Button variant="outline" size="sm" onClick={handleDownload}>
					<Download className="size-3.5" />
					Markdown
				</Button>
			</div>

			<FlatCard className="flex flex-col gap-3 p-5">
				<div className="flex flex-wrap items-center gap-2">
					<Sparkles className="size-4 text-amber-500" />
					<Badge variant="outline" className="text-[10px]">
						{CLASSIFICATION_LABELS[briefing.classification] ??
							briefing.classification}
					</Badge>
					<span className="text-xs text-muted-foreground">{briefing.model}</span>
					<span className="text-xs text-muted-foreground">
						· {new Date(briefing.generatedAt).toLocaleString("fr-FR")}
					</span>
					{briefing.costMicroCents != null && (
						<span className="text-xs text-muted-foreground">
							· coût {(briefing.costMicroCents / 1_000_000).toFixed(4)} ¢
						</span>
					)}
				</div>
				<h1 className="text-xl font-semibold leading-tight">{briefing.title}</h1>
			</FlatCard>

			<FlatCard className="prose prose-sm dark:prose-invert max-w-none p-5">
				<SafeMarkdown>{briefing.content}</SafeMarkdown>
			</FlatCard>
		</div>
	);
}
