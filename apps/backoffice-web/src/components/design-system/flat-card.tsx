import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FlatCardProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
	className?: string;
}

/**
 * Flat card container — Design System v3.0 "Slate Trust & Authority"
 * (mappé sur Dashboard V2 : fond aligné sur `--surface`/sidebar, bordure
 * warm-beige, pas d'ombre).
 *
 * Avant : `bg-secondary` (= `--surface-3` clair) — créait un contraste
 * involontaire avec la sidebar en dark mode. Maintenant : `bg-card`
 * (= `--surface`) + border-soft pour rester lisible sur le `--bg` de
 * page.
 */
export function FlatCard({ children, className, ...props }: FlatCardProps) {
	return (
		<div
			className={cn(
				"rounded-xl bg-card border border-[color:var(--border-soft)] p-0 overflow-hidden",
				className,
			)}
			{...props}
		>
			{children}
		</div>
	);
}
