"use client";

/**
 * Official Documents section — displayed inside the agent's request detail page.
 *
 * Responsibilities:
 *  - List already-generated documents for the current request (agent view).
 *  - Let an agent generate a new document from a template through the
 *    `generateFromTemplate` action.
 *  - Offer a direct PDF download link for each generated document.
 *
 * Generation flow (2 stages, gated):
 *   1. Aperçu — visual rendering + status table; Generate enabled only when 0 errors.
 *   2. Mapping manuel — opt-in editor when fields don't match; pick a different
 *      (source, path) or supply a literal value, then return to step 1.
 */

import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { renderDocumentToHtml } from "@workspace/document-rendering/html";
import type { TiptapDocument, TiptapNode } from "@workspace/document-rendering/types";
import { DocumentSheetFile } from "@workspace/ui/components/document-sheet";
import {
	AlertCircle,
	CheckCircle2,
	Clock,
	Download,
	Eye,
	EyeOff,
	FileText,
	Loader2,
	PenTool,
	RefreshCw,
	Sparkles,
	Trash2,
	Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FlatCard } from "../my-space/flat-card";
import { Badge } from "@workspace/ui/components/badge";
import { BottomSheet } from "@workspace/ui/components/bottom-sheet";
import { Button } from "@workspace/ui/components/button";
import { Combobox, type ComboboxOption } from "@workspace/ui/components/combobox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import {
	useAuthenticatedConvexQuery,
	useConvexActionQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";

interface Props {
	requestId: Id<"requests">;
	orgId: Id<"orgs">;
}

type SourceName = "user" | "profile" | "request" | "formData" | "org" | "system";

interface MappingOverrideEntry {
	source?: SourceName;
	path?: string;
	literal?: string;
}
type MappingOverride = Record<string, MappingOverrideEntry>;

interface PreviewEntry {
	key: string;
	label?: Record<string, string>;
	source: SourceName;
	path?: string;
	value: string;
	status: "resolved" | "empty" | "error";
	error?: string;
	fromMapping: boolean;
}

interface AvailablePath {
	source: SourceName;
	path: string;
	label: string;
	sampleValue: string;
}

const SOURCES: SourceName[] = [
	"user",
	"profile",
	"request",
	"formData",
	"org",
	"system",
];

const SOURCE_OPTIONS: ComboboxOption<SourceName>[] = [
	{ value: "formData", label: "Champs du formulaire" },
	{ value: "request", label: "Demande" },
	{ value: "profile", label: "Bénéficiaire" },
	{ value: "user", label: "Compte" },
	{ value: "org", label: "Organisme" },
	{ value: "system", label: "Système" },
];

export function OfficialDocumentsSection({ requestId, orgId }: Props) {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);

	const { data: documents, isLoading } = useAuthenticatedConvexQuery(
		api.functions.generatedDocumentsData.listForRequest,
		{ requestId },
	);

	return (
		<FlatCard className="flex flex-col p-3 lg:p-4">
			<div className="mb-3 flex items-center gap-2">
				<h3 className="flex items-center gap-2 text-sm font-bold">
					<FileText className="h-4 w-4" />
					{t("templates.generate.section.title")}
					<Badge variant="secondary" className="ml-1 text-xs font-normal">
						{documents?.length ?? 0}
					</Badge>
				</h3>
				<Button
					size="sm"
					className="ml-auto h-8"
					onClick={() => setOpen(true)}
				>
					<Sparkles className="mr-1.5 h-3.5 w-3.5" />
					{t("templates.generate.section.generateButton")}
				</Button>
			</div>

			{isLoading ? (
				<div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
					<Loader2 className="h-4 w-4 animate-spin" />
					{t("templates.generate.section.loading")}
				</div>
			) : !documents || documents.length === 0 ? (
				<p className="py-4 text-center text-sm text-muted-foreground">
					{t("templates.generate.section.empty")}
				</p>
			) : (
				<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
					{documents.map((doc) => (
						<DocumentThumbnail key={doc._id} doc={doc} />
					))}
				</div>
			)}

			<GenerateDialog
				open={open}
				onOpenChange={setOpen}
				requestId={requestId}
				orgId={orgId}
			/>
		</FlatCard>
	);
}

