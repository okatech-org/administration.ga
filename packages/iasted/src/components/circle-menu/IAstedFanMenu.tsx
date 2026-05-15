/**
 * IAstedFanMenu — Bouton iAsted (port mairie.ga) avec menu en éventail.
 *
 * Combine :
 *   - `IAstedButtonFull` au centre (bouton 3D organique avec drag & drop)
 *   - Un arc d'items qui se déploient AUTOUR du bouton au clic
 *   - Filtre SVG « goo » pour effet gluant entre les items (réutilisé depuis CircleMenu)
 *
 * Modèle inspiré de mairie.ga : les fonctions (iChat, iContact, iAppel,
 * iRéunion, Assistant Vocal, Réglages) rayonnent autour du bouton iAsted
 * dans un éventail (fan layout).
 *
 * Comportement :
 *   - Single click sur le bouton → toggle l'éventail
 *   - Double click sur le bouton → `onDoubleClick` (typ. activer voix)
 *   - Clic sur un item → ferme l'éventail + appelle `item.onClick` ou navigue vers `item.href`
 *   - Click outside → ferme l'éventail
 *   - Drag du bouton → repositionne, désactive temporairement l'ouverture
 */

"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CIRCLE_MENU } from "../../tokens/animation";
import { IAstedButtonFull, type IAstedButtonFullProps } from "./IAstedButtonFull";

const C = CIRCLE_MENU;

export interface IAstedFanMenuItem {
	id: string;
	label: string;
	icon: ReactNode;
	href?: string;
	onClick?: () => void;
	/** Classe Tailwind pour le fond du badge (ex : "bg-emerald-600"). */
	className?: string;
}

export interface IAstedFanMenuProps
	extends Omit<IAstedButtonFullProps, "onClick" | "onDoubleClick"> {
	items: IAstedFanMenuItem[];
	/** Mise en page de l'arc : "corner" (bas-droite) ou "fan" (demi-cercle haut). */
	layout?: "corner" | "fan";
	/**
	 * Callback single-click sur le bouton — usage primaire d'iAsted.
	 * Par défaut : lance la conversation vocale (`voiceController.activateVoice`).
	 * Si une session vocale est ACTIVE, le single click la termine (raccroche).
	 */
	onSingleClick?: () => void;
	/** Callback quand un item de l'éventail est sélectionné. */
	onItemSelect?: (item: IAstedFanMenuItem) => void;
	/**
	 * Indique qu'une session vocale est actuellement connectée.
	 * Affecte le comportement du single click (raccrocher).
	 */
	isVoiceConnected?: boolean;
}

interface ArcGeometry {
	start: number;
	end: number;
	radius: number;
}

function resolveArcGeometry(
	layout: "corner" | "fan",
	itemCount: number,
): ArcGeometry {
	const preset = C.arcLayouts[layout];
	const wide = itemCount >= 4;
	return {
		start: wide ? preset.startWide : preset.start,
		end: wide ? preset.endWide : preset.end,
		radius: wide ? preset.radiusWide : preset.radius,
	};
}

function pointOnArc(i: number, n: number, geom: ArcGeometry) {
	const theta =
		n <= 1
			? (geom.start + geom.end) / 2
			: geom.start + ((geom.end - geom.start) * i) / (n - 1);
	return { x: geom.radius * Math.cos(theta), y: geom.radius * Math.sin(theta) };
}

// ─── Filter SVG goo monté une fois par instance ───────────────
function GooFilter() {
	return (
		<svg
			width="0"
			height="0"
			style={{ position: "absolute", pointerEvents: "none" }}
			aria-hidden
		>
			<defs>
				<filter id={`${C.goo.filterId}-fan`}>
					<feGaussianBlur
						in="SourceGraphic"
						stdDeviation={C.goo.stdDeviation}
						result="blur"
					/>
					<feColorMatrix
						in="blur"
						mode="matrix"
						values={C.goo.colorMatrix}
						result="goo"
					/>
					<feBlend in="SourceGraphic" in2="goo" />
				</filter>
			</defs>
		</svg>
	);
}

// ─── Item de l'éventail (badge coloré + label) ────────────────
interface FanItemProps {
	item: IAstedFanMenuItem;
	index: number;
	totalItems: number;
	isOpen: boolean;
	geom: ArcGeometry;
	onClick: () => void;
}

function FanItem({ item, index, totalItems, isOpen, geom, onClick }: FanItemProps) {
	const { x, y } = pointOnArc(index, totalItems, geom);
	return (
		<motion.button
			type="button"
			onClick={onClick}
			initial={false}
			suppressHydrationWarning
			animate={{
				x: isOpen ? x : 0,
				y: isOpen ? y : 0,
				scale: isOpen ? 1 : 0.2,
				opacity: isOpen ? 1 : 0,
			}}
			transition={{
				delay: isOpen
					? index * C.organicStagger
					: (totalItems - 1 - index) * C.organicStagger,
				...C.springItemsOrganic,
			}}
			style={{ height: C.itemSize, width: C.itemSize }}
			className={`absolute flex flex-col items-center justify-center rounded-full text-white shadow-xl ring-2 ring-white/30 hover:scale-110 active:scale-95 transition-transform pointer-events-${isOpen ? "auto" : "none"} ${item.className ?? "bg-emerald-600"}`}
			aria-label={item.label}
			title={item.label}
		>
			<span className="flex items-center justify-center">{item.icon}</span>
			<span className="absolute -bottom-6 text-[10px] font-semibold whitespace-nowrap text-foreground/90 px-2 py-0.5 rounded-full bg-background/70 backdrop-blur-sm shadow-sm">
				{item.label}
			</span>
		</motion.button>
	);
}

