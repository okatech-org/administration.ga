"use client";

/**
 * Éditeur contrôlé de la facette « Typographie / Structure des textes ».
 */

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

export interface TypographySectionValue {
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

export function createDefaultTypographySection(): TypographySectionValue {
	return {
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
	};
}

export interface TypographySectionEditorProps {
	value: TypographySectionValue;
	onChange: (next: TypographySectionValue) => void;
}

export function TypographySectionEditor({
	value,
	onChange,
}: TypographySectionEditorProps) {
	function patch<K extends keyof TypographySectionValue>(
		key: K,
		next: TypographySectionValue[K],
	) {
		onChange({ ...value, [key]: next });
	}
	function patchHeading(level: HeadingLevel, partial: Partial<HeadingStyle>) {
		onChange({
			...value,
			headingStyles: {
				...value.headingStyles,
				[level]: { ...value.headingStyles[level], ...partial },
			},
		});
	}
	function toggleBreak(level: HeadingLevel, checked: boolean) {
		const set = new Set(value.pageBreakBefore);
		if (checked) set.add(level);
		else set.delete(level);
		patch("pageBreakBefore", Array.from(set));
	}

	return (
		<div className="flex flex-col gap-6">
			<section className="flex flex-col gap-4 rounded-md border p-4">
				<h3 className="font-medium">Corps de texte</h3>
				<div className="grid gap-4 md:grid-cols-3">
					<div className="flex flex-col gap-1">
						<Label htmlFor="typo-family">Police</Label>
						<Select
							value={value.fontFamily}
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
							value={value.fontSizeBase}
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
							value={value.lineHeight}
							onChange={(e) =>
								patch("lineHeight", Number(e.target.value) || 1.4)
							}
						/>
					</div>
				</div>
				<div className="flex flex-col gap-1">
					<Label htmlFor="typo-align">Alignement par défaut</Label>
					<Select
						value={value.defaultAlignment}
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
							value={value.paragraphSpacingBefore}
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
							value={value.paragraphSpacingAfter}
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
							value={value.paragraphFirstLineIndent}
							onChange={(e) =>
								patch("paragraphFirstLineIndent", Number(e.target.value) || 0)
							}
						/>
					</div>
				</div>
			</section>

			<section className="flex flex-col gap-4 rounded-md border p-4">
				<h3 className="font-medium">Styles de titres</h3>
				{(Object.keys(value.headingStyles) as HeadingLevel[]).map((level) => {
					const h = value.headingStyles[level];
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
									checked={value.pageBreakBefore.includes(lvl)}
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
						checked={value.widowOrphanControl}
						onCheckedChange={(v) => patch("widowOrphanControl", v)}
					/>
				</div>
				<div className="flex items-center justify-between rounded-md border bg-background p-3">
					<Label className="cursor-pointer">
						Conserver les titres avec le paragraphe suivant
					</Label>
					<Switch
						checked={value.keepHeadingsWithNext}
						onCheckedChange={(v) => patch("keepHeadingsWithNext", v)}
					/>
				</div>
			</section>
		</div>
	);
}

// ============================================================================
// Sérialiseurs
// ============================================================================

export function serializeTypographySection(value: TypographySectionValue) {
	return { ...value };
}

export function deserializeTypographySection(
	raw: Partial<TypographySectionValue> | undefined,
): TypographySectionValue {
	if (!raw) return createDefaultTypographySection();
	const defaults = createDefaultTypographySection();
	return {
		...defaults,
		...raw,
		headingStyles: {
			h1: { ...defaults.headingStyles.h1, ...raw.headingStyles?.h1 },
			h2: { ...defaults.headingStyles.h2, ...raw.headingStyles?.h2 },
			h3: { ...defaults.headingStyles.h3, ...raw.headingStyles?.h3 },
		},
		pageBreakBefore: (raw.pageBreakBefore ?? []) as HeadingLevel[],
	};
}
