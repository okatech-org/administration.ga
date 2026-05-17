"use client";

/**
 * PdfViewer — wrapper SSR-safe autour de pdf-viewer-impl.
 *
 * react-pdf importe pdfjs-dist qui touche `DOMMatrix` au top-level du module.
 * En SSR Node, `DOMMatrix` n'existe pas → crash du prerender. On défère
 * l'import du module impl à un `useEffect` qui ne tourne qu'en browser.
 *
 * Le composant rend `null` côté serveur et avant hydratation, puis monte
 * l'implémentation réelle dès que le module est chargé côté client.
 */

import { useEffect, useState, type ComponentType } from "react";
import type { PdfViewerProps } from "./pdf-viewer-impl";

export type { PdfViewerProps } from "./pdf-viewer-impl";

export function PdfViewer(props: PdfViewerProps) {
	const [Impl, setImpl] = useState<ComponentType<PdfViewerProps> | null>(null);

	useEffect(() => {
		let cancelled = false;
		import("./pdf-viewer-impl").then((m) => {
			if (!cancelled) setImpl(() => m.PdfViewer);
		});
		return () => {
			cancelled = true;
		};
	}, []);

	if (!Impl) return null;
	return <Impl {...props} />;
}
