"use client";

import { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "@convex/_generated/api";
import { SafeMarkdown } from "@workspace/chat/safe-markdown";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/dashboard-v2/icon";
import { Sparkles, RefreshCw, AlertTriangle } from "lucide-react";

type State =
	| { phase: "idle" }
	| { phase: "loading" }
	| { phase: "ready"; markdown: string; generatedAt: number }
	| { phase: "error"; message: string };

/**
 * Drawer « Synthèse IA » du Centre de Commandement.
 *
 * Appelle l'action Convex `ai.dashboardAI.generateDashboardSummary` à la
 * première ouverture, cache le résultat pour les ouvertures suivantes,
 * propose un bouton « Régénérer » pour relancer.
 *
 * Le markdown est rendu via `<SafeMarkdown>` (sanitization stricte).
 */
export function AiSummarySheet({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { t, i18n } = useTranslation();
	const generate = useAction(api.ai.dashboardAI.generateDashboardSummary);
	const [state, setState] = useState<State>({ phase: "idle" });

	const run = async () => {
		setState({ phase: "loading" });
		try {
			const res = await generate({});
			setState({
				phase: "ready",
				markdown: res.markdown,
				generatedAt: res.generatedAt,
			});
		} catch (e: unknown) {
			const message =
				e instanceof Error ? e.message : String(e ?? "Erreur inconnue");
			setState({ phase: "error", message });
		}
	};

	// Première ouverture → on lance la génération. Si on ferme puis rouvre,
	// le résultat précédent reste affiché (rechargement à la demande via
	// le bouton « Régénérer »).
	useEffect(() => {
		if (open && state.phase === "idle") void run();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const formattedDate =
		state.phase === "ready"
			? new Date(state.generatedAt).toLocaleString(
					i18n.language?.startsWith("en") ? "en-US" : "fr-FR",
					{
						day: "numeric",
						month: "long",
						year: "numeric",
						hour: "2-digit",
						minute: "2-digit",
					},
				)
			: null;

	return (
		<BottomSheet
			open={open}
			onOpenChange={onOpenChange}
			title={t("superadmin.dashboard.actions.aiSummary")}
			icon={
				<span
					style={{
						width: 28,
						height: 28,
						borderRadius: 8,
						background: "var(--purple-v2-tint)",
						color: "var(--purple-v2)",
						display: "grid",
						placeItems: "center",
					}}
				>
					<Sparkles className="h-4 w-4" />
				</span>
			}
			maxHeight="80vh"
			maxWidthClass="max-w-3xl"
			footer={
				<div className="flex items-center justify-between gap-3">
					<span className="text-xs text-muted-foreground">
						{formattedDate ?? t("superadmin.dashboard.aiSummary.poweredBy")}
					</span>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => void run()}
						disabled={state.phase === "loading"}
					>
						<RefreshCw className="mr-2 h-3.5 w-3.5" />
						{state.phase === "loading"
							? t("superadmin.dashboard.aiSummary.generating")
							: state.phase === "ready"
								? t("superadmin.dashboard.aiSummary.regenerate")
								: t("superadmin.dashboard.aiSummary.generate")}
					</Button>
				</div>
			}
		>
			<div className="px-5 py-5">
				{state.phase === "loading" || state.phase === "idle" ? (
					<div className="flex flex-col items-center justify-center gap-3 py-12">
						<Icon name="Loader" size={28} className="animate-spin opacity-60" />
						<p className="text-sm text-muted-foreground">
							{t("superadmin.dashboard.aiSummary.generating")}…
						</p>
					</div>
				) : state.phase === "error" ? (
					<div className="rounded-xl border border-[color:var(--danger-v2-tint)] bg-[color:var(--danger-v2-soft)] p-4">
						<div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--danger-v2)]">
							<AlertTriangle className="h-4 w-4" />
							{t("superadmin.dashboard.aiSummary.errorTitle")}
						</div>
						<p className="mt-2 text-sm text-muted-foreground">
							{state.message}
						</p>
					</div>
				) : (
					<article className="prose prose-sm dark:prose-invert max-w-none [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_ul]:my-2 [&_li]:my-0.5">
						<SafeMarkdown>{state.markdown}</SafeMarkdown>
					</article>
				)}
			</div>
		</BottomSheet>
	);
}
