"use client";

/**
 * Formulaire partagé pour créer ou éditer une brique « Typographie ».
 */

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

type Alignment = "left" | "center" | "right" | "justify";
type HeadingLevel = "h1" | "h2" | "h3";

interface HeadingStyle {
	fontSize: number;
	bold: boolean;
	uppercase: boolean;
	spacingBefore: number;
	spacingAfter: number;
	alignment: Alignment;
}

export interface TypographyFormValue {
	nameFr: string;
	descFr: string;
	fontFamily: string;
	fontSizeBase: number;
	lineHeight: number;
	defaultAlignment: Alignment;
	headingStyles: Record<HeadingLevel, HeadingStyle>;
	paragraphSpacingBefore: number;
	paragraphSpacingAfter: number;
	paragraphFirstLineIndent: number;
	pageBreakBefore: HeadingLevel[];
	widowOrphanControl: boolean;
	keepHeadingsWithNext: boolean;
	isDefault: boolean;
}

const FONT_FAMILIES = [
	"Times New Roman, Times, serif",
	"Garamond, serif",
	"Georgia, serif",
	"Arial, sans-serif",
	"Helvetica, Arial, sans-serif",
	"Calibri, sans-serif",
	"Noto Serif, serif",
] as const;

export function createDefaultTypographyForm(): TypographyFormValue {
	return {
		nameFr: "",
		descFr: "",
		fontFamily: "Times New Roman, Times, serif",
		fontSizeBase: 11,
		lineHeight: 1.4,
		defaultAlignment: "justify",
		headingStyles: {
			h1: {
				fontSize: 16,
				bold: true,
				uppercase: true,
				spacingBefore: 0,
				spacingAfter: 6,
				alignment: "center",
			},
			h2: {
				fontSize: 14,
				bold: true,
				uppercase: false,
				spacingBefore: 6,
				spacingAfter: 4,
				alignment: "left",
			},
			h3: {
				fontSize: 12,
				bold: true,
				uppercase: false,
				spacingBefore: 4,
				spacingAfter: 2,
				alignment: "left",
			},
		},
		paragraphSpacingBefore: 0,
		paragraphSpacingAfter: 3,
		paragraphFirstLineIndent: 0,
		pageBreakBefore: [],
		widowOrphanControl: true,
		keepHeadingsWithNext: true,
		isDefault: false,
	};
}

export interface TypographyBlockFormProps {
	initial: TypographyFormValue;
	submitLabel: string;
	submitting?: boolean;
	onSubmit: (value: TypographyFormValue) => Promise<void> | void;
	onDelete?: () => Promise<void> | void;
}

