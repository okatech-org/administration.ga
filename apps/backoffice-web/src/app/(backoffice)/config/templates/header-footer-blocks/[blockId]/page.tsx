"use client";

/**
 * Édition d'une brique « Entête / Pied de page ».
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Palette } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
	HeaderFooterBlockForm,
	type HeaderFooterFormValue,
	type TemplateTypeLiteral,
	textToTiptap,
	tiptapToText,
} from "@/components/config/HeaderFooterBlockForm";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { useConvexMutationQuery, useConvexQuery } from "@/integrations/convex/hooks";

export default function EditHeaderFooterBlockPage() {
	const params = useParams();
	const router = useRouter();
	const blockId = params.blockId as Id<"templateHeaderFooterBlocks">;

	const { data: block, isLoading } = useConvexQuery(
		api.functions.templateHeaderFooterBlocks.getById,
		{ blockId },
	);
	const { mutateAsync: updateBlock } = useConvexMutationQuery(
		api.functions.templateHeaderFooterBlocks.update,
	);
	const { mutateAsync: removeBlock } = useConvexMutationQuery(
		api.functions.templateHeaderFooterBlocks.remove,
	);
	const [submitting, setSubmitting] = useState(false);

	if (isLoading || !block) {
		return (
			<div className="p-6 text-sm text-muted-foreground">Chargement…</div>
		);
	}

	const initial: HeaderFooterFormValue = {
		nameFr: block.name.fr ?? "",
		descFr: block.description?.fr ?? "",
		applicableTemplateTypes: block.applicableTemplateTypes as
			| TemplateTypeLiteral[]
			| undefined,
		header: {
			logoStorageId: block.header.logoStorageId,
			logoAlignment: block.header.logoAlignment,
			height: block.header.height ?? 30,
			textContent: tiptapToText(block.header.content),
		},
		footer: {
			height: block.footer.height ?? 15,
			showPageNumbers: block.footer.showPageNumbers ?? true,
			textContent: tiptapToText(block.footer.content),
		},
		isDefault: block.isDefault ?? false,
	};

	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title={block.name.fr ?? block.name.en ?? "Brique entête / pied"}
				subtitle="Édition de la brique"
				icon={<Palette />}
				showBackButton
			/>

			<FlatCard className="p-6">
				<HeaderFooterBlockForm
					initial={initial}
					submitLabel="Enregistrer"
					submitting={submitting}
					onSubmit={async (value) => {
						setSubmitting(true);
						try {
							await updateBlock({
								blockId,
								name: { fr: value.nameFr },
								description: value.descFr ? { fr: value.descFr } : undefined,
								applicableTemplateTypes: value.applicableTemplateTypes,
								header: {
									logoAlignment: value.header.logoAlignment,
									height: value.header.height,
									content: textToTiptap(value.header.textContent),
								},
								footer: {
									height: value.footer.height,
									showPageNumbers: value.footer.showPageNumbers,
									content: textToTiptap(value.footer.textContent),
								},
								isDefault: value.isDefault,
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
						if (!confirm("Archiver cette brique ? Les modèles qui la réfèrent continueront de fonctionner avec les valeurs par défaut.")) {
							return;
						}
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
