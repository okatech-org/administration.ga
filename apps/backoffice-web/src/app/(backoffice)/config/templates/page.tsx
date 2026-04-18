"use client";

/**
 * Bibliothèque super-admin des modèles de documents globaux.
 *
 * Un modèle encapsule son propre contenu Tiptap + ses 3 facettes
 * structurelles (entête/pied, typographie, voix IA) inline.
 *
 * UI : sidebar de sous-dossiers/types (avec compteurs dynamiques) + barre
 * d'outils (search + tri + bouton création) + grille de vignettes A4. Les
 * 25 modèles diplomatiques issus du seed sont répartis dans 5 sous-dossiers
 * dérivés de leur description ; le récépissé et les modèles custom
 * apparaissent dans « Autres ».
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { LayoutTemplate } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
	TemplatesGrid,
} from "@/components/admin/TemplatesGrid";
import { TemplatesSidebar } from "@/components/admin/TemplatesSidebar";
import { TemplatesToolbar } from "@/components/admin/TemplatesToolbar";
import type { TemplateThumbnailData } from "@/components/admin/TemplateThumbnailCard";
import { PageHeader } from "@/components/design-system/page-header";
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
import { useTemplatesFilter } from "@/hooks/useTemplatesFilter";
import {
	useConvexMutationQuery,
	useConvexQuery,
} from "@/integrations/convex/hooks";

export default function GlobalTemplatesPage() {
	const { t, i18n } = useTranslation();
	const router = useRouter();

	const { data: templates, isLoading } = useConvexQuery(
		api.functions.documentTemplates.listGlobal,
		{},
	);
	const { mutateAsync: removeTemplate } = useConvexMutationQuery(
		api.functions.documentTemplates.remove,
	);

	const {
		filtered,
		query,
		setQuery,
		subfolder,
		setSubfolder,
		templateType,
		setTemplateType,
		sortOrder,
		setSortOrder,
		countsBySubfolder,
		countsByType,
		totalCount,
	} = useTemplatesFilter(templates);

	const [confirmDeleteId, setConfirmDeleteId] =
		useState<Id<"documentTemplates"> | null>(null);
	const [deleting, setDeleting] = useState(false);

	const confirmTarget = templates?.find((tpl) => tpl._id === confirmDeleteId) as
		| TemplateThumbnailData
		| undefined;

	const isFiltered =
		query.trim().length > 0 || subfolder !== "all" || templateType !== "all";

	function clearFilters() {
		setQuery("");
		setSubfolder("all");
		setTemplateType("all");
	}

	async function handleConfirmDelete() {
		if (!confirmDeleteId) return;
		setDeleting(true);
		try {
			await removeTemplate({ templateId: confirmDeleteId });
			toast.success("Modèle archivé");
			setConfirmDeleteId(null);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Échec de la suppression");
		} finally {
			setDeleting(false);
		}
	}

	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title={t("templates.global.page.title")}
				subtitle={t("templates.global.page.subtitle")}
				icon={<LayoutTemplate />}
			/>

			<div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[260px_1fr]">
				<TemplatesSidebar
					subfolder={subfolder}
					onSubfolderChange={setSubfolder}
					templateType={templateType}
					onTemplateTypeChange={setTemplateType}
					totalCount={totalCount}
					countsBySubfolder={countsBySubfolder}
					countsByType={countsByType}
				/>

				<div className="flex flex-col gap-4">
					<TemplatesToolbar
						query={query}
						onQueryChange={setQuery}
						sortOrder={sortOrder}
						onSortOrderChange={setSortOrder}
						onCreate={() => router.push("/config/templates/new")}
						resultCount={filtered.length}
						totalCount={totalCount}
					/>

					{isLoading ? (
						<div className="rounded-xl bg-secondary p-6 text-sm text-muted-foreground">
							{t("templates.global.page.loading")}
						</div>
					) : (
						<TemplatesGrid
							templates={filtered}
							locale={i18n.language}
							isFiltered={isFiltered}
							onOpen={(id) => router.push(`/config/templates/${id}`)}
							onDelete={(id) => setConfirmDeleteId(id)}
							onCreate={() => router.push("/config/templates/new")}
							onClearFilters={clearFilters}
						/>
					)}
				</div>
			</div>

			<AlertDialog
				open={!!confirmDeleteId}
				onOpenChange={(open) => !open && setConfirmDeleteId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Supprimer ce modèle ?</AlertDialogTitle>
						<AlertDialogDescription>
							{confirmTarget ? (
								<>
									Le modèle{" "}
									<span className="font-medium">
										« {confirmTarget.name.fr ?? confirmTarget.name.en} »
									</span>{" "}
									sera archivé (suppression douce). Les documents déjà générés à
									partir de ce modèle restent intacts. Cette action peut être
									annulée par un développeur si nécessaire.
								</>
							) : null}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmDelete}
							disabled={deleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleting ? "Suppression…" : "Supprimer"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
