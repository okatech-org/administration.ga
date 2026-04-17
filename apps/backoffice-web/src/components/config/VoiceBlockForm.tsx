"use client";

/**
 * Formulaire partagé pour créer ou éditer une brique « Voix / Argumentaire ».
 * Les champs sont utilisés comme « prompt système » par l'IA — ils n'apparaissent
 * pas dans le rendu du PDF.
 */

import { Plus, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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

type Register = "administratif" | "juridique" | "commercial" | "diplomatique" | "neutre";
type Pronoun = "je" | "nous" | "le_consulat" | "impersonnel";
type Politeness = "neutre" | "courtois" | "solennel";
type TemplateType = "certificate" | "attestation" | "receipt" | "letter" | "custom";

interface Formula {
	text: string;
	templateType?: TemplateType;
}

interface VocabularyEntry {
	prefer: string;
	avoid: string[];
}

export interface VoiceFormValue {
	nameFr: string;
	descFr: string;
	tone: string;
	register: Register;
	openingFormulas: Formula[];
	closingFormulas: Formula[];
	signatureFormulas: string[];
	personPronoun: Pronoun;
	useFormalAddress: boolean;
	politenessLevel: Politeness;
	argumentationGuidelines: string;
	vocabularyPreferences: VocabularyEntry[];
	isDefault: boolean;
}

export function createDefaultVoiceForm(): VoiceFormValue {
	return {
		nameFr: "",
		descFr: "",
		tone: "Formel et institutionnel",
		register: "administratif",
		openingFormulas: [{ text: "Par la présente, il est attesté que…" }],
		closingFormulas: [
			{ text: "Je vous prie d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées." },
		],
		signatureFormulas: ["Fait à [Lieu], le [Date]."],
		personPronoun: "le_consulat",
		useFormalAddress: true,
		politenessLevel: "courtois",
		argumentationGuidelines:
			"- Toujours citer la référence du dossier en tête de document.\n- Rester factuel : énoncer les faits avérés, éviter les suppositions.\n- Conclure par une formule de politesse adaptée au destinataire.",
		vocabularyPreferences: [],
		isDefault: false,
	};
}

const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
	certificate: "Certificat",
	attestation: "Attestation",
	receipt: "Récépissé",
	letter: "Lettre",
	custom: "Personnalisé",
};

export interface VoiceBlockFormProps {
	initial: VoiceFormValue;
	submitLabel: string;
	submitting?: boolean;
	onSubmit: (value: VoiceFormValue) => Promise<void> | void;
	onDelete?: () => Promise<void> | void;
}

