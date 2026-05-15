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
	/**
	 * Bandeau secondaire rendu sous le header (ex : OrgSelector côté backoffice).
	 * Libère l'espace du header pour les contrôles Maximize/Réduire.
	 */
	subHeaderSlot?: ReactNode;
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

	/**
	 * Layout du shell.
	 * - `"floating"` (default) : dock compact bottom-right desktop, bottom-sheet mobile
	 * - `"side-panel"` : panneau plein hauteur ancré à droite (desktop) qui
	 *   « pousse » le contenu de la page. Mobile reste bottom-sheet.
	 *   À combiner avec un padding-right dynamique sur le `<main>` côté hôte
	 *   (cf. CSS var `--iasted-side-panel-width` settée par IAstedWindow).
	 */
	layout?: "floating" | "side-panel";

	/**
	 * Si `true`, la barre `TabsNav` n'est pas rendue : la fenêtre devient
	 * mono-fonction. Utile quand les options ont déjà été détachées en
	 * éventail (cf. `IAstedFanMenu`) — la TabsNav serait alors redondante.
	 * Défaut : `false` (mode multi-onglets historique).
	 */
	hideTabs?: boolean;

	className?: string;
}

export function WindowShell({
	preset,
	callQueueSlot,
	subHeaderSlot,
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
	layout = "floating",
	hideTabs = false,
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

	const isSidePanel = layout === "side-panel";

	// Animation : slide-from-bottom pour floating, slide-from-right pour side-panel
	const sidePanelMotion = {
		initial: { x: 480, opacity: 0 },
		animate: { x: 0, opacity: 1 },
		exit: { x: 480, opacity: 0 },
	};
	const initialMotion = reduced
		? { opacity: 0 }
		: isSidePanel
			? sidePanelMotion.initial
			: WINDOW_MOTION.initial;
	const animateMotion = reduced
		? { opacity: 1 }
		: isSidePanel
			? sidePanelMotion.animate
			: WINDOW_MOTION.animate;
	const exitMotion = reduced
		? { opacity: 0 }
		: isSidePanel
			? sidePanelMotion.exit
			: WINDOW_MOTION.exit;

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.aside
					initial={initialMotion}
					animate={animateMotion}
					exit={exitMotion}
					transition={transition}
					style={{ zIndex: Z_INDEX.window }}
					className={cn(
						"fixed flex flex-col overflow-hidden print:hidden",
						isSidePanel
							? [
									// Mobile = bottom-sheet (comportement inchangé)
									"left-0 right-0 bottom-0 h-[85dvh] rounded-t-2xl",
									// Desktop = side panel ancré à droite, full height
									"sm:left-auto sm:top-0 sm:right-0 sm:bottom-0 sm:w-[420px] sm:h-screen sm:rounded-none sm:border-l",
									"bg-card border border-[oklch(0_0_0/0.05)] dark:border-[oklch(1_0_0/0.05)]",
								]
							: [
									// Floating dock — comportement original (citizen model)
									"left-0 right-0 bottom-0 sm:left-auto sm:right-6 sm:bottom-6",
									"h-[85dvh] sm:w-[420px] sm:h-[min(640px,calc(100vh-100px))]",
									"rounded-t-2xl sm:rounded-2xl bg-card border border-[oklch(0_0_0/0.05)] dark:border-[oklch(1_0_0/0.05)]",
								],
						className,
					)}
					role="dialog"
					aria-label={title}
				>
					{headerNode}

					{subHeaderSlot && (
						<div className="shrink-0 border-b border-border/50">{subHeaderSlot}</div>
					)}

					{callQueueSlot && (
						<div className="shrink-0 border-b border-border/50">{callQueueSlot}</div>
					)}

					<div className="flex flex-1 flex-col min-h-0 overflow-hidden">
						{tabContent[currentTab] ?? <DefaultEmptyContent tabId={currentTab} />}
					</div>

					{/* Mode mono-fonction (éventail) : on masque la TabsNav.
					    Mode multi-onglets historique : on l'affiche. */}
					{!hideTabs && tabsNavNode}
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
