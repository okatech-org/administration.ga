"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type MethodButtonProps = {
	icon: LucideIcon;
	title: string;
	subtitle?: string;
	onClick: () => void;
	accent?: "blue" | "neutral";
	recommended?: boolean;
	recommendedLabel?: string;
	disabled?: boolean;
};

export function MethodButton({
	icon: Icon,
	title,
	subtitle,
	onClick,
	accent = "neutral",
	recommended,
	recommendedLabel = "Recommandé",
	disabled,
}: MethodButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				"group flex w-full items-center gap-4 rounded-xl border bg-card p-3.5 text-left transition-colors",
				"hover:border-gabon-blue hover:bg-muted/40",
				"disabled:cursor-not-allowed disabled:opacity-50",
			)}
			style={{ borderColor: "var(--border-strong, var(--border))" }}
		>
			<span
				className={cn(
					"grid size-9 shrink-0 place-items-center rounded-[10px]",
					accent === "blue"
						? "bg-gabon-blue text-white"
						: "bg-muted text-muted-foreground",
				)}
			>
				<Icon className="size-4" />
			</span>
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="flex items-center gap-2">
					<span className="text-sm font-medium text-foreground">{title}</span>
					{recommended && (
						<span className="inline-flex items-center rounded-full bg-gabon-blue-tint px-1.5 py-0.5 text-[10px] font-medium text-gabon-blue">
							{recommendedLabel}
						</span>
					)}
				</span>
				{subtitle && (
					<span className="mt-0.5 truncate text-xs text-muted-foreground">
						{subtitle}
					</span>
				)}
			</span>
			<ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
		</button>
	);
}
