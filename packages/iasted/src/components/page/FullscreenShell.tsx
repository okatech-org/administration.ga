/**
 * FullscreenShell — layout plein écran partagé pour les pages `/iasted`.
 *
 * Remplace les pages `/my-space/iasted` (citizen) et `/iasted` (agent) qui
 * dupliquaient chacune ~1000 lignes de layout + styles. Fournit :
 *
 * - **Layout 3 colonnes** (sidebar nav + liste + contenu) aligné DS v3
 * - **Header cohérent** (WindowHeader) identique à la fenêtre compacte
 * - **Bouton minimize** (route vers page d'origine / dashboard)
 * - **Tab indicator** partagé avec compact (`layoutId: "iasted-tab-indicator"`)
 *
 * Le contenu de chaque colonne est un SLOT injecté par l'app — le package ne
 * contient AUCUNE logique Convex ou métier.
 *
 * Responsive :
 * - Desktop ≥ lg : 3 colonnes (nav 80px / list 320px / content flex-1)
 * - Mobile < lg : 1 colonne (nav bottom bar, list plein écran, content modal/route)
 */

"use client";

import { type ComponentType, type ReactNode, type SVGProps } from "react";
import { motion } from "motion/react";
import { Minimize2 } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { TAB_INDICATOR_MOTION } from "../../tokens/animation";
import { resolveIcon } from "../../lib/icon-resolver";
import { TAB_DEFINITIONS } from "../../presets";
import type {
	IAstedPreset,
	IAstedTabId,
	IAstedTabDefinition,
} from "../../types/iasted";

export interface FullscreenShellProps {
	preset: IAstedPreset;
	activeTab: IAstedTabId;
	onTabChange: (tabId: IAstedTabId) => void;
	/** Handler de minimisation (route vers dashboard, typiquement). */
	onMinimize?: () => void;
	/** Titre principal (header compact de la colonne de gauche). */
	title?: string;
	/** Sous-titre (nom d'organisation, par exemple). */
	subtitle?: string;
	/** Résolveur i18n optionnel. */
	resolveLabel?: (labelKey: string, fallback: string) => string;
	/** Définitions d'onglets custom (override TAB_DEFINITIONS par défaut). */
	tabDefinitions?: Partial<Record<IAstedTabId, IAstedTabDefinition>>;
	/** Badges optionnels par tab (ex : unread count, notifications). */
	tabBadges?: Partial<Record<IAstedTabId, ReactNode>>;

	// ── Slots de contenu ──────────────────────────────────
	/** Colonne 2 : liste (conversations, contacts, etc.). Optionnel. */
	listSlot?: ReactNode;
	/** Colonne 3 : contenu principal (chat, détail, etc.). */
	contentSlot: ReactNode;
	/** Slot au-dessus de la colonne list (ex : recherche globale). */
	listHeaderSlot?: ReactNode;
	/** Slot optionnel au bas de la sidebar nav (ex : user badge, switcher org). */
	sidebarFooterSlot?: ReactNode;

	className?: string;
}

/**
 * NavSidebar vertical (desktop) — affiche les tabs sous forme d'icônes verticales
 * avec indicator motion.
 */
function NavSidebar({
	preset,
	activeTab,
	onTabChange,
	resolveLabel,
	tabDefinitions,
	tabBadges,
	footer,
	title,
	subtitle,
}: {
	preset: IAstedPreset;
	activeTab: IAstedTabId;
	onTabChange: (tabId: IAstedTabId) => void;
	resolveLabel?: (labelKey: string, fallback: string) => string;
	tabDefinitions?: Partial<Record<IAstedTabId, IAstedTabDefinition>>;
	tabBadges?: Partial<Record<IAstedTabId, ReactNode>>;
	footer?: ReactNode;
	title?: string;
	subtitle?: string;
}) {
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

	return (
		<nav
			className="flex h-full flex-col border-r border-foreground/5 bg-card"
			role="tablist"
			aria-label="iAsted navigation"
		>
			{(title || subtitle) && (
				<div className="shrink-0 border-b border-foreground/5 px-3 py-3 text-center">
					{title && (
						<p className="truncate text-xs font-bold text-foreground">{title}</p>
					)}
					{subtitle && (
						<p className="truncate text-[10px] font-medium text-muted-foreground">
							{subtitle}
						</p>
					)}
				</div>
			)}
			<div className="flex-1 overflow-y-auto py-2">
				{resolvedTabs.map((tab) => {
					const isActive = tab.id === activeTab;
					const Icon: ComponentType<SVGProps<SVGSVGElement>> = resolveIcon(tab.iconName);
					const label = resolveLabel
						? resolveLabel(tab.labelKey, tab.fallbackLabel)
						: tab.fallbackLabel;
					const badge = tabBadges?.[tab.id];

					return (
						<button
							key={tab.id}
							type="button"
							role="tab"
							aria-selected={isActive}
							onClick={() => onTabChange(tab.id)}
							className={cn(
								"relative mx-2 mb-1 flex w-auto flex-col items-center gap-1 rounded-lg px-2 py-2.5 transition-colors active:scale-[0.97]",
								isActive
									? "bg-primary/10 text-primary"
									: "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
							)}
						>
							<div className="relative">
								<Icon className="h-5 w-5" />
								{badge && (
									<span className="absolute -top-1 -right-1 flex items-center">
										{badge}
									</span>
								)}
							</div>
							<span className="text-[10px] font-medium leading-none">{label}</span>
							{isActive && (
								<motion.span
									layoutId={TAB_INDICATOR_MOTION.layoutId}
									transition={TAB_INDICATOR_MOTION.transition}
									className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r-full bg-primary"
								/>
							)}
						</button>
					);
				})}
			</div>
			{footer && (
				<div className="shrink-0 border-t border-foreground/5 p-2">{footer}</div>
			)}
		</nav>
	);
}