// ─── Composant principal ──────────────────────────────────────
export function IAstedFanMenu({
	items,
	layout = "corner",
	onSingleClick,
	onItemSelect,
	isVoiceConnected = false,
	...buttonProps
}: IAstedFanMenuProps) {
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const geom = resolveArcGeometry(layout, items.length);

	const closeMenu = useCallback(() => setIsOpen(false), []);

	// Single click — usage PRIMAIRE : déclenche la conversation vocale.
	// Si l'éventail est ouvert, on le referme d'abord pour éviter conflit visuel.
	const handleButtonClick = useCallback(() => {
		if (isOpen) setIsOpen(false);
		onSingleClick?.();
	}, [isOpen, onSingleClick]);

	// Double click — ouvre/ferme l'éventail des 6 options détachées.
	const handleDoubleClick = useCallback(() => {
		setIsOpen((prev) => !prev);
	}, []);

	const handleItemClick = useCallback(
		(item: IAstedFanMenuItem) => {
			setIsOpen(false);
			onItemSelect?.(item);
			item.onClick?.();
			if (item.href && typeof window !== "undefined") {
				window.location.href = item.href;
			}
		},
		[onItemSelect],
	);

	// Click outside → close
	useEffect(() => {
		if (!isOpen) return;
		const onPointerDown = (e: PointerEvent) => {
			const node = containerRef.current;
			if (!node) return;
			if (e.target instanceof Node && !node.contains(e.target)) {
				closeMenu();
			}
		};
		document.addEventListener("pointerdown", onPointerDown);
		return () => document.removeEventListener("pointerdown", onPointerDown);
	}, [isOpen, closeMenu]);

	// Escape → close
	useEffect(() => {
		if (!isOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") closeMenu();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [isOpen, closeMenu]);

	return (
		<div ref={containerRef}>
			<GooFilter />

			{/* Items en éventail — positionnés en absolute par rapport au container
			    du bouton (qui est lui-même position: fixed via IAstedButtonFull).
			    On utilise un wrapper qui suit la position du bouton. */}
			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						style={{
							position: "fixed",
							zIndex: 9998,
							pointerEvents: "none",
							inset: 0,
						}}
						aria-hidden
					>
						{/* Wrapper centré sur le bouton — JS lit la position du bouton
						    à chaque render et positionne l'arc dessus. */}
						<FanItemsLayer items={items} isOpen={isOpen} geom={geom} onItemClick={handleItemClick} />
					</motion.div>
				)}
			</AnimatePresence>

			{/* Bouton iAsted (qui gère son propre drag + position fixed) */}
			<IAstedButtonFull
				{...buttonProps}
				isInterfaceOpen={isOpen || buttonProps.isInterfaceOpen}
				onClick={handleButtonClick}
				onDoubleClick={handleDoubleClick}
			/>
		</div>
	);
}

// ─── Layer qui dispose les items à la position du bouton ──────
interface FanItemsLayerProps {
	items: IAstedFanMenuItem[];
	isOpen: boolean;
	geom: ArcGeometry;
	onItemClick: (item: IAstedFanMenuItem) => void;
}

function FanItemsLayer({ items, isOpen, geom, onItemClick }: FanItemsLayerProps) {
	const [center, setCenter] = useState<{ x: number; y: number } | null>(null);

	useEffect(() => {
		const update = () => {
			const btn = document.querySelector(
				".iasted-btn-thick-matter-button",
			) as HTMLElement | null;
			if (!btn) return;
			const r = btn.getBoundingClientRect();
			setCenter({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
		};
		update();
		window.addEventListener("resize", update);
		const iv = setInterval(update, 200); // re-sync si l'utilisateur drag pendant l'ouverture
		return () => {
			window.removeEventListener("resize", update);
			clearInterval(iv);
		};
	}, [isOpen]);

	if (!center) return null;

	return (
		<div
			style={{
				position: "absolute",
				left: center.x,
				top: center.y,
				width: 0,
				height: 0,
				pointerEvents: "none",
			}}
		>
			<div
				style={{
					position: "absolute",
					pointerEvents: "auto",
					transform: "translate(-50%, -50%)",
				}}
			>
				{items.map((item, i) => (
					<FanItem
						key={item.id}
						item={item}
						index={i}
						totalItems={items.length}
						isOpen={isOpen}
						geom={geom}
						onClick={() => onItemClick(item)}
					/>
				))}
			</div>
		</div>
	);
}
