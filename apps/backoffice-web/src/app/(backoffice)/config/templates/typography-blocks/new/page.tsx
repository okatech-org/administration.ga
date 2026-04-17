"use client";

import { api } from "@convex/_generated/api";
import { Type } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
	TypographyBlockForm,
	createDefaultTypographyForm,
} from "@/components/config/TypographyBlockForm";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { useConvexMutationQuery } from "@/integrations/convex/hooks";

export default function NewTypographyBlockPage() {
	const router = useRouter();
	const { mutateAsync: createBlock } = useConvexMutationQuery(
		api.functions.templateTypographyBlocks.create,
	);
	const [submitting, setSubmitting] = useState(false);

	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title="Nouvelle brique typographie"
				subtitle="Police, tailles, interlignage, sauts de page — réutilisable entre modèles."
				icon={<Type />}
				showBackButton
			/>

			<FlatCard className="p-6">
				<TypographyBlockForm
					initial={createDefaultTypographyForm()}
					submitLabel="Créer la brique"
					submitting={submitting}
					onSubmit={async (v) => {
						if (!v.nameFr.trim()) {
							toast.error("Nom requis");
							return;
						}
						setSubmitting(true);
						try {
							await createBlock({
								name: { fr: v.nameFr },
								description: v.descFr ? { fr: v.descFr } : undefined,
								fontFamily: v.fontFamily,
								fontSizeBase: v.fontSizeBase,
								lineHeight: v.lineHeight,
								defaultAlignment: v.defaultAlignment,
								headingStyles: v.headingStyles,
								paragraphSpacingBefore: v.paragraphSpacingBefore,
								paragraphSpacingAfter: v.paragraphSpacingAfter,
								paragraphFirstLineIndent: v.paragraphFirstLineIndent,
								pageBreakBefore: v.pageBreakBefore,
								widowOrphanControl: v.widowOrphanControl,
								keepHeadingsWithNext: v.keepHeadingsWithNext,
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
