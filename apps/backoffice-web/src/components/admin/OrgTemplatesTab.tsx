"use client";

/**
 * Volet « Modèles » d'une représentation.
 *
 * Affiche tous les modèles accessibles à cette représentation — en
 * miniature A4 — en distinguant :
 *
 *   - les modèles **explicitement attribués** (via `orgs.assignedTemplateIds`)
 *   - les modèles visibles via l'**applicabilité globale** (type d'org),
 *     marqués d'un badge « Auto »
 *
 * Deux boutons en tête :
 *   - « Attribuer des modèles » → `AssignTemplatesDialog` pour gérer les
 *     attributions explicites de cette rep
 *   - « Voir la bibliothèque » → raccourci vers `/config/templates`
 *
 * Le clic sur une vignette ouvre le modèle dans l'éditeur global
 * (`/config/templates/[id]`). Un bouton corbeille sur les attributions
 * explicites permet de les retirer en un clic (désaffecte sans supprimer
 * le modèle lui-même).
 */

import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import {
	FileSignature,
	FileStack,
	FileText,
	Library,
	Plus,
	Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AssignTemplatesDialog } from "@/components/admin/AssignTemplatesDialog";
import { PersonalizeTemplateDialog } from "@/components/admin/PersonalizeTemplateDialog";
import {
	TemplateThumbnailCard,
	type TemplateThumbnailData,
} from "@/components/admin/TemplateThumbnailCard";
import { FlatCard } from "@/components/design-system/flat-card";
import { Button } from "@/components/ui/button";
import {
	useConvexMutationQuery,
	useConvexQuery,
} from "@/integrations/convex/hooks";

export interface OrgTemplatesTabProps {
	orgId: Id<"orgs">;
}

