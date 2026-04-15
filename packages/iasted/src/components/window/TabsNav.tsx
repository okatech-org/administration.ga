/**
 * TabsNav — barre d'onglets bottom-nav unifiée iAsted.
 *
 * **Modèle de référence : citizen-web original** — pilules actives
 * `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400`, labels sous icônes,
 * pas d'underline motion (la pilule elle-même marque l'état actif).
 *
 * DS v3 §3.4 : l'emerald est utilisé comme accent sémantique "success / iAsted".
 */

"use client";

import { type ComponentType, type SVGProps } from "react";
import { cn } from "@workspace/ui/lib/utils";
import type { IAstedTabDefinition, IAstedTabId } from "../../types/iasted";

export interface TabsNavProps {
	tabs: IAstedTabDefinition[];
	activeTabId: IAstedTabId;
	onTabChange: (tabId: IAstedTabId) => void;
	/** Résolveur d'icônes : nomIcon → composant Lucide. */
	resolveIcon: (iconName: string) => ComponentType<SVGProps<SVGSVGElement>>;
	/** Résolveur i18n optionnel — si absent, fallback sur `fallbackLabel`. */
	resolveLabel?: (labelKey: string, fallback: string) => string;
	className?: string;
}

export function TabsNav({
	tabs,
	activeTabId,
	onTabChange,
	resolveIcon,
	resolveLabel,
	className,
}: TabsNavProps) {
	return (
		<nav
			className={cn(
				"shrink-0 border-t border-border/50 bg-card",
				className,
			)}
			role="tablist"
		>
			<div className="flex items-center justify-around py-2">
				{tabs.map((tab) => {
					const isActive = tab.id === activeTabId;
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
								// Pill active state (modèle citizen-web original)
								"flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 transition-colors min-w-[60px] active:scale-[0.97]",
								isActive
									? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							<Icon
								className={cn(
									"h-5 w-5",
									isActive && "text-emerald-600 dark:text-emerald-400",
								)}
							/>
							<span
								className={cn(
									"text-[9px] font-semibold leading-none",
									isActive && "text-emerald-600 dark:text-emerald-400",
								)}
							>
								{label}
							</span>
						</button>
					);
				})}
			</div>
		</nav>
	);
}
