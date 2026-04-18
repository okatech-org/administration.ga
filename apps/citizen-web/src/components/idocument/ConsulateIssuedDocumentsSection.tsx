"use client";

/**
 * Citizen vault section — « Délivrés par le consulat ».
 *
 * Surfaces every published generated document the citizen currently has
 * access to, across all their requests. Read-only on purpose: those
 * documents are issued by the consulate and cannot be edited or deleted
 * by the citizen.
 *
 * Chaque document est affiché en vignette A4 fidèle (`DocumentSheetFile`).
 */

import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { DocumentSheetFile } from "@workspace/ui/components/document-sheet";
import { CheckCircle2, Download, FileCheck2, Loader2 } from "lucide-react";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { Button } from "@/components/ui/button";

export function ConsulateIssuedDocumentsSection() {
	const { data: documents, isLoading } = useAuthenticatedConvexQuery(
		api.functions.generatedDocumentsData.listPublishedForCitizen,
		{},
	);

	if (!isLoading && (!documents || documents.length === 0)) return null;

	return (
		<section className="rounded-2xl bg-secondary p-4 sm:p-6">
			<header className="mb-4 flex items-center gap-2">
				<FileCheck2 className="h-4 w-4 text-primary" />
				<h3 className="text-sm font-bold">Délivrés par le consulat</h3>
				<span className="ml-auto rounded-full bg-background px-2 py-0.5 text-[0.7rem] font-medium text-muted-foreground">
					{documents?.length ?? 0}
				</span>
			</header>

			{isLoading ? (
				<div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
					<Loader2 className="h-4 w-4 animate-spin" />
					Chargement…
				</div>
			) : (
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
					{(documents ?? []).map((doc) => (
						<ConsulateDocumentThumbnail key={doc._id} doc={doc} />
					))}
				</div>
			)}
		</section>
	);
}

function ConsulateDocumentThumbnail({ doc }: { doc: Doc<"generatedDocuments"> }) {
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
				<div className="text-xs text-muted-foreground">
					<span className="font-mono">{doc.documentNumber}</span> • {dateStr}
				</div>
				{url ? (
					<Button size="sm" variant="outline" asChild className="mt-1 h-7 text-xs">
						<a href={url} target="_blank" rel="noreferrer">
							<Download className="mr-1 h-3 w-3" />
							Télécharger
						</a>
					</Button>
				) : (
					<Button size="sm" variant="outline" className="mt-1 h-7 text-xs" disabled>
						<Loader2 className="mr-1 h-3 w-3 animate-spin" />
						Lien…
					</Button>
				)}
			</div>
		</div>
	);
}
