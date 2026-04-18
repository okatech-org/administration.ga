"use client";

/**
 * Enrobe `<TemplateEditor />` de deux règles graduées (horizontale en haut,
 * verticale à gauche) avec curseurs draggable pour ajuster les quatre
 * marges du document en temps réel — à la manière d'un éditeur de texte
 * bureau (Word, LibreOffice).
 *
 * - La règle est graduée en millimètres (conversion CSS via MM_TO_PX à 96
 *   dpi).
 * - Deux curseurs par règle : le premier contrôle la marge AVANT (gauche /
 *   haut), le second la marge APRÈS (droite / bas).
 * - Drag & drop via mousedown → document mousemove → mouseup : calcule la
 *   nouvelle valeur en mm depuis `clientX` / `clientY` rapportés au conteneur
 *   de la règle.
 * - Les valeurs sont clampées au demi-page : aucune marge ne peut dépasser
 *   la moitié de la dimension papier.
 */

import { TemplateEditor, type TemplateEditorProps } from "@workspace/document-editor";
import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";

export interface LayoutState {
	paperSize: "A4" | "LETTER";
	orientation: "portrait" | "landscape";
	marginTop: number;
	marginRight: number;
	marginBottom: number;
	marginLeft: number;
}

export interface TemplateEditorWithRulersProps
	extends Omit<
		TemplateEditorProps,
		"paperSize" | "orientation" | "marginTop" | "marginRight" | "marginBottom" | "marginLeft"
	> {
	layout: LayoutState;
	onLayoutChange: (next: LayoutState) => void;
	/** Plage max d'une marge en mm (clampe les valeurs extrêmes). */
	maxMarginMm?: number;
}

/** Dimensions papier en mm. */
const PAPER_MM: Record<"A4" | "LETTER", { w: number; h: number }> = {
	A4: { w: 210, h: 297 },
	LETTER: { w: 216, h: 279 },
};

/** Largeur de la règle verticale en px — doit correspondre à la marge interne
 *  réservée par le wrapper pour ne pas décaler le canvas. */
const RULER_THICKNESS = 28;

/** Tailles des curseurs (petits triangles) en px. */
const HANDLE_SIZE = 14;

type Axis = "horizontal" | "vertical";
type HandleKind = "start" | "end";

