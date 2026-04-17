"use client";

/**
 * Formulaire partagé pour créer ou éditer une brique « Entête / Pied de page ».
 * Utilisé par `/config/templates/header-footer-blocks/new` et `/[blockId]`.
 */

import type { Id } from "@convex/_generated/dataModel";
import { Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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

export interface HeaderFooterFormValue {
	nameFr: string;
	descFr: string;
	applicableTemplateTypes: TemplateTypeLiteral[] | undefined;
	header: {
		logoStorageId?: Id<"_storage">;
		logoAlignment: "left" | "center" | "right";
		height: number;
		textContent: string; // contenu riche simplifié (texte brut pour v1)
	};
	footer: {
		height: number;
		textContent: string;
		showPageNumbers: boolean;
	};
	isDefault: boolean;
}

export function createDefaultHeaderFooterForm(): HeaderFooterFormValue {
	return {
		nameFr: "",
		descFr: "",
		applicableTemplateTypes: undefined,
		header: {
			logoAlignment: "left",
			height: 30,
			textContent: "République Gabonaise\nMinistère des Affaires Étrangères",
		},
		footer: {
			height: 15,
			textContent: "Document officiel — ne pas reproduire sans autorisation.",
			showPageNumbers: true,
		},
		isDefault: false,
	};
}

export interface HeaderFooterBlockFormProps {
	initial: HeaderFooterFormValue;
	submitLabel: string;
	onSubmit: (value: HeaderFooterFormValue) => Promise<void> | void;
	onDelete?: () => Promise<void> | void;
	submitting?: boolean;
}

export function HeaderFooterBlockForm({
	initial,
	submitLabel,
	onSubmit,
	onDelete,
	submitting,
}: HeaderFooterBlockFormProps) {
	const [form, setForm] = useState<HeaderFooterFormValue>(initial);

	function patch<K extends keyof HeaderFooterFormValue>(
		key: K,
		value: HeaderFooterFormValue[K],
	) {
		setForm((f) => ({ ...f, [key]: value }));
	}

	function patchHeader(partial: Partial<HeaderFooterFormValue["header"]>) {
		setForm((f) => ({ ...f, header: { ...f.header, ...partial } }));
	}

	function patchFooter(partial: Partial<HeaderFooterFormValue["footer"]>) {
		setForm((f) => ({ ...f, footer: { ...f.footer, ...partial } }));
	}

	function toggleType(code: TemplateTypeLiteral, checked: boolean) {
		const next = new Set(form.applicableTemplateTypes ?? []);
		if (checked) next.add(code);
		else next.delete(code);
		patch(
			"applicableTemplateTypes",
			next.size === 0 ? undefined : Array.from(next),
		);
	}

	return (
		<form
			className="flex flex-col gap-6"
			onSubmit={(e) => {
				e.preventDefault();
				onSubmit(form);
			}}
		>
			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-1">
					<Label htmlFor="hf-name">Nom de la brique</Label>
					<Input
						id="hf-name"
						value={form.nameFr}
						onChange={(e) => patch("nameFr", e.target.value)}
						placeholder="Entête Ambassade — A4 Portrait"
						required
					/>
				</div>
				<div className="flex flex-col gap-1">
					<Label htmlFor="hf-desc">Description</Label>
					<Input
						id="hf-desc"
						value={form.descFr}
						onChange={(e) => patch("descFr", e.target.value)}
						placeholder="Utilisé pour les attestations officielles"
					/>
				</div>
			</div>

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
							value={form.header.logoAlignment}
							onValueChange={(v) =>
								patchHeader({ logoAlignment: v as "left" | "center" | "right" })
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
							value={form.header.height}
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
						value={form.header.textContent}
						onChange={(e) => patchHeader({ textContent: e.target.value })}
						placeholder="République Gabonaise&#10;Ministère des Affaires Étrangères"
					/>
					<p className="text-xs text-muted-foreground">
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
						Bande inférieure de la page — mentions légales, pagination.
					</p>
				</div>
				<div className="grid gap-4 md:grid-cols-2">
					<div className="flex flex-col gap-1">
						<Label htmlFor="ft-height">Hauteur (mm)</Label>
						<Input
							id="ft-height"
							type="number"
							min={0}
							value={form.footer.height}
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
							checked={form.footer.showPageNumbers}
							onCheckedChange={(v) => patchFooter({ showPageNumbers: v })}
						/>
					</div>
				</div>
				<div className="flex flex-col gap-1">
					<Label htmlFor="ft-content">Contenu du pied</Label>
					<Textarea
						id="ft-content"
						rows={3}
						value={form.footer.textContent}
						onChange={(e) => patchFooter({ textContent: e.target.value })}
						placeholder="Document officiel — ne pas reproduire sans autorisation."
					/>
				</div>
			</section>

			{/* Applicabilité par type de document */}
			<section className="flex flex-col gap-3 rounded-md border p-4">
				<div>
					<h3 className="font-medium">Applicable à quel type de document ?</h3>
					<p className="text-sm text-muted-foreground">
						Si aucun type n'est coché, cette brique sera proposée pour tous
						les types.
					</p>
				</div>
				<div className="grid gap-2 sm:grid-cols-2">
					{TEMPLATE_TYPES.map((tp) => {
						const checked = form.applicableTemplateTypes?.includes(tp.value) ?? false;
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

			{/* Flag défaut */}
			<div className="flex items-center justify-between gap-3 rounded-md border p-4">
				<div>
					<div className="font-medium">Brique par défaut</div>
					<div className="text-sm text-muted-foreground">
						Sélectionnée automatiquement dans le wizard si aucune n'est
						choisie. Un seul bloc par défaut autorisé à la fois.
					</div>
				</div>
				<Switch
					checked={form.isDefault}
					onCheckedChange={(v) => patch("isDefault", v)}
				/>
			</div>

			<div className="flex items-center justify-between">
				{onDelete ? (
					<Button
						type="button"
						variant="outline"
						className="text-destructive"
						onClick={() => onDelete()}
					>
						<Trash2 className="mr-2 h-4 w-4" />
						Archiver cette brique
					</Button>
				) : (
					<span />
				)}
				<Button type="submit" disabled={submitting}>
					<Save className="mr-2 h-4 w-4" />
					{submitting ? "Enregistrement…" : submitLabel}
				</Button>
			</div>
		</form>
	);
}

/**
 * Convertit un bloc de texte multi-lignes en document Tiptap minimal.
 * Suffisant pour les entêtes/pieds textuels en v1. Une version riche
 * avec éditeur inline viendra quand on ajoutera la gestion des logos.
 */
export function textToTiptap(text: string): {
	type: "doc";
	content: Array<{ type: "paragraph"; content?: Array<{ type: "text"; text: string }> }>;
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

/** Extrait le texte brut d'un document Tiptap pour réhydrater le textarea. */
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
