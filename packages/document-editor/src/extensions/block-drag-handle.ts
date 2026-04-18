/**
 * Poignée de déplacement de bloc — plugin ProseMirror custom.
 *
 * Chaque bloc top-level du document (paragraphe, titre, table…) affiche
 * au survol une petite poignée ⋮⋮ flottante à gauche. L'utilisateur peut
 * glisser cette poignée pour réordonner les blocs — inspiré de Notion /
 * Apple Pages.
 *
 * Implémentation :
 *   - Un `<button>` unique en `position: absolute` dans le conteneur
 *     parent de `view.dom`.
 *   - `mousemove` sur `view.dom` : calcule le bloc survolé via
 *     `view.posAtCoords({ left, top })` + `resolve.before(1)`, repositionne
 *     la poignée aux coordonnées du bloc.
 *   - `dragstart` sur la poignée : écrit `fromPos` dans le dataTransfer,
 *     applique une image fantôme du bloc.
 *   - `dragover` sur `view.dom` : dessine une ligne d'insertion (via
 *     decoration DOM) à la frontière de bloc la plus proche du curseur.
 *   - `drop` : calcule la position cible, dispatche une transaction qui
 *     supprime le bloc source et le ré-insère à la nouvelle position.
 *
 * Pas de dépendance Tiptap Pro — 100% ProseMirror.
 */

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { Fragment } from "@tiptap/pm/model";

const HANDLE_WIDTH = 20; // px
const HANDLE_OFFSET_LEFT = 4; // px — léger décalage vers l'intérieur

export const BlockDragHandle = Extension.create({
	name: "blockDragHandle",

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey("block-drag-handle"),
				view(editorView) {
					return new DragHandleView(editorView);
				},
			}),
		];
	},
});

/** Retourne le <div> wrapper (`.ProseMirror`) ou un parent capable de recevoir un handle absolu. */
function getHandleHost(view: EditorView): HTMLElement {
	// On place la poignée comme frère direct du ProseMirror, dans un
	// wrapper relative pour que `position: absolute` soit ancré correctement.
	const pmRoot = view.dom;
	let host = pmRoot.parentElement as HTMLElement | null;
	if (!host) return document.body;
	// S'assure que le parent est positionné (sinon la poignée sort du cadre).
	const pos = getComputedStyle(host).position;
	if (pos === "static") {
		host.style.position = "relative";
	}
	return host;
}

class DragHandleView {
	private readonly view: EditorView;
	private readonly host: HTMLElement;
	private readonly handle: HTMLButtonElement;
	/** Position de début du bloc courant (où la poignée pointe). */
	private currentBlockStart: number | null = null;
	/** Range du bloc en cours de drag (posStart / posEnd). */
	private dragRange: { from: number; to: number } | null = null;
	/** Timer qui diffère le masquage du handle (évite le clignotement). */
	private hideTimer: number | null = null;

	private readonly onMouseMove: (event: MouseEvent) => void;
	private readonly onDragStart: (event: DragEvent) => void;
	private readonly onDragOver: (event: DragEvent) => void;
	private readonly onDrop: (event: DragEvent) => void;
	private readonly onDragEnd: () => void;
	private readonly onMouseLeave: () => void;
	private readonly onHandleMouseEnter: () => void;

