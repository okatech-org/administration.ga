"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Combobox } from "./ui";

const CAT_OPTIONS: Array<{ value: string; label: string }> = [
	{ value: "tech", label: "Tech" },
	{ value: "health", label: "Santé" },
	{ value: "education", label: "Éducation" },
	{ value: "public_service", label: "Service public" },
	{ value: "consulting_services", label: "Conseil & Services" },
	{ value: "finance", label: "Finance" },
	{ value: "trades", label: "Métiers manuels" },
	{ value: "legal", label: "Juridique" },
	{ value: "tourism_hospitality", label: "Tourisme & Hôtellerie" },
	{ value: "arts_culture", label: "Arts & Culture" },
	{ value: "transport", label: "Transport" },
	{ value: "industry", label: "Industrie" },
	{ value: "agriculture", label: "Agriculture" },
	{ value: "other", label: "Autre" },
];

/**
 * Modal pour overrider manuellement la catégorie d'un profil quand l'IA
 * a échoué à le classer (Tab Santé → "Métiers que l'IA n'arrive pas à
 * classer" → bouton "Classer à la main").
 *
 * Le combobox réutilise la même liste taxonomique que le reste du
 * module ; la mutation `classifyManually` côté backend gère la
 * dénormalisation.
 */
export function ClassifyManuallyDialog({
	open,
	onOpenChange,
	profileId,
	profileName,
	freeProfession,
	currentCategory,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	profileId: Id<"profiles">;
	profileName: string;
	freeProfession: string;
	currentCategory: string | null;
}) {
	const { t: _t } = useTranslation();
	const classify = useMutation(api.functions.adminSkillsActions.classifyManually);
	const [category, setCategory] = useState(currentCategory ?? "other");
	const [submitting, setSubmitting] = useState(false);

	const onSubmit = async () => {
		setSubmitting(true);
		try {
			await classify({
				profileId,
				category: category as
					| "tech"
					| "health"
					| "education"
					| "agriculture"
					| "finance"
					| "trades"
					| "public_service"
					| "arts_culture"
					| "transport"
					| "tourism_hospitality"
					| "consulting_services"
					| "legal"
					| "industry"
					| "other",
			});
			toast.success(`Catégorie « ${CAT_OPTIONS.find((c) => c.value === category)?.label} » appliquée`);
			onOpenChange(false);
		} catch (err) {
			toast.error("Échec de la classification", {
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Classer manuellement</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div>
							<p style={{ marginBottom: 8 }}>
								Profil : <strong>{profileName}</strong>
							</p>
							<p style={{ marginBottom: 12, fontStyle: "italic", opacity: 0.75 }}>
								Métier déclaré : « {freeProfession} »
							</p>
							<p style={{ fontSize: 13 }}>
								Sélectionne la catégorie taxonomique à associer à ce profil. Elle
								remplacera celle déduite par l'IA et sera prise en compte
								immédiatement dans les agrégats.
							</p>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<div className="dash-v2" style={{ padding: "8px 4px 4px" }}>
					<Combobox
						icon="Briefcase"
						value={category}
						onChange={setCategory}
						options={CAT_OPTIONS}
					/>
				</div>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
					<AlertDialogAction onClick={onSubmit} disabled={submitting}>
						{submitting ? "Application…" : "Appliquer la catégorie"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
