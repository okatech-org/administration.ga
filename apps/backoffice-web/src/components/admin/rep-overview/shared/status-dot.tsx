import { cn } from "@/lib/utils";

type Status = "ok" | "warn" | "critical" | "idle" | "info";

interface StatusDotProps {
	status: Status;
	/** Ajoute une animation pulse (pour les signaux live). */
	pulse?: boolean;
	size?: "sm" | "md";
	className?: string;
}

const STATUS_COLOR: Record<Status, string> = {
	ok: "bg-emerald-500",
	warn: "bg-amber-500",
	critical: "bg-rose-500",
	idle: "bg-muted-foreground/40",
	info: "bg-sky-500",
};

/**
 * Point coloré de statut — utilisé dans les timelines et les listes live.
 * Pulse optionnel pour les états qui changent (appels en cours, agents en ligne).
 */
export function StatusDot({
	status,
	pulse = false,
	size = "sm",
	className,
}: StatusDotProps) {
	const sizeClass = size === "md" ? "h-2.5 w-2.5" : "h-2 w-2";
	return (
		<span className={cn("relative inline-flex shrink-0", sizeClass, className)}>
			{pulse && (
				<span
					className={cn(
						"absolute inset-0 rounded-full animate-ping opacity-60",
						STATUS_COLOR[status],
					)}
				/>
			)}
			<span
				className={cn(
					"relative inline-block rounded-full",
					sizeClass,
					STATUS_COLOR[status],
				)}
			/>
		</span>
	);
}
