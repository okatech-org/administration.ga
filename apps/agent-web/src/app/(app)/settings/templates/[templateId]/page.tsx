"use client";

/**
 * Édition d'un modèle de documents au niveau de l'organisation (agent).
 *
 * - Réutilise `<TemplateEditor />` partagé avec le backoffice.
 * - Gère la liste des placeholders dynamiques.
 * - Affiche une bannière « mise à jour disponible » quand le modèle est un
 *   clone dont la source a été mise à jour + bouton de synchronisation.
 * - Lien vers l'historique des versions.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { TemplateEditor } from "@workspace/document-editor";
import type {
	PlaceholderDescriptor,
	PlaceholderSource,
	TiptapDocument,
} from "@workspace/document-rendering/types";
import { renderDocumentToHtml } from "@workspace/document-rendering/html";
import {
	ArrowLeft,
	FileText,
	Loader2,
	Lock,
	Plus,
	RefreshCw,
	Save,
	Trash2,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FlatCard } from "@/components/my-space/flat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";

const SOURCES: Array<{ value: PlaceholderSource; label: string }> = [
	{ value: "user", label: "Utilisateur" },
	{ value: "profile", label: "Profil" },
	{ value: "request", label: "Demande" },
	{ value: "formData", label: "Formulaire" },
	{ value: "org", label: "Organisation" },
	{ value: "system", label: "Système" },
];

export default function OrgTemplateEditPage() {
	const params = useParams();
	const router = useRouter();
	const templateId = params.templateId as Id<"documentTemplates">;

	const { data: template, isLoading } = useAuthenticatedConvexQuery(
		api.functions.documentTemplates.getById,
		{ templateId },
	);
	const { data: sourceStatus } = useAuthenticatedConvexQuery(
		api.functions.documentTemplates.getSourceUpdateStatus,
		{ templateId },
	);

	const { mutateAsync: updateTemplate } = useConvexMutationQuery(
		api.functions.documentTemplates.update,
	);
	const { mutateAsync: syncFromSource, isPending: syncing } = useConvexMutationQuery(
		api.functions.documentTemplates.syncFromSource,
	);

	const [content, setContent] = useState<TiptapDocument | null>(null);
	const [placeholders, setPlaceholders] = useState<PlaceholderDescriptor[] | null>(null);
	const [newKey, setNewKey] = useState("");
	const [newLabel, setNewLabel] = useState("");
	const [newSource, setNewSource] = useState<PlaceholderSource>("formData");
	const [saving, setSaving] = useState(false);

	useMemo(() => {
		if (template && content === null) {
			setContent(template.content as TiptapDocument);
			setPlaceholders(
				(template.placeholders ?? []) as unknown as PlaceholderDescriptor[],
			);
		}
	}, [template, content]);

	if (isLoading || !template) {
		return (
			<div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
				<Loader2 className="h-4 w-4 animate-spin" />
				Chargement…
			</div>
		);
	}

	const workingContent = content ?? (template.content as TiptapDocument);
	const workingPlaceholders =
		placeholders ?? ((template.placeholders ?? []) as unknown as PlaceholderDescriptor[]);

	function addPlaceholder() {
		const key = newKey.trim();
		if (!key) return;
		if (workingPlaceholders.some((p) => p.key === key)) {
			toast.error("Clé déjà utilisée");
			return;
		}
		setPlaceholders([
			...workingPlaceholders,
			{
				key,
				label: { fr: newLabel.trim() || key },
				source: newSource,
			},
		]);
		setNewKey("");
		setNewLabel("");
	}

	function removePlaceholder(key: string) {
		setPlaceholders(workingPlaceholders.filter((p) => p.key !== key));
	}

	async function save() {
		setSaving(true);
		try {
			const html = renderDocumentToHtml(workingContent);
			await updateTemplate({
				templateId,
				content: workingContent,
				contentHtml: html,
				placeholders: workingPlaceholders as unknown as never,
			});
			toast.success("Modèle enregistré");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Échec de l'enregistrement");
		} finally {
			setSaving(false);
		}
	}

	async function onSync() {
		try {
			await syncFromSource({ templateId });
			toast.success("Modèle synchronisé depuis le modèle global");
			// Reset local state so the fresh template is re-hydrated.
			setContent(null);
			setPlaceholders(null);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Échec de la synchronisation");
		}
	}

	const title = template.name.fr ?? template.name.en ?? "Modèle sans titre";

	return (
		<div className="flex flex-col gap-6 p-4 md:p-6">
			<header className="flex items-center gap-3">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => router.push("/settings/templates")}
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
					<FileText className="h-5 w-5" />
				</div>
				<div className="flex-1">
					<div className="flex items-center gap-2">
						<h1 className="text-xl font-bold">{title}</h1>
						<Badge variant="secondary" className="text-xs">
							v{template.version ?? 1}
						</Badge>
					</div>
					<p className="text-sm text-muted-foreground">
						Type : {template.templateType}
					</p>
				</div>
				<Button onClick={save} disabled={saving}>
					<Save className="mr-2 h-4 w-4" />
					{saving ? "Enregistrement…" : "Enregistrer"}
				</Button>
			</header>

			{sourceStatus ? (
				<div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-900/20">
					<RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
					<div className="flex-1 text-sm">
						<p className="font-medium text-amber-900 dark:text-amber-200">
							Mise à jour disponible depuis le modèle global
						</p>
						<p className="mt-0.5 text-amber-900/80 dark:text-amber-300/80">
							Le modèle source est en version {sourceStatus.sourceVersion}, ton
							clone est basé sur la version {sourceStatus.cloneVersion}. La
							synchronisation archive ta version actuelle avant d'appliquer le
							contenu source — aucune perte.
						</p>
					</div>
					<Button onClick={onSync} disabled={syncing} size="sm">
						{syncing ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Synchronisation…
							</>
						) : (
							<>
								<RefreshCw className="mr-2 h-4 w-4" />
								Synchroniser
							</>
						)}
					</Button>
				</div>
			) : null}

			{template.lockedForEditing ? (
				<div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-900/20">
					<Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
					<div className="text-sm">
						<p className="font-medium text-amber-900 dark:text-amber-200">
							Modèle verrouillé en édition
						</p>
						<p className="mt-0.5 text-amber-900/80 dark:text-amber-300/80">
							Des documents ont déjà été générés à partir de ce modèle. Toute
							modification incrémentera la version et archivera l'état courant
							dans l'historique. Les documents déjà produits restent liés à leur
							version d'origine.
						</p>
					</div>
				</div>
			) : null}

			{/* ─── Layout 2 colonnes : éditeur à gauche, config à droite ─── */}
			<div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
				<FlatCard className="min-w-0 flex-1 p-4">
					<TemplateEditor
						initialContent={workingContent}
						onChange={(doc) => setContent(doc)}
						paperSize={template.paperSize ?? "A4"}
						orientation={template.orientation ?? "portrait"}
					/>
				</FlatCard>

				<aside className="flex w-full shrink-0 flex-col gap-4 lg:w-96 lg:overflow-y-auto">
					<FlatCard className="p-4">
						<PlaceholderManager
							placeholders={workingPlaceholders}
							onRemove={removePlaceholder}
							newKey={newKey}
							onNewKeyChange={setNewKey}
							newLabel={newLabel}
							onNewLabelChange={setNewLabel}
							newSource={newSource}
							onNewSourceChange={setNewSource}
							onAdd={addPlaceholder}
						/>
					</FlatCard>
				</aside>
			</div>

			<div className="flex justify-between">
				<Button variant="ghost" onClick={() => router.push("/settings/templates")}>
					Retour à la liste
				</Button>
				<Button onClick={save} disabled={saving}>
					<Save className="mr-2 h-4 w-4" />
					{saving ? "Enregistrement…" : "Enregistrer"}
				</Button>
			</div>
		</div>
	);
}