export function TemplateEditorWithRulers({
	layout,
	onLayoutChange,
	maxMarginMm = 80,
	...editorProps
}: TemplateEditorWithRulersProps): ReactElement {
	const paper = PAPER_MM[layout.paperSize];
	const isPortrait = layout.orientation === "portrait";
	const pageWidthMm = isPortrait ? paper.w : paper.h;
	const pageHeightMm = isPortrait ? paper.h : paper.w;

	function setMargin(kind: "top" | "right" | "bottom" | "left", valueMm: number) {
		const clamped = Math.max(0, Math.min(maxMarginMm, Math.round(valueMm)));
		switch (kind) {
			case "top":
				onLayoutChange({ ...layout, marginTop: clamped });
				break;
			case "right":
				onLayoutChange({ ...layout, marginRight: clamped });
				break;
			case "bottom":
				onLayoutChange({ ...layout, marginBottom: clamped });
				break;
			case "left":
				onLayoutChange({ ...layout, marginLeft: clamped });
				break;
		}
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between text-xs text-muted-foreground">
				<span>
					{layout.paperSize} · {layout.orientation === "portrait" ? "portrait" : "paysage"} ·
					{" "}
					{layout.marginTop} / {layout.marginRight} / {layout.marginBottom} / {layout.marginLeft} mm
				</span>
				<span className="hidden sm:inline">
					Fais glisser les curseurs des règles pour ajuster les marges.
				</span>
			</div>

			<div className="relative">
				{/* Règle horizontale (haut) */}
				<div
					className="relative ml-[var(--ruler-thickness)]"
					style={
						{
							"--ruler-thickness": `${RULER_THICKNESS}px`,
						} as React.CSSProperties
					}
				>
					<Ruler
						axis="horizontal"
						pageSizeMm={pageWidthMm}
						marginStart={layout.marginLeft}
						marginEnd={layout.marginRight}
						onChangeStart={(mm) => setMargin("left", mm)}
						onChangeEnd={(mm) => setMargin("right", mm)}
					/>
				</div>

				<div className="flex">
					{/* Règle verticale (gauche) */}
					<Ruler
						axis="vertical"
						pageSizeMm={pageHeightMm}
						marginStart={layout.marginTop}
						marginEnd={layout.marginBottom}
						onChangeStart={(mm) => setMargin("top", mm)}
						onChangeEnd={(mm) => setMargin("bottom", mm)}
					/>
					{/* Canvas éditeur */}
					<div className="min-w-0 flex-1">
						<TemplateEditor
							{...editorProps}
							paperSize={layout.paperSize}
							orientation={layout.orientation}
							marginTop={layout.marginTop}
							marginRight={layout.marginRight}
							marginBottom={layout.marginBottom}
							marginLeft={layout.marginLeft}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

// ─── Ruler ───────────────────────────────────────────────────────────────

interface RulerProps {
	axis: Axis;
	pageSizeMm: number;
	marginStart: number;
	marginEnd: number;
	onChangeStart: (mm: number) => void;
	onChangeEnd: (mm: number) => void;
}

function Ruler({
	axis,
	pageSizeMm,
	marginStart,
	marginEnd,
	onChangeStart,
	onChangeEnd,
}: RulerProps): ReactElement {
	const trackRef = useRef<HTMLDivElement | null>(null);
	const [draggingKind, setDraggingKind] = useState<HandleKind | null>(null);

	const isHorizontal = axis === "horizontal";

	/** Retourne la taille visible de la règle dans le sens de l'axe, en px. */
	function pixelLength(): number {
		const rect = trackRef.current?.getBoundingClientRect();
		if (!rect) return 0;
		return isHorizontal ? rect.width : rect.height;
	}

	function mmFromEvent(clientPos: number): number {
		const rect = trackRef.current?.getBoundingClientRect();
		if (!rect) return 0;
		const origin = isHorizontal ? rect.left : rect.top;
		const size = pixelLength();
		const ratio = Math.max(0, Math.min(1, (clientPos - origin) / size));
		return ratio * pageSizeMm;
	}

	useEffect(() => {
		if (!draggingKind) return;
		function onMove(e: MouseEvent) {
			const mm = mmFromEvent(isHorizontal ? e.clientX : e.clientY);
			if (draggingKind === "start") {
				onChangeStart(mm);
			} else {
				// Pour le curseur de fin, la marge est la distance DEPUIS le bord de
				// fin, donc on soustrait la position du curseur de la taille totale.
				onChangeEnd(pageSizeMm - mm);
			}
		}
		function onUp() {
			setDraggingKind(null);
		}
		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup", onUp);
		return () => {
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", onUp);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [draggingKind, pageSizeMm]);

	// Positions en % des curseurs sur la règle
	const startPct = Math.max(0, Math.min(100, (marginStart / pageSizeMm) * 100));
	const endPct = Math.max(0, Math.min(100, ((pageSizeMm - marginEnd) / pageSizeMm) * 100));

	// Graduations : tous les 10 mm, label tous les 50 mm
	const ticks: Array<{ mm: number; major: boolean; labeled: boolean }> = [];
	for (let mm = 0; mm <= pageSizeMm; mm += 10) {
		ticks.push({
			mm,
			major: mm % 50 === 0,
			labeled: mm % 50 === 0 && mm !== 0 && mm !== pageSizeMm,
		});
	}

	return (
		<div
			ref={trackRef}
			className={
				isHorizontal
					? "relative h-7 w-full select-none overflow-hidden rounded-sm border border-border/60 bg-muted/40"
					: "relative h-full w-7 shrink-0 select-none overflow-hidden rounded-sm border border-border/60 bg-muted/40"
			}
			style={isHorizontal ? undefined : { minHeight: 200 }}
			aria-label={isHorizontal ? "Règle horizontale" : "Règle verticale"}
		>
			{/* Zone active (hors marges) — bande plus claire */}
			<div
				className="absolute bg-background"
				style={
					isHorizontal
						? {
								left: `${startPct}%`,
								right: `${100 - endPct}%`,
								top: 0,
								bottom: 0,
							}
						: {
								top: `${startPct}%`,
								bottom: `${100 - endPct}%`,
								left: 0,
								right: 0,
							}
				}
			/>
			{/* Graduations */}
			{ticks.map((tick) => (
				<div
					key={tick.mm}
					className="absolute bg-foreground/40"
					style={
						isHorizontal
							? {
									left: `${(tick.mm / pageSizeMm) * 100}%`,
									top: tick.major ? 0 : "50%",
									bottom: 0,
									width: 1,
								}
							: {
									top: `${(tick.mm / pageSizeMm) * 100}%`,
									left: tick.major ? 0 : "50%",
									right: 0,
									height: 1,
								}
					}
				/>
			))}
			{/* Labels majeurs */}
			{ticks
				.filter((t) => t.labeled)
				.map((tick) => (
					<span
						key={`label-${tick.mm}`}
						className="absolute text-[8px] font-medium text-muted-foreground"
						style={
							isHorizontal
								? {
										left: `${(tick.mm / pageSizeMm) * 100}%`,
										transform: "translateX(2px)",
										top: 2,
									}
								: {
										top: `${(tick.mm / pageSizeMm) * 100}%`,
										transform: "translateY(2px)",
										left: 2,
									}
						}
					>
						{tick.mm}
					</span>
				))}
			{/* Curseurs */}
			<Handle
				axis={axis}
				positionPct={startPct}
				onMouseDown={() => setDraggingKind("start")}
				label={`Marge ${isHorizontal ? "gauche" : "haute"}`}
			/>
			<Handle
				axis={axis}
				positionPct={endPct}
				onMouseDown={() => setDraggingKind("end")}
				label={`Marge ${isHorizontal ? "droite" : "basse"}`}
			/>
		</div>
	);
}

function Handle({
	axis,
	positionPct,
	onMouseDown,
	label,
}: {
	axis: Axis;
	positionPct: number;
	onMouseDown: () => void;
	label: string;
}): ReactElement {
	const isHorizontal = axis === "horizontal";

	const handleClick = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			onMouseDown();
		},
		[onMouseDown],
	);

	return (
		<button
			type="button"
			onMouseDown={handleClick}
			aria-label={label}
			title={label}
			className={
				isHorizontal
					? "absolute top-0 flex h-full items-center justify-center bg-primary/80 hover:bg-primary cursor-ew-resize"
					: "absolute left-0 flex w-full items-center justify-center bg-primary/80 hover:bg-primary cursor-ns-resize"
			}
			style={
				isHorizontal
					? {
							left: `calc(${positionPct}% - ${HANDLE_SIZE / 2}px)`,
							width: HANDLE_SIZE,
						}
					: {
							top: `calc(${positionPct}% - ${HANDLE_SIZE / 2}px)`,
							height: HANDLE_SIZE,
						}
			}
		>
			<span
				aria-hidden
				className="block h-2 w-2 rotate-45 bg-primary-foreground"
			/>
		</button>
	);
}
