"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Type } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
	TypographyBlockForm,
	type TypographyFormValue,
} from "@/components/config/TypographyBlockForm";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { useConvexMutationQuery, useConvexQuery } from "@/integrations/convex/hooks";

export default function EditTypographyBlockPage() {
	const params = useParams();
	const router = useRouter();
	const blockId = params.blockId as Id<"templateTypographyBlocks">;

	const { data: block, isLoading } = useConvexQuery(
		api.functions.templateTypographyBlocks.getById,
		{ blockId },
	);
	const { mutateAsync: updateBlock } = useConvexMutationQuery(
		api.functions.templateTypographyBlocks.update,
	);
	const { mutateAsync: removeBlock } = useConvexMutationQuery(
		api.functions.templateTypographyBlocks.remove,
	);
	const [submitting, setSubmitting] = useState(false);

	if (isLoading || !block) {
		return <div className="p-6 text-sm text-muted-foreground">Chargement…</div>;
	}

	const initial: TypographyFormValue = {
		nameFr: block.name.fr ?? "",
		descFr: block.description?.fr ?? "",
		fontFamily: block.fontFamily,
		fontSizeBase: block.fontSizeBase,
		lineHeight: block.lineHeight,
		defaultAlignment: block.defaultAlignment,
		headingStyles: {
			h1: {
				fontSize: block.headingStyles.h1.fontSize,
				bold: block.headingStyles.h1.bold,
				uppercase: block.headingStyles.h1.uppercase,
				spacingBefore: block.headingStyles.h1.spacingBefore ?? 0,
				spacingAfter: block.headingStyles.h1.spacingAfter ?? 0,
				alignment: block.headingStyles.h1.alignment ?? "center",
			},
			h2: {
				fontSize: block.headingStyles.h2.fontSize,
				bold: block.headingStyles.h2.bold,
				uppercase: block.headingStyles.h2.uppercase,
				spacingBefore: block.headingStyles.h2.spacingBefore ?? 0,
				spacingAfter: block.headingStyles.h2.spacingAfter ?? 0,
				alignment: block.headingStyles.h2.alignment ?? "left",
			},
			h3: {
				fontSize: block.headingStyles.h3.fontSize,
				bold: block.headingStyles.h3.bold,
				uppercase: block.headingStyles.h3.uppercase,
				spacingBefore: block.headingStyles.h3.spacingBefore ?? 0,
				spacingAfter: block.headingStyles.h3.spacingAfter ?? 0,
				alignment: block.headingStyles.h3.alignment ?? "left",
			},
		},
		paragraphSpacingBefore: block.paragraphSpacingBefore ?? 0,
		paragraphSpacingAfter: block.paragraphSpacingAfter ?? 0,
		paragraphFirstLineIndent: block.paragraphFirstLineIndent ?? 0,
		pageBreakBefore: (block.pageBreakBefore ?? []) as Array<"h1" | "h2" | "h3">,
		widowOrphanControl: block.widowOrphanControl ?? true,
		keepHeadingsWithNext: block.keepHeadingsWithNext ?? true,
		isDefault: block.isDefault ?? false,
	};

	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title={block.name.fr ?? block.name.en ?? "Brique typographie"}
				subtitle="Édition de la brique"
				icon={<Type />}
				showBackButton
			/>

			<FlatCard className="p-6">
				<TypographyBlockForm
					initial={initial}
					submitLabel="Enregistrer"
					submitting={submitting}
					onSubmit={async (v) => {
						setSubmitting(true);
						try {
							await updateBlock({
								blockId,
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