export function FullscreenShell({
	preset,
	activeTab,
	onTabChange,
	onMinimize,
	title,
	subtitle,
	resolveLabel,
	tabDefinitions,
	tabBadges,
	listSlot,
	contentSlot,
	listHeaderSlot,
	sidebarFooterSlot,
	className,
}: FullscreenShellProps) {
	return (
		<div
			className={cn(
				"flex h-dvh w-full flex-col overflow-hidden bg-background lg:flex-row",
				className,
			)}
		>
			{/* Sidebar nav — desktop ≥ lg, bottom bar sur mobile */}
			<div className="hidden w-20 shrink-0 lg:block">
				<NavSidebar
					preset={preset}
					activeTab={activeTab}
					onTabChange={onTabChange}
					resolveLabel={resolveLabel}
					tabDefinitions={tabDefinitions}
					tabBadges={tabBadges}
					footer={sidebarFooterSlot}
					title={title}
					subtitle={subtitle}
				/>
			</div>

			{/* Mobile : header compact avec titre + close */}
			{(title || onMinimize) && (
				<header className="flex shrink-0 items-center gap-3 border-b border-foreground/5 bg-card px-3 py-2.5 lg:hidden">
					<div className="min-w-0 flex-1">
						{title && (
							<h1 className="truncate text-sm font-bold text-foreground">{title}</h1>
						)}
						{subtitle && (
							<p className="truncate text-xs font-medium text-muted-foreground">
								{subtitle}
							</p>
						)}
					</div>
					{onMinimize && (
						<button
							type="button"
							onClick={onMinimize}
							className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground active:scale-[0.97]"
							aria-label="Réduire"
						>
							<Minimize2 className="h-4 w-4" />
						</button>
					)}
				</header>
			)}

			{/* Column 2 : liste (optionnelle) */}
			{listSlot && (
				<aside className="flex max-h-[40dvh] shrink-0 flex-col overflow-hidden border-r border-foreground/5 bg-card lg:max-h-none lg:w-80">
					{listHeaderSlot && (
						<div className="shrink-0 border-b border-foreground/5">{listHeaderSlot}</div>
					)}
					<div className="flex-1 overflow-y-auto">{listSlot}</div>
				</aside>
			)}

			{/* Column 3 : contenu principal (flex-1) */}
			<main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
				{/* Header desktop avec bouton minimize à droite */}
				{onMinimize && (
					<header className="hidden shrink-0 items-center justify-end gap-2 border-b border-foreground/5 bg-card px-4 py-2.5 lg:flex">
						<button
							type="button"
							onClick={onMinimize}
							className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground active:scale-[0.97]"
							aria-label="Réduire"
						>
							<Minimize2 className="h-4 w-4" />
						</button>
					</header>
				)}
				<div className="flex-1 overflow-hidden">{contentSlot}</div>
			</main>

			{/* Mobile : bottom tabs */}
			<div className="shrink-0 lg:hidden">
				<MobileBottomNav
					preset={preset}
					activeTab={activeTab}
					onTabChange={onTabChange}
					resolveLabel={resolveLabel}
					tabDefinitions={tabDefinitions}
				/>
			</div>
		</div>
	);
}

function MobileBottomNav({
	preset,
	activeTab,
	onTabChange,
	resolveLabel,
	tabDefinitions,
}: {
	preset: IAstedPreset;
	activeTab: IAstedTabId;
	onTabChange: (tabId: IAstedTabId) => void;
	resolveLabel?: (labelKey: string, fallback: string) => string;
	tabDefinitions?: Partial<Record<IAstedTabId, IAstedTabDefinition>>;
}) {
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

	return (
		<nav
			className="relative flex items-stretch border-t border-foreground/5 bg-card"
			role="tablist"
		>
			{resolvedTabs.map((tab) => {
				const isActive = tab.id === activeTab;
				const Icon = resolveIcon(tab.iconName);
				const label = resolveLabel
					? resolveLabel(tab.labelKey, tab.fallbackLabel)
					: tab.fallbackLabel;

				return (
					<button
						key={tab.id}
						type="button"
						role="tab"
						aria-selected={isActive}
						onClick={() => onTabChange(tab.id)}
						className={cn(
							"relative flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2.5 transition-colors active:scale-[0.97]",
							isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
						)}
					>
						<Icon className="h-4 w-4" />
						<span className="text-[10px] font-medium leading-none">{label}</span>
						{isActive && (
							<motion.span
								layoutId={`${TAB_INDICATOR_MOTION.layoutId}-mobile`}
								transition={TAB_INDICATOR_MOTION.transition}
								className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-primary"
							/>
						)}
					</button>
				);
			})}
		</nav>
	);
}
