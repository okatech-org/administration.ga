/**
 * WindowShell — shell universel iAsted (fenêtre flottante compacte).
 *
 * **Modèle de référence : citizen-web original** (CitizenIAstedWindow.tsx,
 * restauré après feedback utilisateur) :
 * - Dimensions : 420×640 desktop (min(640, vh-100)), 85dvh mobile
 * - Entrance : spring slide-from-bottom (stiffness 320, damping 28)
 * - Surface : `bg-card` + bordure subtile (oklch 0/0.05)
 * - Radius : `rounded-t-2xl sm:rounded-2xl` (mobile bottom-sheet, desktop dock)
 * - Séparateurs internes : `border-border/50`
 *
 * Les trois apps (citizen / agent / backoffice) et agent-desktop partagent ce shell.
 * Seuls le contenu des tabs et le preset varient.
 */

"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bot } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { WINDOW_MOTION, REDUCED_MOTION } from "../../tokens/animation";
import { Z_INDEX } from "../../tokens/sizes";
import { useReducedMotion } from "../../hooks/use-reduced-motion";
import { resolveIcon } from "../../lib/icon-resolver";
import { TAB_DEFINITIONS } from "../../presets";
import type {
	IAstedPreset,
	IAstedContextValue,
	IAstedTabId,
	IAstedTabDefinition,
} from "../../types/iasted";
import { WindowHeader } from "./WindowHeader";
import { TabsNav } from "./TabsNav";

export interface WindowShellProps {
	preset: IAstedPreset;
	context?: IAstedContextValue;
	/** Slot injecté (Phase 3 : call-center depuis agent-web). */
	callQueueSlot?: ReactNode;
	/** Contenu rendu par onglet ; la clé correspond à `IAstedTabId`. */
	tabContent: Partial<Record<IAstedTabId, ReactNode>>;
	onClose?: () => void;
	/** Handler d'expansion vers page fullscreen. */
	onExpand?: () => void;
	defaultTab?: IAstedTabId;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	activeTab?: IAstedTabId;
	onActiveTabChange?: (tabId: IAstedTabId) => void;

	// ── Header ──
	title?: string;
	subtitle?: string;
	headerIcon?: ReactNode;
	header?: ReactNode;
	headerRightSlot?: ReactNode;

	// ── TabsNav ──
	tabsNav?: ReactNode;
	tabDefinitions?: Partial<Record<IAstedTabId, IAstedTabDefinition>>;
	resolveLabel?: (labelKey: string, fallback: string) => string;

	className?: string;
}

export function WindowShell({
	preset,
	callQueueSlot,
	tabContent,
	onClose,
	onExpand,
	defaultTab,
	open,
	onOpenChange,
	activeTab: controlledActiveTab,
	onActiveTabChange,
	title = "iAsted",
	subtitle,
	headerIcon = <Bot />,
	header: customHeader,
	headerRightSlot,
	tabsNav: customTabsNav,
	tabDefinitions,
	resolveLabel,
	className,
}: WindowShellProps) {
	const reduced = useReducedMotion();

	const [uncontrolledOpen, setUncontrolledOpen] = useState<boolean>(false);
	const isOpenControlled = open !== undefined;
	const isOpen = isOpenControlled ? open : uncontrolledOpen;

	const firstTab = preset.tabs[0] ?? "ichat";
	const [uncontrolledTab, setUncontrolledTab] = useState<IAstedTabId>(
		defaultTab ?? firstTab,
	);
	const isTabControlled = controlledActiveTab !== undefined;
	const currentTab = isTabControlled ? controlledActiveTab : uncontrolledTab;

	useEffect(() => {
		if (!isTabControlled && defaultTab && defaultTab !== uncontrolledTab) {
			setUncontrolledTab(defaultTab);
		}
	}, [defaultTab, isTabControlled, uncontrolledTab]);

	const handleClose = useCallback(() => {
		if (isOpenControlled) {
			onOpenChange?.(false);
		} else {
			setUncontrolledOpen(false);
		}
		onClose?.();
	}, [isOpenControlled, onOpenChange, onClose]);

	const handleTabChange = useCallback(
		(tabId: IAstedTabId) => {
			if (isTabControlled) {
				onActiveTabChange?.(tabId);
			} else {
				setUncontrolledTab(tabId);
			}
		},
		[isTabControlled, onActiveTabChange],
	);

	const transition = reduced ? REDUCED_MOTION.transition : WINDOW_MOTION.transition;

	// ── Header par défaut ── (modèle citizen-web : Maximize2 expand desktop-only + Minus close)
	const headerNode =
		customHeader ??
		(
			<WindowHeader
				icon={headerIcon}
				title={title}
				subtitle={subtitle}
				rightSlot={headerRightSlot}
				onExpand={onExpand}
				onClose={handleClose}
			/>
		);

	// ── TabsNav par défaut ──
	const resolvedTabs: IAstedTabDefinition[] = preset.tabs.map((tabId) => {
		return (
			tabDefinitions?.[tabId] ??
			TAB_DEFINITIONS[tabId] ?? {
				id: tabId,
				labelKey: `iasted.tabs.${tabId}`,
				fallbackLabel: tabId,
				iconName: "Bot",
			}
		);
	});

	const tabsNavNode =
		customTabsNav ??
		(
			<TabsNav
				tabs={resolvedTabs}
				activeTabId={currentTab}
				onTabChange={handleTabChange}
				resolveIcon={resolveIcon}
				resolveLabel={resolveLabel}
			/>
		);

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.aside
					initial={reduced ? { opacity: 0 } : WINDOW_MOTION.initial}
					animate={reduced ? { opacity: 1 } : WINDOW_MOTION.animate}
					exit={reduced ? { opacity: 0 } : WINDOW_MOTION.exit}
					transition={transition}
					style={{ zIndex: Z_INDEX.window }}
					className={cn(
						// Position — mobile bottom sheet, desktop dock bottom-right
						"fixed left-0 right-0 bottom-0 flex flex-col overflow-hidden sm:left-auto sm:right-6 sm:bottom-6",
						// Dimensions — 420×min(640,vh-100) desktop, 85dvh mobile (modèle citizen)
						"h-[85dvh] sm:w-[420px] sm:h-[min(640px,calc(100vh-100px))]",
						// Surface + border subtile + rounded
						"rounded-t-2xl sm:rounded-2xl bg-card border border-[oklch(0_0_0/0.05)] dark:border-[oklch(1_0_0/0.05)]",
						className,
					)}
					role="dialog"
					aria-label={title}
				>
					{headerNode}

					{callQueueSlot && (
						<div className="shrink-0 border-b border-border/50">{callQueueSlot}</div>
					)}

					<div className="flex flex-1 flex-col min-h-0 overflow-hidden">
						{tabContent[currentTab] ?? <DefaultEmptyContent tabId={currentTab} />}
					</div>

					{tabsNavNode}
				</motion.aside>
			)}
		</AnimatePresence>
	);
}

/**
 * Placeholder affiché quand un consumer n'a pas fourni de contenu pour
 * le tab actif (utile pendant la migration phase par phase).
 */
function DefaultEmptyContent({ tabId }: { tabId: IAstedTabId }) {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
			<div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
				<Bot className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
			</div>
			<p className="text-sm font-medium text-muted-foreground">Contenu à venir</p>
			<p className="text-xs text-muted-foreground/70">Tab : {tabId}</p>
		</div>
	);
}
