"use client";

/**
 * Édition d'un modèle de documents au niveau de l'organisation (agent).
 *
 * - Réutilise `<TemplateEditor />` partagé avec le backoffice.
 * - Gère la liste des placeholders dynamiques.
 * - Affiche une bannière « mise à jour disponible » quand le modèle est un
 *   clone dont la source a été mise à jour + bouton de synchronisation.
 * - Lien vers l'historique des versions.
 * - Permet d'éditer la mise en page (format, orientation, marges) après
 *   création — ce que la sheet de création ne permet pas.
 * - Branche `onUploadImage` au storage Convex pour insérer des images via la
 *   toolbar de l'éditeur.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	TemplateAIDrawer,
	TemplateEditor,
	type TemplateAIInput,
	type TemplateAIResult,
} from "@workspace/document-editor";
import type {
	PlaceholderDescriptor,
	PlaceholderSource,
	TiptapDocument,
} from "@workspace/document-rendering/types";
import { renderDocumentToHtml } from "@workspace/document-rendering/html";
import { useConvex } from "convex/react";
import {
	ArrowLeft,
	FileText,
	Loader2,
	Lock,
	Plus,
	RefreshCw,
	Save,
	Settings2,
	Trash2,
} from "lucide-react";
import { useParams, useRouter } from "@workspace/routing";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FlatCard } from "../../components/my-space/flat-card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import { BottomSheet } from "@workspace/ui/components/bottom-sheet";
import { useOrg } from "../../shell/org-provider";
import {
	usePageContext,
	useRegisterPageAction,
} from "../../hooks/use-page-context";
import type {
	PageAction,
	PageEntity,
} from "../../stores/page-context-store";
import { useCanDoTask } from "../../hooks/useCanDoTask";
import {
	useAuthenticatedConvexQuery,
	useConvexActionQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";

const SOURCES: PlaceholderSource[] = [
	"user",
	"profile",
	"request",
	"formData",
	"org",
	"system",
];

interface LayoutDraft {
	paperSize: "A4" | "LETTER";
	orientation: "portrait" | "landscape";
	marginTop: number;
	marginRight: number;
	marginBottom: number;
	marginLeft: number;
}

const DEFAULT_LAYOUT: LayoutDraft = {
	paperSize: "A4",
	orientation: "portrait",
	marginTop: 20,
	marginRight: 20,
	marginBottom: 20,
	marginLeft: 20,
};

export default function TemplateEditorPage() {
	const { t } = useTranslation();
	const params = useParams();
	const router = useRouter();
	const templateId = params.templateId as Id<"documentTemplates">;
	const convex = useConvex();
	const { activeOrgId } = useOrg();
	const { canDo: canDoTask } = useCanDoTask(activeOrgId ?? undefined);
	const enableAI = canDoTask("documents.ai_generation");
	const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

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
	const { mutateAsync: syncFromSource, isPending: syncing } =
		useConvexMutationQuery(api.functions.documentTemplates.syncFromSource);
	const { mutateAsync: generateUploadUrl } = useConvexMutationQuery(
		api.functions.documents.generateUploadUrl,
	);
	const { mutateAsync: aiGenerateFromDocument } = useConvexActionQuery(
		api.functions.templateAI.generateFromDocument,
	);

	const [content, setContent] = useState<TiptapDocument | null>(null);
	const [placeholders, setPlaceholders] = useState<
		PlaceholderDescriptor[] | null
	>(null);
	const [layout, setLayout] = useState<LayoutDraft | null>(null);
	const [newKey, setNewKey] = useState("");
	const [newSource, setNewSource] = useState<PlaceholderSource>("formData");
	const [saving, setSaving] = useState(false);
	const [savingLayout, setSavingLayout] = useState(false);
	// Bumped when an AI generation result lands so the editor re-loads its
	// content (Tiptap doesn't react to initialContent changes after mount).
	const [contentRevision, setContentRevision] = useState(0);

	useMemo(() => {
		if (template && content === null) {
			setContent(template.content as TiptapDocument);
			setPlaceholders(
				(template.placeholders ?? []) as unknown as PlaceholderDescriptor[],
			);
		}
	}, [template, content]);

	useEffect(() => {
		if (template && layout === null) {
			setLayout({
				paperSize: template.paperSize ?? DEFAULT_LAYOUT.paperSize,
				orientation: template.orientation ?? DEFAULT_LAYOUT.orientation,
				marginTop: template.marginTop ?? DEFAULT_LAYOUT.marginTop,
				marginRight: template.marginRight ?? DEFAULT_LAYOUT.marginRight,
				marginBottom: template.marginBottom ?? DEFAULT_LAYOUT.marginBottom,
				marginLeft: template.marginLeft ?? DEFAULT_LAYOUT.marginLeft,
			});
		}
	}, [template, layout]);

	const onUploadImage = useCallback(
		async (file: File): Promise<{ src: string; storageId?: string }> => {
			const postUrl = await generateUploadUrl({});
			const result = await fetch(postUrl, {
				method: "POST",
				headers: { "Content-Type": file.type },
				body: file,
			});
			if (!result.ok) throw new Error("Upload failed");
			const { storageId } = (await result.json()) as { storageId: string };
			const url = await convex.query(api.functions.documents.getUrl, {
				storageId: storageId as unknown as Id<"_storage">,
			});
			return { src: url ?? "", storageId };
		},
		[convex, generateUploadUrl],
	);

	const onAIUploadFile = useCallback(
		async (
			file: File,
		): Promise<{ fileUrl: string; fileMimeType: string }> => {
			const postUrl = await generateUploadUrl({});
			const res = await fetch(postUrl, {
				method: "POST",
				headers: { "Content-Type": file.type },
				body: file,
			});
			if (!res.ok) throw new Error("Upload failed");
			const { storageId } = (await res.json()) as { storageId: string };
			const url = await convex.query(api.functions.documents.getUrl, {
				storageId: storageId as unknown as Id<"_storage">,
			});
			return { fileUrl: url ?? "", fileMimeType: file.type };
		},
		[convex, generateUploadUrl],
	);

	const onAIGenerate = useCallback(
		async (input: TemplateAIInput): Promise<TemplateAIResult> => {
			const result = await aiGenerateFromDocument({
				...input,
				orgId: activeOrgId ?? undefined,
			});
			return result as TemplateAIResult;
		},
		[aiGenerateFromDocument, activeOrgId],
	);

	function onAIApply(result: TemplateAIResult) {
		setContent(result.document);
		setPlaceholders(result.placeholders);
		// Force the editor to re-load the new content (Tiptap is mount-only).
		setContentRevision((v) => v + 1);
		toast.success(t("templates.ai.phases.resultTitle"));
	}

	// ─── iAsted page context ──────────────────────────────
	// Note : `save` / `saveLayout` / `onSync` sont déclarés en function
	// expressions plus bas — hissés dans la fonction parente, donc
	// référençables ici. La capture de leur identifiant n'est pas un
	// problème car les handlers sont invoqués à la demande.
	const pageEntities: PageEntity[] = template
		? [
			{
				id: template._id,
				type: "template",
				label:
					template.name?.fr ?? template.name?.en ?? "Modèle de document",
				data: {
					templateType: template.templateType,
					placeholderCount: (placeholders ?? template.placeholders ?? []).length,
					hasSource: Boolean(sourceStatus),
				},
			},
		]
		: [];
	const pageActions: PageAction[] = [
		{
			id: "itemplates.save_content",
			label: "Enregistrer le contenu et les placeholders",
			description:
				"Sauvegarde le contenu Tiptap et les placeholders du modèle.",
			requiresConfirmation: true,
		},
		{
			id: "itemplates.save_layout",
			label: "Enregistrer la mise en page",
			description:
				"Sauvegarde le format de papier, l'orientation et les marges.",
			requiresConfirmation: true,
		},
		{
			id: "itemplates.sync_from_source",
			label: "Synchroniser depuis la source",
			description:
				"Réimporte le contenu et les placeholders depuis le modèle source. Écrase les modifications locales non sauvegardées.",
			requiresConfirmation: true,
		},
		{
			id: "itemplates.back",
			label: "Retour à la liste des modèles",
			description: "Navigue vers /itemplates.",
		},
	];
	usePageContext({
		module: "itemplates",
		title: template?.name?.fr ?? template?.name?.en ?? "Éditeur de modèle",
		summary: template
			? `Modèle « ${template.name?.fr ?? template.name?.en ?? "—"} » · ${(placeholders ?? template.placeholders ?? []).length} placeholder(s).`
			: "Chargement du modèle…",
		visibleEntities: pageEntities,
		availableActions: pageActions,
		scopedToolNames: [],
	});
	useRegisterPageAction("itemplates.save_content", async () => {
		await save();
		return { success: true };
	});
	useRegisterPageAction("itemplates.save_layout", async () => {
		await saveLayout();
		return { success: true };
	});
	useRegisterPageAction("itemplates.sync_from_source", async () => {
		await onSync();
		return { success: true };
	});
	useRegisterPageAction("itemplates.back", async () => {
		router.push("/itemplates");
		return { success: true };
	});

	if (isLoading || !template) {
		return (
			<div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
				<Loader2 className="h-4 w-4 animate-spin" />
				{t("templates.common.loading")}
			</div>
		);
	}

	const workingContent = content ?? (template.content as TiptapDocument);
	const workingPlaceholders =
		placeholders ??
		((template.placeholders ?? []) as unknown as PlaceholderDescriptor[]);
	const workingLayout = layout ?? DEFAULT_LAYOUT;

	function addPlaceholder() {
		const key = newKey.trim();
		if (!key) return;
		if (workingPlaceholders.some((p) => p.key === key)) {
			toast.error(t("templates.placeholders.duplicateKey"));
			return;
		}
		setPlaceholders([
			...workingPlaceholders,
			{
				key,
				source: newSource,
			},
		]);
		setNewKey("");
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
			toast.success(t("templates.edit.saved"));
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : t("templates.edit.saveError"),
			);
		} finally {
			setSaving(false);
		}
	}

	async function saveLayout() {
		if (!layout) return;
		setSavingLayout(true);
		try {
			await updateTemplate({
				templateId,
				paperSize: layout.paperSize,
				orientation: layout.orientation,
				marginTop: layout.marginTop,
				marginRight: layout.marginRight,
				marginBottom: layout.marginBottom,
				marginLeft: layout.marginLeft,
			});
			toast.success(t("templates.layout.saved"));
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : t("templates.layout.saveError"),
			);
		} finally {
			setSavingLayout(false);
		}
	}

	async function onSync() {
		try {
			await syncFromSource({ templateId });
			toast.success(t("templates.edit.syncBanner.success"));
			setContent(null);
			setPlaceholders(null);
			setLayout(null);
		} catch (err) {
			toast.error(
				err instanceof Error
					? err.message
					: t("templates.edit.syncBanner.error"),
			);
		}
	}

	const title =
		template.name.fr ??
		template.name.en ??
		t("templates.common.untitledTemplate");

	return (
		<div className="flex flex-col gap-6 p-4 md:p-6">
			<header className="flex items-center gap-3">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => router.push("/itemplates")}
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
						{t("templates.edit.typeLabel", {
							type: t(
								`templates.type.${template.templateType}`,
								template.templateType,
							),
						})}
					</p>
				</div>
				<Button onClick={save} disabled={saving}>
					<Save className="mr-2 h-4 w-4" />
					{saving ? t("templates.common.saving") : t("templates.common.save")}
				</Button>
			</header>

			{sourceStatus ? (
				<div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-900/20">
					<RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
					<div className="flex-1 text-sm">
						<p className="font-medium text-amber-900 dark:text-amber-200">
							{t("templates.edit.syncBanner.title")}
						</p>
						<p className="mt-0.5 text-amber-900/80 dark:text-amber-300/80">
							{t("templates.edit.syncBanner.description", {
								sourceVersion: sourceStatus.sourceVersion,
								cloneVersion: sourceStatus.cloneVersion,
							})}
						</p>
					</div>
					<Button onClick={onSync} disabled={syncing} size="sm">
						{syncing ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								{t("templates.edit.syncBanner.syncing")}
							</>
						) : (
							<>
								<RefreshCw className="mr-2 h-4 w-4" />
								{t("templates.edit.syncBanner.button")}
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
							{t("templates.edit.lockBanner.title")}
						</p>
						<p className="mt-0.5 text-amber-900/80 dark:text-amber-300/80">
							{t("templates.edit.lockBanner.description")}
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
						paperSize={workingLayout.paperSize}
						orientation={workingLayout.orientation}
						marginTop={workingLayout.marginTop}
						marginRight={workingLayout.marginRight}
						marginBottom={workingLayout.marginBottom}
						marginLeft={workingLayout.marginLeft}
						onUploadImage={onUploadImage}
						enableAI={enableAI}
						onAIGenerate={() => setAiDrawerOpen(true)}
						contentRevision={contentRevision}
					/>
				</FlatCard>

				<aside className="flex w-full shrink-0 flex-col gap-4 lg:w-96 lg:overflow-y-auto">
					<FlatCard className="p-4">
						<LayoutSettingsCard
							layout={workingLayout}
							saving={savingLayout}
							onChange={setLayout}
							onSave={saveLayout}
						/>
					</FlatCard>

					<FlatCard className="p-4">
						<PlaceholderManager
							placeholders={workingPlaceholders}
							onRemove={removePlaceholder}
							newKey={newKey}
							onNewKeyChange={setNewKey}
							newSource={newSource}
							onNewSourceChange={setNewSource}
							onAdd={addPlaceholder}
						/>
					</FlatCard>
				</aside>
			</div>

			<div className="flex justify-between">
				<Button variant="ghost" onClick={() => router.push("/itemplates")}>
					{t("templates.edit.backToList")}
				</Button>
				<Button onClick={save} disabled={saving}>
					<Save className="mr-2 h-4 w-4" />
					{saving ? t("templates.common.saving") : t("templates.common.save")}
				</Button>
			</div>

			{enableAI ? (
				<TemplateAIDrawer
					open={aiDrawerOpen}
					onOpenChange={setAiDrawerOpen}
					onUploadFile={onAIUploadFile}
					onGenerate={onAIGenerate}
					onApply={onAIApply}
					defaultPaperSize={workingLayout.paperSize}
				/>
			) : null}
		</div>
	);
}

/**
 * Sidebar card to edit page layout (paper size, orientation, margins) after
 * the template has been created. Persists via a dedicated `Apply` button so
 * that local tweaks don't trigger a save on every keystroke.
 */
