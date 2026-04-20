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
 * Signature and publication actions arrive in Phase 3 — for Phase 1 MVP the
 * focus is simply: pick a template → generate PDF → download.
 */

import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { DocumentSheetFile } from "@workspace/ui/components/document-sheet";
import {
	CheckCircle2,
	Clock,
	Download,
	Eye,
	EyeOff,
	FileText,
	Loader2,
	PenTool,
	Sparkles,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FlatCard } from "../my-space/flat-card";
import { Badge } from "@workspace/ui/components/badge";
import { BottomSheet } from "@workspace/ui/components/bottom-sheet";
import { Button } from "@workspace/ui/components/button";
import { Combobox, type ComboboxOption } from "@workspace/ui/components/combobox";
import { Label } from "@workspace/ui/components/label";
import {
	useAuthenticatedConvexQuery,
	useConvexActionQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";

interface Props {
	requestId: Id<"requests">;
	orgId: Id<"orgs">;
}

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

	const canSign = doc.signatureStatus === "unsigned";

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
	const [isGenerating, setIsGenerating] = useState(false);

	// Org-only templates — les modèles globaux ne servent JAMAIS à générer
	// directement, uniquement comme sources de clonage dans /itemplates.
	const { data: templates } = useAuthenticatedConvexQuery(
		api.functions.documentTemplates.listOrgTemplates,
		{ orgId },
	);

	// Preview de la résolution des placeholders pour le template sélectionné.
	// Read-only — l'agent vérifie visuellement avant de cliquer Generate.
	const { data: preview, isLoading: previewLoading } = useAuthenticatedConvexQuery(
		api.functions.generatedDocumentsData.previewResolvedPlaceholders,
		templateId ? { requestId, templateId } : "skip",
	);

	const { mutateAsync: generate } = useConvexActionQuery(
		api.functions.generatedDocuments.generateFromTemplate,
	);

	async function onGenerate() {
		if (!templateId) return;
		setIsGenerating(true);
		try {
			await generate({ requestId, templateId, trigger: "manual" });
			toast.success(t("templates.generate.toast.generated"));
			onOpenChange(false);
			setTemplateId("");
		} catch (err) {
			const message = err instanceof Error ? err.message : t("templates.generate.toast.generationFailed");
			toast.error(message);
		} finally {
			setIsGenerating(false);
		}
	}

	const templateOptions: ComboboxOption<string>[] = (templates ?? []).map(
		(tpl) => ({
			value: tpl._id,
			label: tpl.name.fr ?? tpl.name.en ?? t("templates.common.untitled"),
		}),
	);

	return (
		<BottomSheet
			open={open}
			onOpenChange={onOpenChange}
			title={t("templates.generate.sheet.title")}
			maxHeight="70vh"
			footer={
				<div className="flex items-center justify-end gap-2">
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						{t("templates.common.cancel")}
					</Button>
					<Button onClick={onGenerate} disabled={!templateId || isGenerating}>
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
			}
		>
			<div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
				<p className="text-sm text-muted-foreground">
					{t("templates.generate.sheet.description")}
				</p>
				<Label htmlFor="template-picker">{t("templates.common.templateLabel")}</Label>
				<Combobox
					options={templateOptions}
					value={templateId || null}
					onValueChange={(v) => setTemplateId(v as Id<"documentTemplates">)}
					placeholder={
						templates ? t("templates.common.chooseTemplate") : t("templates.common.loading")
					}
					searchPlaceholder={t("templates.common.searchTemplate")}
					emptyText={t("templates.common.noTemplatesAvailableForOrg")}
				/>

				{templateId ? (
					<PreviewTable preview={preview ?? null} loading={previewLoading} />
				) : null}
			</div>
		</BottomSheet>
	);
}

function PreviewTable({
	preview,
	loading,
}: {
	preview: Array<{
		key: string;
		// Optional — newer placeholders have no label, the key alone identifies them.
		label?: Record<string, string>;
		source: string;
		path?: string;
		value: string;
		status: "resolved" | "empty" | "error";
		error?: string;
		fromMapping: boolean;
	}> | null;
	loading: boolean;
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
	if (!preview) return null;
	if (preview.length === 0) {
		return (
			<div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
				{t("templates.generate.preview.noPlaceholders")}
			</div>
		);
	}
	const emptyCount = preview.filter((p) => p.status === "empty").length;
	const errorCount = preview.filter((p) => p.status === "error").length;
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between text-xs">
				<span className="font-medium">{t("templates.generate.preview.title")}</span>
				<span className="text-muted-foreground">
					{preview.length - emptyCount - errorCount} / {preview.length}{" "}
					{t("templates.generate.preview.resolved")}
				</span>
			</div>
			<ul className="flex flex-col gap-1 rounded-md border bg-muted/20 p-2">
				{preview.map((p) => (
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
					</li>
				))}
			</ul>
			{errorCount > 0 ? (
				<div className="text-[0.7rem] text-destructive">
					{t("templates.generate.preview.errorWarning")}
				</div>
			) : emptyCount > 0 ? (
				<div className="text-[0.7rem] text-amber-700">
					{t("templates.generate.preview.emptyWarning", { count: emptyCount })}
				</div>
			) : null}
		</div>
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
