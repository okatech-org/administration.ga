import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface TabItem {
	key: string;
	label: string;
	icon?: LucideIcon;
	count?: number;
}

interface TabSwitcherProps {
	tabs: TabItem[];
	activeTab: string;
	onTabChange: (key: string) => void;
	className?: string;
}

/**
 * Unified tab switcher for my-space pages.
 * Consistent with iProfil design language.
 */
export function TabSwitcher({ tabs, activeTab, onTabChange, className }: TabSwitcherProps) {
	return (
		<div className={cn("flex items-center gap-1 bg-secondary rounded-xl p-1", className)}>
			{tabs.map((tab) => {
				const isActive = activeTab === tab.key;
				const Icon = tab.icon;
				return (
					<button
						key={tab.key}
						type="button"
						onClick={() => onTabChange(tab.key)}
						className={cn(
							"flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center active:scale-[0.97]",
							isActive
								? "bg-primary text-primary-foreground"
								: "text-muted-foreground hover:text-foreground hover:bg-[#EBE6DC]/50 dark:hover:bg-[#383633]/50",
						)}
					>
						{Icon && <Icon className="h-4 w-4 shrink-0" />}
						{tab.label}
						{tab.count !== undefined && tab.count > 0 && (
							<Badge
								variant={isActive ? "secondary" : "outline"}
								className={cn(
									"ml-1 h-5 min-w-5 px-1.5 text-[10px] font-semibold",
									isActive
										? "bg-primary-foreground/20 text-primary-foreground border-0"
										: "text-muted-foreground",
								)}
							>
								{tab.count}
							</Badge>
						)}
					</button>
				);
			})}
		</div>
	);
}
