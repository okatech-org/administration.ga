import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FlatCardProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
	className?: string;
}

/**
 * Flat card container matching the iProfil design language.
 * Consistent rounded-xl card with subtle border.
 */
export function FlatCard({ children, className, style, ...props }: FlatCardProps) {
	return (
		<div
			className={cn(
				"rounded-xl bg-card p-0 overflow-hidden border flat-card-border",
				className,
			)}
			style={style}
			{...props}
		>
			{children}
		</div>
	);
}
