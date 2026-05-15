"use client";

import type { Doc } from "@convex/_generated/dataModel";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
	LocalizedTextField,
	RepeatableList,
	type LocalizedString,
} from "./helpers";

type Service = Doc<"services">;

type Step = {
	label: LocalizedString;
	description?: LocalizedString;
	icon?: string;
	extras?: Array<{ label: LocalizedString; icon?: string }>;
};

type Doc_ = {
	type: string;
	label: LocalizedString;
	description?: LocalizedString;
	required: boolean;
	format?: "original" | "copy" | "digital" | "certified";
	group?: "required" | "situational";
};

const DOC_TYPE_OPTIONS = [
	{ value: "passport", label: "Passeport" },
	{ value: "id_card", label: "Carte d'identité" },
	{ value: "birth_certificate", label: "Acte de naissance" },
	{ value: "marriage_certificate", label: "Acte de mariage" },
	{ value: "death_certificate", label: "Acte de décès" },
	{ value: "proof_of_address", label: "Justificatif de domicile" },
	{ value: "photo", label: "Photo d'identité" },
	{ value: "other", label: "Autre document" },
];

const EXTRA_ICON_OPTIONS = [
	{ value: "", label: "Aucune" },
	{ value: "clock", label: "Horloge (durée)" },
	{ value: "shield", label: "Bouclier (sécurité)" },
	{ value: "upload", label: "Upload" },
	{ value: "check", label: "Validation" },
];

const FORMAT_OPTIONS = [
	{ value: "original", label: "Original" },
	{ value: "copy", label: "Copie" },
	{ value: "digital", label: "Numérique" },
	{ value: "certified", label: "Certifié" },
];

