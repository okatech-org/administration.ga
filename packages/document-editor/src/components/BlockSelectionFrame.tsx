"use client";

/**
 * Overlay de sélection de bloc — cadre bleu avec 8 poignées de resize
 * aux coins et milieux de côtés (style Canva / Apple Pages).
 *
 * Rendu dans un Portal document.body en `position: fixed` pour ne pas
 * être clippé par `overflow: hidden` du papier A4. Une boucle rAF
 * maintient le cadre aligné sur le bloc DOM même en cas de scroll interne.
 *
 * Handles actifs :
 *   e / w             → blockWidth (% de la largeur du papier)
 *   s                 → blockMinHeight (px)
 *   se / sw / ne / nw → combinaison width + height
 *   n                 → spaceBefore (déplacement haut via margin-top, TODO)
 */

import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type HandleDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

interface Rect {
	top: number;
	left: number;
	width: number;
	height: number;
}

interface ResizeState {
	dir: HandleDir;
	startX: number;
	startY: number;
	startWidth: number;
	startHeight: number;
	blockStart: number;
	containerWidth: number;
}

const H = 8; // Taille des handles en px

function isBlockContext(editor: Editor): boolean {
	const { selection } = editor.state;
	if (!selection.empty) return false;
	if (
		editor.isActive("placeholder") ||
		editor.isActive("imagePlaceholder") ||
		editor.isActive("signaturePlaceholder") ||
		editor.isActive("table")
	)
		return false;
	return selection.$from.depth >= 1;
}

function getBlockDOMRect(editor: Editor): Rect | null {
	if (!isBlockContext(editor)) return null;
	const { $from } = editor.state.selection;
	const blockStart = $from.before(1);
	const domNode = editor.view.nodeDOM(blockStart) as HTMLElement | null;
	if (!domNode) return null;
	const r = domNode.getBoundingClientRect();
	// Ne pas afficher si hors écran
	if (r.bottom < 0 || r.top > window.innerHeight) return null;
	return { top: r.top, left: r.left, width: r.width, height: r.height };
}

interface Props {
	editor: Editor | null;
}

