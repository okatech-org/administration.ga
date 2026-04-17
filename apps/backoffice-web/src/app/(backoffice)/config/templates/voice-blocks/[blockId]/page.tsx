"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { MessageSquareQuote } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
	VoiceBlockForm,
	type VoiceFormValue,
	cleanVoiceForSubmit,
} from "@/components/config/VoiceBlockForm";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { useConvexMutationQuery, useConvexQuery } from "@/integrations/convex/hooks";

export default function EditVoiceBlockPage() {
	const params = useParams();
	const router = useRouter();
	const blockId = params.blockId as Id<"templateVoiceBlocks">;

	const { data: block, isLoading } = useConvexQuery(
		api.functions.templateVoiceBlocks.getById,
		{ blockId },
	);
	const { mutateAsync: updateBlock } = useConvexMutationQuery(
		api.functions.templateVoiceBlocks.update,
	);
	const { mutateAsync: removeBlock } = useConvexMutationQuery(
		api.functions.templateVoiceBlocks.remove,
	);
	const [submitting, setSubmitting] = useState(false);

	if (isLoading || !block) {
		return <div className="p-6 text-sm text-muted-foreground">Chargement…</div>;
	}

	const initial: VoiceFormValue = {
		nameFr: block.name.fr ?? "",
		descFr: block.description?.fr ?? "",
		tone: block.tone,
		register: block.register,
		openingFormulas: (block.openingFormulas ?? []).map((f) => ({
			text: f.text,
			templateType: f.templateType,
		})),
		closingFormulas: (block.closingFormulas ?? []).map((f) => ({
			text: f.text,
			templateType: f.templateType,
		})),
		signatureFormulas: block.signatureFormulas ?? [],
		personPronoun: block.personPronoun,
		useFormalAddress: block.useFormalAddress ?? true,
		politenessLevel: block.politenessLevel,
		argumentationGuidelines: block.argumentationGuidelines ?? "",
		vocabularyPreferences: (block.vocabularyPreferences ?? []).map((v) => ({
			prefer: v.prefer,
			avoid: v.avoid ?? [],
		})),
		isDefault: block.isDefault ?? false,
	};

	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title={block.name.fr ?? block.name.en ?? "Brique voix / argumentaire"}
				subtitle="Édition de la brique"
				icon={<MessageSquareQuote />}
				showBackButton
			/>

			<FlatCard className="p-6">
				<VoiceBlockForm
					initial={initial}
					submitLabel="Enregistrer"
					submitting={submitting}
					onSubmit={async (v) => {
						const cleaned = cleanVoiceForSubmit(v);
						setSubmitting(true);
						try {
							await updateBlock({
								blockId,
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
								isDefault: v.isDefault,
							});
							toast.success("Brique enregistrée");
						} catch (err) {
							toast.error(
								err instanceof Error ? err.message : "Échec de l'enregistrement",
							);
						} finally {
							setSubmitting(false);
						}
					}}
					onDelete={async () => {
						if (!confirm("Archiver cette brique ?")) return;
						try {
							await removeBlock({ blockId });
							toast.success("Brique archivée");
							router.push("/config/templates");
						} catch (err) {
							toast.error(
								err instanceof Error ? err.message : "Échec de l'archivage",
							);
						}
					}}
				/>
			</FlatCard>
		</div>
	);
}
