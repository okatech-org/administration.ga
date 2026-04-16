"use client";

/**
 * Citizen-facing panel listing the official documents issued by the
 * consulate for a specific request. Only shows documents explicitly
 * published to the citizen (`publishedToCitizen=true`).
 *
 * Each entry displays the document label, its reference number, the
 * publication date and a direct download link. A signed badge surfaces
 * the signature status so the citizen can trust the document's origin.
 */

import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { CheckCircle2, Download, FileCheck2, Loader2 } from "lucide-react";
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
			<header className="mb-3 flex items-center gap-2">
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
				<ul className="flex flex-col gap-2">
					{(documents ?? []).map((doc) => (
						<OfficialDocumentRow key={doc._id} doc={doc} />
					))}
				</ul>
			)}
		</FlatCard>
	);
}

function OfficialDocumentRow({ doc }: { doc: Doc<"generatedDocuments"> }) {
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
	return (
		<li className="flex items-start gap-3 rounded-xl bg-background p-3">
			<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
				<FileCheck2 className="h-4 w-4" />
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="truncate font-medium">{label}</span>
					{doc.signatureStatus === "signed" ? (
						<span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[0.7rem] font-medium text-emerald-800">
							<CheckCircle2 className="h-3 w-3" />
							Signé
						</span>
					) : null}
				</div>
				<div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
					<span className="font-mono">{doc.documentNumber}</span>
					<span>•</span>
					<span>Délivré le {dateStr}</span>
				</div>
			</div>
			{url ? (
				<Button size="sm" variant="outline" asChild>
					<a href={url} target="_blank" rel="noreferrer">
						<Download className="mr-2 h-4 w-4" />
						Télécharger
					</a>
				</Button>
			) : (
				<Button size="sm" variant="outline" disabled>
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					Lien…
				</Button>
			)}
		</li>
	);
}
