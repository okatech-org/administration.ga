interface RelativeTimeProps {
	timestamp: number;
	className?: string;
}

/**
 * Format "il y a X" en français.
 * Pour éviter tout ré-render inutile, on calcule au montage puis laissons la
 * réactivité Convex (remount sur nouvelle data) rafraîchir la valeur.
 */
export function RelativeTime({ timestamp, className }: RelativeTimeProps) {
	const label = formatRelative(timestamp);
	const absolute = new Date(timestamp).toLocaleString("fr-FR", {
		day: "numeric",
		month: "long",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

	return (
		<time
			dateTime={new Date(timestamp).toISOString()}
			title={absolute}
			className={className}
		>
			{label}
		</time>
	);
}

function formatRelative(ts: number): string {
	const delta = Date.now() - ts;
	if (delta < 0) return "à l'instant";

	const seconds = Math.floor(delta / 1000);
	if (seconds < 60) return "à l'instant";

	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `il y a ${minutes} min`;

	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `il y a ${hours} h`;

	const days = Math.floor(hours / 24);
	if (days < 7) return `il y a ${days} j`;

	if (days < 30) return `il y a ${Math.floor(days / 7)} sem`;
	if (days < 365) return `il y a ${Math.floor(days / 30)} mois`;
	return `il y a ${Math.floor(days / 365)} an${Math.floor(days / 365) > 1 ? "s" : ""}`;
}
