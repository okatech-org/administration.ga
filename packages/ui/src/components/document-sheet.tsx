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
 */

import { FileText, FileType, Image as ImageIcon } from "lucide-react";
import {
	type CSSProperties,
	type KeyboardEvent,
	type MouseEvent,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";
import { cn } from "../lib/utils";

/** Dimensions A4 en px @ 96dpi — base du rendu « naturel » avant scale. */
export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;

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

	const clickable = typeof onClick === "function";

	return (
		<div
			ref={cardRef}
			role={clickable ? "button" : undefined}
			tabIndex={clickable ? 0 : undefined}
			onClick={clickable ? () => onClick?.() : undefined}
			onKeyDown={
				clickable
					? (e: KeyboardEvent) => {
							if (e.key === "Enter" || e.key === " ") onClick?.();
						}
					: undefined
			}
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
				className="absolute left-0 top-0 flex flex-col bg-white text-neutral-900"
				style={{
					width: `${naturalWidth}px`,
					height: `${naturalHeight}px`,
					transform: `scale(${scale})`,
					transformOrigin: "top left",
					boxSizing: "border-box",
				}}
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
	return (
		<div
			className="flex flex-1 flex-col"
			style={{
				padding: `${margin}mm`,
				fontFamily,
				fontSize: "11pt",
				lineHeight: 1.35,
				...style,
			}}
		>
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
	lines?: string[];
	/** Espacement après l'entête en mm. Défaut : 4mm. */
	marginBottomMm?: number;
}

export function DocumentSheetHeader({
	logoUrl,
	logoHeightMm = 22,
	lines = [],
	marginBottomMm = 4,
}: DocumentSheetHeaderProps) {
	if (!logoUrl && lines.length === 0) return null;
	return (
		<div
			className="flex flex-col items-center text-center"
			style={{ marginBottom: `${marginBottomMm}mm` }}
		>
			{logoUrl ? (
				// biome-ignore lint/a11y/useAltText: logo décoratif dans vignette
				<img
					src={logoUrl}
					alt=""
					style={{
						height: `${logoHeightMm}mm`,
						width: "auto",
						marginBottom: "3mm",
					}}
				/>
			) : null}
			{lines.map((line, idx) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: lignes stables issues de l'entête
					key={idx}
					style={{
						fontSize: idx === 0 ? "11pt" : "10pt",
						fontWeight: idx === 0 ? 700 : 400,
						textTransform: idx === 0 ? "uppercase" : "none",
						lineHeight: 1.2,
					}}
				>
					{line}
				</div>
			))}
		</div>
	);
}

export interface DocumentSheetFooterProps {
	lines?: string[];
	/** Marge supérieure en mm. Défaut : 4mm. */
	marginTopMm?: number;
}

export function DocumentSheetFooter({
	lines = [],
	marginTopMm = 4,
}: DocumentSheetFooterProps) {
	if (lines.length === 0) return null;
	return (
		<div
			className="text-center italic"
			style={{
				marginTop: `${marginTopMm}mm`,
				color: "#4B5563",
				fontSize: "9pt",
				lineHeight: 1.25,
			}}
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
		<div className="doc-sheet-body" style={{ flex: 1, overflow: "hidden" }}>
			{html?.trim() ? (
				<div dangerouslySetInnerHTML={{ __html: html }} />
			) : (
				<div
					className="flex h-full items-center justify-center text-center italic"
					style={{ color: "#9CA3AF", fontSize: "12pt" }}
				>
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

	return (
		<DocumentSheet
			orientation="portrait"
			onClick={onClick}
			overlays={overlays}
			ariaLabel={ariaLabel ?? `Ouvrir ${fileName}`}
		>
			{isPdf && url ? (
				<iframe
					src={`${url}#view=FitH&toolbar=0&navpanes=0`}
					title={fileName}
					className="h-full w-full border-0"
					style={{
						width: `${A4_WIDTH_PX}px`,
						height: `${A4_HEIGHT_PX}px`,
						pointerEvents: "none",
					}}
				/>
			) : isImage && url ? (
				// biome-ignore lint/a11y/useAltText: alt défini dans props
				<img
					src={url}
					alt={fileName}
					className="h-full w-full object-cover"
					style={{ width: "100%", height: "100%" }}
				/>
			) : (
				<DocumentSheetPage>
					<div
						className="flex flex-1 flex-col items-center justify-center text-center"
						style={{ gap: "6mm" }}
					>
						<FileIconForType mimeType={mimeType} fileName={fileName} size={72} />
						<div
							style={{
								fontSize: "14pt",
								fontWeight: 600,
								wordBreak: "break-word",
								maxWidth: "80%",
							}}
						>
							{fileName}
						</div>
						{subtitle ? (
							<div
								style={{
									fontSize: "10pt",
									color: "#6B7280",
								}}
							>
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
		return <ImageIcon size={size} strokeWidth={1.5} style={{ color: "#6B7280" }} />;
	}
	if (
		mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
		ext === "docx" ||
		ext === "doc"
	) {
		return <FileType size={size} strokeWidth={1.5} style={{ color: "#2563EB" }} />;
	}
	if (mimeType === "application/pdf" || ext === "pdf") {
		return <FileText size={size} strokeWidth={1.5} style={{ color: "#DC2626" }} />;
	}
	return <FileText size={size} strokeWidth={1.5} style={{ color: "#6B7280" }} />;
}
