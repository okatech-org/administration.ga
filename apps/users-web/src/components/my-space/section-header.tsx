import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
	/** Lucide icon element */
	icon: ReactNode;
	/** Background class for the icon box, e.g. "bg-teal-500/10" */
	iconBgClass?: string;
	/** Text color class for the icon, e.g. "text-teal-600 dark:text-teal-400" */
	iconTextClass?: string;
	/** Section title */
	title: ReactNode;
	/** Optional actions slot (right side) */
	actions?: ReactNode;
	/** Additional className for the container */
	className?: string;
}

/**
 * Section header with icon-in-colored-box pattern from iProfil.
 * Provides consistent section headers across my-space pages.
 */
export function SectionHeader({
	icon,
	iconBgClass = "bg-foreground/8 dark:bg-foreground/5",
	iconTextClass,
	title,
	actions,
	className,
}: SectionHeaderProps) {
	return (
		<div className={cn("flex items-center justify-between mb-2", className)}>
			<span className="text-sm font-bold flex items-center gap-2">
				<div className={cn("p-1 rounded-md", iconBgClass)}>
					<span className={cn("h-3.5 w-3.5 shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5", iconTextClass)}>
						{icon}
					</span>
				</div>
				{title}
			</span>
			{actions}
		</div>
	);
}
