/**
 * CircleMenu — FAB iAsted avec deploy gooey en arc haut-gauche.
 *
 * Refonte 2026-04-26 (validée utilisateur) — abandonne le contrat « bit-exact »
 * de la version citizen-web originale. Cf. plan dans
 * `.claude/plans/alors-j-aimerais-retravailler-l-ic-ne-linear-dove.md`.
 *
 * Trois principes :
 * 1. **Trigger immobile** : pas de dance multi-étape, juste un scale subtil.
 * 2. **Arc haut-gauche** : 3 items déployés en arc de π → 3π/2 (utile pour
 *    un FAB collé en bas-à-droite ; les items sortent vers la zone libre).
 * 3. **Effet gooey** : filtre SVG (feGaussianBlur + feColorMatrix) appliqué
 *    sur la couche des disques colorés ; les icônes sont rendues en
 *    surimpression pour rester nettes.
 */

"use client";

import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { Menu } from "lucide-react";
import { type PointerEvent as ReactPointerEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { CIRCLE_MENU } from "../../tokens/animation";
import { IAstedTrigger3D } from "./IAstedTrigger3D";
import type { CircleMenuItemConfig, CircleMenuProps } from "./types";

const C = CIRCLE_MENU;

type ArcLayout = "corner" | "fan";

interface ArcGeometry {
	start: number;
	end: number;
	radius: number;
}

function resolveArcGeometry(layout: ArcLayout, itemCount: number): ArcGeometry {
	const preset = C.arcLayouts[layout];
	// Au-delà de 3 items, on bascule sur les valeurs « wide » pour éviter
	// le chevauchement visuel et donner de la place aux labels.
	const wide = itemCount >= 4;
	return {
		start: wide ? preset.startWide : preset.start,
		end: wide ? preset.endWide : preset.end,
		radius: wide ? preset.radiusWide : preset.radius,
	};
}

const pointOnArc = (i: number, n: number, geom: ArcGeometry) => {
	const theta =
		n <= 1 ? (geom.start + geom.end) / 2 : geom.start + ((geom.end - geom.start) * i) / (n - 1);
	return { x: geom.radius * Math.cos(theta), y: geom.radius * Math.sin(theta) };
};

// ─── Goo filter (monté une seule fois par instance) ───
const GooFilter = () => (
	<svg
		width="0"
		height="0"
		style={{ position: "absolute", pointerEvents: "none" }}
		aria-hidden
	>
		<defs>
			<filter id={C.goo.filterId}>
				<feGaussianBlur in="SourceGraphic" stdDeviation={C.goo.stdDeviation} result="blur" />
				<feColorMatrix in="blur" mode="matrix" values={C.goo.colorMatrix} result="goo" />
				<feBlend in="SourceGraphic" in2="goo" />
			</filter>
		</defs>
	</svg>
);

// ─── Disque coloré (couche goo, sans icône) ───
const ItemBlob = ({
	index,
	totalItems,
	isOpen,
	bgClassName,
	geom,
}: {
	index: number;
	totalItems: number;
	isOpen: boolean;
	bgClassName: string;
	geom: ArcGeometry;
}) => {
	const { x, y } = pointOnArc(index, totalItems, geom);
	return (
		<motion.div
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
			className={cn(
				"absolute rounded-full pointer-events-none",
				bgClassName,
			)}
		/>
	);
};

// ─── Couche icône+label (au-dessus du goo, nette) ───
const ItemOverlay = ({
	icon,
	label,
	onClick,
	index,
	totalItems,
	isOpen,
	geom,
}: {
	icon: ReactNode;
	label: string;
	onClick?: () => void;
	index: number;
	totalItems: number;
	isOpen: boolean;
	geom: ArcGeometry;
}) => {
	const { x, y } = pointOnArc(index, totalItems, geom);

	const handleClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		onClick?.();
	};

	return (
		<motion.button
			type="button"
			initial={false}
			suppressHydrationWarning
			animate={{
				x: isOpen ? x : 0,
				y: isOpen ? y : 0,
				scale: isOpen ? 1 : 0.2,
				opacity: isOpen ? 1 : 0,
			}}
			whileHover={{ scale: 1.12, transition: { duration: 0.12 } }}
			whileTap={{ scale: 0.92 }}
			transition={{
				delay: isOpen
					? index * C.organicStagger
					: (totalItems - 1 - index) * C.organicStagger,
				...C.springItemsOrganic,
			}}
			style={{
				height: C.itemSize,
				width: C.itemSize,
				pointerEvents: isOpen ? "auto" : "none",
			}}
			className="absolute rounded-full flex items-center justify-center cursor-pointer outline-none ring-0 bg-transparent"
			onClick={handleClick}
			aria-label={label}
			tabIndex={isOpen ? 0 : -1}
			aria-hidden={!isOpen}
		>
			{icon}
			<AnimatePresence>
				{isOpen && (
					<motion.span
						initial={{ opacity: 0, y: -4 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0 }}
						transition={{ delay: 0.18 + index * 0.04 }}
						className="text-[10px] font-bold text-foreground absolute top-full left-1/2 -translate-x-1/2 mt-1.5 whitespace-nowrap"
					>
						{label}
					</motion.span>
				)}
			</AnimatePresence>
		</motion.button>
	);
};