function DocumentThumbnail({ doc }: { doc: Doc<"generatedDocuments"> }) {
	const { t, i18n } = useTranslation();
	const { data: url } = useAuthenticatedConvexQuery(
		api.functions.generatedDocumentsData.getDownloadUrl,
		{ documentId: doc._id },
	);
	const { mutateAsync: publish, isPending: publishing } = useConvexMutationQuery(
		api.functions.generatedDocumentsData.publishToCitizen,
	);
	const { mutateAsync: unpublish, isPending: unpublishing } = useConvexMutationQuery(
		api.functions.generatedDocumentsData.unpublish,
	);
	const { mutateAsync: signDocument, isPending: signing } = useConvexActionQuery(
		api.functions.generatedDocuments.signDocument,
	);
	const { mutateAsync: deleteDoc, isPending: deleting } = useConvexMutationQuery(
		api.functions.generatedDocumentsData.deleteGenerated,
	);

	const label = doc.label ?? t("templates.generate.row.fallbackLabel");
	const dateLocale = i18n.language.startsWith("fr") ? "fr-FR" : "en-US";
	const dateStr = new Date(doc.generatedAt).toLocaleString(dateLocale);

	async function togglePublish() {
		try {
			if (doc.publishedToCitizen) {
				await unpublish({ documentId: doc._id });
				toast.success(t("templates.generate.toast.unpublished"));
			} else {
				await publish({ documentId: doc._id });
				toast.success(t("templates.generate.toast.published"));
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : t("templates.generate.toast.actionFailed");
			toast.error(message);
		}
	}

	async function onSign() {
		try {
			await signDocument({ documentId: doc._id });
			toast.success(t("templates.generate.toast.signed"));
		} catch (err) {
			const message = err instanceof Error ? err.message : t("templates.generate.toast.signFailed");
			toast.error(message);
		}
	}

	async function onDelete() {
		const confirmMsg = t("templates.generate.row.deleteConfirm", { label });
		if (!window.confirm(confirmMsg)) return;
		try {
			await deleteDoc({ documentId: doc._id });
			toast.success(t("templates.generate.toast.deleted"));
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: t("templates.generate.toast.deleteFailed");
			toast.error(message);
		}
	}

	const canSign = doc.signatureStatus === "unsigned";
	const canDelete = doc.signatureStatus !== "signed";

	const overlays = (
		<div className="absolute right-2 top-2 flex items-center gap-1">
			{doc.signatureStatus === "signed" ? (
				<span className="inline-flex items-center gap-1 rounded bg-emerald-100/95 px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-emerald-800 shadow-sm">
					<CheckCircle2 className="h-2.5 w-2.5" />
					Signé
				</span>
			) : null}
			{doc.publishedToCitizen ? (
				<span className="inline-flex items-center gap-1 rounded bg-blue-100/95 px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-blue-800 shadow-sm">
					Publié
				</span>
			) : null}
		</div>
	);

	return (
		<div className="flex flex-col gap-2">
			<DocumentSheetFile
				fileName={`${label}.pdf`}
				mimeType="application/pdf"
				url={url ?? null}
				onClick={url ? () => window.open(url, "_blank") : undefined}
				overlays={overlays}
				ariaLabel={`Ouvrir ${label}`}
			/>
			<div className="flex flex-col gap-0.5 px-1">
				<div className="truncate font-medium" title={label}>
					{label}
				</div>
				<div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
					<span className="font-mono">{doc.documentNumber}</span>
					<SignatureChip status={doc.signatureStatus} />
				</div>
				<div className="text-xs text-muted-foreground/80">{dateStr}</div>
				<div className="mt-1 flex items-center gap-0.5">
					{canSign ? (
						<Button
							size="icon"
							variant="ghost"
							className="h-7 w-7"
							onClick={onSign}
							disabled={signing}
							aria-label={t("templates.generate.row.signLabel")}
							title={t("templates.generate.row.signLabel")}
						>
							{signing ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : (
								<PenTool className="h-3.5 w-3.5" />
							)}
						</Button>
					) : null}
					<Button
						size="icon"
						variant="ghost"
						className="h-7 w-7"
						onClick={togglePublish}
						disabled={publishing || unpublishing}
						aria-label={
							doc.publishedToCitizen
								? t("templates.generate.row.unpublishLabel")
								: t("templates.generate.row.publishLabel")
						}
						title={
							doc.publishedToCitizen
								? t("templates.generate.row.unpublishLabel")
								: t("templates.generate.row.publishLabel")
						}
					>
						{publishing || unpublishing ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : doc.publishedToCitizen ? (
							<EyeOff className="h-3.5 w-3.5" />
						) : (
							<Eye className="h-3.5 w-3.5" />
						)}
					</Button>
					{url ? (
						<Button size="icon" variant="ghost" className="h-7 w-7" asChild>
							<a
								href={url}
								target="_blank"
								rel="noreferrer"
								aria-label={t("templates.generate.row.downloadLabel")}
							>
								<Download className="h-3.5 w-3.5" />
							</a>
						</Button>
					) : (
						<Button size="icon" variant="ghost" className="h-7 w-7" disabled>
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						</Button>
					)}
					{canDelete ? (
						<Button
							size="icon"
							variant="ghost"
							className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
							onClick={onDelete}
							disabled={deleting}
							aria-label={t("templates.generate.row.deleteLabel")}
							title={t("templates.generate.row.deleteLabel")}
						>
							{deleting ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : (
								<Trash2 className="h-3.5 w-3.5" />
							)}
						</Button>
					) : null}
				</div>
			</div>
		</div>
	);
}

function SignatureChip({ status }: { status: Doc<"generatedDocuments">["signatureStatus"] }) {
	const { t } = useTranslation();
	if (status === "signed") {
		return (
			<span className="inline-flex items-center gap-1 rounded bg-green-100 px-1.5 py-0.5 text-[0.7rem] text-green-800">
				<CheckCircle2 className="h-3 w-3" />
				{t("templates.generate.chip.signed")}
			</span>
		);
	}
	if (status === "pending_signature") {
		return (
			<span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[0.7rem] text-amber-800">
				<Clock className="h-3 w-3" />
				{t("templates.generate.chip.pendingSignature")}
			</span>
		);
	}
	return (
		<span className="rounded bg-muted px-1.5 py-0.5 text-[0.7rem] text-muted-foreground">
			{t("templates.generate.chip.unsigned")}
		</span>
	);
}

// =============================================================================
// GenerateDialog — 2-stage state machine (preview ⇄ mapping)
// =============================================================================

function GenerateDialog({
	open,
	onOpenChange,
	requestId,
	orgId,
}: {
	open: boolean;
	onOpenChange: (value: boolean) => void;
	requestId: Id<"requests">;
	orgId: Id<"orgs">;
}) {
	const { t } = useTranslation();
	const [templateId, setTemplateId] = useState<Id<"documentTemplates"> | "">("");
	const [stage, setStage] = useState<"preview" | "mapping">("preview");
	const [mappingOverride, setMappingOverride] = useState<MappingOverride>({});
	const [focusedKey, setFocusedKey] = useState<string | null>(null);
	const [isGenerating, setIsGenerating] = useState(false);

	// Debounced copy of `mappingOverride` sent to the Convex query — typing in
	// the path/literal field would otherwise re-fetch on every keystroke and
	// re-mount the row, killing input focus.
	const [debouncedOverride, setDebouncedOverride] = useState<MappingOverride>({});
	useEffect(() => {
		const id = setTimeout(() => setDebouncedOverride(mappingOverride), 300);
		return () => clearTimeout(id);
	}, [mappingOverride]);

	// Org-only templates — les modèles globaux ne servent JAMAIS à générer
	// directement, uniquement comme sources de clonage dans /itemplates.
	const { data: templates } = useAuthenticatedConvexQuery(
		api.functions.documentTemplates.listOrgTemplates,
		{ orgId },
	);

	// Reactive preview — re-runs every time the (debounced) override changes.
	const { data: bundle, isLoading: previewLoading } = useAuthenticatedConvexQuery(
		api.functions.generatedDocumentsData.previewResolvedPlaceholders,
		templateId
			? { requestId, templateId, fieldMappingOverride: debouncedOverride }
			: "skip",
	);

	const { mutateAsync: generate } = useConvexActionQuery(
		api.functions.generatedDocuments.generateFromTemplate,
	);

	// Reset transient state whenever the picked template changes or the
	// dialog re-opens — avoids a stale override leaking into a new generation.
	useEffect(() => {
		setMappingOverride({});
		setStage("preview");
		setFocusedKey(null);
	}, [templateId]);

	useEffect(() => {
		if (!open) {
			setTemplateId("");
		}
	}, [open]);

	const placeholders = (bundle?.placeholders ?? []) as PreviewEntry[];
	const errorCount = placeholders.filter((p) => p.status === "error").length;
	const emptyCount = placeholders.filter((p) => p.status === "empty").length;
	const canGenerate = templateId !== "" && !previewLoading && errorCount === 0;

	async function onGenerate() {
		if (!templateId) return;
		setIsGenerating(true);
		try {
			await generate({
				requestId,
				templateId,
				trigger: "manual",
				fieldMappingOverride:
					Object.keys(mappingOverride).length > 0 ? mappingOverride : undefined,
			});
			toast.success(t("templates.generate.toast.generated"));
			onOpenChange(false);
		} catch (err) {
			const message = err instanceof Error ? err.message : t("templates.generate.toast.generationFailed");
			toast.error(message);
		} finally {
			setIsGenerating(false);
		}
	}

	function openMappingFor(key: string | null) {
		setFocusedKey(key);
		setStage("mapping");
	}

	const templateOptions: ComboboxOption<string>[] = (templates ?? []).map(
		(tpl) => ({
			value: tpl._id,
			label: tpl.name.fr ?? tpl.name.en ?? t("templates.common.untitled"),
		}),
	);

	const footer =
		stage === "preview" ? (
			<div className="flex flex-wrap items-center justify-end gap-2">
				<Button variant="ghost" onClick={() => onOpenChange(false)}>
					{t("templates.common.cancel")}
				</Button>
				{templateId && errorCount > 0 ? (
					<Button variant="outline" onClick={() => openMappingFor(null)}>
						<Wrench className="mr-2 h-4 w-4" />
						{t("templates.generate.mapping.openButton")}
					</Button>
				) : null}
				<Button onClick={onGenerate} disabled={!canGenerate || isGenerating}>
					{isGenerating ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							{t("templates.generate.sheet.submitting")}
						</>
					) : (
						<>
							<Sparkles className="mr-2 h-4 w-4" />
							{t("templates.generate.sheet.submit")}
						</>
					)}
				</Button>
			</div>
		) : (
			<div className="flex flex-wrap items-center justify-between gap-2">
				<Button
					variant="ghost"
					onClick={() => {
						setMappingOverride({});
						setStage("preview");
					}}
				>
					{t("templates.generate.mapping.cancelButton")}
				</Button>
				<Button onClick={() => setStage("preview")} disabled={errorCount > 0}>
					<CheckCircle2 className="mr-2 h-4 w-4" />
					{t("templates.generate.mapping.confirmButton")}
				</Button>
			</div>
		);

	return (
		<BottomSheet
			open={open}
			onOpenChange={onOpenChange}
			title={
				stage === "preview"
					? t("templates.generate.sheet.title")
					: t("templates.generate.mapping.sheetTitle")
			}
			maxHeight="85vh"
			footer={footer}
		>
			<div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
				{stage === "preview" ? (
					<>
						<p className="text-sm text-muted-foreground">
							{t("templates.generate.sheet.description")}
						</p>
						<div>
							<Label htmlFor="template-picker">
								{t("templates.common.templateLabel")}
							</Label>
							<Combobox
								options={templateOptions}
								value={templateId || null}
								onValueChange={(v) =>
									setTemplateId(v as Id<"documentTemplates">)
								}
								placeholder={
									templates
										? t("templates.common.chooseTemplate")
										: t("templates.common.loading")
								}
								searchPlaceholder={t("templates.common.searchTemplate")}
								emptyText={t("templates.common.noTemplatesAvailableForOrg")}
							/>
						</div>

						{templateId ? (
							<PreviewStage
								bundle={bundle}
								loading={previewLoading}
								errorCount={errorCount}
								emptyCount={emptyCount}
								onMapField={(key) => openMappingFor(key)}
							/>
						) : null}
					</>
				) : (
					<MappingStage
						placeholders={placeholders}
						mappingOverride={mappingOverride}
						setMappingOverride={setMappingOverride}
						availablePaths={(bundle?.availablePaths ?? []) as AvailablePath[]}
						focusedKey={focusedKey}
						loading={previewLoading}
					/>
				)}
			</div>
		</BottomSheet>
	);
}