function LayoutSettingsCard({
	layout,
	saving,
	onChange,
	onSave,
}: {
	layout: LayoutDraft;
	saving: boolean;
	onChange: (next: LayoutDraft) => void;
	onSave: () => void;
}) {
	const { t } = useTranslation();
	function patch(partial: Partial<LayoutDraft>) {
		onChange({ ...layout, ...partial });
	}
	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-2">
				<Settings2 className="h-4 w-4 text-muted-foreground" />
				<div>
					<div className="font-medium">
						{t("templates.layout.sectionTitle")}
					</div>
					<div className="text-xs text-muted-foreground">
						{t("templates.layout.sectionDescription")}
					</div>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<div className="flex flex-col gap-1">
					<Label htmlFor="layout-paper">
						{t("templates.layout.paperSize")}
					</Label>
					<Select
						value={layout.paperSize}
						onValueChange={(v) => patch({ paperSize: v as "A4" | "LETTER" })}
					>
						<SelectTrigger id="layout-paper">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="A4">A4</SelectItem>
							<SelectItem value="LETTER">US Letter</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="flex flex-col gap-1">
					<Label htmlFor="layout-orientation">
						{t("templates.layout.orientation")}
					</Label>
					<Select
						value={layout.orientation}
						onValueChange={(v) =>
							patch({ orientation: v as "portrait" | "landscape" })
						}
					>
						<SelectTrigger id="layout-orientation">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="portrait">
								{t("templates.layout.orientationPortrait")}
							</SelectItem>
							<SelectItem value="landscape">
								{t("templates.layout.orientationLandscape")}
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<MarginInput
					id="layout-margin-top"
					label={t("templates.layout.marginTop")}
					value={layout.marginTop}
					onChange={(v) => patch({ marginTop: v })}
				/>
				<MarginInput
					id="layout-margin-right"
					label={t("templates.layout.marginRight")}
					value={layout.marginRight}
					onChange={(v) => patch({ marginRight: v })}
				/>
				<MarginInput
					id="layout-margin-bottom"
					label={t("templates.layout.marginBottom")}
					value={layout.marginBottom}
					onChange={(v) => patch({ marginBottom: v })}
				/>
				<MarginInput
					id="layout-margin-left"
					label={t("templates.layout.marginLeft")}
					value={layout.marginLeft}
					onChange={(v) => patch({ marginLeft: v })}
				/>
			</div>

			<Button onClick={onSave} disabled={saving} variant="outline">
				{saving ? (
					<>
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						{t("templates.layout.saving")}
					</>
				) : (
					t("templates.layout.saveButton")
				)}
			</Button>
		</div>
	);
}