export function OrgTemplatesTab({ orgId }: OrgTemplatesTabProps) {
	const { i18n } = useTranslation();
	const router = useRouter();

	// L'org doc (pour `assignedTemplateIds` + nom + type → dialog)
	const { data: org } = useConvexQuery(api.functions.orgs.getById, { orgId });

	// Tous les modèles accessibles à cette rep (union applicabilité + attribués)
	const { data: visibleTemplates, isLoading } = useConvexQuery(
		api.functions.documentTemplates.listByOrg,
		{ orgId },
	);

	const { mutateAsync: assignTemplates } = useConvexMutationQuery(
		api.functions.orgs.assignTemplates,
	);

	const [dialogOpen, setDialogOpen] = useState(false);
	const [personalizeTarget, setPersonalizeTarget] = useState<
		{ id: Id<"documentTemplates">; name: string } | null
	>(null);

	// Set des IDs explicitement attribués — sert à distinguer les vignettes
	// « Auto » des attributions explicites.
	const explicitIds = useMemo(() => {
		return new Set<string>(
			((org?.assignedTemplateIds ?? []) as Id<"documentTemplates">[]).map(
				(id) => id as unknown as string,
			),
		);
	}, [org?.assignedTemplateIds]);

	// On ne garde que les modèles globaux (isGlobal=true) — les templates
	// org-propres ne relèvent pas de l'attribution (ils appartiennent déjà
	// à la rep, édités via l'agent workspace).
	const globalTemplates = useMemo(() => {
		return ((visibleTemplates ?? []) as Array<Doc<"documentTemplates">>)
			.filter((t) => t.isGlobal)
			.map((t) => ({
				template: t as unknown as TemplateThumbnailData,
				isExplicit: explicitIds.has(t._id as unknown as string),
			}));
	}, [visibleTemplates, explicitIds]);

	async function unassignOne(templateId: Id<"documentTemplates">) {
		if (!org) return;
		const next = ((org.assignedTemplateIds ?? []) as Id<"documentTemplates">[])
			.filter((id) => (id as unknown as string) !== (templateId as unknown as string));
		try {
			await assignTemplates({ orgId, templateIds: next });
			toast.success("Modèle retiré de cette représentation");
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Échec du retrait",
			);
		}
	}

	return (
		<div className="flex flex-col gap-4">
			{/* Barre d'actions */}
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/20 px-4 py-3">
				<div className="flex items-center gap-2">
					<FileStack className="h-4 w-4 text-muted-foreground" />
					<div>
						<div className="text-sm font-medium">Modèles de documents</div>
						<div className="text-xs text-muted-foreground">
							{globalTemplates.length > 0
								? `${globalTemplates.length} modèle${globalTemplates.length > 1 ? "s" : ""} accessible${globalTemplates.length > 1 ? "s" : ""} (${explicitIds.size} attribué${explicitIds.size > 1 ? "s" : ""} explicitement)`
								: "Aucun modèle accessible à cette représentation pour l'instant."}
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => router.push(`/reps/${orgId}/branding`)}
						className="gap-1.5"
					>
						<FileSignature className="h-3.5 w-3.5" />
						Identité documentaire
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => router.push("/config/templates")}
						className="gap-1.5"
					>
						<Library className="h-3.5 w-3.5" />
						Voir la bibliothèque
					</Button>
					<Button
						size="sm"
						onClick={() => setDialogOpen(true)}
						className="gap-1.5"
						disabled={!org}
					>
						<Plus className="h-3.5 w-3.5" />
						Attribuer des modèles
					</Button>
				</div>
			</div>

			{/* Grille de vignettes ou état vide */}
			{isLoading ? (
				<FlatCard className="p-6">
					<div className="text-sm text-muted-foreground">Chargement…</div>
				</FlatCard>
			) : globalTemplates.length === 0 ? (
				<FlatCard>
					<div className="flex flex-col items-center gap-2 p-10 text-center">
						<FileText className="h-10 w-10 text-muted-foreground" />
						<p className="font-medium">Aucun modèle attribué</p>
						<p className="max-w-md text-sm text-muted-foreground">
							Cette représentation n'a pas encore de modèles globaux
							accessibles. Attribue-lui des modèles depuis la bibliothèque
							globale pour que iAsted puisse les utiliser dans ses
							générations de documents.
						</p>
						<Button
							className="mt-4"
							onClick={() => setDialogOpen(true)}
							disabled={!org}
						>
							<Plus className="mr-2 h-4 w-4" />
							Attribuer des modèles
						</Button>
					</div>
				</FlatCard>
			) : (
				<>
					{explicitIds.size > 0 ? (
						<Section title={`Attribués à cette représentation (${explicitIds.size})`}>
							<Grid>
								{globalTemplates
									.filter((x) => x.isExplicit)
									.map((x) => (
										<TemplateThumbnailCard
											key={x.template._id}
											template={x.template}
											locale={i18n.language}
											onOpen={() =>
												setPersonalizeTarget({
													id: x.template._id as Id<"documentTemplates">,
													name:
														(x.template.name as { fr?: string; en?: string }).fr ??
														(x.template.name as { fr?: string; en?: string }).en ??
														"Modèle",
												})
											}
											onDelete={() =>
												unassignOne(x.template._id as Id<"documentTemplates">)
											}
										/>
									))}
							</Grid>
						</Section>
					) : null}

					{globalTemplates.some((x) => !x.isExplicit) ? (
						<Section
							title={`Accessibles via le type « ${getOrgTypeLabel(org?.type)} » (${globalTemplates.filter((x) => !x.isExplicit).length})`}
							hint={
								<span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
									<Sparkles className="h-3 w-3" />
									Modèles visibles automatiquement — peuvent être épinglés via
									« Attribuer des modèles »
								</span>
							}
						>
							<Grid>
								{globalTemplates
									.filter((x) => !x.isExplicit)
									.map((x) => (
										<TemplateThumbnailCard
											key={x.template._id}
											template={x.template}
											locale={i18n.language}
											onOpen={() =>
												setPersonalizeTarget({
													id: x.template._id as Id<"documentTemplates">,
													name:
														(x.template.name as { fr?: string; en?: string }).fr ??
														(x.template.name as { fr?: string; en?: string }).en ??
														"Modèle",
												})
											}
											autoBadge
										/>
									))}
							</Grid>
						</Section>
					) : null}
				</>
			)}

			{/* Dialog d'attribution */}
			{dialogOpen && org ? (
				<AssignTemplatesDialog
					open={dialogOpen}
					onOpenChange={setDialogOpen}
					org={{
						_id: org._id,
						name: org.name,
						type: org.type,
						assignedTemplateIds: org.assignedTemplateIds,
					}}
				/>
			) : null}

			{/* Dialog de personnalisation d'un modèle */}
			{personalizeTarget ? (
				<PersonalizeTemplateDialog
					open={true}
					onOpenChange={(open) => !open && setPersonalizeTarget(null)}
					templateId={personalizeTarget.id}
					templateName={personalizeTarget.name}
					orgId={orgId}
				/>
			) : null}
		</div>
	);
}

// ─── Sous-composants de mise en page ────────────────────────────────────

function Section({
	title,
	hint,
	children,
}: {
	title: string;
	hint?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<section className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
				{hint}
			</div>
			{children}
		</section>
	);
}

function Grid({ children }: { children: React.ReactNode }) {
	return (
		<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{children}
		</div>
	);
}

// ─── Libellés types d'organisation (alignés sur `reps-grid`) ─────────────

const ORG_TYPE_LABELS: Record<string, string> = {
	embassy: "Ambassade",
	high_representation: "Haute Représentation",
	general_consulate: "Consulat Général",
	permanent_mission: "Mission Permanente",
	high_commission: "Haut-Commissariat",
	third_party: "Partenaire Tiers",
	consulate: "Consulat",
	honorary_consulate: "Consulat honoraire",
};

function getOrgTypeLabel(type?: string): string {
	if (!type) return "Type inconnu";
	return ORG_TYPE_LABELS[type] ?? type;
}
