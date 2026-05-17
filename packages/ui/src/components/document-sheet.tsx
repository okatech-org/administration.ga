"use client";

/**
 * Vignette A4 réutilisable pour l'affichage uniforme des documents.
 *
 * Principe : le contenu est rendu aux dimensions natives A4 (794×1123 px
 * @ 96dpi) puis réduit via `transform: scale()` calculé dynamiquement via
 * `ResizeObserver` pour tenir exactement dans la carte. Les proportions
 * internes (logo, marges, polices) sont *identiques* au document imprimé.
 *
 * Utilisations :
 *   - Bibliothèque de modèles (TemplateThumbnailCard)
 *   - iDocument : aperçu des documents stockés
 *   - iCorrespondance : pièces jointes
 *   - iBoîte / iMessage : fichiers envoyés (docx, pdf)
 *   - Pages publiques citoyen (documents délivrés par le consulat)
 *
 * Variantes :
 *   - `DocumentSheet` (générique) : enfants rendus en A4 naturel
 *   - `DocumentSheetHtml` : injecte un HTML (contentHtml des modèles/générés)
 *   - `DocumentSheetFile` : aperçu d'un fichier uploadé (PDF embarqué, image,
 *     icône + nom de fichier pour docx/autres)
 *
 * NOTE : Les styles dynamiques (dimensions mm, transform scale, polices)
 * sont appliqués via ref callbacks pour éviter la prop `style=` sur les
 * éléments natifs, conformément à la règle lint du projet.
 */

