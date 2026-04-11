import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FlatCardProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
	className?: string;
}

/**
 * Flat card container — Citizen Design System v3.0.
 * Warm gray surface, rounded-xl, zero shadow, zero border.
 */
export function FlatCard({ children, className, ...props }: FlatCardProps) {
	return (
		<div
			className={cn(
				"rounded-xl bg-[#F4F3ED] dark:bg-[#171616] p-0 overflow-hidden",
				className,
			)}
			{...props}
		>
			{children}
		</div>
	);
}
