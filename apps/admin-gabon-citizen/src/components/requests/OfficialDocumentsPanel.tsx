"use client";

/**
 * Citizen-facing panel listing the official documents issued by the
 * consulate for a specific request. Only shows documents explicitly
 * published to the citizen (`publishedToCitizen=true`).
 *
 * Chaque document est affiché en vignette A4 (`DocumentSheetFile`) avec
 * aperçu PDF natif + métadonnées et vérification d'empreinte SHA-256.
 */

import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { DocumentSheetFile } from "@workspace/ui/components/document-sheet";
import { CheckCircle2, Copy, Download, FileCheck2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { FlatCard } from "@/components/my-space/flat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
	requestId: Id<"requests">;
}

export function OfficialDocumentsPanel({ requestId }: Props) {
	const { data: documents, isLoading } = useAuthenticatedConvexQuery(
		api.functions.generatedDocumentsData.listForRequest,
		{ requestId },
	);

	// ACL at the query level already filters to published docs for citizens.
	// Hide the whole panel when nothing is available — keeps the page calm.
	if (!isLoading && (!documents || documents.length === 0)) return null;

	return (
		<FlatCard className="p-4 sm:p-6">
			<header className="mb-4 flex items-center gap-2">
				<FileCheck2 className="h-4 w-4 text-muted-foreground" />
				<h3 className="text-sm font-bold">Documents officiels délivrés</h3>
				<Badge variant="secondary" className="ml-auto text-xs font-normal">
					{documents?.length ?? 0}
				</Badge>
			</header>

			{isLoading ? (
				<div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
					<Loader2 className="h-4 w-4 animate-spin" />
					Chargement…
				</div>
			) : (
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{(documents ?? []).map((doc) => (
						<OfficialDocumentThumbnail key={doc._id} doc={doc} />
					))}
				</div>
			)}
		</FlatCard>
	);
}

function OfficialDocumentThumbnail({ doc }: { doc: Doc<"generatedDocuments"> }) {
	const { data: url } = useAuthenticatedConvexQuery(
		api.functions.generatedDocumentsData.getDownloadUrl,
		{ documentId: doc._id },
	);
	const label = doc.label ?? "Document officiel";
	const dateStr = doc.publishedAt
		? new Date(doc.publishedAt).toLocaleDateString("fr-FR", {
				day: "2-digit",
				month: "long",
				year: "numeric",
			})
		: new Date(doc.generatedAt).toLocaleDateString("fr-FR");

	async function copyHash() {
		try {
			await navigator.clipboard.writeText(doc.pdfSha256);
			toast.success("Empreinte copiée");
		} catch {
			toast.error("Impossible de copier");
		}
	}

	const overlays = doc.signatureStatus === "signed" ? (
		<div className="absolute right-2 top-2">
			<span className="inline-flex items-center gap-1 rounded bg-emerald-100/95 px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-emerald-800 shadow-sm">
				<CheckCircle2 className="h-2.5 w-2.5" />
				Signé
			</span>
		</div>
	) : null;

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
					<span>•</span>
					<span>Délivré le {dateStr}</span>
				</div>
				<div className="mt-1 flex items-center gap-2">
					{url ? (
						<Button size="sm" variant="outline" asChild className="h-7 text-xs">
							<a href={url} target="_blank" rel="noreferrer">
								<Download className="mr-1 h-3 w-3" />
								Télécharger
							</a>
						</Button>
					) : (
						<Button size="sm" variant="outline" disabled className="h-7 text-xs">
							<Loader2 className="mr-1 h-3 w-3 animate-spin" />
							Lien…
						</Button>
					)}
				</div>
				<details className="mt-1 rounded bg-muted/40 px-2 py-1 text-xs">
					<summary className="flex cursor-pointer items-center gap-1.5 select-none text-muted-foreground">
						<ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
						Vérifier l'empreinte
					</summary>
					<div className="mt-2 flex flex-col gap-1.5">
						<p className="text-muted-foreground text-[11px]">
							Empreinte SHA-256 du document. Compare-la après téléchargement
							pour garantir qu'il n'a pas été altéré.
						</p>
						<div className="flex items-center gap-1.5">
							<code className="flex-1 overflow-x-auto rounded bg-background px-2 py-1 font-mono text-[0.65rem] text-foreground">
								{doc.pdfSha256}
							</code>
							<Button
								size="icon"
								variant="ghost"
								className="h-7 w-7 shrink-0"
								onClick={copyHash}
								aria-label="Copier l'empreinte"
							>
								<Copy className="h-3.5 w-3.5" />
							</Button>
						</div>
					</div>
				</details>
			</div>
		</div>
	);
}
