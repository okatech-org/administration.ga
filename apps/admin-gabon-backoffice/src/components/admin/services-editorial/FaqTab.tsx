"use client";

import type { Doc } from "@convex/_generated/dataModel";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	LocalizedTextField,
	RepeatableList,
	type LocalizedString,
} from "./helpers";

type Service = Doc<"services">;
type Faq = { question: LocalizedString; answer: LocalizedString };

export function FaqTab({
	service,
	onSave,
	saving,
}: {
	service: Service;
	onSave: (patch: { faqs?: Faq[] }) => Promise<void>;
	saving?: boolean;
}) {
	const [faqs, setFaqs] = useState<Faq[]>([]);

	useEffect(() => {
		setFaqs(((service as { faqs?: Faq[] }).faqs ?? []).map((f) => ({ ...f })));
	}, [service]);

	const handleSave = async () => {
		try {
			await onSave({
				faqs:
					faqs.length > 0
						? faqs.filter(
								(f) =>
									(f.question.fr || f.question.en) &&
									(f.answer.fr || f.answer.en),
							)
						: undefined,
			});
			toast.success("FAQ sauvegardée.");
		} catch (e) {
			toast.error((e as Error).message || "Erreur lors de la sauvegarde.");
		}
	};

	return (
		<div className="space-y-6">
			<section className="space-y-3">
				<div>
					<h3 className="text-base font-semibold">Questions fréquentes</h3>
					<p className="text-sm text-muted-foreground">
						Affichées dans la section « Questions fréquentes ». Les démarches
						liées (sidebar) sont calculées automatiquement par catégorie — pas
						d'édition manuelle nécessaire.
					</p>
				</div>
				<RepeatableList<Faq>
					items={faqs}
					onChange={setFaqs}
					addLabel="Ajouter une question"
					emptyState="Aucune FAQ — la section « Questions fréquentes » sera masquée."
					newItem={() => ({ question: {}, answer: {} })}
					renderItem={(faq, _i, set) => (
						<div className="space-y-3">
							<LocalizedTextField
								label="Question"
								value={faq.question}
								onChange={(question) => set({ ...faq, question })}
								required
							/>
							<LocalizedTextField
								label="Réponse"
								value={faq.answer}
								onChange={(answer) => set({ ...faq, answer })}
								required
								multiline
								rows={4}
							/>
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
