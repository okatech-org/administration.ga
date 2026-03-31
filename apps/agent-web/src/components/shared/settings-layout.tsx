import { type ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface SettingsTab {
	id: string;
	label: string;
	icon?: React.ReactNode;
	variant?: "default" | "destructive";
}

export interface SettingsTabGroup {
	label: string;
	tabs: SettingsTab[];
}

interface SettingsLayoutProps {
	title: string;
	description?: string;
	/** Flat tabs list (legacy) */
	tabs?: SettingsTab[];
	/** Grouped tabs with section labels (preferred) */
	groups?: SettingsTabGroup[];
	activeTab: string;
	onTabChange: (tabId: string) => void;
	children: ReactNode;
}

export function SettingsLayout({
	title,
	description,
	tabs,
	groups,
	activeTab,
	onTabChange,
	children,
}: SettingsLayoutProps) {
	// Si groups est fourni, l'utiliser. Sinon, fallback sur tabs dans un groupe unique.
	const resolvedGroups: SettingsTabGroup[] = groups
		? groups
		: tabs
			? [{ label: "", tabs }]
			: [];

	return (
		<div className="flex flex-1 flex-col p-3 md:p-6 min-h-full overflow-auto w-full max-w-[1400px] mx-auto">
			<div className="flex flex-col gap-1 mb-4 md:mb-6">
				<h1 className="text-xl md:text-3xl font-semibold tracking-tight">
					{title}
				</h1>
				{description && (
					<p className="text-sm md:text-base text-muted-foreground">
						{description}
					</p>
				)}
			</div>

			<div className="flex flex-col md:flex-row bg-card rounded-2xl border shadow-sm flex-1 overflow-hidden">
				{/* Sidebar → horizontal scroll on mobile */}
				<aside className="w-full md:w-56 lg:w-64 border-b md:border-b-0 md:border-r px-2 py-2 md:p-4 shrink-0 flex flex-row md:flex-col gap-1 bg-muted/20 overflow-x-auto">
					{resolvedGroups.map((group, gi) => (
						<div key={group.label || gi} className={cn("flex flex-row md:flex-col gap-1", gi > 0 && "md:mt-3 md:pt-3 md:border-t md:border-border/30")}>
							{/* Label de groupe (visible uniquement desktop) */}
							{group.label && (
								<p className="hidden md:block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-4 py-1">
									{group.label}
								</p>
							)}
							{group.tabs.map((tab) => {
								const isActive = tab.id === activeTab;
								return (
									<button
										type="button"
										key={tab.id}
										onClick={() => onTabChange(tab.id)}
										className={cn(
											"flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-sm transition-colors text-left whitespace-nowrap shrink-0 md:shrink md:w-full",
											isActive
												? "bg-primary text-primary-foreground font-medium"
												: tab.variant === "destructive"
													? "text-destructive hover:bg-destructive/10"
													: "text-muted-foreground hover:bg-muted hover:text-foreground",
										)}
									>
										{tab.icon && <span className="shrink-0">{tab.icon}</span>}
										{tab.label}
									</button>
								);
							})}
						</div>
					))}
				</aside>

				{/* Content */}
				<main className="flex-1 p-4 md:p-8 overflow-x-hidden overflow-y-auto">
					{children}
				</main>
			</div>
		</div>
	);
}

export function SettingsSectionHeader({
	title,
	description,
	action,
}: {
	title: string;
	description?: string;
	action?: ReactNode;
}) {
	return (
		<div className="flex items-start justify-between mb-6">
			<div>
				<h2 className="text-lg font-semibold">{title}</h2>
				{description && (
					<p className="text-sm text-muted-foreground mt-0.5">{description}</p>
				)}
			</div>
			{action && <div>{action}</div>}
		</div>
	);
}

export function SettingsRow({
	title,
	description,
	action,
	value,
	className,
}: {
	title: string | ReactNode;
	description?: ReactNode;
	action?: ReactNode;
	value?: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b last:border-b-0 gap-3",
				className,
			)}
		>
			<div className="flex-1 space-y-0.5 pr-4">
				<div className="font-medium text-sm text-foreground">{title}</div>
				{description && (
					<div className="text-sm text-muted-foreground">{description}</div>
				)}
			</div>
			<div className="flex items-center gap-4 sm:shrink-0">
				{value && (
					<div className="text-sm font-medium truncate max-w-[200px] sm:max-w-[300px]">
						{value}
					</div>
				)}
				{action && <div className="shrink-0">{action}</div>}
			</div>
		</div>
	);
}

/** A visual divider between sections inside a tab */
export function SettingsDivider() {
	return <Separator className="my-8" />;
}
