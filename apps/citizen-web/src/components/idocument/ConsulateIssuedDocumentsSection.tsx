"use client";

/**
 * Citizen vault section — « Délivrés par le consulat ».
 *
 * Surfaces every published generated document the citizen currently has
 * access to, across all their requests. Read-only on purpose: those
 * documents are issued by the consulate and cannot be edited or deleted
 * by the citizen.
 */

import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
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
			<header className="mb-3 flex items-center gap-2">
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
				<ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
					{(documents ?? []).map((doc) => (
						<ConsulateDocumentCard key={doc._id} doc={doc} />
					))}
				</ul>
			)}
		</section>
	);
}

function ConsulateDocumentCard({ doc }: { doc: Doc<"generatedDocuments"> }) {
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
		<li className="flex flex-col gap-2 rounded-xl bg-background p-3">
			<div className="flex items-start gap-2">
				<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
					<FileCheck2 className="h-4 w-4" />
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<span className="truncate font-medium">{label}</span>
						{doc.signatureStatus === "signed" ? (
							<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-label="Document signé" />
						) : null}
					</div>
					<div className="mt-0.5 text-xs text-muted-foreground">
						<span className="font-mono">{doc.documentNumber}</span> • {dateStr}
					</div>
				</div>
			</div>
			{url ? (
				<Button size="sm" variant="outline" asChild className="w-full">
					<a href={url} target="_blank" rel="noreferrer">
						<Download className="mr-2 h-4 w-4" />
						Télécharger
					</a>
				</Button>
			) : (
				<Button size="sm" variant="outline" className="w-full" disabled>
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					Lien…
				</Button>
			)}
		</li>
	);
}
