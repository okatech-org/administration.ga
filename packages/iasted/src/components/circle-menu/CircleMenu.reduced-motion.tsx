/**
 * CircleMenu — variante `prefers-reduced-motion: reduce`.
 *
 * WCAG 2.1 AA compliance : supprime toute animation vestibulaire
 * (rotation, shake, orbit, blur). Seuls restent un fade+scale simple.
 *
 * API de props IDENTIQUE au CircleMenu principal pour permettre un switch
 * transparent via le fichier `index.tsx`.
 *
 * Layout : items affichés instantanément en cercle, même positions que la
 * variante animée, mais pas de séquence open/close.
 */

"use client";

import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { type PointerEvent as ReactPointerEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { CIRCLE_MENU, REDUCED_MOTION } from "../../tokens/animation";
import { IAstedTrigger3D } from "./IAstedTrigger3D";
import type { CircleMenuItemConfig, CircleMenuProps } from "./types";

const pointOnArc = (i: number, n: number, r: number = CIRCLE_MENU.arcRadius) => {
	const theta =
		n <= 1
			? (CIRCLE_MENU.arcStart + CIRCLE_MENU.arcEnd) / 2
			: CIRCLE_MENU.arcStart +
				((CIRCLE_MENU.arcEnd - CIRCLE_MENU.arcStart) * i) / (n - 1);
	return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
};

const MenuItemStatic = ({
	icon,
	label,
	onClick,
	index,
	totalItems,
	isOpen,
	itemClassName,
}: {
	icon: ReactNode;
	label: string;
	onClick?: () => void;
	index: number;
	totalItems: number;
	isOpen: boolean;
	itemClassName?: string;
}) => {
	const { x, y } = pointOnArc(index, totalItems);

	const handleClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		onClick?.();
	};

	if (!isOpen) return null;

	return (
		<motion.button
			{...REDUCED_MOTION.circleMenuFadeScale}
			style={{
				height: CIRCLE_MENU.itemSize - 2,
				width: CIRCLE_MENU.itemSize - 2,
				transform: `translate(${x}px, ${y}px)`,
				position: "absolute",
			}}
			className={cn(
				"rounded-full flex items-center justify-center cursor-pointer",
				itemClassName ?? "bg-muted hover:bg-muted/70",
			)}
			onClick={handleClick}
			aria-label={label}
		>
			{icon}
			<span className="text-[10px] font-bold text-foreground absolute top-full left-1/2 -translate-x-1/2 mt-1.5 whitespace-nowrap">
				{label}
			</span>
		</motion.button>
	);
};

export const CircleMenuReducedMotion = ({
	items,
	openIcon = <Menu size={18} className="text-background" />,
	triggerClassName,
	itemClassName,
	defaultOpen = false,
	onCloseComplete,
	onTriggerClick,
	// ── Mode 3D organique (animations désactivées via @media prefers-reduced-motion) ──
	triggerVariant = "default",
	voiceState = "idle",
	audioLevel = 0,
	onLongPress,
	longPressDelayMs = 350,
	voiceDisabled = false,
}: CircleMenuProps) => {
	const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);

	// Long-press detection (identique à la variante animée)
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
			if (!onLongPress || voiceDisabled) return;
			longPressTriggeredRef.current = false;
			clearLongPressTimer();
			longPressTimerRef.current = setTimeout(() => {
				longPressTriggeredRef.current = true;
				if (typeof navigator !== "undefined" && navigator.vibrate) {
					try { navigator.vibrate(15); } catch { /* ignore */ }
				}
				onLongPress();
			}, longPressDelayMs);
		},
		[onLongPress, longPressDelayMs, voiceDisabled, clearLongPressTimer],
	);

	const handlePointerUp = useCallback(() => clearLongPressTimer(), [clearLongPressTimer]);
	const handlePointerCancel = useCallback(() => clearLongPressTimer(), [clearLongPressTimer]);

	useEffect(() => () => clearLongPressTimer(), [clearLongPressTimer]);

	const handleTriggerClick = () => {
		// Bypass si un long-press vient d'être déclenché (cohérent avec la variante animée).
		if (longPressTriggeredRef.current) {
			longPressTriggeredRef.current = false;
			return;
		}
		if (isOpen) {
			onTriggerClick?.();
		} else {
			setIsOpen(true);
		}
	};

	const handleClose = () => {
		setIsOpen(false);
		onCloseComplete?.();
	};

	const is3D = triggerVariant === "3d-organic";

	return (
		<div
			style={{
				width: isOpen ? CIRCLE_MENU.containerSize : CIRCLE_MENU.itemSize,
				height: isOpen ? CIRCLE_MENU.containerSize : CIRCLE_MENU.itemSize,
			}}
			className="relative flex items-center justify-center place-self-center transition-[width,height] duration-150"
		>
			{/* Trigger central : variante 3D organique (auto-statique via @media reduce) OU disque classique */}
			<div className="z-50 relative">
				{is3D ? (
					<IAstedTrigger3D
						voiceState={voiceState}
						audioLevel={audioLevel}
						size="sm"
						isInterfaceOpen={isOpen}
						disabled={voiceDisabled}
						onClick={handleTriggerClick}
						onPointerDown={handlePointerDown}
						onPointerUp={handlePointerUp}
						onPointerCancel={handlePointerCancel}
						ariaLabel={
							isOpen
								? "iAsted ouvert — maintenir pour parler"
								: "Ouvrir iAsted — maintenir pour parler"
						}
					/>
				) : (
					<button
						type="button"
						style={{ height: CIRCLE_MENU.itemSize, width: CIRCLE_MENU.itemSize }}
						className={cn(
							"rounded-full flex items-center justify-center cursor-pointer outline-none ring-0 z-50",
							triggerClassName ?? "bg-foreground",
						)}
						onClick={handleTriggerClick}
						aria-expanded={isOpen}
						aria-label={isOpen ? "Interagir avec iAsted" : "Ouvrir iAsted"}
					>
						{openIcon}
					</button>
				)}

				{/* Bouton close */}
				<AnimatePresence>
					{isOpen && (
						<motion.button
							{...REDUCED_MOTION.circleMenuFadeScale}
							onClick={(e) => {
								e.stopPropagation();
								handleClose();
							}}
							className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full h-7 w-7 rounded-full bg-foreground/80 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-foreground transition-colors"
							aria-label="Fermer le menu"
						>
							<X size={14} className="text-background" />
						</motion.button>
					)}
				</AnimatePresence>
			</div>

			{/* Items (rendus uniquement quand ouvert, pas d'orbit) */}
			<div className="absolute inset-0 z-0 flex items-center justify-center">
				<AnimatePresence>
					{items.map((item: CircleMenuItemConfig, index: number) => (
						<MenuItemStatic
							key={`menu-item-${index}`}
							icon={item.icon}
							label={item.label}
							onClick={item.onClick}
							index={index}
							totalItems={items.length}
							isOpen={isOpen}
							itemClassName={item.className ?? itemClassName}
						/>
					))}
				</AnimatePresence>
			</div>
		</div>
	);
};