	constructor(view: EditorView) {
		this.view = view;
		this.host = getHandleHost(view);

		// Bouton de poignée
		const btn = document.createElement("button");
		btn.type = "button";
		btn.setAttribute("draggable", "true");
		btn.setAttribute("aria-label", "Déplacer le bloc");
		btn.className = "block-drag-handle";
		btn.style.position = "absolute";
		btn.style.top = "0";
		btn.style.left = "0";
		btn.style.display = "none";
		btn.style.width = `${HANDLE_WIDTH}px`;
		btn.style.height = "20px";
		btn.style.cursor = "grab";
		btn.style.userSelect = "none";
		btn.style.zIndex = "30";
		btn.innerHTML =
			'<svg width="12" height="16" viewBox="0 0 12 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><circle cx="3.5" cy="4" r="1.3" fill="currentColor"/><circle cx="8.5" cy="4" r="1.3" fill="currentColor"/><circle cx="3.5" cy="8" r="1.3" fill="currentColor"/><circle cx="8.5" cy="8" r="1.3" fill="currentColor"/><circle cx="3.5" cy="12" r="1.3" fill="currentColor"/><circle cx="8.5" cy="12" r="1.3" fill="currentColor"/></svg>';
		this.host.appendChild(btn);
		this.handle = btn;

		// Events
		this.onMouseMove = (e) => this.handleMouseMove(e);
		this.onMouseLeave = () => this.scheduleHide();
		this.onHandleMouseEnter = () => this.cancelHide();
		this.onDragStart = (e) => this.handleDragStart(e);
		this.onDragOver = (e) => this.handleDragOver(e);
		this.onDrop = (e) => this.handleDrop(e);
		this.onDragEnd = () => this.clearInsertLine();

		// Écoute sur le HOST (conteneur parent) — ça couvre aussi la zone
		// où vit le handle (hors de view.dom). Plus la poignée n'est
		// instable : tant que la souris reste dans le cadre page, elle
		// reste affichée.
		this.host.addEventListener("mousemove", this.onMouseMove);
		this.host.addEventListener("mouseleave", this.onMouseLeave);
		this.handle.addEventListener("mouseenter", this.onHandleMouseEnter);
		this.handle.addEventListener("dragstart", this.onDragStart);
		this.handle.addEventListener("dragend", this.onDragEnd);
		view.dom.addEventListener("dragover", this.onDragOver);
		view.dom.addEventListener("drop", this.onDrop);
	}

	destroy(): void {
		this.host.removeEventListener("mousemove", this.onMouseMove);
		this.host.removeEventListener("mouseleave", this.onMouseLeave);
		this.handle.removeEventListener("mouseenter", this.onHandleMouseEnter);
		this.handle.removeEventListener("dragstart", this.onDragStart);
		this.handle.removeEventListener("dragend", this.onDragEnd);
		this.view.dom.removeEventListener("dragover", this.onDragOver);
		this.view.dom.removeEventListener("drop", this.onDrop);
		if (this.hideTimer !== null) window.clearTimeout(this.hideTimer);
		this.handle.remove();
		this.clearInsertLine();
	}

	private scheduleHide() {
		this.cancelHide();
		this.hideTimer = window.setTimeout(() => this.hideHandle(), 200);
	}

	private cancelHide() {
		if (this.hideTimer !== null) {
			window.clearTimeout(this.hideTimer);
			this.hideTimer = null;
		}
	}

	// ─── Positionnement de la poignée ────────────────────────────────

	private handleMouseMove(e: MouseEvent) {
		// Si la souris est sur la poignée elle-même, on garde tel quel.
		const target = e.target as HTMLElement | null;
		if (target && this.handle.contains(target)) {
			this.cancelHide();
			return;
		}
		// Tente de résoudre la position dans le document. Si on survole une
		// zone du host hors du ProseMirror (entre blocs, scroll gutter…),
		// on programme juste un masquage différé sans supprimer le handle.
		const result = this.view.posAtCoords({ left: e.clientX, top: e.clientY });
		if (!result) {
			this.scheduleHide();
			return;
		}
		const { pos } = result;
		const $pos = this.view.state.doc.resolve(pos);
		if ($pos.depth < 1) {
			this.scheduleHide();
			return;
		}
		this.cancelHide();
		const blockStart = $pos.before(1);
		if (blockStart === this.currentBlockStart) return;
		this.currentBlockStart = blockStart;
		this.positionHandle(blockStart);
	}

	private positionHandle(blockStart: number) {
		const coords = this.view.coordsAtPos(blockStart);
		const hostRect = this.host.getBoundingClientRect();
		// Position relative au host (en tenant compte du scroll éventuel)
		const top = coords.top - hostRect.top;
		const left = coords.left - hostRect.left - HANDLE_WIDTH - HANDLE_OFFSET_LEFT;
		this.handle.style.top = `${top}px`;
		this.handle.style.left = `${left}px`;
		this.handle.style.display = "flex";
	}

	private hideHandle() {
		this.handle.style.display = "none";
		this.currentBlockStart = null;
	}

	// ─── Drag & drop ─────────────────────────────────────────────────