import { FileText, FileType, Image as ImageIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../lib/utils";
import { PdfViewer } from "./pdf-viewer";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";

/** Dimensions A4 en px @ 96dpi — base du rendu « naturel » avant scale. */
export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;

/**
 * Applique un objet CSSProperties sur un élément HTML via sa propriété `.style`.
 * Utilisé en ref callback pour éviter la prop `style=` dans le JSX.
 */
function applyCSS(el: HTMLElement | null, css: CSSProperties) {
	if (!el) return;
	for (const [key, value] of Object.entries(css)) {
		const cssKey = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
		if (value != null) {
			el.style.setProperty(cssKey, String(value));
		}
	}
}

export interface DocumentSheetProps {
	/** Orientation. Défaut : portrait. */
	orientation?: "portrait" | "landscape";
	/** Contenu rendu à l'échelle A4 réelle (units : mm, pt, px naturels). */
	children: ReactNode;
	/** Action au clic sur la feuille. */
	onClick?: () => void;
	/** Overlays positionnés absolument par-dessus la feuille (badges, etc.). */
	overlays?: ReactNode;
	/** Label d'accessibilité. */
	ariaLabel?: string;
	/** Classes supplémentaires sur le cadre extérieur. */
	className?: string;
}

/**
 * Cadre A4 brut. Le `children` doit être écrit aux dimensions réelles d'une
 * feuille A4 (210×297mm). La miniature scale automatiquement pour tenir dans
 * la largeur du conteneur parent.
 *
 * Angles droits (pas de `border-radius`) pour un rendu « feuille de papier ».
 */
export function DocumentSheet({
	orientation = "portrait",
	children,
	onClick,
	overlays,
	ariaLabel,
	className,
}: DocumentSheetProps) {
	const cardRef = useRef<HTMLDivElement>(null);
	const innerRef = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState(0);
	const isLandscape = orientation === "landscape";
	const naturalWidth = isLandscape ? A4_HEIGHT_PX : A4_WIDTH_PX;
	const naturalHeight = isLandscape ? A4_WIDTH_PX : A4_HEIGHT_PX;

	useEffect(() => {
		if (!cardRef.current) return;
		const el = cardRef.current;
		const observer = new ResizeObserver((entries) => {
			const width = entries[0]?.contentRect.width ?? 0;
			setScale(width / naturalWidth);
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, [naturalWidth]);

	// Apply dynamic transform/dimensions via ref instead of style prop
	useEffect(() => {
		applyCSS(innerRef.current, {
			width: `${naturalWidth}px`,
			height: `${naturalHeight}px`,
			transform: `scale(${scale})`,
			transformOrigin: "top left",
			boxSizing: "border-box",
		});
	}, [naturalWidth, naturalHeight, scale]);

	const clickable = typeof onClick === "function";
	const interactiveProps = clickable
		? {
				role: "button" as const,
				tabIndex: 0,
				onClick: () => {
					onClick();
				},
				onKeyDown: (e: KeyboardEvent) => {
					if (e.key === "Enter" || e.key === " ") onClick();
				},
			}
		: {};

	return (
		<div
			ref={cardRef}
			{...interactiveProps}
			aria-label={ariaLabel}
			className={cn(
				"relative w-full overflow-hidden border border-border bg-white shadow-sm transition dark:border-border/60",
				isLandscape ? "aspect-[297/210]" : "aspect-[210/297]",
				clickable &&
					"cursor-pointer hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/60",
				className,
			)}
		>
			<div
				ref={innerRef}
				className="absolute left-0 top-0 flex flex-col bg-white text-neutral-900"
			>
				{children}
			</div>
			{overlays}
		</div>
	);
}

export interface DocumentSheetPageProps {
	/** Marges en mm. Défaut : 20mm de chaque côté. */
	margin?: number;
	/** Famille de police. Défaut : Times New Roman. */
	fontFamily?: string;
	/** Style additionnel. */
	style?: CSSProperties;
	children: ReactNode;
}

/**
 * Page A4 standard avec marges et typographie par défaut. À utiliser comme
 * enfant direct de `DocumentSheet`.
 */
export function DocumentSheetPage({
	margin = 20,
	fontFamily = "'Times New Roman', serif",
	style,
	children,
}: DocumentSheetPageProps) {
	const pageRef = useCallback(
		(el: HTMLDivElement | null) => {
			applyCSS(el, {
				padding: `${margin}mm`,
				fontFamily,
				fontSize: "11pt",
				lineHeight: "1.35",
				...style,
			});
		},
		[margin, fontFamily, style],
	);

	return (
		<div ref={pageRef} className="flex flex-1 flex-col">
			{children}
		</div>
	);
}

export interface DocumentSheetHeaderProps {
	/** URL du logo (sceau, identité visuelle). */
	logoUrl?: string | null;
	/** Hauteur du logo en mm. Défaut : 22mm. */
	logoHeightMm?: number;
	/** Lignes textuelles de l'entête (ordre d'affichage). */
	lines?: Array<string>;
	/** Espacement après l'entête en mm. Défaut : 4mm. */
	marginBottomMm?: number;
}

export function DocumentSheetHeader({
	logoUrl,
	logoHeightMm = 22,
	lines = [],
	marginBottomMm = 4,
}: DocumentSheetHeaderProps) {
	const headerRef = useCallback(
		(el: HTMLDivElement | null) => {
			applyCSS(el, { marginBottom: `${marginBottomMm}mm` });
		},
		[marginBottomMm],
	);

	const logoRef = useCallback(
		(el: HTMLImageElement | null) => {
			applyCSS(el, { height: `${logoHeightMm}mm` });
		},
		[logoHeightMm],
	);

	if (!logoUrl && lines.length === 0) return null;
	return (
		<div ref={headerRef} className="flex flex-col items-center text-center">
			{logoUrl ? (
				// biome-ignore lint/a11y/useAltText: logo décoratif dans vignette
				<img
					ref={logoRef}
					src={logoUrl}
					alt=""
					className="mb-[3mm] w-auto"
				/>
			) : null}
			{lines.map((line, idx) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: lignes stables issues de l'entête
					key={idx}
					className={cn(
						"leading-[1.2]",
						idx === 0
							? "text-[11pt] font-bold uppercase"
							: "text-[10pt] font-normal normal-case",
					)}
				>
					{line}
				</div>
			))}
		</div>
	);
}

export interface DocumentSheetFooterProps {
	lines?: Array<string>;
	/** Marge supérieure en mm. Défaut : 4mm. */
	marginTopMm?: number;
}

export function DocumentSheetFooter({
	lines = [],
	marginTopMm = 4,
}: DocumentSheetFooterProps) {
	const footerRef = useCallback(
		(el: HTMLDivElement | null) => {
			applyCSS(el, { marginTop: `${marginTopMm}mm` });
		},
		[marginTopMm],
	);

	if (lines.length === 0) return null;
	return (
		<div
			ref={footerRef}
			className="text-center italic text-[#4B5563] text-[9pt] leading-[1.25]"
		>
			{lines.map((line, idx) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: lignes stables issues du pied
				<div key={idx}>{line}</div>
			))}
		</div>
	);
}

/**
 * Corps du document : accepte du HTML brut (modèles, documents générés) ou
 * un placeholder si vide.
 */
export function DocumentSheetBody({
	html,
	emptyLabel = "Aperçu vide",
}: {
	html?: string;
	emptyLabel?: string;
}) {
	return (
		<div className="flex-1 overflow-hidden doc-sheet-body">
			{html?.trim() ? (
				<div dangerouslySetInnerHTML={{ __html: html }} />
			) : (
				<div className="flex h-full items-center justify-center text-center italic text-[#9CA3AF] text-[12pt]">
					{emptyLabel}
				</div>
			)}
			{/* @ts-ignore styled-jsx prop missing native types in shared workspace */}
			<style jsx>{`
				.doc-sheet-body :global(p) {
					margin: 0 0 3mm 0;
				}
				.doc-sheet-body :global(h1) {
					font-size: 16pt;
					font-weight: 700;
					text-align: center;
					margin: 4mm 0;
				}
				.doc-sheet-body :global(h2) {
					font-size: 13pt;
					font-weight: 700;
					margin: 3mm 0;
				}
				.doc-sheet-body :global(h3) {
					font-size: 11pt;
					font-weight: 700;
					margin: 2mm 0;
				}
				.doc-sheet-body :global(table) {
					border-collapse: collapse;
					width: 100%;
				}
				.doc-sheet-body :global(td),
				.doc-sheet-body :global(th) {
					padding: 1mm 2mm;
				}
				.doc-sheet-body :global(img) {
					max-width: 100%;
					height: auto;
				}
			`}</style>
		</div>
	);
}

// ============================================================================
// Variantes spécialisées
// ============================================================================

export interface DocumentSheetFileProps {
	/** Nom affiché (titre du fichier). */
	fileName: string;
	/** Type MIME pour choisir le rendu approprié. */
	mimeType?: string;
	/** URL du fichier (pour preview PDF/image). */
	url?: string | null;
	/** Légende secondaire (ex. taille, date). */
	subtitle?: string;
	/** Action au clic. */
	onClick?: () => void;
	/** Overlays. */
	overlays?: ReactNode;
	/** Label ARIA. */
	ariaLabel?: string;
}

/**
 * Vignette A4 pour un fichier uploadé (pièce jointe, document citoyen, etc.).
 *
 * Rendu selon le type :
 *   - `application/pdf` : première page embarquée via iframe
 *   - image/* : image affichée plein cadre
 *   - autres (docx, xlsx…) : icône + nom de fichier centrés
 */
export function DocumentSheetFile({
	fileName,
	mimeType,
	url,
	subtitle,
	onClick,
	overlays,
	ariaLabel,
}: DocumentSheetFileProps) {
	const isPdf = mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
	const isImage =
		mimeType?.startsWith("image/") ||
		/\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(fileName);

	// Pour les PDF, on rend la 1re page via PdfViewer (canvas) — pas d'iframe.
	// Pour les images, <img> object-cover. Pour le reste, icône + nom.
	const clickable = typeof onClick === "function";
	const interactiveProps = clickable
		? {
				role: "button" as const,
				tabIndex: 0,
				onClick: () => {
					onClick();
				},
				onKeyDown: (e: KeyboardEvent) => {
					if (e.key === "Enter" || e.key === " ") onClick();
				},
			}
		: {};

	if (isPdf && url) {
		return (
			<div
				{...interactiveProps}
				aria-label={ariaLabel ?? `Ouvrir ${fileName}`}
				className={cn(
					"relative w-full overflow-hidden border border-border bg-white shadow-sm transition aspect-[210/297] dark:border-border/60",
					clickable &&
						"cursor-pointer hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/60",
				)}
			>
				<PdfViewer url={url} mode="thumbnail" />
				{overlays}
			</div>
		);
	}

	return (
		<DocumentSheet
			orientation="portrait"
			onClick={onClick}
			overlays={overlays}
			ariaLabel={ariaLabel ?? `Ouvrir ${fileName}`}
		>
			{isImage && url ? (
				// biome-ignore lint/a11y/useAltText: alt défini dans props
				<img
					src={url}
					alt={fileName}
					className="h-full w-full object-cover"
				/>
			) : (
				<DocumentSheetPage>
					<div className="flex flex-1 flex-col items-center justify-center gap-[6mm] text-center">
						<FileIconForType mimeType={mimeType} fileName={fileName} size={72} />
						<div className="max-w-[80%] break-words text-[14pt] font-semibold">
							{fileName}
						</div>
						{subtitle ? (
							<div className="text-[10pt] text-[#6B7280]">
								{subtitle}
							</div>
						) : null}
					</div>
				</DocumentSheetPage>
			)}
		</DocumentSheet>
	);
}

/** Icône selon le mime-type / extension. */
function FileIconForType({
	mimeType,
	fileName,
	size = 48,
}: {
	mimeType?: string;
	fileName: string;
	size?: number;
}) {
	const ext = fileName.split(".").pop()?.toLowerCase();
	if (mimeType?.startsWith("image/") || /^(png|jpe?g|gif|webp|svg)$/.test(ext ?? "")) {
		return <ImageIcon size={size} strokeWidth={1.5} className="text-[#6B7280]" />;
	}
	if (
		mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
		ext === "docx" ||
		ext === "doc"
	) {
		return <FileType size={size} strokeWidth={1.5} className="text-[#2563EB]" />;
	}
	if (mimeType === "application/pdf" || ext === "pdf") {
		return <FileText size={size} strokeWidth={1.5} className="text-[#DC2626]" />;
	}
	return <FileText size={size} strokeWidth={1.5} className="text-[#6B7280]" />;
}
