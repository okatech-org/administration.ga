"use client";

/**
 * Création d'une brique « Entête / Pied de page » globale.
 */

import { api } from "@convex/_generated/api";
import { Palette } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
	HeaderFooterBlockForm,
	createDefaultHeaderFooterForm,
	textToTiptap,
} from "@/components/config/HeaderFooterBlockForm";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { useConvexMutationQuery } from "@/integrations/convex/hooks";

export default function NewHeaderFooterBlockPage() {
	const router = useRouter();
	const { mutateAsync: createBlock } = useConvexMutationQuery(
		api.functions.templateHeaderFooterBlocks.create,
	);
	const [submitting, setSubmitting] = useState(false);

	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title="Nouvelle brique entête / pied"
				subtitle="Logo, titre institutionnel et pied de page — réutilisables entre modèles."
				icon={<Palette />}
				showBackButton
			/>

			<FlatCard className="p-6">
				<HeaderFooterBlockForm
					initial={createDefaultHeaderFooterForm()}
					submitLabel="Créer la brique"
					submitting={submitting}
					onSubmit={async (value) => {
						if (!value.nameFr.trim()) {
							toast.error("Nom requis");
							return;
						}
						setSubmitting(true);
						try {
							await createBlock({
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
								isGlobal: true,
								isDefault: value.isDefault,
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
