"use client";

/**
 * Edit a global template — rich Tiptap editor + placeholder manager.
 *
 * This page is lazy (client-only) because the Tiptap editor uses browser-only
 * APIs. It loads the current template from Convex, lets the super-admin edit
 * the content and the placeholder list, and persists through
 * `documentTemplates.update` which archives the previous version.
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
import { FileText, History, Lock, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { OrgTypeAccessPicker } from "@/components/config/OrgTypeAccessPicker";
import { toast } from "sonner";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
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
import { useConvexMutationQuery, useConvexQuery } from "@/integrations/convex/hooks";

const SOURCES: Array<{ value: PlaceholderSource; label: string }> = [
	{ value: "user", label: "Utilisateur" },
	{ value: "profile", label: "Profil" },
	{ value: "request", label: "Demande" },
	{ value: "formData", label: "Formulaire" },
	{ value: "org", label: "Organisation" },
	{ value: "system", label: "Système" },
];

export default function EditTemplatePage() {
	const params = useParams();
	const router = useRouter();
	const templateId = params.templateId as Id<"documentTemplates">;

	const { data: template, isLoading } = useConvexQuery(
		api.functions.documentTemplates.getById,
		{ templateId },
	);

	const { mutateAsync: updateTemplate } = useConvexMutationQuery(
		api.functions.documentTemplates.update,
	);

	const [content, setContent] = useState<TiptapDocument | null>(null);
	const [placeholders, setPlaceholders] = useState<PlaceholderDescriptor[] | null>(null);
	const [allowedOrgTypes, setAllowedOrgTypes] = useState<string[] | undefined | null>(null);
	const [newKey, setNewKey] = useState("");
	const [newLabel, setNewLabel] = useState("");
	const [newSource, setNewSource] = useState<PlaceholderSource>("formData");
	const [saving, setSaving] = useState(false);

	// Initialize local state once template arrives. Using useMemo here as a
	// write-once pattern: `null` means "not yet hydrated", anything else is
	// editor state.
	useMemo(() => {
		if (template && content === null) {
			setContent(template.content as TiptapDocument);
			setPlaceholders(
				(template.placeholders ?? []) as unknown as PlaceholderDescriptor[],
			);
			setAllowedOrgTypes(template.allowedOrgTypes ?? undefined);
		}
	}, [template, content]);

	if (isLoading || !template) {
		return <div className="p-6 text-sm text-muted-foreground">Chargement…</div>;
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
		if (allowedOrgTypes && Array.isArray(allowedOrgTypes) && allowedOrgTypes.length === 0) {
			toast.error(
				"Coche au moins un type d'organisation autorisé ou désactive la restriction",
			);
			return;
		}
		setSaving(true);
		try {
			const html = renderDocumentToHtml(workingContent);
			await updateTemplate({
				templateId,
				content: workingContent,
				contentHtml: html,
				placeholders: workingPlaceholders as unknown as never,
				allowedOrgTypes: (allowedOrgTypes ?? undefined) as never,
			});
			toast.success("Modèle enregistré");
		} catch (err) {
			const message = err instanceof Error ? err.message : "Échec de l'enregistrement";
			toast.error(message);
		} finally {
			setSaving(false);
		}
	}

	const title = template.name.fr ?? template.name.en ?? "Modèle sans titre";

	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title={title}
				subtitle={`Type: ${template.templateType} — version ${template.version ?? 1}`}
				icon={<FileText />}
				showBackButton
				actions={
					<div className="flex items-center gap-2">
						<Button variant="outline" asChild>
							<Link href={`/config/templates/${templateId}/versions`}>
								<History className="mr-2 h-4 w-4" />
								Historique
							</Link>
						</Button>
						<Button onClick={save} disabled={saving}>
							<Save className="mr-2 h-4 w-4" />
							{saving ? "Enregistrement…" : "Enregistrer"}
						</Button>
					</div>
				}
			/>

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
							version d'origine et ne sont pas affectés.
						</p>
					</div>
				</div>
			) : null}

			{/* ─── Layout 2 colonnes : éditeur à gauche, config à droite ─── */}
			<div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
				{/* Éditeur — toolbar + page A4 */}
				<FlatCard className="min-w-0 flex-1 p-4">
					<TemplateEditor
						initialContent={workingContent}
						onChange={(doc) => setContent(doc)}
						paperSize={template.paperSize ?? "A4"}
						orientation={template.orientation ?? "portrait"}
					/>
				</FlatCard>

				{/* Sidebar droite — toutes les configurations du modèle */}
				<aside className="flex w-full shrink-0 flex-col gap-4 lg:w-96 lg:overflow-y-auto">
					{template.isGlobal ? (
						<FlatCard className="p-4">
							<OrgTypeAccessPicker
								value={allowedOrgTypes === null ? undefined : allowedOrgTypes}
								onChange={(next) => setAllowedOrgTypes(next)}
							/>
						</FlatCard>
					) : null}

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
				<Button variant="ghost" onClick={() => router.push("/config/templates")}>
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
		// Parent validates (clé vide silencieuse, duplicata avec toast).
		// On ne ferme la sheet qu'après un ajout effectif pour laisser le toast
		// d'erreur visible et permettre la correction sans réouvrir la sheet.
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
					Les variables déclarées ici apparaissent dans l'éditeur et sont remplies à la
					génération avec les données de la demande.
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