function PlaceholderManager({
	placeholders,
	onRemove,
	newKey,
	onNewKeyChange,
	newLabel,
	onNewLabelChange,
	newSource,
	onNewSourceChange,
	onAdd,
}: {
	placeholders: PlaceholderDescriptor[];
	onRemove: (key: string) => void;
	newKey: string;
	onNewKeyChange: (value: string) => void;
	newLabel: string;
	onNewLabelChange: (value: string) => void;
	newSource: PlaceholderSource;
	onNewSourceChange: (value: PlaceholderSource) => void;
	onAdd: () => void;
}) {
	const [sheetOpen, setSheetOpen] = useState(false);

	function handleAdd() {
		const trimmed = newKey.trim();
		if (!trimmed) return;
		const isDuplicate = placeholders.some((p) => p.key === trimmed);
		onAdd();
		if (!isDuplicate) setSheetOpen(false);
	}

	return (
		<div className="flex flex-col gap-4">
			<div>
				<div className="font-medium">Variables dynamiques</div>
				<div className="text-sm text-muted-foreground">
					Les variables déclarées ici apparaissent dans l'éditeur et sont remplies
					à la génération avec les données de la demande.
				</div>
			</div>

			{placeholders.length > 0 ? (
				<ul className="flex flex-wrap gap-2">
					{placeholders.map((p) => (
						<li
							key={p.key}
							className="flex items-center gap-2 rounded-md border bg-background px-2 py-1 text-sm"
						>
							<code className="font-mono text-xs">{`{{${p.key}}}`}</code>
							<span className="text-muted-foreground">— {p.label.fr ?? p.key}</span>
							<span className="rounded bg-muted px-1 text-[0.7rem] uppercase">
								{p.source}
							</span>
							<button
								type="button"
								className="text-muted-foreground hover:text-destructive"
								onClick={() => onRemove(p.key)}
								aria-label={`Supprimer ${p.key}`}
							>
								<Trash2 className="h-3.5 w-3.5" />
							</button>
						</li>
					))}
				</ul>
			) : (
				<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
					Aucune variable pour l'instant.
				</div>
			)}

			<Button type="button" onClick={() => setSheetOpen(true)}>
				<Plus className="mr-1 h-4 w-4" />
				Ajouter une variable
			</Button>

			<BottomSheet
				open={sheetOpen}
				onOpenChange={setSheetOpen}
				title="Ajouter une variable dynamique"
				maxHeight="85vh"
				footer={
					<div className="flex items-center justify-end gap-2">
						<Button variant="ghost" onClick={() => setSheetOpen(false)}>
							Annuler
						</Button>
						<Button onClick={handleAdd}>
							<Plus className="mr-1 h-4 w-4" />
							Ajouter
						</Button>
					</div>
				}
			>
				<div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
					<p className="text-sm text-muted-foreground">
						Les variables sont remplies à la génération avec les données de la
						demande (utilisateur, profil, formulaire, organisation, système).
					</p>

					<div className="grid gap-4 md:grid-cols-2">
						<div className="flex flex-col gap-1">
							<Label htmlFor="ph-key">Clé</Label>
							<Input
								id="ph-key"
								value={newKey}
								onChange={(e) => onNewKeyChange(e.target.value)}
								placeholder="firstName"
								autoFocus
							/>
						</div>
						<div className="flex flex-col gap-1">
							<Label htmlFor="ph-label">Libellé</Label>
							<Input
								id="ph-label"
								value={newLabel}
								onChange={(e) => onNewLabelChange(e.target.value)}
								placeholder="Prénom"
							/>
						</div>
						<div className="flex flex-col gap-1 md:col-span-2">
							<Label htmlFor="ph-source">Source</Label>
							<Select
								value={newSource}
								onValueChange={(v) => onNewSourceChange(v as PlaceholderSource)}
							>
								<SelectTrigger id="ph-source">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{SOURCES.map((s) => (
										<SelectItem key={s.value} value={s.value}>
											{s.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>
			</BottomSheet>
		</div>
	);
}
