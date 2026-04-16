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
	Sparkles,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FlatCard } from "@/components/my-space/flat-card";
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
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
					Documents officiels
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
					Générer
				</Button>
			</div>

			{isLoading ? (
				<div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
					<Loader2 className="h-4 w-4 animate-spin" />
					Chargement…
				</div>
			) : !documents || documents.length === 0 ? (
				<p className="py-4 text-center text-sm text-muted-foreground">
					Aucun document généré pour cette demande.
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

	const label = doc.label ?? "Document";
	const dateStr = new Date(doc.generatedAt).toLocaleString("fr-FR");

	async function togglePublish() {
		try {
			if (doc.publishedToCitizen) {
				await unpublish({ documentId: doc._id });
				toast.success("Document retiré de la vue citoyen");
			} else {
				await publish({ documentId: doc._id });
				toast.success("Document publié au citoyen");
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : "Échec de l'opération";
			toast.error(message);
		}
	}

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
				<Button
					size="icon"
					variant="ghost"
					className="h-7 w-7"
					onClick={togglePublish}
					disabled={publishing || unpublishing}
					aria-label={doc.publishedToCitizen ? "Retirer du citoyen" : "Publier au citoyen"}
					title={doc.publishedToCitizen ? "Retirer du citoyen" : "Publier au citoyen"}
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
						<a href={url} target="_blank" rel="noreferrer" aria-label="Télécharger">
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
	if (status === "signed") {
		return (
			<span className="inline-flex items-center gap-1 rounded bg-green-100 px-1.5 py-0.5 text-[0.7rem] text-green-800">
				<CheckCircle2 className="h-3 w-3" />
				Signé
			</span>
		);
	}
	if (status === "pending_signature") {
		return (
			<span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[0.7rem] text-amber-800">
				<Clock className="h-3 w-3" />
				En attente
			</span>
		);
	}
	return (
		<span className="rounded bg-muted px-1.5 py-0.5 text-[0.7rem] text-muted-foreground">
			Non signé
		</span>
	);
}

function PublishedChip() {
	return (
		<span className="inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-[0.7rem] text-blue-800">
			<CheckCircle2 className="h-3 w-3" />
			Publié
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
	const [templateId, setTemplateId] = useState<Id<"documentTemplates"> | "">("");
	const [isGenerating, setIsGenerating] = useState(false);

	const { data: templates } = useAuthenticatedConvexQuery(
		api.functions.documentTemplates.listForService,
		// Passing an impossible serviceId would be cleaner, but `listForService`
		// also merges global templates — and our agent needs global templates
		// primarily for MVP. `listByOrg` would be a better fit once org templates
		// exist; the merged listing is sufficient here.
		{ serviceId: undefined as unknown as Id<"services">, orgId },
	);

	const { mutateAsync: generate } = useConvexActionQuery(
		api.functions.generatedDocuments.generateFromTemplate,
	);

	async function onGenerate() {
		if (!templateId) return;
		setIsGenerating(true);
		try {
			await generate({ requestId, templateId, trigger: "manual" });
			toast.success("Document généré");
			onOpenChange(false);
			setTemplateId("");
		} catch (err) {
			const message = err instanceof Error ? err.message : "Échec de la génération";
			toast.error(message);
		} finally {
			setIsGenerating(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Générer un document officiel</DialogTitle>
					<DialogDescription>
						Sélectionne un modèle — les variables seront remplies automatiquement à partir de
						la demande.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-3 py-2">
					<Label htmlFor="template-picker">Modèle</Label>
					<Select
						value={templateId}
						onValueChange={(v) => setTemplateId(v as Id<"documentTemplates">)}
					>
						<SelectTrigger id="template-picker">
							<SelectValue placeholder={templates ? "Choisir un modèle…" : "Chargement…"} />
						</SelectTrigger>
						<SelectContent>
							{(templates ?? []).map((t) => (
								<SelectItem key={t._id} value={t._id}>
									{t.name.fr ?? t.name.en ?? "(sans titre)"}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<DialogFooter>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						Annuler
					</Button>
					<Button onClick={onGenerate} disabled={!templateId || isGenerating}>
						{isGenerating ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Génération…
							</>
						) : (
							<>
								<Sparkles className="mr-2 h-4 w-4" />
								Générer
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
