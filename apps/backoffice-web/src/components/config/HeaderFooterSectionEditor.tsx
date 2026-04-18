"use client";

/**
 * Éditeur contrôlé de la facette « Entête & pied » d'un modèle.
 *
 * Cet éditeur ne gère PAS l'identité de la facette (nom, description,
 * flag par défaut) — la facette appartient à son modèle parent et suit
 * son cycle de vie. Le parent passe `value` et reçoit les mises à jour
 * via `onChange`.
 */

import type { Id } from "@convex/_generated/dataModel";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export type TemplateTypeLiteral =
	| "certificate"
	| "attestation"
	| "receipt"
	| "letter"
	| "custom";

const TEMPLATE_TYPES: { value: TemplateTypeLiteral; label: string }[] = [
	{ value: "certificate", label: "Certificat" },
	{ value: "attestation", label: "Attestation" },
	{ value: "receipt", label: "Récépissé" },
	{ value: "letter", label: "Lettre" },
	{ value: "custom", label: "Personnalisé" },
];

export interface HeaderFooterSectionValue {
	/** Types de document auxquels s'applique cette entête. Vide = tous. */
	applicableTemplateTypes?: TemplateTypeLiteral[];
	header: {
		logoStorageId?: Id<"_storage">;
		logoAlignment: "left" | "center" | "right";
		/** Hauteur de la bande d'entête en mm. */
		height: number;
		/** Police appliquée au nom de la représentation (défaut : Optima). */
		fontFamily?: string;
		/** Contenu en texte brut multi-lignes (converti en Tiptap à la sauvegarde). */
		textContent: string;
	};
	footer: {
		height: number;
		textContent: string;
		showPageNumbers: boolean;
	};
}

/** Valeur par défaut pour un nouveau template. */
export function createDefaultHeaderFooterSection(): HeaderFooterSectionValue {
	return {
		applicableTemplateTypes: undefined,
		header: {
			logoAlignment: "left",
			height: 30,
			textContent:
				"RÉPUBLIQUE GABONAISE\nUnion — Travail — Justice\nMinistère des Affaires Étrangères",
		},
		footer: {
			height: 15,
			textContent: "Document officiel — ne pas reproduire sans autorisation.",
			showPageNumbers: true,
		},
	};
}

export interface HeaderFooterSectionEditorProps {
	value: HeaderFooterSectionValue;
	onChange: (next: HeaderFooterSectionValue) => void;
}

export function HeaderFooterSectionEditor({
	value,
	onChange,
}: HeaderFooterSectionEditorProps) {
	const { t } = useTranslation();

	function patchHeader(partial: Partial<HeaderFooterSectionValue["header"]>) {
		onChange({ ...value, header: { ...value.header, ...partial } });
	}
	function patchFooter(partial: Partial<HeaderFooterSectionValue["footer"]>) {
		onChange({ ...value, footer: { ...value.footer, ...partial } });
	}
	function toggleType(code: TemplateTypeLiteral, checked: boolean) {
		const next = new Set(value.applicableTemplateTypes ?? []);
		if (checked) next.add(code);
		else next.delete(code);
		onChange({
			...value,
			applicableTemplateTypes:
				next.size === 0 ? undefined : Array.from(next),
		});
	}

	return (
		<div className="flex flex-col gap-6">
			{/* Entête */}
			<section className="flex flex-col gap-4 rounded-md border p-4">
				<div>
					<h3 className="font-medium">Entête</h3>
					<p className="text-sm text-muted-foreground">
						Bande supérieure de la page : logo + titre institutionnel.
					</p>
				</div>
				<div className="grid gap-4 md:grid-cols-2">
					<div className="flex flex-col gap-1">
						<Label htmlFor="hf-align">Alignement du logo</Label>
						<Select
							value={value.header.logoAlignment}
							onValueChange={(v) =>
								patchHeader({
									logoAlignment: v as "left" | "center" | "right",
								})
							}
						>
							<SelectTrigger id="hf-align">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="left">Gauche</SelectItem>
								<SelectItem value="center">Centre</SelectItem>
								<SelectItem value="right">Droite</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="flex flex-col gap-1">
						<Label htmlFor="hf-height">Hauteur (mm)</Label>
						<Input
							id="hf-height"
							type="number"
							min={0}
							value={value.header.height}
							onChange={(e) =>
								patchHeader({ height: Number(e.target.value) || 0 })
							}
						/>
					</div>
				</div>
				<div className="flex flex-col gap-1">
					<Label htmlFor="hf-content">Contenu de l'entête</Label>
					<Textarea
						id="hf-content"
						rows={4}
						value={value.header.textContent}
						onChange={(e) => patchHeader({ textContent: e.target.value })}
						placeholder={t("templates.sections.headerFooter.contentPlaceholder") ?? ""}
					/>
					<p className="text-[0.7rem] text-muted-foreground">
						Une ligne par paragraphe. Le logo sera chargé depuis le module
						« Identité visuelle » (à venir).
					</p>
				</div>
			</section>

			{/* Pied de page */}
			<section className="flex flex-col gap-4 rounded-md border p-4">
				<div>
					<h3 className="font-medium">Pied de page</h3>
					<p className="text-sm text-muted-foreground">
						Bande inférieure — mentions légales et pagination.
					</p>
				</div>
				<div className="grid gap-4 md:grid-cols-2">
					<div className="flex flex-col gap-1">
						<Label htmlFor="ft-height">Hauteur (mm)</Label>
						<Input
							id="ft-height"
							type="number"
							min={0}
							value={value.footer.height}
							onChange={(e) =>
								patchFooter({ height: Number(e.target.value) || 0 })
							}
						/>
					</div>
					<div className="flex items-center justify-between gap-3 rounded-md border bg-background p-3">
						<Label htmlFor="ft-pages" className="cursor-pointer">
							Afficher la pagination
						</Label>
						<Switch
							id="ft-pages"
							checked={value.footer.showPageNumbers}
							onCheckedChange={(v) => patchFooter({ showPageNumbers: v })}
						/>
					</div>
				</div>
				<div className="flex flex-col gap-1">
					<Label htmlFor="ft-content">Contenu du pied</Label>
					<Textarea
						id="ft-content"
						rows={3}
						value={value.footer.textContent}
						onChange={(e) => patchFooter({ textContent: e.target.value })}
					/>
				</div>
			</section>

			{/* Applicabilité par type de document */}
			<section className="flex flex-col gap-3 rounded-md border p-4">
				<div>
					<h3 className="font-medium">Applicable à quel type de document ?</h3>
					<p className="text-sm text-muted-foreground">
						Information indicative — si aucun type n'est coché, cette entête
						est valable pour tous.
					</p>
				</div>
				<div className="grid gap-2 sm:grid-cols-2">
					{TEMPLATE_TYPES.map((tp) => {
						const checked =
							value.applicableTemplateTypes?.includes(tp.value) ?? false;
						return (
							<label
								key={tp.value}
								className="flex cursor-pointer items-center gap-2 rounded-md border bg-background p-2 hover:bg-muted/30"
							>
								<Checkbox
									checked={checked}
									onCheckedChange={(v) => toggleType(tp.value, v === true)}
								/>
								<span className="text-sm">{tp.label}</span>
							</label>
						);
					})}
				</div>
			</section>
		</div>
	);
}