export function TypographyBlockForm({
	initial,
	submitLabel,
	submitting,
	onSubmit,
	onDelete,
}: TypographyBlockFormProps) {
	const [form, setForm] = useState<TypographyFormValue>(initial);

	function patch<K extends keyof TypographyFormValue>(
		key: K,
		value: TypographyFormValue[K],
	) {
		setForm((f) => ({ ...f, [key]: value }));
	}

	function patchHeading(level: HeadingLevel, partial: Partial<HeadingStyle>) {
		setForm((f) => ({
			...f,
			headingStyles: {
				...f.headingStyles,
				[level]: { ...f.headingStyles[level], ...partial },
			},
		}));
	}

	function toggleBreak(level: HeadingLevel, checked: boolean) {
		const set = new Set(form.pageBreakBefore);
		if (checked) set.add(level);
		else set.delete(level);
		patch("pageBreakBefore", Array.from(set));
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
					<Label htmlFor="typo-name">Nom de la brique</Label>
					<Input
						id="typo-name"
						value={form.nameFr}
						onChange={(e) => patch("nameFr", e.target.value)}
						placeholder="Corps officiel — Times 11 pt justifié"
						required
					/>
				</div>
				<div className="flex flex-col gap-1">
					<Label htmlFor="typo-desc">Description</Label>
					<Input
						id="typo-desc"
						value={form.descFr}
						onChange={(e) => patch("descFr", e.target.value)}
						placeholder="Typographie standard consulaire"
					/>
				</div>
			</div>

			<section className="flex flex-col gap-4 rounded-md border p-4">
				<h3 className="font-medium">Corps de texte</h3>
				<div className="grid gap-4 md:grid-cols-3">
					<div className="flex flex-col gap-1">
						<Label htmlFor="typo-family">Police</Label>
						<Select
							value={form.fontFamily}
							onValueChange={(v) => patch("fontFamily", v)}
						>
							<SelectTrigger id="typo-family">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{FONT_FAMILIES.map((f) => (
									<SelectItem key={f} value={f}>
										{f.split(",")[0]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="flex flex-col gap-1">
						<Label htmlFor="typo-size">Taille (pt)</Label>
						<Input
							id="typo-size"
							type="number"
							min={6}
							max={24}
							step={0.5}
							value={form.fontSizeBase}
							onChange={(e) =>
								patch("fontSizeBase", Number(e.target.value) || 11)
							}
						/>
					</div>
					<div className="flex flex-col gap-1">
						<Label htmlFor="typo-lh">Interlignage</Label>
						<Input
							id="typo-lh"
							type="number"
							min={1}
							max={3}
							step={0.05}
							value={form.lineHeight}
							onChange={(e) =>
								patch("lineHeight", Number(e.target.value) || 1.4)
							}
						/>
					</div>
				</div>
				<div className="flex flex-col gap-1">
					<Label htmlFor="typo-align">Alignement par défaut</Label>
					<Select
						value={form.defaultAlignment}
						onValueChange={(v) => patch("defaultAlignment", v as Alignment)}
					>
						<SelectTrigger id="typo-align">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="left">Aligné à gauche</SelectItem>
							<SelectItem value="center">Centré</SelectItem>
							<SelectItem value="right">Aligné à droite</SelectItem>
							<SelectItem value="justify">Justifié</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</section>

			<section className="flex flex-col gap-4 rounded-md border p-4">
				<h3 className="font-medium">Paragraphes</h3>
				<div className="grid gap-4 md:grid-cols-3">
					<div className="flex flex-col gap-1">
						<Label htmlFor="typo-pb">Espace avant (mm)</Label>
						<Input
							id="typo-pb"
							type="number"
							min={0}
							value={form.paragraphSpacingBefore}
							onChange={(e) =>
								patch("paragraphSpacingBefore", Number(e.target.value) || 0)
							}
						/>
					</div>
					<div className="flex flex-col gap-1">
						<Label htmlFor="typo-pa">Espace après (mm)</Label>
						<Input
							id="typo-pa"
							type="number"
							min={0}
							value={form.paragraphSpacingAfter}
							onChange={(e) =>
								patch("paragraphSpacingAfter", Number(e.target.value) || 0)
							}
						/>
					</div>
					<div className="flex flex-col gap-1">
						<Label htmlFor="typo-indent">Alinéa (mm)</Label>
						<Input
							id="typo-indent"
							type="number"
							min={0}
							value={form.paragraphFirstLineIndent}
							onChange={(e) =>
								patch("paragraphFirstLineIndent", Number(e.target.value) || 0)
							}
						/>
					</div>
				</div>
			</section>

			<section className="flex flex-col gap-4 rounded-md border p-4">
				<h3 className="font-medium">Styles de titres</h3>
				{(Object.keys(form.headingStyles) as HeadingLevel[]).map((level) => {
					const h = form.headingStyles[level];
					return (
						<div key={level} className="rounded-md bg-muted/30 p-3">
							<div className="mb-3 font-medium uppercase">{level}</div>
							<div className="grid gap-3 md:grid-cols-4">
								<div className="flex flex-col gap-1">
									<Label>Taille (pt)</Label>
									<Input
										type="number"
										min={6}
										max={40}
										step={0.5}
										value={h.fontSize}
										onChange={(e) =>
											patchHeading(level, {
												fontSize: Number(e.target.value) || h.fontSize,
											})
										}
									/>
								</div>
								<div className="flex flex-col gap-1">
									<Label>Alignement</Label>
									<Select
										value={h.alignment}
										onValueChange={(v) =>
											patchHeading(level, { alignment: v as Alignment })
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="left">Gauche</SelectItem>
											<SelectItem value="center">Centre</SelectItem>
											<SelectItem value="right">Droite</SelectItem>
											<SelectItem value="justify">Justifié</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="flex items-center justify-between rounded-md border bg-background p-2">
									<Label className="cursor-pointer">Gras</Label>
									<Switch
										checked={h.bold}
										onCheckedChange={(v) => patchHeading(level, { bold: v })}
									/>
								</div>
								<div className="flex items-center justify-between rounded-md border bg-background p-2">
									<Label className="cursor-pointer">Majuscules</Label>
									<Switch
										checked={h.uppercase}
										onCheckedChange={(v) =>
											patchHeading(level, { uppercase: v })
										}
									/>
								</div>
							</div>
						</div>
					);
				})}
			</section>

			<section className="flex flex-col gap-3 rounded-md border p-4">
				<h3 className="font-medium">Règles de saut & flow</h3>
				<div className="flex flex-col gap-2">
					<Label>Forcer un saut de page avant :</Label>
					<div className="flex gap-3">
						{(["h1", "h2", "h3"] as HeadingLevel[]).map((lvl) => (
							<label
								key={lvl}
								className="flex cursor-pointer items-center gap-2 rounded-md border bg-background p-2"
							>
								<Checkbox
									checked={form.pageBreakBefore.includes(lvl)}
									onCheckedChange={(v) => toggleBreak(lvl, v === true)}
								/>
								<span className="uppercase">{lvl}</span>
							</label>
						))}
					</div>
				</div>
				<div className="flex items-center justify-between rounded-md border bg-background p-3">
					<Label className="cursor-pointer">
						Éviter les lignes veuves / orphelines
					</Label>
					<Switch
						checked={form.widowOrphanControl}
						onCheckedChange={(v) => patch("widowOrphanControl", v)}
					/>
				</div>
				<div className="flex items-center justify-between rounded-md border bg-background p-3">
					<Label className="cursor-pointer">
						Conserver les titres avec le paragraphe suivant
					</Label>
					<Switch
						checked={form.keepHeadingsWithNext}
						onCheckedChange={(v) => patch("keepHeadingsWithNext", v)}
					/>
				</div>
			</section>

			<div className="flex items-center justify-between gap-3 rounded-md border p-4">
				<div>
					<div className="font-medium">Brique par défaut</div>
					<div className="text-sm text-muted-foreground">
						Sélectionnée automatiquement dans le wizard si aucune n'est choisie.
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