export function BlockSelectionFrame({ editor }: Props) {
	const [rect, setRect] = useState<Rect | null>(null);
	const rafRef = useRef<number | null>(null);
	const resizingRef = useRef<ResizeState | null>(null);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Boucle rAF — met à jour le rect chaque frame (gère scroll automatiquement)
	useEffect(() => {
		if (!editor) return;

		function tick() {
			if (!editor) { rafRef.current = requestAnimationFrame(tick); return; }
			// Pendant un resize, on laisse les handlers mettre à jour le rect
			if (!resizingRef.current) {
				const r = getBlockDOMRect(editor);
				setRect(r);
			}
			rafRef.current = requestAnimationFrame(tick);
		}

		rafRef.current = requestAnimationFrame(tick);
		return () => {
			if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
		};
	}, [editor]);

	const onHandleMouseDown = useCallback(
		(dir: HandleDir, e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			if (!editor || !rect) return;

			const { $from } = editor.state.selection;
			if ($from.depth < 1) return;
			const blockStart = $from.before(1);

			// Conteneur de l'éditeur pour calculer le % de largeur
			const pmEl = editor.view.dom as HTMLElement;
			const containerWidth = pmEl.getBoundingClientRect().width;

			resizingRef.current = {
				dir,
				startX: e.clientX,
				startY: e.clientY,
				startWidth: rect.width,
				startHeight: rect.height,
				blockStart,
				containerWidth,
			};

			const onMouseMove = (ev: MouseEvent) => {
				const rs = resizingRef.current;
				if (!rs || !editor) return;
				const dx = ev.clientX - rs.startX;
				const dy = ev.clientY - rs.startY;
				const updates: Record<string, string | null> = {};

				if (
					rs.dir === "e" ||
					rs.dir === "se" ||
					rs.dir === "ne"
				) {
					const newW = Math.max(80, rs.startWidth + dx);
					updates.blockWidth = `${Math.round((newW / rs.containerWidth) * 100)}%`;
				} else if (
					rs.dir === "w" ||
					rs.dir === "sw" ||
					rs.dir === "nw"
				) {
					const newW = Math.max(80, rs.startWidth - dx);
					updates.blockWidth = `${Math.round((newW / rs.containerWidth) * 100)}%`;
				}

				if (
					rs.dir === "s" ||
					rs.dir === "se" ||
					rs.dir === "sw"
				) {
					const newH = Math.max(20, rs.startHeight + dy);
					updates.blockMinHeight = `${Math.round(newH)}px`;
				}

				if (Object.keys(updates).length > 0) {
					editor
						.chain()
						.focus()
						.updateAttributes("paragraph", updates)
						.updateAttributes("heading", updates)
						.run();
				}

				// Mise à jour optimiste du rect pendant le drag
				setRect((prev) => {
					if (!prev) return prev;
					const newRect = { ...prev };
					if (updates.blockWidth) {
						const pct = parseFloat(updates.blockWidth) / 100;
						newRect.width = rs.containerWidth * pct;
					}
					if (updates.blockMinHeight) {
						newRect.height = Math.max(prev.height, parseFloat(updates.blockMinHeight));
					}
					return newRect;
				});
			};

			const onMouseUp = () => {
				resizingRef.current = null;
				document.removeEventListener("mousemove", onMouseMove);
				document.removeEventListener("mouseup", onMouseUp);
				document.body.style.cursor = "";
				document.body.style.userSelect = "";
			};

			document.body.style.cursor = getCursor(dir);
			document.body.style.userSelect = "none";
			document.addEventListener("mousemove", onMouseMove);
			document.addEventListener("mouseup", onMouseUp);
		},
		[editor, rect],
	);

	if (!mounted || !rect) return null;

	const handles: { dir: HandleDir; style: React.CSSProperties }[] = [
		{
			dir: "n",
			style: {
				top: -H / 2,
				left: "50%",
				transform: "translateX(-50%)",
				cursor: "n-resize",
			},
		},
		{
			dir: "s",
			style: {
				bottom: -H / 2,
				left: "50%",
				transform: "translateX(-50%)",
				cursor: "s-resize",
			},
		},
		{
			dir: "e",
			style: {
				right: -H / 2,
				top: "50%",
				transform: "translateY(-50%)",
				cursor: "e-resize",
			},
		},
		{
			dir: "w",
			style: {
				left: -H / 2,
				top: "50%",
				transform: "translateY(-50%)",
				cursor: "w-resize",
			},
		},
		{
			dir: "ne",
			style: { top: -H / 2, right: -H / 2, cursor: "ne-resize" },
		},
		{
			dir: "nw",
			style: { top: -H / 2, left: -H / 2, cursor: "nw-resize" },
		},
		{
			dir: "se",
			style: { bottom: -H / 2, right: -H / 2, cursor: "se-resize" },
		},
		{
			dir: "sw",
			style: { bottom: -H / 2, left: -H / 2, cursor: "sw-resize" },
		},
	];

	return createPortal(
		<div
			style={{
				position: "fixed",
				top: rect.top,
				left: rect.left,
				width: rect.width,
				height: rect.height,
				border: "2px solid rgba(99,102,241,0.55)",
				borderRadius: "2px",
				pointerEvents: "none",
				zIndex: 9998,
				boxSizing: "border-box",
			}}
		>
			{handles.map(({ dir, style }) => (
				<div
					key={dir}
					onMouseDown={(e) => onHandleMouseDown(dir, e)}
					style={{
						position: "absolute",
						width: H,
						height: H,
						background: "white",
						border: "2px solid rgba(99,102,241,0.7)",
						borderRadius: "1px",
						pointerEvents: "auto",
						boxSizing: "border-box",
						...style,
					}}
				/>
			))}
		</div>,
		document.body,
	);
}

function getCursor(dir: HandleDir): string {
	switch (dir) {
		case "n": return "n-resize";
		case "s": return "s-resize";
		case "e": return "e-resize";
		case "w": return "w-resize";
		case "ne": return "ne-resize";
		case "nw": return "nw-resize";
		case "se": return "se-resize";
		case "sw": return "sw-resize";
	}
}