	private handleDragStart(e: DragEvent) {
		if (this.currentBlockStart === null) {
			e.preventDefault();
			return;
		}
		const $start = this.view.state.doc.resolve(this.currentBlockStart);
		const from = this.currentBlockStart;
		const to = $start.after(1);
		this.dragRange = { from, to };

		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = "move";
			e.dataTransfer.setData("text/plain", `block:${from}-${to}`);
			// Dragimage transparente : supprime le ghost natif du navigateur
			// (peu fluide) et laisse notre ligne de preview gérer le feedback.
			const ghost = document.createElement("div");
			ghost.style.position = "fixed";
			ghost.style.top = "-9999px";
			ghost.style.left = "-9999px";
			ghost.style.width = "1px";
			ghost.style.height = "1px";
			ghost.style.opacity = "0";
			document.body.appendChild(ghost);
			e.dataTransfer.setDragImage(ghost, 0, 0);
			// Nettoyage du ghost dès le prochain tick
			setTimeout(() => ghost.remove(), 0);
		}
	}

	private handleDragOver(e: DragEvent) {
		if (!this.dragRange) return;
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = "move";

		this.insertionPointerY = e.clientY;
		const coords = this.view.posAtCoords({ left: e.clientX, top: e.clientY });
		if (!coords) return;
		const insertPos = this.findInsertionPos(coords.pos);
		if (insertPos === null) return;
		this.drawInsertLine(insertPos);
	}

	private handleDrop(e: DragEvent) {
		if (!this.dragRange) return;
		e.preventDefault();
		const coords = this.view.posAtCoords({ left: e.clientX, top: e.clientY });
		if (!coords) {
			this.clearInsertLine();
			this.dragRange = null;
			return;
		}
		const insertPos = this.findInsertionPos(coords.pos);
		this.clearInsertLine();
		if (insertPos === null) {
			this.dragRange = null;
			return;
		}

		const { from, to } = this.dragRange;
		// No-op si on drop dans la zone qu'on déplace.
		if (insertPos >= from && insertPos <= to) {
			this.dragRange = null;
			return;
		}

		const { state } = this.view;
		const node = state.doc.slice(from, to).content;
		let tr = state.tr.delete(from, to);
		// Après suppression, les indices > to sont décalés de -(to - from).
		const adjustedInsertPos =
			insertPos > to ? insertPos - (to - from) : insertPos;
		tr = tr.insert(adjustedInsertPos, node);
		this.view.dispatch(tr.scrollIntoView());
		this.dragRange = null;
	}

	// ─── Ligne d'insertion (decoration DOM) ──────────────────────────

	/** Frontière de bloc top-level la plus proche de `pos`. */
	private findInsertionPos(pos: number): number | null {
		const $pos = this.view.state.doc.resolve(pos);
		if ($pos.depth < 1) return null;
		const blockStart = $pos.before(1);
		const blockEnd = $pos.after(1);
		// Choisit le côté le plus proche
		const coordsStart = this.view.coordsAtPos(blockStart);
		const coordsEnd = this.view.coordsAtPos(blockEnd);
		const pointerY = (this.insertionPointerY ?? 0) || coordsStart.top;
		return pointerY - coordsStart.top < coordsEnd.top - pointerY
			? blockStart
			: blockEnd;
	}

	private insertionPointerY: number | null = null;
	private insertLine: HTMLDivElement | null = null;

	private drawInsertLine(pos: number) {
		const coords = this.view.coordsAtPos(pos);
		if (!this.insertLine) {
			const line = document.createElement("div");
			line.className = "block-drag-insertion-line";
			line.style.position = "fixed";
			line.style.pointerEvents = "none";
			line.style.height = "2px";
			line.style.background = "rgba(99,102,241,0.8)";
			line.style.borderRadius = "1px";
			line.style.zIndex = "9999";
			line.style.transition = "top 60ms ease-out";
			document.body.appendChild(line);
			this.insertLine = line;
		}
		// Largeur = largeur du bloc éditeur
		const pmRect = this.view.dom.getBoundingClientRect();
		this.insertLine.style.top = `${coords.top}px`;
		this.insertLine.style.left = `${pmRect.left}px`;
		this.insertLine.style.width = `${pmRect.width}px`;
	}

	private clearInsertLine() {
		if (this.insertLine) {
			this.insertLine.remove();
			this.insertLine = null;
		}
		this.insertionPointerY = null;
	}
}
