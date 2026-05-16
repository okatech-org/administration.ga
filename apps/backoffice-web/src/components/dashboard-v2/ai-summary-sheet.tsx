"use client";

import { useEffect, useMemo, useState } from "react";
import { useAction } from "convex/react";
import { useTranslation } from "react-i18next";
import { Download, AlertTriangle, RefreshCw, Sparkles } from "lucide-react";
import { api } from "@convex/_generated/api";
import { SafeMarkdown } from "@workspace/chat/safe-markdown";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/dashboard-v2/icon";
import {
	downloadAiSummary,
	type AiSummaryPdfData,
} from "@/lib/ai-summary-pdf";

type State =
	| { phase: "idle" }
	| { phase: "loading" }
	| { phase: "ready"; markdown: string; generatedAt: number }
	| { phase: "error"; message: string };

/**
 * Drawer « Synthèse IA » du Centre de Commandement.
 *
 * Même UX que « Rapport du jour » : aperçu « feuille » (fond toujours
 * blanc, texte toujours sombre dans les deux modes), bouton de
 * téléchargement PDF en footer. Le markdown Gemini est rendu via
 * `<SafeMarkdown>` (sanitization XSS) et converti en React-PDF par
 * `ai-summary-pdf.tsx` au moment du téléchargement.
 *
 * Le résultat est mis en cache local : refermer/rouvrir le drawer
 * conserve la synthèse, un bouton « Régénérer » permet de relancer
 * Gemini explicitement.
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
	const [downloading, setDownloading] = useState(false);
	const locale = i18n.language?.startsWith("en") ? "en-US" : "fr-FR";

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

	useEffect(() => {
		if (open && state.phase === "idle") void run();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const dateInfo = useMemo(() => {
		if (state.phase !== "ready") return null;
		const d = new Date(state.generatedAt);
		return {
			date: d.toLocaleDateString(locale, {
				weekday: "long",
				day: "numeric",
				month: "long",
				year: "numeric",
			}),
			time: d.toLocaleTimeString(locale, {
				hour: "2-digit",
				minute: "2-digit",
			}),
		};
	}, [state, locale]);

	const handleDownload = async () => {
		if (state.phase !== "ready") return;
		setDownloading(true);
		try {
			const data: AiSummaryPdfData = {
				markdown: state.markdown,
				generatedAt: state.generatedAt,
				locale: i18n.language?.startsWith("en") ? "en" : "fr",
			};
			await downloadAiSummary(data);
		} finally {
			setDownloading(false);
		}
	};

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
						{state.phase === "ready"
							? t("superadmin.dashboard.aiSummary.poweredBy")
							: t("superadmin.dashboard.dailyReport.confidential")}
					</span>
					<div className="flex items-center gap-2">
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
						<Button
							type="button"
							size="sm"
							onClick={handleDownload}
							disabled={downloading || state.phase !== "ready"}
						>
							<Download className="mr-2 h-3.5 w-3.5" />
							{downloading
								? t("superadmin.dashboard.dailyReport.generating")
								: t("superadmin.dashboard.dailyReport.downloadPdf")}
						</Button>
					</div>
				</div>
			}
		>
			{/* Aperçu « feuille » — fond toujours blanc, texte toujours sombre,
			    même en dark mode (pareil que Rapport du jour). On lit toujours
			    sur du papier avant de télécharger le PDF. */}
			<div
				className="mx-auto my-6"
				style={{
					maxWidth: 640,
					background: "#ffffff",
					color: "#14130f",
					boxShadow: "0 8px 32px -12px rgba(0,0,0,0.25)",
					borderRadius: 4,
					padding: "32px 40px",
				}}
			>
				{/* Header */}
				<div
					style={{
						fontSize: 10,
						letterSpacing: 1.5,
						textTransform: "uppercase",
						color: "#6a665b",
						fontWeight: 600,
					}}
				>
					CENTRE DE COMMANDEMENT · CONSULAT.GA
				</div>
				<h2
					style={{
						fontSize: 24,
						fontWeight: 700,
						margin: "6px 0 4px",
						color: "#14130f",
						letterSpacing: "-0.02em",
					}}
				>
					{i18n.language?.startsWith("en")
						? "Strategic AI summary"
						: "Synthèse stratégique IA"}
				</h2>
				{dateInfo && (
					<div style={{ fontSize: 12, color: "#6a665b" }}>
						{dateInfo.date} · {dateInfo.time}
					</div>
				)}
				<div
					style={{
						display: "flex",
						width: 60,
						height: 3,
						marginTop: 12,
						overflow: "hidden",
					}}
				>
					<span style={{ flex: 1, background: "#0a8a3b" }} />
					<span style={{ flex: 1, background: "#f1c531" }} />
					<span style={{ flex: 1, background: "#0b4f9c" }} />
				</div>

				<hr
					style={{
						border: "none",
						borderBottom: "1px solid #e6e2d8",
						margin: "20px 0",
					}}
				/>

				{/* Corps */}
				{state.phase === "loading" || state.phase === "idle" ? (
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							justifyContent: "center",
							gap: 12,
							padding: "48px 0",
						}}
					>
						<Icon
							name="Loader"
							size={28}
							className="animate-spin"
							color="#6a665b"
						/>
						<p style={{ fontSize: 13, color: "#6a665b" }}>
							{t("superadmin.dashboard.aiSummary.generating")}…
						</p>
					</div>
				) : state.phase === "error" ? (
					<div
						style={{
							border: "1px solid #f5d5d1",
							background: "#fdf3f1",
							borderRadius: 8,
							padding: 16,
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: 8,
								fontSize: 13,
								fontWeight: 600,
								color: "#b3261e",
							}}
						>
							<AlertTriangle className="h-4 w-4" />
							{t("superadmin.dashboard.aiSummary.errorTitle")}
						</div>
						<p
							style={{ marginTop: 8, fontSize: 13, color: "#6a665b" }}
						>
							{state.message}
						</p>
					</div>
				) : (
					/* Markdown rendu avec styles "papier" — toujours noir sur blanc.
					   On échappe au prose Tailwind (qui s'adapte au dark mode) pour
					   garder un look constant. */
					<article
						style={{
							color: "#14130f",
							fontSize: 14,
							lineHeight: 1.65,
						}}
						className="ai-paper-prose"
					>
						<SafeMarkdown>{state.markdown}</SafeMarkdown>
					</article>
				)}

				{state.phase === "ready" && dateInfo && (
					<div
						style={{
							marginTop: 32,
							paddingTop: 12,
							borderTop: "1px solid #e6e2d8",
							fontSize: 10,
							color: "#9a9588",
							textAlign: "center",
						}}
					>
						{i18n.language?.startsWith("en")
							? `Generated by Gemini · ${dateInfo.date} at ${dateInfo.time}`
							: `Généré par Gemini · ${dateInfo.date} à ${dateInfo.time}`}
					</div>
				)}
			</div>

			{/* Styles ciblés pour le rendu markdown dans le contexte "papier". */}
			<style jsx>{`
				:global(.ai-paper-prose h1),
				:global(.ai-paper-prose h2) {
					font-size: 16px;
					font-weight: 700;
					margin: 18px 0 8px;
					color: #14130f;
					letter-spacing: -0.005em;
				}
				:global(.ai-paper-prose h3),
				:global(.ai-paper-prose h4) {
					font-size: 14px;
					font-weight: 600;
					margin: 14px 0 6px;
					color: #14130f;
				}
				:global(.ai-paper-prose p) {
					margin: 0 0 10px;
					color: #14130f;
				}
				:global(.ai-paper-prose ul),
				:global(.ai-paper-prose ol) {
					margin: 0 0 12px 18px;
					padding: 0;
				}
				:global(.ai-paper-prose li) {
					margin: 4px 0;
					color: #14130f;
				}
				:global(.ai-paper-prose li::marker) {
					color: #6f51c4;
				}
				:global(.ai-paper-prose strong) {
					font-weight: 700;
					color: #14130f;
				}
				:global(.ai-paper-prose em) {
					font-style: italic;
				}
				:global(.ai-paper-prose code) {
					background: #f3efe4;
					padding: 1px 5px;
					border-radius: 3px;
					font-size: 12.5px;
					color: #14130f;
				}
				:global(.ai-paper-prose a) {
					color: #0b4f9c;
					text-decoration: underline;
				}
			`}</style>
		</BottomSheet>
	);
}