// =============================================================================
// PreviewStage — visual document preview + status banner + status table
// =============================================================================

function PreviewStage({
	bundle,
	loading,
	errorCount,
	emptyCount,
	onMapField,
}: {
	bundle:
		| {
				placeholders: PreviewEntry[];
				templateContent: TiptapNode | null | undefined;
				availablePaths: AvailablePath[];
		  }
		| null
		| undefined;
	loading: boolean;
	errorCount: number;
	emptyCount: number;
	onMapField: (key: string) => void;
}) {
	const { t } = useTranslation();
	const placeholders = (bundle?.placeholders ?? []) as PreviewEntry[];
	const total = placeholders.length;
	const resolvedCount = total - errorCount - emptyCount;

	return (
		<div className="flex flex-col gap-3">
			<StatusBanner
				total={total}
				errorCount={errorCount}
				emptyCount={emptyCount}
				onMapManually={() => onMapField("")}
			/>

			<DocumentVisualPreview
				content={bundle?.templateContent ?? null}
				placeholders={placeholders}
				loading={loading}
			/>

			<div className="flex items-center justify-between text-xs">
				<span className="font-medium">
					{t("templates.generate.preview.title")}
				</span>
				<span className="text-muted-foreground">
					{resolvedCount} / {total}{" "}
					{t("templates.generate.preview.resolved")}
				</span>
			</div>
			<PreviewTable
				placeholders={placeholders}
				loading={loading}
				onMapField={onMapField}
			/>
		</div>
	);
}

