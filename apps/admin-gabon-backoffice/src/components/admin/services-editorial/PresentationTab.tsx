"use client";

import type { Doc } from "@convex/_generated/dataModel";
import { Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import {
	LocalizedListField,
	LocalizedTextField,
	type LocalizedString,
} from "./helpers";

type Service = Doc<"services">;
type CalloutVariant = "info" | "warning" | "success";

export function PresentationTab({
	service,
	onSave,
	saving,
}: {
	service: Service;
	onSave: (patch: {
		audience?: LocalizedString;
		expressDays?: number;
		titleValidity?: LocalizedString;
		noteCallout?: { variant: CalloutVariant; body: LocalizedString };
		useCases?: LocalizedString[];
	}) => Promise<void>;
	saving?: boolean;
}) {
	const [audience, setAudience] = useState<LocalizedString>({});
	const [expressDays, setExpressDays] = useState<string>("");
	const [titleValidity, setTitleValidity] = useState<LocalizedString>({});
	const [calloutEnabled, setCalloutEnabled] = useState(false);
	const [calloutVariant, setCalloutVariant] = useState<CalloutVariant>("info");
	const [calloutBody, setCalloutBody] = useState<LocalizedString>({});
	const [useCases, setUseCases] = useState<LocalizedString[]>([]);

	useEffect(() => {
		setAudience((service.audience as LocalizedString) ?? {});
		setExpressDays(
			(service as { expressDays?: number }).expressDays?.toString() ?? "",
		);
		setTitleValidity((service.titleValidity as LocalizedString) ?? {});
		const callout = (service as { noteCallout?: { variant: CalloutVariant; body: LocalizedString } }).noteCallout;
		if (callout) {
			setCalloutEnabled(true);
			setCalloutVariant(callout.variant);
			setCalloutBody(callout.body);
		}
		const cases = (service as { useCases?: LocalizedString[] }).useCases;
		setUseCases(cases ?? []);
	}, [service]);

	const handleSave = async () => {
		const patch: Parameters<typeof onSave>[0] = {
			audience: audience.fr || audience.en ? cleanLoc(audience) : undefined,
			expressDays: expressDays ? parseInt(expressDays, 10) : undefined,
			titleValidity:
				titleValidity.fr || titleValidity.en ? cleanLoc(titleValidity) : undefined,
			noteCallout:
				calloutEnabled && (calloutBody.fr || calloutBody.en)
					? { variant: calloutVariant, body: cleanLoc(calloutBody) }
					: undefined,
			useCases:
				useCases.length > 0
					? useCases.filter((c) => c.fr || c.en).map(cleanLoc)
					: undefined,
		};
		try {
			await onSave(patch);
			toast.success("Section Présentation sauvegardée.");
		} catch (e) {
			toast.error((e as Error).message || "Erreur lors de la sauvegarde.");
		}
	};

	return (
		<div className="space-y-6">
			<section className="space-y-4">
				<div>
					<h3 className="text-base font-semibold">Métadonnées affichées</h3>
					<p className="text-sm text-muted-foreground">
						Apparaît dans le hero et la sidebar « En bref » de la page publique.
					</p>
				</div>
				<div className="grid gap-4 md:grid-cols-2">
					<LocalizedTextField
						label="Public concerné"
						value={audience}
						onChange={setAudience}
						helpText="Ex: « Ressortissants gabonais », « Étrangers en séjour »"
					/>
					<div className="space-y-2">
						<Label className="text-sm font-medium">
							Délai express (jours ouvrés)
						</Label>
						<p className="text-xs text-muted-foreground">
							Affiché en plus du délai standard si renseigné.
						</p>
						<Input
							type="number"
							min={1}
							max={365}
							value={expressDays}
							onChange={(e) => setExpressDays(e.target.value)}
							placeholder="ex: 5"
						/>
					</div>
				</div>
				<LocalizedTextField
					label="Validité du titre"
					value={titleValidity}
					onChange={setTitleValidity}
					helpText="Ex: « 5 ans (adultes) », « Indéterminée »"
				/>
			</section>

			<Separator />

			<section className="space-y-4">
				<div className="flex items-start justify-between gap-4">
					<div>
						<h3 className="text-base font-semibold">Encart « À noter »</h3>
						<p className="text-sm text-muted-foreground">
							Apparaît au-dessus de la section « Dans quels cas ».
						</p>
					</div>
					<Button
						type="button"
						variant={calloutEnabled ? "secondary" : "outline"}
						size="sm"
						onClick={() => setCalloutEnabled((v) => !v)}
					>
						{calloutEnabled ? "Désactiver" : "Activer"}
					</Button>
				</div>
				{calloutEnabled && (
					<div className="space-y-3">
						<div className="space-y-2">
							<Label className="text-sm font-medium">Variante</Label>
							<Select
								value={calloutVariant}
								onValueChange={(v) => setCalloutVariant(v as CalloutVariant)}
							>
								<SelectTrigger className="w-48">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="info">Info (bleu)</SelectItem>
									<SelectItem value="warning">Avertissement (jaune)</SelectItem>
									<SelectItem value="success">Succès (vert)</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<LocalizedTextField
							label="Texte du callout"
							value={calloutBody}
							onChange={setCalloutBody}
							multiline
							rows={3}
						/>
					</div>
				)}
			</section>

			<Separator />

			<section className="space-y-3">
				<div>
					<h3 className="text-base font-semibold">
						Dans quels cas ce service est-il utile ?
					</h3>
					<p className="text-sm text-muted-foreground">
						Liste à puces affichée dans la section « Présentation ».
					</p>
				</div>
				<LocalizedListField
					label="Cas d'usage"
					items={useCases}
					onChange={setUseCases}
					addLabel="Ajouter un cas d'usage"
					placeholder="Description du cas"
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

function cleanLoc(s: LocalizedString): LocalizedString {
	const out: LocalizedString = {};
	if (s.fr) out.fr = s.fr;
	if (s.en) out.en = s.en;
	return out;
}
