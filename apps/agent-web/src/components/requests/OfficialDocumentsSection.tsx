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
import { FlatCard } from "@/components/my-space/flat-card";
import { Badge } from "@/components/ui/badge";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import {
	useAuthenticatedConvexQuery,
	useConvexActionQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";

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
				<ul className="flex flex-col gap-2">
					{documents.map((doc) => (
						<DocumentRow key={doc._id} doc={doc} />
					))}
				</ul>
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

function DocumentRow({ doc }: { doc: Doc<"generatedDocuments"> }) {
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

	return (
		<li className="flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-sm">
			<FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
			<div className="min-w-0 flex-1">
				<div className="truncate font-medium">{label}</div>
				<div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
					<span className="font-mono">{doc.documentNumber}</span>
					<SignatureChip status={doc.signatureStatus} />
					{doc.publishedToCitizen ? <PublishedChip /> : null}
				</div>
				<div className="mt-1 text-xs text-muted-foreground/80">{dateStr}</div>
			</div>
			<div className="flex items-center gap-0.5">
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
		</li>
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

function PublishedChip() {
	const { t } = useTranslation();
	return (
		<span className="inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-[0.7rem] text-blue-800">
			<CheckCircle2 className="h-3 w-3" />
			{t("templates.generate.chip.published")}
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
			</div>
		</BottomSheet>
	);
}
