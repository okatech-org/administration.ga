"use client";

import { api } from "@convex/_generated/api";
import { MessageSquareQuote } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
	VoiceBlockForm,
	cleanVoiceForSubmit,
	createDefaultVoiceForm,
} from "@/components/config/VoiceBlockForm";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { useConvexMutationQuery } from "@/integrations/convex/hooks";

export default function NewVoiceBlockPage() {
	const router = useRouter();
	const { mutateAsync: createBlock } = useConvexMutationQuery(
		api.functions.templateVoiceBlocks.create,
	);
	const [submitting, setSubmitting] = useState(false);

	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title="Nouvelle brique de style rédactionnel"
				subtitle="Ton, argumentaire, formules — utilisés par l'IA pour guider la génération."
				icon={<MessageSquareQuote />}
				showBackButton
			/>

			<FlatCard className="p-6">
				<VoiceBlockForm
					initial={createDefaultVoiceForm()}
					submitLabel="Créer la brique"
					submitting={submitting}
					onSubmit={async (v) => {
						if (!v.nameFr.trim()) {
							toast.error("Nom requis");
							return;
						}
						const cleaned = cleanVoiceForSubmit(v);
						setSubmitting(true);
						try {
							await createBlock({
								name: { fr: v.nameFr },
								description: v.descFr ? { fr: v.descFr } : undefined,
								tone: v.tone,
								register: v.register,
								openingFormulas: cleaned.openingFormulas,
								closingFormulas: cleaned.closingFormulas,
								signatureFormulas: cleaned.signatureFormulas,
								personPronoun: v.personPronoun,
								useFormalAddress: v.useFormalAddress,
								politenessLevel: v.politenessLevel,
								argumentationGuidelines: v.argumentationGuidelines || undefined,
								vocabularyPreferences: cleaned.vocabularyPreferences,
								isGlobal: true,
								isDefault: v.isDefault,
							});
							toast.success("Brique créée");
							router.push("/config/templates");
						} catch (err) {
							toast.error(
								err instanceof Error ? err.message : "Échec de la création",
							);
						} finally {
							setSubmitting(false);
						}
					}}
				/>
			</FlatCard>
		</div>
	);
}
