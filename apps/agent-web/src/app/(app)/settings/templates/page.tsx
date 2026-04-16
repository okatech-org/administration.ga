"use client";

/**
 * Gestion des modèles de documents au niveau de l'organisation (agent).
 *
 * Liste les templates org + un bouton « Cloner depuis global » qui ouvre un
 * dialog avec la bibliothèque globale filtrée par type d'organisation. Chaque
 * entrée clique vers la page d'édition dédiée.
 */

import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { FileText, Loader2, Plus, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { FlatCard } from "@/components/my-space/flat-card";
import { useOrg } from "@/components/org/org-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";

export default function OrgTemplatesPage() {
	const router = useRouter();
	const { activeOrgId } = useOrg();
	const [cloneOpen, setCloneOpen] = useState(false);

	const { data: templates, isLoading } = useAuthenticatedConvexQuery(
		api.functions.documentTemplates.listByOrg,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	if (!activeOrgId) {
		return (
			<div className="p-6 text-sm text-muted-foreground">
				Aucune organisation active.
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6 p-4 md:p-6">
			<header className="flex flex-wrap items-center gap-3">
				<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
					<FileText className="h-5 w-5" />
				</div>
				<div className="flex-1">
					<h1 className="text-xl font-bold">Modèles de documents</h1>
					<p className="text-sm text-muted-foreground">
						Les modèles de ton organisation + les modèles globaux disponibles.
					</p>
				</div>
				<Button onClick={() => setCloneOpen(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Cloner depuis un modèle global
				</Button>
			</header>

			<FlatCard className="p-0">
				{isLoading ? (
					<div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						Chargement…
					</div>
				) : !templates || templates.length === 0 ? (
					<div className="flex flex-col items-center gap-3 p-10 text-center">
						<FileText className="h-8 w-8 text-muted-foreground" />
						<div>
							<p className="font-medium">Aucun modèle disponible</p>
							<p className="mt-1 text-sm text-muted-foreground">
								Clone un modèle global pour l'adapter à ta représentation.
							</p>
						</div>
						<Button onClick={() => setCloneOpen(true)}>
							<Plus className="mr-2 h-4 w-4" />
							Cloner depuis un modèle global
						</Button>
					</div>
				) : (
					<ul className="divide-y">
						{templates.map((t) => (
							<TemplateRow
								key={t._id}
								template={t}
								orgId={activeOrgId}
								onOpen={(id) => router.push(`/settings/templates/${id}`)}
							/>
						))}
					</ul>
				)}
			</FlatCard>

			<CloneFromGlobalDialog
				open={cloneOpen}
				onOpenChange={setCloneOpen}
				orgId={activeOrgId}
				onCloned={(id) => {
					setCloneOpen(false);
					router.push(`/settings/templates/${id}`);
				}}
			/>
		</div>
	);
}

function TemplateRow({
	template,
	orgId,
	onOpen,
}: {
	template: Doc<"documentTemplates">;
	orgId: Id<"orgs">;
	onOpen: (id: Id<"documentTemplates">) => void;
}) {
	const title = template.name.fr ?? template.name.en ?? "(sans titre)";
	const description = template.description?.fr ?? template.description?.en;

	// For cloned org templates, check if the source has a newer version.
	const { data: sourceStatus } = useAuthenticatedConvexQuery(
		api.functions.documentTemplates.getSourceUpdateStatus,
		template.isGlobal ? "skip" : { templateId: template._id },
	);

	const canOpen = !template.isGlobal;

	return (
		<li
			className={`flex items-center justify-between gap-4 px-5 py-4 transition-colors ${
				canOpen ? "hover:bg-muted/40 cursor-pointer" : "opacity-80"
			}`}
			onClick={() => {
				if (canOpen) onOpen(template._id);
			}}
		>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="font-medium">{title}</span>
					{template.isGlobal ? (
						<Badge variant="outline" className="text-xs">
							Global
						</Badge>
					) : (
						<Badge variant="secondary" className="text-xs">
							Org
						</Badge>
					)}
					{sourceStatus ? (
						<Badge className="bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-200">
							Mise à jour source disponible
						</Badge>
					) : null}
				</div>
				{description ? (
					<div className="mt-0.5 text-sm text-muted-foreground">{description}</div>
				) : null}
				<div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
					<span className="rounded bg-muted px-1.5 py-0.5 uppercase tracking-wide">
						{template.templateType}
					</span>
					<span>v{template.version ?? 1}</span>
					{template.updatedAt ? (
						<span>— maj {new Date(template.updatedAt).toLocaleDateString("fr-FR")}</span>
					) : null}
				</div>
			</div>
			{canOpen ? (
				<span className="text-sm text-muted-foreground">Ouvrir →</span>
			) : (
				<CloneFromRowButton templateId={template._id} orgId={orgId} />
			)}
		</li>
	);
}

function CloneFromRowButton({
	templateId,
	orgId,
}: {
	templateId: Id<"documentTemplates">;
	orgId: Id<"orgs">;
}) {
	const router = useRouter();
	const { mutateAsync: clone, isPending } = useConvexMutationQuery(
		api.functions.documentTemplates.cloneFromGlobal,
	);
	return (
		<Button
			size="sm"
			variant="outline"
			onClick={async (e) => {
				e.stopPropagation();
				try {
					const id = await clone({ globalTemplateId: templateId, orgId });
					toast.success("Modèle cloné");
					router.push(`/settings/templates/${id}`);
				} catch (err) {
					toast.error(err instanceof Error ? err.message : "Échec du clonage");
				}
			}}
			disabled={isPending}
		>
			<Sparkles className="mr-2 h-3.5 w-3.5" />
			Cloner
		</Button>
	);
}

function CloneFromGlobalDialog({
	open,
	onOpenChange,
	orgId,
	onCloned,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	orgId: Id<"orgs">;
	onCloned: (id: Id<"documentTemplates">) => void;
}) {
	const { data: globals, isLoading } = useAuthenticatedConvexQuery(
		api.functions.documentTemplates.listGlobalForOrg,
		open ? { orgId } : "skip",
	);

	const { mutateAsync: clone, isPending } = useConvexMutationQuery(
		api.functions.documentTemplates.cloneFromGlobal,
	);

	async function doClone(templateId: Id<"documentTemplates">) {
		try {
			const id = await clone({ globalTemplateId: templateId, orgId });
			toast.success("Modèle cloné");
			onCloned(id);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Échec du clonage");
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Cloner depuis un modèle global</DialogTitle>
					<DialogDescription>
						Seuls les modèles accessibles à ton type d'organisation apparaissent
						ici. Le clone devient modifiable sous ton organisation.
					</DialogDescription>
				</DialogHeader>

				{isLoading ? (
					<div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						Chargement…
					</div>
				) : !globals || globals.length === 0 ? (
					<div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
						Aucun modèle global accessible à ton type d'organisation.
					</div>
				) : (
					<ul className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
						{globals.map((g) => (
							<li
								key={g._id}
								className="flex items-center justify-between gap-3 rounded-md border bg-background p-3"
							>
								<div className="min-w-0 flex-1">
									<div className="font-medium">
										{g.name.fr ?? g.name.en ?? "(sans titre)"}
									</div>
									{g.description?.fr ? (
										<div className="mt-0.5 text-xs text-muted-foreground">
											{g.description.fr}
										</div>
									) : null}
									<div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
										<span className="rounded bg-muted px-1.5 py-0.5 uppercase">
											{g.templateType}
										</span>
										<span>v{g.version ?? 1}</span>
									</div>
								</div>
								<Button size="sm" onClick={() => doClone(g._id)} disabled={isPending}>
									Cloner
								</Button>
							</li>
						))}
					</ul>
				)}

				<DialogFooter>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						Fermer
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