// ─── Circle Menu ──────────────────────────────────────────────
export const CircleMenu = ({
	items,
	openIcon = <Menu size={18} className="text-background" />,
	triggerClassName,
	itemClassName,
	defaultOpen = false,
	onCloseComplete,
	// ── Mode 3D organique (iAsted vocal) ──
	triggerVariant = "default",
	voiceState = "idle",
	audioLevel = 0,
	onLongPress,
	longPressDelayMs = 350,
	voiceDisabled = false,
	isVoiceConnected = false,
	onVoiceHangUp,
	layout = "corner",
	onTriggerHoverStart,
	onTriggerHoverEnd,
}: CircleMenuProps) => {
	// Géométrie d'arc résolue à chaque render — dépend du nombre d'items
	// (au-delà de 3, on bascule sur les valeurs « wide ») et du mode de
	// disposition (« corner » desktop ou « fan » mobile).
	const geom: ArcGeometry = resolveArcGeometry(layout, items.length);
	const [isOpen, setIsOpen] = useState(false);
	const triggerAnimate = useAnimationControls();
	const containerRef = useRef<HTMLDivElement>(null);

	// ── Long-press detection (mode 3D) ───────────────────────────
	const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const longPressTriggeredRef = useRef(false);

	const clearLongPressTimer = useCallback(() => {
		if (longPressTimerRef.current) {
			clearTimeout(longPressTimerRef.current);
			longPressTimerRef.current = null;
		}
	}, []);

	const handlePointerDown = useCallback(
		(_event: ReactPointerEvent<HTMLButtonElement>) => {
			// Quand une session vocale est active, le tap court raccroche
			// (cf. `handleTriggerClick`) et le long-press est désactivé pour
			// éviter toute confusion. On ne démarre donc pas le timer.
			if (isVoiceConnected) return;
			if (!onLongPress || voiceDisabled) return;
			longPressTriggeredRef.current = false;
			clearLongPressTimer();
			longPressTimerRef.current = setTimeout(() => {
				longPressTriggeredRef.current = true;
				// Feedback haptique léger si supporté
				if (typeof navigator !== "undefined" && navigator.vibrate) {
					try { navigator.vibrate(15); } catch { /* ignore */ }
				}
				onLongPress();
			}, longPressDelayMs);
		},
		[onLongPress, longPressDelayMs, voiceDisabled, clearLongPressTimer, isVoiceConnected],
	);

	const handlePointerUp = useCallback(
		(_event: ReactPointerEvent<HTMLButtonElement>) => {
			clearLongPressTimer();
		},
		[clearLongPressTimer],
	);

	const handlePointerCancel = useCallback(
		(_event: ReactPointerEvent<HTMLButtonElement>) => {
			clearLongPressTimer();
		},
		[clearLongPressTimer],
	);

	useEffect(() => () => clearLongPressTimer(), [clearLongPressTimer]);

	const playOpenAnimation = useCallback(async () => {
		setIsOpen(true);
		triggerAnimate.start({
			scale: 1.15,
			transition: C.springTriggerSubtle,
		});
	}, [triggerAnimate]);

	const playCloseAnimation = useCallback(async () => {
		setIsOpen(false);
		await triggerAnimate.start({
			scale: 1,
			transition: C.springTriggerSubtle,
		});
		onCloseComplete?.();
	}, [triggerAnimate, onCloseComplete]);

	useEffect(() => {
		if (!defaultOpen) return;
		const t = setTimeout(() => playOpenAnimation(), 100);
		return () => clearTimeout(t);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Pilotage vocal via iAsted : ouvre/ferme/bascule l'éventail à la demande
	// du tool `open_app_menu`. L'event est émis par `useIAstedHost.dispatchUiAction`.
	useEffect(() => {
		const handler = (e: Event) => {
			const detail = (e as CustomEvent<{ open?: boolean }>).detail;
			const shouldOpen = detail?.open ?? !isOpen;
			if (shouldOpen && !isOpen) playOpenAnimation();
			else if (!shouldOpen && isOpen) playCloseAnimation();
		};
		window.addEventListener("iasted:fan-toggle", handler);
		return () => window.removeEventListener("iasted:fan-toggle", handler);
	}, [isOpen, playOpenAnimation, playCloseAnimation]);

	// Raccourci clavier d'accessibilité — Option+Space (ou Alt+Space) toggle la
	// session vocale. Plus accessible que Cmd+Shift+V pour les utilisateurs avec
	// motricité réduite ou clavier non-standard.
	useEffect(() => {
		const handler = (event: KeyboardEvent) => {
			const isAltSpace =
				event.altKey && !event.metaKey && !event.ctrlKey && event.code === "Space";
			if (!isAltSpace) return;
			const target = event.target as HTMLElement | null;
			const tag = target?.tagName;
			if (
				tag === "INPUT" ||
				tag === "TEXTAREA" ||
				(target && (target as HTMLElement).isContentEditable)
			) {
				return;
			}
			event.preventDefault();
			// Réutilise le bouton trigger : effet identique au clic.
			if (isVoiceConnected && onVoiceHangUp) {
				onVoiceHangUp();
			} else if (!isOpen) {
				void playOpenAnimation();
			} else {
				void playCloseAnimation();
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [isOpen, isVoiceConnected, onVoiceHangUp, playOpenAnimation, playCloseAnimation]);

	const handleTriggerClick = () => {
		// Si un long-press vient d'être déclenché, on annule le clic suivant
		// (sinon le tap qui suit le maintien rouvrirait/fermerait le menu).
		if (longPressTriggeredRef.current) {
			longPressTriggeredRef.current = false;
			return;
		}
		// Session vocale active : le tap court raccroche au lieu d'ouvrir
		// le menu d'items. C'est le geste de raccrochage canonique.
		if (isVoiceConnected) {
			onVoiceHangUp?.();
			return;
		}
		if (isOpen) {
			playCloseAnimation();
		} else {
			playOpenAnimation();
		}
	};

	// Click outside ⇒ close
	useEffect(() => {
		if (!isOpen) return;
		const onPointerDown = (e: PointerEvent) => {
			const node = containerRef.current;
			if (!node) return;
			if (e.target instanceof Node && !node.contains(e.target)) {
				playCloseAnimation();
			}
		};
		// `pointerdown` (capture) — fires before any inner click handler resolves.
		document.addEventListener("pointerdown", onPointerDown);
		return () => document.removeEventListener("pointerdown", onPointerDown);
	}, [isOpen, playCloseAnimation]);

	const is3D = triggerVariant === "3d-organic";
	// Alignement du trigger dans le conteneur : ancré bas-droite en mode
	// `corner` (FAB desktop classique), ancré bas-centre en mode `fan`
	// (FAB mobile, items en éventail symétrique vers le haut).
	const triggerAlignClass =
		layout === "fan" ? "items-end justify-center" : "items-end justify-end";
	const outerAlignClass =
		layout === "fan"
			? "relative flex items-end justify-center pointer-events-none"
			: "relative flex items-end justify-end place-self-end pointer-events-none";

	return (
		<div
			ref={containerRef}
			style={{ width: C.containerSize, height: C.containerSize }}
			className={outerAlignClass}
		>
			<GooFilter />

			{/* Couche 1 : disques colorés sous le filtre goo (effet metaball).
			   Position du trigger selon `layout` ; les items déploient autour.
			   En mode 3D, on ne rend pas le trigger blob (il est remplacé par
			   IAstedTrigger3D dans la couche overlay), seuls les item blobs restent. */}
			<div
				style={{ filter: `url(#${C.goo.filterId})` }}
				className={cn("absolute inset-0 flex", triggerAlignClass)}
			>
				{/* Trigger blob (omis en mode 3D) */}
				{!is3D && (
					<motion.div
						animate={triggerAnimate}
						initial={false}
						style={{ height: C.itemSize, width: C.itemSize }}
						className={cn(
							"rounded-full",
							triggerClassName ?? "bg-foreground",
						)}
					/>
				)}
				{/* Item blobs (mêmes positions que la couche overlay) */}
				{items.map((item, index) => (
					<ItemBlob
						key={`blob-${index}`}
						index={index}
						totalItems={items.length}
						isOpen={isOpen}
						bgClassName={item.className ?? itemClassName ?? "bg-muted"}
						geom={geom}
					/>
				))}
			</div>

			{/* Couche 2 : icônes/labels nets, au-dessus du goo */}
			<div className={cn("absolute inset-0 flex z-10", triggerAlignClass)}>
				{/* Trigger interactif : variante 3D organique OU disque classique */}
				{is3D ? (
					<div className="pointer-events-auto">
						<IAstedTrigger3D
							voiceState={voiceState}
							audioLevel={audioLevel}
							size="md"
							isInterfaceOpen={isOpen}
							disabled={voiceDisabled}
							showHangUpOverlay={isVoiceConnected}
							onClick={handleTriggerClick}
							onPointerDown={handlePointerDown}
							onPointerUp={handlePointerUp}
							onPointerCancel={handlePointerCancel}
							onPointerEnter={
								onTriggerHoverStart && !isVoiceConnected && !voiceDisabled
									? () => onTriggerHoverStart()
									: undefined
							}
							onPointerLeave={
								onTriggerHoverEnd ? () => onTriggerHoverEnd() : undefined
							}
							ariaLabel={
								isVoiceConnected
									? "Raccrocher la conversation vocale"
									: isOpen
										? "iAsted ouvert — maintenir pour parler"
										: "Ouvrir iAsted — maintenir pour parler"
							}
						/>
					</div>
				) : (
					<motion.button
						type="button"
						animate={triggerAnimate}
						initial={false}
						style={{ height: C.itemSize, width: C.itemSize }}
						className="relative rounded-full flex items-center justify-center cursor-pointer outline-none ring-0 hover:brightness-125 transition-all duration-100 bg-transparent pointer-events-auto"
						onClick={handleTriggerClick}
						aria-expanded={isOpen}
						aria-label={isOpen ? "Interagir avec iAsted" : "Ouvrir iAsted"}
					>
						<motion.span
							initial={false}
							animate={{ scale: isOpen ? 1.2 : 1 }}
							transition={C.springTriggerSubtle}
						>
							{openIcon}
						</motion.span>
					</motion.button>
				)}

				{/* Items interactifs (icônes nettes) */}
				{items.map((item, index) => (
					<ItemOverlay
						key={`overlay-${index}`}
						icon={item.icon}
						label={item.label}
						onClick={item.onClick}
						index={index}
						totalItems={items.length}
						isOpen={isOpen}
						geom={geom}
					/>
				))}
			</div>
		</div>
	);
};
