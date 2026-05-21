"use client";

import type { Doc } from "@convex/_generated/dataModel";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

type PricingItem = {
	id: string;
	name: LocalizedString;
	description?: LocalizedString;
	delay?: LocalizedString;
	price?: LocalizedString;
	isFree?: boolean;
	variant?: "standard" | "express" | "duplicate" | "reduced" | "addon";
};

type Mode = {
	mode: "online" | "in_person" | "postal";
	title?: LocalizedString;
	description: LocalizedString;
	delay?: LocalizedString;
	fee?: LocalizedString;
	availability?: LocalizedString;
	recommended?: boolean;
};

const VARIANT_OPTIONS = [
	{ value: "standard", label: "Standard" },
	{ value: "express", label: "Express" },
	{ value: "duplicate", label: "Duplicata" },
	{ value: "reduced", label: "Réduit (mineurs, etc.)" },
	{ value: "addon", label: "Supplément (traduction, etc.)" },
];

const MODE_OPTIONS = [
	{ value: "online", label: "En ligne" },
	{ value: "in_person", label: "En personne" },
	{ value: "postal", label: "Par voie postale" },
];

function slugify(s: string): string {
	return s
		.toLowerCase()
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "")
		.slice(0, 40);
}

export function PricingAndModesTab({
	service,
	onSave,
	saving,
}: {
	service: Service;
	onSave: (patch: {
		pricingTable?: PricingItem[];
		legalReference?: LocalizedString;
		pricingNote?: LocalizedString;
		availableModes?: Mode[];
	}) => Promise<void>;
	saving?: boolean;
}) {
	const [items, setItems] = useState<PricingItem[]>([]);
	const [legalRef, setLegalRef] = useState<LocalizedString>({});
	const [note, setNote] = useState<LocalizedString>({});
	const [modes, setModes] = useState<Mode[]>([]);

	useEffect(() => {
		setItems(((service as { pricingTable?: PricingItem[] }).pricingTable ?? []).map((p) => ({ ...p })));
		setLegalRef((service as { legalReference?: LocalizedString }).legalReference ?? {});
		setNote((service as { pricingNote?: LocalizedString }).pricingNote ?? {});
		setModes(((service as { availableModes?: Mode[] }).availableModes ?? []).map((m) => ({ ...m })));
	}, [service]);

	const handleSave = async () => {
		try {
			await onSave({
				pricingTable:
					items.length > 0
						? items
								.filter((p) => p.name.fr || p.name.en)
								.map((p) => ({ ...p, id: p.id || slugify(p.name.fr || p.name.en || `item-${Date.now()}`) }))
						: undefined,
				legalReference: legalRef.fr || legalRef.en ? legalRef : undefined,
				pricingNote: note.fr || note.en ? note : undefined,
				availableModes:
					modes.length > 0
						? modes.filter((m) => m.description.fr || m.description.en)
						: undefined,
			});
			toast.success("Tarifs & modes sauvegardés.");
		} catch (e) {
			toast.error((e as Error).message || "Erreur lors de la sauvegarde.");
		}
	};

	return (
		<div className="space-y-6">
			<section className="space-y-3">
				<div>
					<h3 className="text-base font-semibold">Tableau de tarifs</h3>
					<p className="text-sm text-muted-foreground">
						Affiché dans la section « Tarifs & délais ». Chaque ligne porte un
						`id` stable (auto-généré depuis le nom) qui permet à chaque org de
						surcharger le prix localement.
					</p>
				</div>
				<RepeatableList<PricingItem>
					items={items}
					onChange={setItems}
					addLabel="Ajouter un tarif"
					emptyState="Aucun tarif — la section « Tarifs & délais » sera masquée."
					newItem={() => ({
						id: "",
						name: {},
						description: {},
						variant: "standard",
					})}
					renderItem={(item, _i, set) => (
						<div className="space-y-3">
							<div className="grid gap-3 md:grid-cols-2">
								<div className="space-y-2">
									<Label className="text-sm font-medium">Variante</Label>
									<Select
										value={item.variant ?? "standard"}
										onValueChange={(variant) =>
											set({
												...item,
												variant: variant as PricingItem["variant"],
											})
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{VARIANT_OPTIONS.map((opt) => (
												<SelectItem key={opt.value} value={opt.value}>
													{opt.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="flex items-center justify-between rounded-md border p-3">
									<Label className="text-sm font-medium">Gratuit</Label>
									<Switch
										checked={item.isFree ?? false}
										onCheckedChange={(isFree) => set({ ...item, isFree })}
									/>
								</div>
							</div>
							<LocalizedTextField
								label="Nom de la prestation"
								value={item.name}
								onChange={(name) => set({ ...item, name })}
								required
							/>
							<LocalizedTextField
								label="Description"
								value={item.description ?? {}}
								onChange={(description) => set({ ...item, description })}
								multiline
								rows={2}
							/>
							<div className="grid gap-3 md:grid-cols-2">
								<LocalizedTextField
									label="Délai (texte libre)"
									value={item.delay ?? {}}
									onChange={(delay) => set({ ...item, delay })}
									helpText="Ex: « 10 jours », « + 3 jours »"
								/>
								<LocalizedTextField
									label="Tarif"
									value={item.price ?? {}}
									onChange={(price) => set({ ...item, price })}
									helpText="Ex: « 25 € », « + 30 € » — ignoré si « Gratuit »"
								/>
							</div>
						</div>
					)}
				/>
				<div className="grid gap-3 md:grid-cols-2">
					<LocalizedTextField
						label="Référence légale"
						value={legalRef}
						onChange={setLegalRef}
						helpText="Ex: « Arrêté ministériel n° 2026-007 du 12 janvier 2026 »"
					/>
					<LocalizedTextField
						label="Note bas de tableau"
						value={note}
						onChange={setNote}
						multiline
						rows={2}
						helpText="Ex: conditions de remboursement"
					/>
				</div>
			</section>

			<Separator />

			<section className="space-y-3">
				<div>
					<h3 className="text-base font-semibold">Modes de soumission</h3>
					<p className="text-sm text-muted-foreground">
						Cards de la section « En ligne ou en personne ». Coche
						« Recommandé » sur le mode à mettre en avant.
					</p>
				</div>
				<RepeatableList<Mode>
					items={modes}
					onChange={setModes}
					addLabel="Ajouter un mode"
					emptyState="Aucun mode — la section « En ligne ou en personne ? » sera masquée."
					newItem={() => ({
						mode: "online",
						description: {},
						recommended: false,
					})}
					renderItem={(mode, _i, set) => (
						<div className="space-y-3">
							<div className="grid gap-3 md:grid-cols-2">
								<div className="space-y-2">
									<Label className="text-sm font-medium">Mode</Label>
									<Select
										value={mode.mode}
										onValueChange={(m) =>
											set({ ...mode, mode: m as Mode["mode"] })
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{MODE_OPTIONS.map((opt) => (
												<SelectItem key={opt.value} value={opt.value}>
													{opt.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="flex items-center justify-between rounded-md border p-3">
									<Label className="text-sm font-medium">Recommandé</Label>
									<Switch
										checked={mode.recommended ?? false}
										onCheckedChange={(recommended) =>
											set({ ...mode, recommended })
										}
									/>
								</div>
							</div>
							<LocalizedTextField
								label="Titre (optionnel)"
								value={mode.title ?? {}}
								onChange={(title) => set({ ...mode, title })}
								helpText="Si vide, un titre par défaut sera utilisé"
							/>
							<LocalizedTextField
								label="Description"
								value={mode.description}
								onChange={(description) => set({ ...mode, description })}
								required
								multiline
								rows={3}
							/>
							<div className="grid gap-3 md:grid-cols-3">
								<LocalizedTextField
									label="Délai"
									value={mode.delay ?? {}}
									onChange={(delay) => set({ ...mode, delay })}
								/>
								<LocalizedTextField
									label="Frais"
									value={mode.fee ?? {}}
									onChange={(fee) => set({ ...mode, fee })}
								/>
								<LocalizedTextField
									label="Disponibilité"
									value={mode.availability ?? {}}
									onChange={(availability) => set({ ...mode, availability })}
									helpText="Ex: « 24/7 », « Sur RDV »"
								/>
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