// ============================================================================
// Sérialiseurs — convertissent le texte brut du formulaire en document Tiptap
// minimal pour persistance dans Convex.
// ============================================================================

export function textToTiptap(text: string): {
	type: "doc";
	content: Array<{
		type: "paragraph";
		content?: Array<{ type: "text"; text: string }>;
	}>;
} {
	const lines = text.split(/\r?\n/);
	return {
		type: "doc",
		content: lines.map((line) => ({
			type: "paragraph",
			content: line ? [{ type: "text", text: line }] : undefined,
		})),
	};
}

/** Extrait le texte brut d'un document Tiptap (réhydrate le textarea). */
export function tiptapToText(doc: unknown): string {
	if (!doc || typeof doc !== "object") return "";
	const maybe = doc as {
		content?: Array<{
			type?: string;
			content?: Array<{ type?: string; text?: string }>;
		}>;
	};
	if (!maybe.content) return "";
	return maybe.content
		.map((para) =>
			para.type === "paragraph" && para.content
				? para.content
						.filter((n) => n.type === "text")
						.map((n) => n.text ?? "")
						.join("")
				: "",
		)
		.join("\n");
}

/**
 * Sérialise la section vers la forme attendue par Convex
 * (`documentTemplates.headerFooter`). Le `logoStorageId` est conservé en
 * l'état — c'est la zone Identité visuelle qui le remplira plus tard.
 */
export function serializeHeaderFooterSection(value: HeaderFooterSectionValue) {
	return {
		header: {
			logoStorageId: value.header.logoStorageId,
			logoAlignment: value.header.logoAlignment,
			height: value.header.height,
			fontFamily: value.header.fontFamily,
			content: textToTiptap(value.header.textContent),
		},
		footer: {
			height: value.footer.height,
			showPageNumbers: value.footer.showPageNumbers,
			content: textToTiptap(value.footer.textContent),
		},
	};
}

/**
 * Recharge une facette `headerFooter` Convex vers le type formulaire, utile
 * quand on édite un template existant.
 */
export function deserializeHeaderFooterSection(
	raw:
		| {
				header: {
					logoStorageId?: Id<"_storage">;
					logoAlignment: "left" | "center" | "right";
					height?: number;
					fontFamily?: string;
					content: unknown;
				};
				footer: {
					height?: number;
					showPageNumbers?: boolean;
					content: unknown;
				};
		  }
		| undefined,
	applicableTemplateTypes?: TemplateTypeLiteral[],
): HeaderFooterSectionValue {
	if (!raw) return createDefaultHeaderFooterSection();
	return {
		applicableTemplateTypes,
		header: {
			logoStorageId: raw.header.logoStorageId,
			logoAlignment: raw.header.logoAlignment,
			height: raw.header.height ?? 30,
			fontFamily: raw.header.fontFamily,
			textContent: tiptapToText(raw.header.content),
		},
		footer: {
			height: raw.footer.height ?? 15,
			showPageNumbers: raw.footer.showPageNumbers ?? true,
			textContent: tiptapToText(raw.footer.content),
		},
	};
}