function StatusBanner({
	total,
	errorCount,
	emptyCount,
	onMapManually,
}: {
	total: number;
	errorCount: number;
	emptyCount: number;
	onMapManually: () => void;
}) {
	const { t } = useTranslation();
	if (total === 0) return null;

	if (errorCount > 0) {
		return (
			<div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3">
				<AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
				<div className="flex-1 text-xs">
					<div className="font-medium text-destructive">
						{t("templates.generate.banner.errorsTitle", { count: errorCount })}
					</div>
					<div className="mt-0.5 text-destructive/80">
						{t("templates.generate.banner.errorsBody")}
					</div>
				</div>
				<Button
					size="sm"
					variant="outline"
					className="h-7"
					onClick={onMapManually}
				>
					<Wrench className="mr-1.5 h-3 w-3" />
					{t("templates.generate.mapping.openButton")}
				</Button>
			</div>
		);
	}
	if (emptyCount > 0) {
		return (
			<div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50/80 p-3">
				<Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
				<div className="flex-1 text-xs">
					<div className="font-medium text-amber-900">
						{t("templates.generate.banner.emptyTitle", { count: emptyCount })}
					</div>
					<div className="mt-0.5 text-amber-800">
						{t("templates.generate.banner.emptyBody")}
					</div>
				</div>
			</div>
		);
	}
	return (
		<div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50/80 p-3">
			<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
			<div className="flex-1 text-xs">
				<div className="font-medium text-emerald-900">
					{t("templates.generate.banner.allResolvedTitle")}
				</div>
				<div className="mt-0.5 text-emerald-800">
					{t("templates.generate.banner.allResolvedBody")}
				</div>
			</div>
		</div>
	);
}