export function VoiceBlockForm({
	initial,
	submitLabel,
	submitting,
	onSubmit,
	onDelete,
}: VoiceBlockFormProps) {
	const [form, setForm] = useState<VoiceFormValue>(initial);

	function patch<K extends keyof VoiceFormValue>(key: K, value: VoiceFormValue[K]) {
		setForm((f) => ({ ...f, [key]: value }));
	}

	function addOpening() {
		patch("openingFormulas", [...form.openingFormulas, { text: "" }]);
	}
	function removeOpening(idx: number) {
		patch(
			"openingFormulas",
			form.openingFormulas.filter((_, i) => i !== idx),
		);
	}
	function patchOpening(idx: number, partial: Partial<Formula>) {
		patch(
			"openingFormulas",
			form.openingFormulas.map((f, i) => (i === idx ? { ...f, ...partial } : f)),
		);
	}

	function addClosing() {
		patch("closingFormulas", [...form.closingFormulas, { text: "" }]);
	}
	function removeClosing(idx: number) {
		patch(
			"closingFormulas",
			form.closingFormulas.filter((_, i) => i !== idx),
		);
	}
	function patchClosing(idx: number, partial: Partial<Formula>) {
		patch(
			"closingFormulas",
			form.closingFormulas.map((f, i) => (i === idx ? { ...f, ...partial } : f)),
		);
	}

	function addSignature() {
		patch("signatureFormulas", [...form.signatureFormulas, ""]);
	}
	function removeSignature(idx: number) {
		patch(
			"signatureFormulas",
			form.signatureFormulas.filter((_, i) => i !== idx),
		);
	}

	function addVocab() {
		patch("vocabularyPreferences", [
			...form.vocabularyPreferences,
			{ prefer: "", avoid: [] },
		]);
	}
	function removeVocab(idx: number) {
		patch(
			"vocabularyPreferences",
			form.vocabularyPreferences.filter((_, i) => i !== idx),
		);
	}
	function patchVocab(idx: number, partial: Partial<VocabularyEntry>) {
		patch(
			"vocabularyPreferences",
			form.vocabularyPreferences.map((v, i) =>
				i === idx ? { ...v, ...partial } : v,
			),
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
					<Label htmlFor="voice-name">Nom de la brique</Label>
					<Input
						id="voice-name"
						value={form.nameFr}
						onChange={(e) => patch("nameFr", e.target.value)}
						placeholder="Ton formel consulaire"
						required
					/>
				</div>
				<div className="flex flex-col gap-1">
					<Label htmlFor="voice-desc">Description</Label>
					<Input
						id="voice-desc"
						value={form.descFr}
						onChange={(e) => patch("descFr", e.target.value)}
						placeholder="Destiné aux attestations et certificats officiels"
					/>
				</div>
			</div>

			<section className="flex flex-col gap-4 rounded-md border p-4">
				<h3 className="font-medium">Ton et registre</h3>
				<div className="grid gap-4 md:grid-cols-2">
					<div className="flex flex-col gap-1">
						<Label htmlFor="voice-tone">Ton (libellé libre)</Label>
						<Input
							id="voice-tone"
							value={form.tone}
							onChange={(e) => patch("tone", e.target.value)}
							placeholder="Formel et institutionnel"
						/>
					</div>
					<div className="flex flex-col gap-1">
						<Label htmlFor="voice-register">Registre</Label>
						<Select
							value={form.register}
							onValueChange={(v) => patch("register", v as Register)}
						>
							<SelectTrigger id="voice-register">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="administratif">Administratif</SelectItem>
								<SelectItem value="juridique">Juridique</SelectItem>
								<SelectItem value="commercial">Commercial</SelectItem>
								<SelectItem value="diplomatique">Diplomatique</SelectItem>
								<SelectItem value="neutre">Neutre</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</section>

			<section className="flex flex-col gap-4 rounded-md border p-4">
				<h3 className="font-medium">Règles linguistiques</h3>
				<div className="grid gap-4 md:grid-cols-2">
					<div className="flex flex-col gap-1">
						<Label htmlFor="voice-pronoun">Personne grammaticale</Label>
						<Select
							value={form.personPronoun}
							onValueChange={(v) => patch("personPronoun", v as Pronoun)}
						>
							<SelectTrigger id="voice-pronoun">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="je">Je</SelectItem>
								<SelectItem value="nous">Nous</SelectItem>
								<SelectItem value="le_consulat">Le consulat / L'ambassade</SelectItem>
								<SelectItem value="impersonnel">Impersonnel (il est attesté…)</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="flex flex-col gap-1">
						<Label htmlFor="voice-politeness">Niveau de politesse</Label>
						<Select
							value={form.politenessLevel}
							onValueChange={(v) => patch("politenessLevel", v as Politeness)}
						>
							<SelectTrigger id="voice-politeness">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="neutre">Neutre</SelectItem>
								<SelectItem value="courtois">Courtois</SelectItem>
								<SelectItem value="solennel">Solennel</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
				<div className="flex items-center justify-between rounded-md border bg-background p-3">
					<Label className="cursor-pointer">
						Utiliser le vouvoiement systématiquement
					</Label>
					<Switch
						checked={form.useFormalAddress}
						onCheckedChange={(v) => patch("useFormalAddress", v)}
					/>
				</div>
			</section>

			<section className="flex flex-col gap-4 rounded-md border p-4">
				<div className="flex items-center justify-between">
					<h3 className="font-medium">Formules d'ouverture</h3>
					<Button type="button" variant="ghost" size="sm" onClick={addOpening}>
						<Plus className="mr-1 h-3.5 w-3.5" />
						Ajouter
					</Button>
				</div>
				{form.openingFormulas.length === 0 ? (
					<p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
						Aucune formule. L'IA s'en passera.
					</p>
				) : (
					<ul className="flex flex-col gap-3">
						{form.openingFormulas.map((f, idx) => (
							<li
								key={idx}
								className="grid gap-2 rounded-md border bg-background p-3 md:grid-cols-[1fr_180px_auto]"
							>
								<Textarea
									rows={2}
									value={f.text}
									onChange={(e) =>
										patchOpening(idx, { text: e.target.value })
									}
									placeholder="Par la présente, il est attesté que…"
								/>
								<Select
									value={f.templateType ?? "__any__"}
									onValueChange={(v) =>
										patchOpening(idx, {
											templateType:
												v === "__any__" ? undefined : (v as TemplateType),
										})
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="__any__">Tous les types</SelectItem>
										{(Object.keys(TEMPLATE_TYPE_LABELS) as TemplateType[]).map(
											(t) => (
												<SelectItem key={t} value={t}>
													{TEMPLATE_TYPE_LABELS[t]}
												</SelectItem>
											),
										)}
									</SelectContent>
								</Select>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={() => removeOpening(idx)}
									aria-label="Supprimer"
								>
									<X className="h-4 w-4" />
								</Button>
							</li>
						))}
					</ul>
				)}
			</section>

			<section className="flex flex-col gap-4 rounded-md border p-4">
				<div className="flex items-center justify-between">
					<h3 className="font-medium">Formules de clôture</h3>
					<Button type="button" variant="ghost" size="sm" onClick={addClosing}>
						<Plus className="mr-1 h-3.5 w-3.5" />
						Ajouter
					</Button>
				</div>
				{form.closingFormulas.length === 0 ? (
					<p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
						Aucune formule.
					</p>
				) : (
					<ul className="flex flex-col gap-3">
						{form.closingFormulas.map((f, idx) => (
							<li
								key={idx}
								className="grid gap-2 rounded-md border bg-background p-3 md:grid-cols-[1fr_180px_auto]"
							>
								<Textarea
									rows={2}
									value={f.text}
									onChange={(e) =>
										patchClosing(idx, { text: e.target.value })
									}
									placeholder="Je vous prie d'agréer…"
								/>
								<Select
									value={f.templateType ?? "__any__"}
									onValueChange={(v) =>
										patchClosing(idx, {
											templateType:
												v === "__any__" ? undefined : (v as TemplateType),
										})
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="__any__">Tous les types</SelectItem>
										{(Object.keys(TEMPLATE_TYPE_LABELS) as TemplateType[]).map(
											(t) => (
												<SelectItem key={t} value={t}>
													{TEMPLATE_TYPE_LABELS[t]}
												</SelectItem>
											),
										)}
									</SelectContent>
								</Select>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={() => removeClosing(idx)}
								>
									<X className="h-4 w-4" />
								</Button>
							</li>
						))}
					</ul>
				)}
			</section>

			<section className="flex flex-col gap-4 rounded-md border p-4">
				<div className="flex items-center justify-between">
					<h3 className="font-medium">Formules de signature</h3>
					<Button type="button" variant="ghost" size="sm" onClick={addSignature}>
						<Plus className="mr-1 h-3.5 w-3.5" />
						Ajouter
					</Button>
				</div>
				<ul className="flex flex-col gap-2">
					{form.signatureFormulas.map((s, idx) => (
						<li key={idx} className="flex items-center gap-2">
							<Input
								value={s}
								onChange={(e) =>
									patch(
										"signatureFormulas",
										form.signatureFormulas.map((v, i) =>
											i === idx ? e.target.value : v,
										),
									)
								}
								placeholder="Fait à [Lieu], le [Date]."
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								onClick={() => removeSignature(idx)}
							>
								<X className="h-4 w-4" />
							</Button>
						</li>
					))}
				</ul>
			</section>

			<section className="flex flex-col gap-3 rounded-md border p-4">
				<div>
					<h3 className="font-medium">Directives d'argumentaire</h3>
					<p className="text-sm text-muted-foreground">
						Contexte injecté dans le prompt de l'IA lors de la génération.
						Markdown toléré.
					</p>
				</div>
				<Textarea
					rows={6}
					value={form.argumentationGuidelines}
					onChange={(e) => patch("argumentationGuidelines", e.target.value)}
					placeholder="- Toujours citer la référence du dossier…"
				/>
			</section>

			<section className="flex flex-col gap-4 rounded-md border p-4">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="font-medium">Préférences lexicales</h3>
						<p className="text-sm text-muted-foreground">
							Termes à privilégier et termes à éviter.
						</p>
					</div>
					<Button type="button" variant="ghost" size="sm" onClick={addVocab}>
						<Plus className="mr-1 h-3.5 w-3.5" />
						Ajouter
					</Button>
				</div>
				{form.vocabularyPreferences.length === 0 ? (
					<p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
						Aucune préférence définie.
					</p>
				) : (
					<ul className="flex flex-col gap-3">
						{form.vocabularyPreferences.map((v, idx) => (
							<li
								key={idx}
								className="grid gap-2 rounded-md border bg-background p-3 md:grid-cols-[1fr_1fr_auto]"
							>
								<div className="flex flex-col gap-1">
									<Label>Préférer</Label>
									<Input
										value={v.prefer}
										onChange={(e) =>
											patchVocab(idx, { prefer: e.target.value })
										}
										placeholder="usager"
									/>
								</div>
								<div className="flex flex-col gap-1">
									<Label>Éviter (séparés par des virgules)</Label>
									<Input
										value={v.avoid.join(", ")}
										onChange={(e) =>
											patchVocab(idx, {
												avoid: e.target.value
													.split(",")
													.map((s) => s.trim())
													.filter(Boolean),
											})
										}
										placeholder="client, consommateur"
									/>
								</div>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={() => removeVocab(idx)}
									className="self-end"
								>
									<X className="h-4 w-4" />
								</Button>
							</li>
						))}
					</ul>
				)}
			</section>

			<div className="flex items-center justify-between gap-3 rounded-md border p-4">
				<div>
					<div className="font-medium">Brique par défaut</div>
					<div className="text-sm text-muted-foreground">
						Sélectionnée automatiquement par l'IA si aucune n'est choisie.
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

/** Nettoie les formules vides avant soumission (text.trim().length === 0). */
export function cleanVoiceForSubmit(v: VoiceFormValue) {
	return {
		openingFormulas: v.openingFormulas.filter((f) => f.text.trim().length > 0),
		closingFormulas: v.closingFormulas.filter((f) => f.text.trim().length > 0),
		signatureFormulas: v.signatureFormulas.filter((s) => s.trim().length > 0),
		vocabularyPreferences: v.vocabularyPreferences.filter(
			(p) => p.prefer.trim().length > 0,
		),
	};
}
