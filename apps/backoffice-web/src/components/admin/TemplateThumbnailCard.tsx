"use client";

/**
 * Vignette d'un modèle de document affichée en format A4 miniature.
 *
 * Réutilisée par :
 *   - la bibliothèque globale `/config/templates`
 *   - le volet « Modèles » d'une représentation `/reps/[orgId]` (onglet templates)
 *
 * S'appuie sur `DocumentSheet` (partagé `@workspace/ui`) qui rend la feuille
 * A4 à dimensions natives puis applique un `transform: scale()` dynamique.
 * Les proportions sont *exactement* celles du document imprimé.
 */

import type { Id } from "@convex/_generated/dataModel";
import {
	DocumentSheet,
	DocumentSheetBody,
	DocumentSheetFooter,
	DocumentSheetHeader,
	DocumentSheetPage,
} from "@workspace/ui/components/document-sheet";
import { Globe, type LucideIcon, Sparkles, Target, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export interface TemplateThumbnailData {
	_id: Id<"documentTemplates">;
	name: Record<string, string>;
	description?: Record<string, string>;
	templateType: string;
	version?: number;
	updatedAt?: number;
	orientation?: "portrait" | "landscape";
	contentHtml?: string;
	logoUrl?: string | null;
	headerFooter?: {
		header: { content: unknown };
		footer: { content: unknown };
	};
}

export interface TemplateThumbnailCardProps {
	template: TemplateThumbnailData;
	locale?: string;
	onOpen: () => void;
	/** Affiche un bouton corbeille en haut-droite (au hover). */
	onDelete?: () => void;
	/** Badge « Auto » affiché en haut-droite si attribution implicite. */
	autoBadge?: boolean;
	/** Badge personnalisé (ex. « Attribué ») — rendu sous le type en bas-gauche. */
	extraBadge?: ReactNode;
	/** Badge d'applicabilité en haut-gauche de la feuille A4. */
	applicabilityBadge?: "all" | "specific";
	/** Badge sous-dossier en bas-droite de la feuille A4. */
	subfolderBadge?: { label: string; icon: LucideIcon };
}

/** Extrait les lignes textuelles d'un document Tiptap pour l'aperçu. */
function tiptapToLines(doc: unknown): string[] {
	if (!doc || typeof doc !== "object") return [];
	const maybe = doc as {
		content?: Array<{
			type?: string;
			content?: Array<{ type?: string; text?: string }>;
		}>;
	};
	if (!maybe.content) return [];
	return maybe.content
		.map((para) =>
			para.type === "paragraph" && para.content
				? para.content
						.filter((n) => n.type === "text")
						.map((n) => n.text ?? "")
						.join("")
				: "",
		)
		.filter((line) => line.length > 0);
}

export function TemplateThumbnailCard({
	template,
	locale,
	onOpen,
	onDelete,
	autoBadge,
	extraBadge,
	applicabilityBadge,
	subfolderBadge,
}: TemplateThumbnailCardProps) {
	const { t } = useTranslation();
	const title =
		template.name.fr ?? template.name.en ?? t("templates.common.untitled");
	const desc = template.description?.fr ?? template.description?.en;
	const dateLocale = locale?.startsWith("fr") ? "fr-FR" : "en-US";

	const headerLines = tiptapToLines(template.headerFooter?.header.content);
	const footerLines = tiptapToLines(template.headerFooter?.footer.content);
	const bodyHtml = template.contentHtml?.trim() ?? "";

	const overlays = (
		<>
			{applicabilityBadge ? (
				<div className="absolute left-2 top-2">
					<span
						className="inline-flex items-center gap-1 rounded bg-white/90 px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-neutral-700 shadow-sm"
						title={
							applicabilityBadge === "all"
								? "Accessible à toutes les représentations"
								: "Accessible à certains types d'organisation"
						}
					>
						{applicabilityBadge === "all" ? (
							<Globe className="h-2.5 w-2.5" />
						) : (
							<Target className="h-2.5 w-2.5" />
						)}
						{applicabilityBadge === "all" ? "Toutes" : "Ciblée"}
					</span>
				</div>
			) : null}

			<div className="absolute right-2 top-2 flex items-center gap-1">
				{autoBadge ? (
					<span className="inline-flex items-center gap-1 rounded bg-foreground/10 px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-foreground shadow-sm">
						<Sparkles className="h-2.5 w-2.5" />
						Auto
					</span>
				) : null}
				{onDelete ? (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onDelete();
						}}
						className="flex h-7 w-7 items-center justify-center rounded-md border border-destructive/30 bg-white/90 text-destructive opacity-0 shadow-sm transition group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
						aria-label={`Supprimer le modèle ${title}`}
						title="Supprimer"
					>
						<Trash2 className="h-3.5 w-3.5" />
					</button>
				) : null}
			</div>

			<div className="absolute bottom-2 left-2 flex flex-col items-start gap-1">
				<span className="rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white">
					{t(`templates.type.${template.templateType}`, template.templateType)}
				</span>
				{extraBadge}
			</div>

			{subfolderBadge ? (
				<div className="absolute bottom-2 right-2">
					<span
						className="inline-flex items-center gap-1 rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-neutral-700 shadow-sm"
						title={subfolderBadge.label}
					>
						<subfolderBadge.icon className="h-2.5 w-2.5" />
						{subfolderBadge.label}
					</span>
				</div>
			) : null}
		</>
	);

	return (
		<div className="group flex flex-col gap-3">
			<DocumentSheet
				orientation={template.orientation ?? "portrait"}
				onClick={onOpen}
				overlays={overlays}
				ariaLabel={`Ouvrir le modèle ${title}`}
			>
				<DocumentSheetPage>
					<DocumentSheetHeader
						logoUrl={template.logoUrl}
						lines={headerLines}
					/>
					<DocumentSheetBody
						html={bodyHtml}
						emptyLabel="Aperçu vide — cliquez pour rédiger le contenu"
					/>
					<DocumentSheetFooter lines={footerLines} />
				</DocumentSheetPage>
			</DocumentSheet>

			{/* Métadonnées */}
			<div className="flex flex-col gap-0.5 px-1">
				<div className="truncate font-medium" title={title}>
					{title}
				</div>
				{desc ? (
					<div className="truncate text-sm text-muted-foreground" title={desc}>
						{desc}
					</div>
				) : null}
				<div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
					<span>v{template.version ?? 1}</span>
					{template.updatedAt ? (
						<span>
							·{" "}
							{t("templates.list.row.updatedOn", {
								date: new Date(template.updatedAt).toLocaleDateString(
									dateLocale,
								),
							})}
						</span>
					) : null}
				</div>
			</div>
		</div>
	);
}
