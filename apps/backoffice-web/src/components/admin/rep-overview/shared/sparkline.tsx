import { cn } from "@/lib/utils";

interface SparklineProps {
	/** Série numérique — typiquement 7 points. */
	data: number[];
	/** Couleur du tracé (hex ou var CSS). */
	color?: string;
	/** Largeur SVG en px. */
	width?: number;
	/** Hauteur SVG en px. */
	height?: number;
	className?: string;
}

/**
 * Sparkline SVG inline — aucune librairie de charts nécessaire.
 * Rend un path courbe + un fond légèrement teinté.
 */
export function Sparkline({
	data,
	color = "currentColor",
	width = 96,
	height = 28,
	className,
}: SparklineProps) {
	if (!data.length) {
		return <div style={{ width, height }} className={className} />;
	}

	const max = Math.max(...data, 1);
	const min = Math.min(...data, 0);
	const range = max - min || 1;

	const stepX = data.length > 1 ? width / (data.length - 1) : 0;
	const points = data.map((value, i) => {
		const x = i * stepX;
		const y = height - ((value - min) / range) * height;
		return `${x.toFixed(1)},${y.toFixed(1)}`;
	});

	const linePath = `M ${points.join(" L ")}`;
	const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;

	return (
		<svg
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			className={cn("shrink-0", className)}
			role="img"
			aria-label={`Tendance : ${data.length} points, min ${min}, max ${max}`}
		>
			<path
				d={areaPath}
				fill={color}
				fillOpacity={0.12}
				stroke="none"
			/>
			<path
				d={linePath}
				fill="none"
				stroke={color}
				strokeWidth={1.5}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