function MarginInput({
	id,
	label,
	value,
	onChange,
}: {
	id: string;
	label: string;
	value: number;
	onChange: (value: number) => void;
}) {
	return (
		<div className="flex flex-col gap-1">
			<Label htmlFor={id} className="text-xs">
				{label}
			</Label>
			<Input
				id={id}
				type="number"
				min={0}
				step={1}
				value={value}
				onChange={(e) => {
					const next = Number(e.target.value);
					onChange(Number.isFinite(next) && next >= 0 ? next : 0);
				}}
			/>
		</div>
	);
}

function PlaceholderManager({
	placeholders,
	onRemove,
	newKey,
	onNewKeyChange,
	newSource,
	onNewSourceChange,
	onAdd,
}: {
	placeholders: PlaceholderDescriptor[];
	onRemove: (key: string) => void;
	newKey: string;
	onNewKeyChange: (value: string) => void;
	newSource: PlaceholderSource;
	onNewSourceChange: (value: PlaceholderSource) => void;
	onAdd: () => void;
}) {
	const { t } = useTranslation();
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
				<div className="font-medium">{t("templates.placeholders.title")}</div>
				<div className="text-sm text-muted-foreground">
					{t("templates.placeholders.description")}
				</div>
			</div>

			{placeholders.length > 0 ? (
				<ul className="flex flex-col gap-1.5">
					{placeholders.map((p) => (
						<li
							key={p.key}
							className="flex min-w-0 items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-sm"
						>
							<code className="min-w-0 flex-1 break-all font-mono text-xs leading-tight text-blue-700">{`{{${p.key}}}`}</code>
							<span className="shrink-0 rounded bg-muted px-1 py-0.5 text-[0.65rem] uppercase tracking-wide">
								{t(`templates.placeholders.sources.${p.source}`)}
							</span>
							<button
								type="button"
								className="shrink-0 text-muted-foreground hover:text-destructive"
								onClick={() => onRemove(p.key)}
								aria-label={t("templates.placeholders.removeAria", {
									key: p.key,
								})}
							>
								<Trash2 className="h-3.5 w-3.5" />
							</button>
						</li>
					))}
				</ul>
			) : (
				<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
					{t("templates.placeholders.empty")}
				</div>
			)}

			<Button type="button" onClick={() => setSheetOpen(true)}>
				<Plus className="mr-1 h-4 w-4" />
				{t("templates.placeholders.addButton")}
			</Button>

			<BottomSheet
				open={sheetOpen}
				onOpenChange={setSheetOpen}
				title={t("templates.placeholders.addSheet.title")}
				maxHeight="85vh"
				footer={
					<div className="flex items-center justify-end gap-2">
						<Button variant="ghost" onClick={() => setSheetOpen(false)}>
							{t("templates.common.cancel")}
						</Button>
						<Button onClick={handleAdd}>
							<Plus className="mr-1 h-4 w-4" />
							{t("templates.placeholders.addSheet.submit")}
						</Button>
					</div>
				}
			>
				<div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
					<p className="text-sm text-muted-foreground">
						{t("templates.placeholders.addSheet.description")}
					</p>

					<div className="flex flex-col gap-4">
						<div className="flex flex-col gap-1">
							<Label htmlFor="ph-key">
								{t("templates.placeholders.fields.key")}
							</Label>
							<Input
								id="ph-key"
								value={newKey}
								onChange={(e) => onNewKeyChange(e.target.value)}
								placeholder={t(
									"templates.placeholders.fields.keyPlaceholder",
								)}
								autoFocus
							/>
							<span className="text-[0.7rem] text-muted-foreground">
								{t("templates.placeholders.fields.keyHint")}
							</span>
						</div>
						<div className="flex flex-col gap-1">
							<Label htmlFor="ph-source">
								{t("templates.placeholders.fields.source")}
							</Label>
							<Select
								value={newSource}
								onValueChange={(v) =>
									onNewSourceChange(v as PlaceholderSource)
								}
							>
								<SelectTrigger id="ph-source">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{SOURCES.map((s) => (
										<SelectItem key={s} value={s}>
											{t(`templates.placeholders.sources.${s}`)}
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