export function StepsAndDocsTab({
	service,
	onSave,
	saving,
}: {
	service: Service;
	onSave: (patch: {
		processSteps?: Step[];
		joinedDocuments?: Doc_[];
	}) => Promise<void>;
	saving?: boolean;
}) {
	const [steps, setSteps] = useState<Step[]>([]);
	const [docs, setDocs] = useState<Doc_[]>([]);

	useEffect(() => {
		setSteps(((service as { processSteps?: Step[] }).processSteps ?? []).map((s) => ({ ...s })));
		setDocs(((service as { joinedDocuments?: Doc_[] }).joinedDocuments ?? []).map((d) => ({ ...d })));
	}, [service]);

	const handleSave = async () => {
		try {
			await onSave({
				processSteps:
					steps.length > 0
						? steps.filter((s) => s.label.fr || s.label.en)
						: undefined,
				joinedDocuments:
					docs.length > 0
						? docs.filter((d) => d.label.fr || d.label.en)
						: undefined,
			});
			toast.success("Étapes & pièces sauvegardées.");
		} catch (e) {
			toast.error((e as Error).message || "Erreur lors de la sauvegarde.");
		}
	};

	return (
		<div className="space-y-6">
			<section className="space-y-3">
				<div>
					<h3 className="text-base font-semibold">Étapes du parcours</h3>
					<p className="text-sm text-muted-foreground">
						Numérotation auto. Chaque étape peut avoir des badges (extras) :
						durée, sécurité, format, etc.
					</p>
				</div>
				<RepeatableList<Step>
					items={steps}
					onChange={setSteps}
					addLabel="Ajouter une étape"
					emptyState="Aucune étape — la section « Étapes de la procédure » sera masquée."
					newItem={() => ({ label: {}, description: {}, extras: [] })}
					renderItem={(step, _i, set) => (
						<div className="space-y-3">
							<LocalizedTextField
								label="Titre de l'étape"
								value={step.label}
								onChange={(label) => set({ ...step, label })}
								required
							/>
							<LocalizedTextField
								label="Description"
								value={step.description ?? {}}
								onChange={(description) => set({ ...step, description })}
								multiline
								rows={3}
							/>
							<div className="space-y-2">
								<Label className="text-xs uppercase tracking-wider text-muted-foreground">
									Badges (extras)
								</Label>
								<RepeatableList
									items={step.extras ?? []}
									onChange={(extras) => set({ ...step, extras })}
									addLabel="Ajouter un badge"
									newItem={() => ({ label: {}, icon: "" })}
									renderItem={(extra, _j, setExtra) => (
										<div className="grid gap-2 md:grid-cols-[1fr_180px]">
											<LocalizedTextField
												label="Texte du badge"
												value={extra.label}
												onChange={(label) => setExtra({ ...extra, label })}
											/>
											<div className="space-y-2">
												<Label className="text-sm font-medium">Icône</Label>
												<Select
													value={extra.icon ?? ""}
													onValueChange={(icon) => setExtra({ ...extra, icon })}
												>
													<SelectTrigger>
														<SelectValue placeholder="Aucune" />
													</SelectTrigger>
													<SelectContent>
														{EXTRA_ICON_OPTIONS.map((opt) => (
															<SelectItem
																key={opt.value || "none"}
																value={opt.value || "none"}
															>
																{opt.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
										</div>
									)}
								/>
							</div>
						</div>
					)}
				/>
			</section>

			<Separator />

			<section className="space-y-3">
				<div>
					<h3 className="text-base font-semibold">Pièces à fournir</h3>
					<p className="text-sm text-muted-foreground">
						Affichées dans la section « Pièces à fournir » et regroupées par
						bloc (Obligatoires / Selon votre situation).
					</p>
				</div>
				<RepeatableList<Doc_>
					items={docs}
					onChange={setDocs}
					addLabel="Ajouter une pièce"
					emptyState="Aucune pièce — la section « Pièces à fournir » sera masquée."
					newItem={() => ({
						type: "other",
						label: {},
						description: {},
						required: true,
						format: "original",
						group: "required",
					})}
					renderItem={(doc, _i, set) => (
						<div className="space-y-3">
							<div className="grid gap-3 md:grid-cols-2">
								<div className="space-y-2">
									<Label className="text-sm font-medium">
										Type de document
									</Label>
									<Select
										value={doc.type}
										onValueChange={(type) => set({ ...doc, type })}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{DOC_TYPE_OPTIONS.map((opt) => (
												<SelectItem key={opt.value} value={opt.value}>
													{opt.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label className="text-sm font-medium">Format requis</Label>
									<Select
										value={doc.format ?? "original"}
										onValueChange={(format) =>
											set({
												...doc,
												format: format as Doc_["format"],
											})
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{FORMAT_OPTIONS.map((opt) => (
												<SelectItem key={opt.value} value={opt.value}>
													{opt.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
							<LocalizedTextField
								label="Libellé du document"
								value={doc.label}
								onChange={(label) => set({ ...doc, label })}
								required
							/>
							<LocalizedTextField
								label="Précision (sous-texte)"
								value={doc.description ?? {}}
								onChange={(description) => set({ ...doc, description })}
								multiline
								rows={2}
								helpText="Ex: « De moins de 3 mois », « Copie couleur »"
							/>
							<div className="grid gap-3 md:grid-cols-2">
								<div className="flex items-center justify-between rounded-md border p-3">
									<Label className="text-sm font-medium">Obligatoire</Label>
									<Switch
										checked={doc.required}
										onCheckedChange={(required) =>
											set({
												...doc,
												required,
												group: required ? "required" : "situational",
											})
										}
									/>
								</div>
								<div className="space-y-2">
									<Label className="text-sm font-medium">Groupe</Label>
									<Select
										value={
											doc.group ?? (doc.required ? "required" : "situational")
										}
										onValueChange={(group) =>
											set({ ...doc, group: group as Doc_["group"] })
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="required">Obligatoires</SelectItem>
											<SelectItem value="situational">
												Selon votre situation
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						</div>
					)}
				/>
			</section>

			<div className="flex justify-end border-t pt-4">
				<Button type="button" onClick={handleSave} disabled={saving} className="gap-2">
					<Save className="size-4" />
					{saving ? "Sauvegarde…" : "Sauvegarder cet onglet"}
				</Button>
			</div>
		</div>
	);
}