// =============================================================================
// DocumentVisualPreview — Tiptap → HTML with highlighted unresolved placeholders
// =============================================================================

function DocumentVisualPreview({
	content,
	placeholders,
	loading,
}: {
	content: TiptapNode | null;
	placeholders: PreviewEntry[];
	loading: boolean;
}) {
	const { t } = useTranslation();

	const html = useMemo(() => {
		if (!content) return null;
		const resolvedMap: Record<string, string> = {};
		for (const p of placeholders) {
			if (p.status === "resolved") resolvedMap[p.key] = p.value;
		}
		try {
			const transformed = substituteResolvedKeepUnresolved(content, resolvedMap);
			return renderDocumentToHtml(transformed as TiptapDocument);
		} catch (err) {
			console.error("DocumentVisualPreview render error", err);
			return null;
		}
	}, [content, placeholders]);

	if (loading) {
		return (
			<div className="flex h-32 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
				<Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
				{t("templates.generate.visualPreview.loading")}
			</div>
		);
	}
	if (!html) {
		return (
			<div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
				{t("templates.generate.visualPreview.unavailable")}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-1.5">
			<div className="text-xs font-medium">
				{t("templates.generate.visualPreview.title")}
			</div>
			<div className="preview-pane max-h-[40vh] overflow-y-auto rounded-md border border-border/60 bg-white p-4 text-sm text-black shadow-sm">
				<style>{PREVIEW_PANE_CSS}</style>
				<div dangerouslySetInnerHTML={{ __html: html }} />
			</div>
		</div>
	);
}

const PREVIEW_PANE_CSS = `
.preview-pane .placeholder-chip {
	display: inline-block;
	padding: 0 0.25rem;
	border-radius: 0.25rem;
	background-color: rgb(254 226 226);
	color: rgb(153 27 27);
	font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
	font-size: 0.85em;
	border: 1px solid rgb(248 113 113 / 0.4);
}
.preview-pane h1, .preview-pane h2, .preview-pane h3 {
	font-weight: 600;
	margin-top: 0.5em;
	margin-bottom: 0.25em;
}
.preview-pane h1 { font-size: 1.25em; }
.preview-pane h2 { font-size: 1.1em; }
.preview-pane h3 { font-size: 1em; }
.preview-pane p { margin: 0.25em 0; }
.preview-pane ul, .preview-pane ol { padding-left: 1.25em; margin: 0.25em 0; }
.preview-pane table { border-collapse: collapse; margin: 0.5em 0; }
.preview-pane td, .preview-pane th { border: 1px solid #e5e7eb; padding: 0.25em 0.5em; }
`;

/**
 * Walk the Tiptap tree, replacing `placeholder` nodes whose key has a resolved
 * value with text nodes. Unresolved placeholders are LEFT INTACT — they render
 * via `PlaceholderNodeSchema.renderHTML` as `<span class="placeholder-chip">`,
 * which the preview pane styles in red. This preserves the visual contrast
 * between known-good substitutions and missing data.
 */
function substituteResolvedKeepUnresolved(
	node: TiptapNode,
	resolved: Record<string, string>,
): TiptapNode {
	function transform(n: TiptapNode): TiptapNode {
		if (n.type === "placeholder") {
			const key = (n.attrs as { key?: string } | undefined)?.key;
			if (key && key in resolved) {
				return {
					type: "text",
					text: resolved[key] ?? "",
					marks: n.marks,
				};
			}
			return n;
		}
		if (!n.content) return n;
		return { ...n, content: n.content.map(transform) };
	}
	return transform(node);
}

// =============================================================================
// PreviewTable — per-placeholder status table
// =============================================================================

function PreviewTable({
	placeholders,
	loading,
	onMapField,
}: {
	placeholders: PreviewEntry[];
	loading: boolean;
	onMapField: (key: string) => void;
}) {
	const { t } = useTranslation();
	if (loading) {
		return (
			<div className="flex items-center gap-2 text-xs text-muted-foreground">
				<Loader2 className="h-3.5 w-3.5 animate-spin" />
				{t("templates.generate.preview.loading")}
			</div>
		);
	}
	if (placeholders.length === 0) {
		return (
			<div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
				{t("templates.generate.preview.noPlaceholders")}
			</div>
		);
	}
	return (
		<ul className="flex flex-col gap-1 rounded-md border bg-muted/20 p-2">
			{placeholders.map((p) => (
				<li
					key={p.key}
					className="flex items-start gap-2 text-xs"
					data-status={p.status}
				>
					<StatusBadge status={p.status} />
					<div className="flex-1 min-w-0">
						<div className="flex items-baseline gap-1.5">
							<code className="font-mono">{p.key}</code>
							<span className="text-muted-foreground">
								[{p.source}
								{p.path && p.path !== p.key ? `.${p.path}` : ""}]
							</span>
							{p.fromMapping ? (
								<span className="rounded bg-primary/10 px-1 text-[0.65rem] text-primary">
									{t("templates.generate.preview.mapped")}
								</span>
							) : null}
						</div>
						<div className="mt-0.5 truncate text-muted-foreground">
							{p.status === "error"
								? p.error ?? t("templates.generate.preview.error")
								: p.value || `(${t("templates.generate.preview.empty")})`}
						</div>
					</div>
					{p.status !== "resolved" ? (
						<Button
							size="sm"
							variant="ghost"
							className="h-6 px-2 text-[0.7rem]"
							onClick={() => onMapField(p.key)}
						>
							<Wrench className="mr-1 h-3 w-3" />
							{t("templates.generate.preview.mapAction")}
						</Button>
					) : null}
				</li>
			))}
		</ul>
	);
}

function StatusBadge({
	status,
}: {
	status: "resolved" | "empty" | "error";
}) {
	if (status === "resolved") {
		return (
			<CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
		);
	}
	if (status === "empty") {
		return <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />;
	}
	return (
		<div className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-destructive bg-destructive/10" />
	);
}

// =============================================================================
// MappingStage — manual placeholder remapping editor
// =============================================================================

function MappingStage({
	placeholders,
	mappingOverride,
	setMappingOverride,
	availablePaths,
	focusedKey,
	loading,
}: {
	placeholders: PreviewEntry[];
	mappingOverride: MappingOverride;
	setMappingOverride: (next: MappingOverride) => void;
	availablePaths: AvailablePath[];
	focusedKey: string | null;
	loading: boolean;
}) {
	const { t } = useTranslation();

	function patch(key: string, next: MappingOverrideEntry | undefined) {
		const copy = { ...mappingOverride };
		if (next === undefined) {
			delete copy[key];
		} else {
			copy[key] = next;
		}
		setMappingOverride(copy);
	}

	const errorCount = placeholders.filter((p) => p.status === "error").length;
	const resolvedCount = placeholders.filter((p) => p.status === "resolved").length;

	return (
		<div className="flex flex-col gap-3">
			<p className="text-sm text-muted-foreground">
				{t("templates.generate.mapping.description")}
			</p>
			<div className="flex items-center justify-between text-xs">
				<span className="font-medium">
					{resolvedCount} / {placeholders.length}{" "}
					{t("templates.generate.preview.resolved")}
				</span>
				{errorCount > 0 ? (
					<span className="text-destructive">
						{t("templates.generate.banner.errorsTitle", { count: errorCount })}
					</span>
				) : null}
				{loading ? (
					<Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
				) : null}
			</div>
			<ul className="flex flex-col gap-2">
				{placeholders.map((p) => (
					<MappingRow
						key={p.key}
						entry={p}
						override={mappingOverride[p.key]}
						onPatch={(next) => patch(p.key, next)}
						availablePaths={availablePaths}
						initiallyExpanded={focusedKey === p.key || focusedKey === ""}
					/>
				))}
			</ul>
		</div>
	);
}

function MappingRow({
	entry,
	override,
	onPatch,
	availablePaths,
	initiallyExpanded,
}: {
	entry: PreviewEntry;
	override: MappingOverrideEntry | undefined;
	onPatch: (next: MappingOverrideEntry | undefined) => void;
	availablePaths: AvailablePath[];
	initiallyExpanded: boolean;
}) {
	const { t } = useTranslation();
	const [expanded, setExpanded] = useState(
		initiallyExpanded || entry.status !== "resolved",
	);
	const useLiteral = override?.literal !== undefined;
	const effectiveSource: SourceName = override?.source ?? entry.source;
	const effectivePath = override?.path ?? entry.path ?? entry.key;

	const pathOptions = useMemo<ComboboxOption<string>[]>(
		() =>
			availablePaths
				.filter((ap) => ap.source === effectiveSource)
				.map((ap) => ({
					value: ap.path,
					label: ap.sampleValue
						? `${ap.label} — ${ap.sampleValue}`
						: ap.label,
				})),
		[availablePaths, effectiveSource],
	);

	return (
		<li
			className="flex flex-col gap-2 rounded-md border bg-card p-2.5"
			data-status={entry.status}
		>
			<div className="flex items-start gap-2">
				<StatusBadge status={entry.status} />
				<div className="flex-1 min-w-0">
					<div className="flex items-baseline gap-1.5">
						<code className="font-mono text-xs">{entry.key}</code>
						{override ? (
							<span className="rounded bg-primary/10 px-1 text-[0.65rem] text-primary">
								{t("templates.generate.preview.mapped")}
							</span>
						) : null}
					</div>
					<div className="mt-0.5 truncate text-[0.7rem] text-muted-foreground">
						{entry.status === "error"
							? entry.error ?? t("templates.generate.preview.error")
							: entry.value || `(${t("templates.generate.preview.empty")})`}
					</div>
				</div>
				<div className="flex items-center gap-1">
					{override ? (
						<Button
							size="icon"
							variant="ghost"
							className="h-7 w-7"
							onClick={() => onPatch(undefined)}
							title={t("templates.generate.mapping.resetTooltip")}
						>
							<RefreshCw className="h-3.5 w-3.5" />
						</Button>
					) : null}
					<Button
						size="sm"
						variant="ghost"
						className="h-7 px-2 text-[0.7rem]"
						onClick={() => setExpanded((v) => !v)}
					>
						{expanded
							? t("templates.generate.mapping.collapse")
							: t("templates.generate.mapping.expand")}
					</Button>
				</div>
			</div>

			{expanded ? (
				<div className="flex flex-col gap-2 border-t pt-2">
					<div className="flex items-center gap-2">
						<Switch
							id={`literal-${entry.key}`}
							checked={useLiteral}
							onCheckedChange={(checked) => {
								if (checked) {
									onPatch({ literal: override?.literal ?? "" });
								} else if (override) {
									onPatch({
										source: override.source,
										path: override.path,
									});
								} else {
									onPatch(undefined);
								}
							}}
						/>
						<Label htmlFor={`literal-${entry.key}`} className="text-xs">
							{t("templates.generate.mapping.useLiteralLabel")}
						</Label>
					</div>

					{useLiteral ? (
						<div className="flex flex-col gap-1">
							<Label htmlFor={`literal-input-${entry.key}`} className="text-[0.7rem]">
								{t("templates.generate.mapping.literalLabel")}
							</Label>
							<Input
								id={`literal-input-${entry.key}`}
								value={override?.literal ?? ""}
								onChange={(e) => onPatch({ literal: e.target.value })}
								placeholder={t("templates.generate.mapping.literalPlaceholder")}
							/>
						</div>
					) : (
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-[160px_1fr]">
							<div className="flex flex-col gap-1">
								<Label className="text-[0.7rem]">
									{t("templates.generate.mapping.sourceLabel")}
								</Label>
								<Combobox
									options={SOURCE_OPTIONS}
									value={effectiveSource}
									onValueChange={(v) =>
										onPatch({
											source: v as SourceName,
											path: override?.path,
										})
									}
									placeholder={t("templates.generate.mapping.sourceLabel")}
									searchPlaceholder={t(
										"templates.generate.mapping.pathSearchPlaceholder",
									)}
								/>
							</div>
							<div className="flex flex-col gap-1">
								<Label className="text-[0.7rem]">
									{t("templates.generate.mapping.pathLabel")}
								</Label>
								<Combobox
									options={pathOptions}
									value={effectivePath ?? null}
									onValueChange={(v) =>
										onPatch({
											source: effectiveSource,
											path: v || undefined,
										})
									}
									placeholder={t(
										"templates.generate.mapping.pathPlaceholder",
									)}
									searchPlaceholder={t(
										"templates.generate.mapping.pathSearchPlaceholder",
									)}
									emptyText={t("templates.generate.mapping.pathEmpty")}
								/>
							</div>
						</div>
					)}
				</div>
			) : null}
		</li>
	);
}
