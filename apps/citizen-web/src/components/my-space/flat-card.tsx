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
export function FlatCard({ children, className, ...props }: FlatCardProps) {
	return (
		<div
			className={cn(
				"rounded-xl bg-[#F4F3ED] dark:bg-[#2B2A28]/47 p-0 overflow-hidden",
				className,
			)}
			{...props}
		>
			{children}
		</div>
	);
}
