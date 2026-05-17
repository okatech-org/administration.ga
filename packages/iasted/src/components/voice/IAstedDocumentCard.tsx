/**
 * IAstedDocumentCard — Liste des documents que iAsted vient de générer
 * pendant la session vocale en cours.
 *
 * Écoute l'event window `iasted:document-created` (émis par `useIAstedHost`
 * en réponse au tool serveur `draft_correspondence` / `generate_document`),
 * et affiche une carte par document avec 3 actions :
 *
 *   - Télécharger : ouvre le PDF dans un nouvel onglet via la `downloadUrl`
 *     pré-signée fournie dans le payload.
 *   - Ouvrir dans iDocument : navigue vers la fiche document (route
 *     `/idocument/{id}` — la route exacte dépend du `documentRoutePrefix`
 *     passé en prop, qui diffère entre backoffice et agent-web).
 *   - Envoyer via iCorrespondance : visible uniquement si la génération
 *     a aussi créé un brouillon (`correspondanceItemId` présent). Navigue
 *     vers `/icorrespondance/{itemId}`.
 *
 * Le composant gère sa propre file de documents (max 5 visibles, les plus
 * récents en premier) et reste muet tant qu'aucun document n'a été émis
 * pendant la session.
 */

"use client";

import { FileText, Download, FolderOpen, Send } from "lucide-react";
import { useEffect, useState } from "react";

export interface IAstedDocumentCardData {
	documentId: string;
	correspondanceItemId?: string;
	filename: string;
	label: string;
	correspondanceType?: string;
	templateCode?: string;
	downloadUrl?: string;
	createdAt: number;
}

export interface IAstedDocumentCardProps {
	/**
	 * Préfixe de route vers la fiche document dans iDocument.
	 * Backoffice : `"/idocument"` — agent-web : `"/idocument"`.
	 * Citizen-web n'affiche pas cette card (iAsted ne génère pas de docs côté
	 * citoyen).
	 */
	documentRoutePrefix?: string;
	/**
	 * Préfixe de route vers le brouillon iCorrespondance.
	 * Backoffice : `"/icorrespondance"` — agent-web : `"/diplomatic-affairs/correspondance"`.
	 */
	correspondanceRoutePrefix?: string;
	/**
	 * Maximum de cards visibles simultanément (les plus anciennes sont
	 * tronquées). Défaut : 5.
	 */
	maxVisible?: number;
}

const MAX_DEFAULT = 5;

export function IAstedDocumentCard({
	documentRoutePrefix = "/idocument",
	correspondanceRoutePrefix = "/icorrespondance",
	maxVisible = MAX_DEFAULT,
}: IAstedDocumentCardProps) {
	const [docs, setDocs] = useState<IAstedDocumentCardData[]>([]);

	useEffect(() => {
		const handler = (e: Event) => {
			const detail = (e as CustomEvent<Omit<IAstedDocumentCardData, "createdAt">>).detail;
			if (!detail || !detail.documentId) return;
			setDocs((prev) => {
				if (prev.some((d) => d.documentId === detail.documentId)) return prev;
				const next: IAstedDocumentCardData[] = [
					{ ...detail, createdAt: Date.now() },
					...prev,
				];
				return next.slice(0, maxVisible);
			});
		};
		window.addEventListener("iasted:document-created", handler);
		return () => window.removeEventListener("iasted:document-created", handler);
	}, [maxVisible]);

	if (docs.length === 0) return null;

	return (
		<div
			role="region"
			aria-label="Documents générés par iAsted"
			className="border-t border-border/40 bg-violet-500/5 px-4 py-3 space-y-2"
		>
			<p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-400">
				Documents générés ({docs.length})
			</p>
			<div className="space-y-2 max-h-[200px] overflow-y-auto">
				{docs.map((doc) => (
					<DocRow
						key={doc.documentId}
						doc={doc}
						documentRoutePrefix={documentRoutePrefix}
						correspondanceRoutePrefix={correspondanceRoutePrefix}
					/>
				))}
			</div>
		</div>
	);
}

function DocRow({
	doc,
	documentRoutePrefix,
	correspondanceRoutePrefix,
}: {
	doc: IAstedDocumentCardData;
	documentRoutePrefix: string;
	correspondanceRoutePrefix: string;
}) {
	const canSend = Boolean(doc.correspondanceItemId);

	const handleDownload = () => {
		if (doc.downloadUrl) {
			window.open(doc.downloadUrl, "_blank", "noopener,noreferrer");
		} else {
			// Fallback : ouvrir la fiche iDocument qui contient le bouton télécharger
			window.location.href = `${documentRoutePrefix}/${doc.documentId}`;
		}
	};

	const handleOpen = () => {
		window.location.href = `${documentRoutePrefix}/${doc.documentId}`;
	};

	const handleSend = () => {
		if (!doc.correspondanceItemId) return;
		window.location.href = `${correspondanceRoutePrefix}/${doc.correspondanceItemId}`;
	};

	return (
		<div className="rounded-lg border border-violet-500/20 bg-background/80 p-2.5 space-y-2">
			<div className="flex items-start gap-2">
				<div className="shrink-0 mt-0.5">
					<FileText className="h-4 w-4 text-violet-600 dark:text-violet-400" />
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-xs font-semibold leading-snug truncate" title={doc.label}>
						{doc.label}
					</p>
					<p className="text-[10px] text-muted-foreground truncate" title={doc.filename}>
						{doc.filename}
					</p>
				</div>
			</div>
			<div className="flex items-center gap-1.5 flex-wrap">
				<button
					type="button"
					onClick={handleDownload}
					className="inline-flex items-center gap-1 rounded-md bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-semibold px-2 py-1 transition-colors"
				>
					<Download className="h-3 w-3" />
					Télécharger
				</button>
				<button
					type="button"
					onClick={handleOpen}
					className="inline-flex items-center gap-1 rounded-md border border-border hover:bg-muted text-[11px] font-medium px-2 py-1 transition-colors"
				>
					<FolderOpen className="h-3 w-3" />
					iDocument
				</button>
				{canSend && (
					<button
						type="button"
						onClick={handleSend}
						className="inline-flex items-center gap-1 rounded-md border border-border hover:bg-muted text-[11px] font-medium px-2 py-1 transition-colors"
					>
						<Send className="h-3 w-3" />
						iCorrespondance
					</button>
				)}
			</div>
		</div>
	);
}
