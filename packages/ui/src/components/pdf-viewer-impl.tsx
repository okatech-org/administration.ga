"use client";

/**
 * PdfViewer — Rendu réel des PDF via react-pdf + pdfjs-dist.
 *
 * Deux modes :
 *   - `thumbnail` : rend uniquement la page 1, calée sur la largeur du parent
 *     via ResizeObserver. Désactive text/annotation layers (pointer-events:none).
 *   - `full`      : viewer paginé (◄ Page X/Y ►), zoom (−/+/Fit), scroll natif.
 *
 * Stratégie de chargement :
 *   - On passe l'URL directement à react-pdf via `file={{ url }}`. react-pdf
 *     gère son fetch interne ET son cache, ce qui évite les soucis de buffer
 *     détaché lors du transfer postMessage vers le worker pdf.js.
 *   - Le worker pdf.js est servi depuis `/pdf.worker.min.mjs?v=<version>`
 *     (copié dans `public/` à l'install). La query string évite le cache HTTP
 *     stale après mise à jour. La CSP autorise `worker-src 'self' blob:`.
 */

import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus, ZoomIn } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Button } from "./button";
import { cn } from "../lib/utils";

// ─── Worker pdf.js — servi depuis /public/pdf.worker.min.mjs ────────────────
// IMPORTANT : la version du worker DOIT matcher `pdfjs.version` (embarquée
// par react-pdf). Le `?v=` cache-bust force le navigateur à refetch le worker
// quand la version change. Si vous mettez à jour react-pdf, recopiez :
//   node_modules/.bun/pdfjs-dist@<version>/node_modules/pdfjs-dist/build/pdf.worker.min.mjs
// vers apps/agent-web/public/pdf.worker.min.mjs.
if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
	pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs?v=${pdfjs.version}`;
}

// Options de chargement stables (mémoïsées globalement pour éviter de
// reconstruire l'objet à chaque render — sinon react-pdf rejoue le fetch).
const DOCUMENT_OPTIONS = {
	cMapUrl: "/cmaps/",
	cMapPacked: true,
	standardFontDataUrl: "/standard_fonts/",
};

export interface PdfViewerProps {
	/** URL du PDF (Convex storage URL, blob URL, etc.). */
	url: string;
	/** Mode d'affichage. */
	mode: "thumbnail" | "full";
	/** Largeur fixe en mode full (sinon auto via ResizeObserver). */
	width?: number;
	/** Classes supplémentaires. */
	className?: string;
	/** Action « Agrandir » (mode full uniquement). */
	onExpand?: () => void;
	/** Désactive les contrôles toolbar (mode full uniquement). */
	hideToolbar?: boolean;
}

export function PdfViewer({
	url,
	mode,
	width,
	className,
	onExpand,
	hideToolbar = false,
}: PdfViewerProps) {
	const [error, setError] = useState<string | null>(null);
	const [numPages, setNumPages] = useState<number>(0);
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [zoom, setZoom] = useState<number>(1);
	const [autoWidth, setAutoWidth] = useState<number>(width ?? 0);
	const containerRef = useRef<HTMLDivElement>(null);

	// ResizeObserver pour adapter la largeur du rendu au container.
	useEffect(() => {
		if (width) return;
		const el = containerRef.current;
		if (!el) return;
		const observer = new ResizeObserver((entries) => {
			const w = entries[0]?.contentRect.width ?? 0;
			if (w > 0) setAutoWidth(w);
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, [width]);

	// Référence d'URL stable pour `file` — évite que react-pdf rejoue le fetch
	// à chaque render. La même URL pour la même string => même objet.
	const file = useMemo(() => ({ url }), [url]);

	const onLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
		setNumPages(n);
		setCurrentPage(1);
		setError(null);
	}, []);

	const onLoadError = useCallback((err: Error) => {
		setError(err?.message ?? "Erreur de chargement");
	}, []);

	const renderedWidth = (width ?? autoWidth) * (mode === "full" ? zoom : 1);
	const goPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
	const goNext = () => setCurrentPage((p) => Math.min(numPages, p + 1));
	const zoomOut = () => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)));
	const zoomIn = () => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)));
	const zoomFit = () => setZoom(1);

	// ─── Skeleton / erreur ─────────────────────────────────────────────────
	if (error) {
		return (
			<div
				ref={containerRef}
				className={cn(
					"flex h-full w-full items-center justify-center bg-muted/10 text-xs text-muted-foreground",
					className,
				)}
			>
				Impossible de charger le PDF
			</div>
		);
	}

	// ─── Mode thumbnail ────────────────────────────────────────────────────
	if (mode === "thumbnail") {
		return (
			<div
				ref={containerRef}
				className={cn(
					"pointer-events-none relative w-full overflow-hidden bg-white aspect-[210/297]",
					className,
				)}
			>
				<Document
					file={file}
					onLoadSuccess={onLoadSuccess}
					onLoadError={onLoadError}
					options={DOCUMENT_OPTIONS}
					loading={
						<div className="flex h-full items-center justify-center">
							<div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground/60" />
						</div>
					}
					error={null}
					className="h-full w-full"
				>
					{renderedWidth > 0 ? (
						<Page
							pageNumber={1}
							width={renderedWidth}
							renderTextLayer={false}
							renderAnnotationLayer={false}
							loading={null}
							error={null}
						/>
					) : null}
				</Document>
			</div>
		);
	}

	// ─── Mode full ─────────────────────────────────────────────────────────
	return (
		<div className={cn("flex h-full w-full flex-col", className)}>
			{!hideToolbar && (
				<div className="flex items-center justify-between gap-2 border-b bg-card/50 px-3 py-2 text-xs">
					<div className="flex items-center gap-1">
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							onClick={goPrev}
							disabled={currentPage <= 1}
							aria-label="Page précédente"
						>
							<ChevronLeft className="h-3.5 w-3.5" />
						</Button>
						<span className="min-w-[60px] text-center font-mono tabular-nums text-muted-foreground">
							{numPages > 0 ? `${currentPage} / ${numPages}` : "—"}
						</span>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							onClick={goNext}
							disabled={currentPage >= numPages}
							aria-label="Page suivante"
						>
							<ChevronRight className="h-3.5 w-3.5" />
						</Button>
					</div>
					<div className="flex items-center gap-1">
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							onClick={zoomOut}
							disabled={zoom <= 0.5}
							aria-label="Zoom arrière"
						>
							<Minus className="h-3.5 w-3.5" />
						</Button>
						<button
							type="button"
							onClick={zoomFit}
							className="min-w-[48px] rounded px-2 py-0.5 font-mono text-[11px] text-muted-foreground hover:bg-muted"
							aria-label="Ajuster à la largeur"
						>
							{Math.round(zoom * 100)} %
						</button>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							onClick={zoomIn}
							disabled={zoom >= 3}
							aria-label="Zoom avant"
						>
							<Plus className="h-3.5 w-3.5" />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							onClick={zoomFit}
							aria-label="Adapter à la largeur"
							title="Adapter à la largeur"
						>
							<ZoomIn className="h-3.5 w-3.5" />
						</Button>
						{onExpand ? (
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-7 w-7"
								onClick={onExpand}
								aria-label="Agrandir"
								title="Plein écran"
							>
								<Maximize2 className="h-3.5 w-3.5" />
							</Button>
						) : null}
					</div>
				</div>
			)}
			<div
				ref={containerRef}
				className="flex flex-1 justify-center overflow-auto bg-muted/30 p-4"
			>
				<Document
					file={file}
					onLoadSuccess={onLoadSuccess}
					onLoadError={onLoadError}
					options={DOCUMENT_OPTIONS}
					loading={
						<div className="flex h-full items-center justify-center">
							<div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground/60" />
						</div>
					}
					error={
						<div className="text-xs text-muted-foreground">
							Erreur lors du rendu du PDF
						</div>
					}
				>
					{renderedWidth > 0 ? (
						<Page
							pageNumber={currentPage}
							width={renderedWidth}
							className="shadow-md"
							loading={null}
							error={null}
						/>
					) : null}
				</Document>
			</div>
		</div>
	);
}
