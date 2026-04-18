"use client";

/**
 * Édition d'un modèle global — 4 onglets :
 *
 *   - Contenu            : l'éditeur Tiptap (corps du document)
 *   - Entête & pied      : facette `headerFooter`
 *   - Typographie        : facette `typography`
 *   - Style rédactionnel : facette `voice` (métier IA uniquement)
 *
 * La sidebar droite regroupe les réglages transverses (layout,
 * placeholders, diffusion). Un unique bouton « Enregistrer » persiste
 * l'ensemble.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	TemplateAIDrawer,
	type TemplateAIInput,
	type TemplateAIResult,
} from "@workspace/document-editor";
import type { Editor } from "@tiptap/react";
import type {
	PlaceholderDescriptor,
	PlaceholderSource,
	TiptapDocument,
} from "@workspace/document-rendering/types";
import { renderDocumentToHtml } from "@workspace/document-rendering/html";
import { useAction, useConvex } from "convex/react";
import {
	FileText,
	History,
	Loader2,
	Lock,
	MessageSquareQuote,
	Palette,
	Plus,
	Save,
	Settings2,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
	ApplicabilityPicker,
	type Applicability,
} from "@/components/config/ApplicabilityPicker";
import { TemplateEditorWithRulers } from "@/components/admin/TemplateEditorWithRulers";
import { ContextualFormatPanel } from "@/components/admin/template-editor/ContextualFormatPanel";
import {
	RepresentationHeaderPreview,
	deriveHeaderLines as derivePreviewHeaderLines,
	deriveFooterLines as derivePreviewFooterLines,
} from "@/components/admin/RepresentationHeaderPreview";
import {
	HeaderFooterSectionEditor,
	type HeaderFooterSectionValue,
	createDefaultHeaderFooterSection,
	deserializeHeaderFooterSection,
	serializeHeaderFooterSection,
} from "@/components/config/HeaderFooterSectionEditor";
import {
	type TypographySectionValue,
	createDefaultTypographySection,
	deserializeTypographySection,
	serializeTypographySection,
} from "@/components/config/TypographySectionEditor";
import {
	VoiceSectionEditor,
	type VoiceSectionValue,
	createDefaultVoiceSection,
	deserializeVoiceSection,
	serializeVoiceSection,
} from "@/components/config/VoiceSectionEditor";
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
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useConvexMutationQuery, useConvexQuery } from "@/integrations/convex/hooks";

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

const SOURCES: PlaceholderSource[] = [
	"user",
	"profile",
	"request",
	"formData",
	"org",
	"system",
];

export default function EditTemplatePage() {
	const { t } = useTranslation();
	const params = useParams();
	const router = useRouter();
	const templateId = params.templateId as Id<"documentTemplates">;

	const { data: template, isLoading } = useConvexQuery(
		api.functions.documentTemplates.getById,
		{ templateId },
	);

	// URL signée du sceau (résout `logoStorageId` via Convex storage).
	// Null tant que le modèle n'est pas chargé, ou s'il n'a pas de logo.
	const { data: logoUrl } = useConvexQuery(
		api.functions.documentTemplates.getTemplateLogoUrl,
		{ templateId },
	);

	const { mutateAsync: updateTemplate } = useConvexMutationQuery(
		api.functions.documentTemplates.update,
	);
	const { mutateAsync: generateUploadUrl } = useConvexMutationQuery(
		api.functions.documents.generateUploadUrl,
	);
	const convex = useConvex();
	const aiGenerateFromDocument = useAction(
		api.functions.templateAI.generateFromDocument,
	);
	const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

	// ─── États pilotés par le template ──────────────────────────────────
	const [content, setContent] = useState<TiptapDocument | null>(null);
	const [placeholders, setPlaceholders] = useState<PlaceholderDescriptor[] | null>(
		null,
	);
	const [applicability, setApplicability] = useState<Applicability | null>(null);
	const [applicableOrgTypes, setApplicableOrgTypes] = useState<string[]>([]);
	const [layout, setLayout] = useState<LayoutDraft | null>(null);
	const [headerFooter, setHeaderFooter] = useState<HeaderFooterSectionValue | null>(
		null,
	);
	const [typography, setTypography] = useState<TypographySectionValue | null>(
		null,
	);
	const [voice, setVoice] = useState<VoiceSectionValue | null>(null);

	const [newKey, setNewKey] = useState("");
	const [newSource, setNewSource] = useState<PlaceholderSource>("formData");
	const [saving, setSaving] = useState(false);
	const [savingLayout, setSavingLayout] = useState(false);
	const [contentRevision, setContentRevision] = useState(0);
	// Rep sélectionnée pour prévisualiser l'entête / pied dans l'éditeur.
	// Null = aperçu générique (valeurs fallback Madrid du template).
	const [previewOrgId, setPreviewOrgId] = useState<Id<"orgs"> | null>(null);
	const { data: previewOrg } = useConvexQuery(
		api.functions.orgs.getById,
		previewOrgId ? { orgId: previewOrgId } : "skip",
	);
	// Taille d'affichage du sceau dans l'aperçu WYSIWYG (px).
	const [logoHeightPx, setLogoHeightPx] = useState(80);
	// Instance Tiptap partagée entre le canvas, la bubble menu et la sidebar
	// contextuelle. Captée via `onReady` depuis TemplateEditor.
	const [editorInstance, setEditorInstance] = useState<Editor | null>(null);

	// Hydratation une seule fois à la réception du template.
	useMemo(() => {
		if (template && content === null) {
			setContent(template.content as TiptapDocument);
			setPlaceholders(
				(template.placeholders ?? []) as unknown as PlaceholderDescriptor[],
			);
			if (template.applicability) {
				setApplicability(template.applicability as Applicability);
				setApplicableOrgTypes(template.applicableOrgTypes ?? []);
			} else if (template.allowedOrgTypes && template.allowedOrgTypes.length > 0) {
				setApplicability("specificOrgTypes");
				setApplicableOrgTypes(template.allowedOrgTypes);
			} else {
				setApplicability("all");
				setApplicableOrgTypes([]);
			}
			setHeaderFooter(
				template.headerFooter
					? deserializeHeaderFooterSection(template.headerFooter)
					: createDefaultHeaderFooterSection(),
			);
			setTypography(
				template.typography
					? deserializeTypographySection(
							template.typography as Partial<TypographySectionValue>,
						)
					: createDefaultTypographySection(),
			);
			setVoice(
				template.voice
					? deserializeVoiceSection(template.voice as Partial<VoiceSectionValue>)
					: createDefaultVoiceSection(),
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
		async (file: File): Promise<{ fileUrl: string; fileMimeType: string }> => {
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
				// Utilise la facette `voice` du template courant pour guider l'IA.
				templateId,
			});
			return result as TemplateAIResult;
		},
		[aiGenerateFromDocument, templateId],
	);

	function onAIApply(result: TemplateAIResult) {
		setContent(result.document);
		setPlaceholders(result.placeholders);
		setContentRevision((v) => v + 1);
		toast.success(t("templates.ai.phases.resultTitle"));
	}

	if (isLoading || !template) {
		return (
			<div className="p-6 text-sm text-muted-foreground">
				{t("templates.common.loading")}
			</div>
		);
	}

	const workingContent = content ?? (template.content as TiptapDocument);
	const workingPlaceholders =
		placeholders ??
		((template.placeholders ?? []) as unknown as PlaceholderDescriptor[]);
	const workingLayout = layout ?? DEFAULT_LAYOUT;
	const workingHeaderFooter = headerFooter ?? createDefaultHeaderFooterSection();
	const workingTypography = typography ?? createDefaultTypographySection();
	const workingVoice = voice ?? createDefaultVoiceSection();

	// Aperçu du sceau + entête + pied affichés dans l'éditeur. Si une rep
	// de preview est sélectionnée, on dérive les lignes de SON branding
	// (headerLines / footerAddress / footerPhone / footerEmail) — c'est ce
	// que verront les citoyens au rendu PDF. Sinon, fallback sur les lignes
	// définies dans le template (exemple Madrid).
	const previewFromOrgHeader = previewOrg
		? derivePreviewHeaderLines(previewOrg)
		: [];
	const previewFromOrgFooter = previewOrg
		? derivePreviewFooterLines(previewOrg)
		: [];
	const templateHeaderLines = workingHeaderFooter.header.textContent
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l.length > 0);
	const templateFooterLines = workingHeaderFooter.footer.textContent
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l.length > 0);
	const headerPreviewLines =
		previewFromOrgHeader.length > 0
			? previewFromOrgHeader
			: templateHeaderLines;
	const footerPreviewLines =
		previewFromOrgFooter.length > 0
			? previewFromOrgFooter
			: templateFooterLines;

	function addPlaceholder() {
		const key = newKey.trim();
		if (!key) return;
		if (workingPlaceholders.some((p) => p.key === key)) {
			toast.error(t("templates.placeholders.duplicateKey"));
			return;
		}
		setPlaceholders([...workingPlaceholders, { key, source: newSource }]);
		setNewKey("");
	}

	function removePlaceholder(key: string) {
		setPlaceholders(workingPlaceholders.filter((p) => p.key !== key));
	}

	async function save() {
		if (applicability === "specificOrgTypes" && applicableOrgTypes.length === 0) {
			toast.error(t("templates.global.new.errors.orgTypesRequired"));
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
				applicability: (applicability ?? "all") as never,
				applicableOrgTypes:
					applicability === "specificOrgTypes"
						? (applicableOrgTypes as never)
						: (undefined as never),
				allowedOrgTypes:
					applicability === "specificOrgTypes"
						? (applicableOrgTypes as never)
						: (undefined as never),
				headerFooter: serializeHeaderFooterSection(workingHeaderFooter) as never,
				typography: serializeTypographySection(workingTypography) as never,
				voice: serializeVoiceSection(workingVoice) as never,
			});
			toast.success(t("templates.edit.saved"));
		} catch (err) {
			const message =
				err instanceof Error ? err.message : t("templates.edit.saveError");
			toast.error(message);
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
			toast.error(err instanceof Error ? err.message : t("templates.layout.saveError"));
		} finally {
			setSavingLayout(false);
		}
	}

	const title =
		template.name.fr ?? template.name.en ?? t("templates.global.edit.untitled");

	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title={title}
				subtitle={t("templates.global.edit.subtitle", {
					type: t(`templates.type.${template.templateType}`, template.templateType),
					version: template.version ?? 1,
				})}
				icon={<FileText />}
				showBackButton
				actions={
					<div className="flex items-center gap-2">
						<Button variant="outline" asChild>
							<Link href={`/config/templates/${templateId}/versions`}>
								<History className="mr-2 h-4 w-4" />
								{t("templates.global.edit.history")}
							</Link>
						</Button>
						<Button onClick={save} disabled={saving}>
							<Save className="mr-2 h-4 w-4" />
							{saving ? t("templates.common.saving") : t("templates.common.save")}
						</Button>
					</div>
				}
			/>

			{template.lockedForEditing ? (
				<div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-900/20">
					<Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
					<div className="text-sm">
						<p className="font-medium text-amber-900 dark:text-amber-200">
							{t("templates.edit.lockBanner.title")}
						</p>
						<p className="mt-0.5 text-amber-900/80 dark:text-amber-300/80">
							{t("templates.edit.lockBanner.descriptionExtended")}
						</p>
					</div>
				</div>
			) : null}

			{/* Layout 2 colonnes : document WYSIWYG à gauche, panneau de
			     paramètres à droite (facettes dépliables + mise en page). */}
			<div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
				<div className="min-w-0 flex-1">
					<FlatCard className="p-4">
						<TemplateEditorWithRulers
							initialContent={workingContent}
							onChange={(doc) => setContent(doc)}
							layout={workingLayout}
							onLayoutChange={(next) => setLayout(next)}
							onUploadImage={onUploadImage}
							headerPreview={{
								logoSrc: logoUrl,
								lines: headerPreviewLines,
								fontFamily: workingHeaderFooter.header.fontFamily ?? "Optima",
								logoHeight: logoHeightPx,
							}}
							footerPreview={{ lines: footerPreviewLines }}
							onAIGenerate={() => setAiDrawerOpen(true)}
							onReady={setEditorInstance}
							contentRevision={contentRevision}
						/>
					</FlatCard>
				</div>

				{/* Sidebar droite — paramètres contextuels (style Pages) */}
				<aside className="flex w-full shrink-0 flex-col gap-4 lg:w-96 lg:overflow-y-auto">
					<ContextualFormatPanel
						editor={editorInstance}
						documentPanel={
							<>
								<FlatCard className="p-4">
									<LayoutSettingsCard
										layout={workingLayout}
										saving={savingLayout}
										onChange={setLayout}
										onSave={saveLayout}
									/>
								</FlatCard>

								{/* Facettes dépliables — chacune agit directement sur le document. */}
								<FlatCard className="px-4 py-2">
									<Accordion
										type="multiple"
										defaultValue={[]}
										className="w-full"
									>
										<AccordionItem
											value="header-footer"
											className="border-b-0"
										>
											<AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
												<span className="flex items-center gap-2">
													<Palette className="h-4 w-4 text-muted-foreground" />
													Entête &amp; pied
												</span>
											</AccordionTrigger>
											<AccordionContent className="pb-4">
												<RepresentationHeaderPreview
													previewOrgId={previewOrgId}
													onPreviewOrgIdChange={setPreviewOrgId}
													headerFontFamily={
														workingHeaderFooter.header.fontFamily ?? "Optima"
													}
													onHeaderFontFamilyChange={(value) =>
														setHeaderFooter({
															...workingHeaderFooter,
															header: {
																...workingHeaderFooter.header,
																fontFamily: value,
															},
														})
													}
													logoHeightPx={logoHeightPx}
													onLogoHeightPxChange={setLogoHeightPx}
													templateHeaderText={
														workingHeaderFooter.header.textContent
													}
													onTemplateHeaderTextChange={(text) =>
														setHeaderFooter({
															...workingHeaderFooter,
															header: {
																...workingHeaderFooter.header,
																textContent: text,
															},
														})
													}
												/>
											</AccordionContent>
										</AccordionItem>
										<AccordionItem value="voice" className="border-b-0">
											<AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
												<span className="flex items-center gap-2">
													<MessageSquareQuote className="h-4 w-4 text-muted-foreground" />
													Style rédactionnel
												</span>
											</AccordionTrigger>
											<AccordionContent className="pb-4">
												<VoiceSectionEditor
													value={workingVoice}
													onChange={setVoice}
												/>
											</AccordionContent>
										</AccordionItem>
									</Accordion>
								</FlatCard>

								{template.isGlobal ? (
									<FlatCard className="p-4">
										<ApplicabilityPicker
											applicability={applicability ?? "all"}
											applicableOrgTypes={applicableOrgTypes}
											onChange={(next) => {
												setApplicability(next.applicability);
												setApplicableOrgTypes(next.applicableOrgTypes);
											}}
										/>
									</FlatCard>
								) : null}

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
							</>
						}
					/>
				</aside>
			</div>

			<div className="flex justify-between">
				<Button variant="ghost" onClick={() => router.push("/config/templates")}>
					{t("templates.edit.backToList")}
				</Button>
				<Button onClick={save} disabled={saving}>
					<Save className="mr-2 h-4 w-4" />
					{saving ? t("templates.common.saving") : t("templates.common.save")}
				</Button>
			</div>

			<TemplateAIDrawer
				open={aiDrawerOpen}
				onOpenChange={setAiDrawerOpen}
				onUploadFile={onAIUploadFile}
				onGenerate={onAIGenerate}
				onApply={onAIApply}
				defaultPaperSize={workingLayout.paperSize}
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
								aria-label={t("templates.placeholders.removeAria", { key: p.key })}
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
							<Label htmlFor="ph-key">{t("templates.placeholders.fields.key")}</Label>
							<Input
								id="ph-key"
								value={newKey}
								onChange={(e) => onNewKeyChange(e.target.value)}
								placeholder={t("templates.placeholders.fields.keyPlaceholder")}
								autoFocus
							/>
							<span className="text-[0.7rem] text-muted-foreground">
								{t("templates.placeholders.fields.keyHint")}
							</span>
						</div>
						<div className="flex flex-col gap-1">
							<Label htmlFor="ph-source">{t("templates.placeholders.fields.source")}</Label>
							<Select
								value={newSource}
								onValueChange={(v) => onNewSourceChange(v as PlaceholderSource)}
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

/**
 * Sidebar card to edit page layout (paper size, orientation, margins).
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
					<div className="font-medium">{t("templates.layout.sectionTitle")}</div>
					<div className="text-xs text-muted-foreground">
						{t("templates.layout.sectionDescription")}
					</div>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<div className="flex flex-col gap-1">
					<Label htmlFor="layout-paper">{t("templates.layout.paperSize")}</Label>
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
