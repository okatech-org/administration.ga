import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hook pour rendre un element flottant deplaçable par drag & drop.
 * Persiste la position dans localStorage sous la cle fournie.
 */
export function useDraggable(storageKey: string) {
	const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
	const isDragging = useRef(false);
	const dragStart = useRef({ x: 0, y: 0 });
	const hasMoved = useRef(false);
	const elementRef = useRef<HTMLDivElement>(null);

	// Charger la position sauvegardee
	useEffect(() => {
		try {
			const saved = localStorage.getItem(storageKey);
			if (saved) {
				const pos = JSON.parse(saved);
				const maxX = window.innerWidth - 60;
				const maxY = window.innerHeight - 60;
				setPosition({
					x: Math.min(Math.max(0, pos.x), maxX),
					y: Math.min(Math.max(0, pos.y), maxY),
				});
			}
		} catch {
			// Position par defaut
		}
	}, [storageKey]);

	const handlePointerDown = useCallback((e: React.PointerEvent) => {
		isDragging.current = true;
		hasMoved.current = false;
		const el = elementRef.current;
		if (!el) return;

		const rect = el.getBoundingClientRect();
		dragStart.current = {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top,
		};
	}, []);

	const handlePointerMove = useCallback((e: React.PointerEvent) => {
		if (!isDragging.current) return;

		// Capturer au premier mouvement pour ne pas bloquer le clic simple
		if (!hasMoved.current) {
			const el = elementRef.current;
			if (el) {
				try { el.setPointerCapture(e.pointerId); } catch { /* */ }
			}
		}

		const newX = e.clientX - dragStart.current.x;
		const newY = e.clientY - dragStart.current.y;

		const maxX = window.innerWidth - 60;
		const maxY = window.innerHeight - 60;
		const clampedX = Math.min(Math.max(0, newX), maxX);
		const clampedY = Math.min(Math.max(0, newY), maxY);

		setPosition({ x: clampedX, y: clampedY });
		hasMoved.current = true;
	}, []);

	const handlePointerUp = useCallback((e: React.PointerEvent) => {
		if (!isDragging.current) return;
		isDragging.current = false;

		const el = elementRef.current;
		if (el && hasMoved.current) {
			try { el.releasePointerCapture(e.pointerId); } catch { /* */ }
		}

		// Sauvegarder la position
		if (hasMoved.current && position) {
			try {
				localStorage.setItem(storageKey, JSON.stringify(position));
			} catch {
				// Silencieux
			}
		}

		// Reset apres un tick pour laisser onClick lire hasMoved
		if (hasMoved.current) {
			setTimeout(() => { hasMoved.current = false; }, 0);
		}
	}, [position, storageKey]);

	const style: React.CSSProperties | undefined = position
		? { position: "fixed", left: position.x, top: position.y, bottom: "auto", right: "auto" }
		: undefined;

	return {
		ref: elementRef,
		style,
		get isDragged() { return hasMoved.current; },
		handlers: {
			onPointerDown: handlePointerDown,
			onPointerMove: handlePointerMove,
			onPointerUp: handlePointerUp,
		},
	};
}
