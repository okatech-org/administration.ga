import type { ConsularTheme } from "@/hooks/useConsularTheme";
import { cn } from "@/lib/utils";

interface ThemePreviewProps {
	themeId: ConsularTheme;
	label: string;
	description: string;
	isActive: boolean;
	onClick: () => void;
}

export function ThemePreview({
	themeId,
	label,
	description,
	isActive,
	onClick,
}: ThemePreviewProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"relative flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer w-full text-left active:scale-[0.97]",
				isActive
					? "bg-primary/10 ring-2 ring-primary/20"
					: "bg-[#FDFCFA] dark:bg-[#21201E]/77 hover:bg-[#EBE6DC]/50 dark:hover:bg-[#383633]/50",
			)}
		>
			<div
				className={cn(
					"w-16 h-12 rounded-lg overflow-hidden relative shrink-0",
					themeId === "default"
						? "bg-[#FDFCFA] dark:bg-[#21201E]/77"
						: "bg-[oklch(0.92_0.005_250)]",
				)}
			>
				{themeId === "default" ? (
					<div className="p-1.5 space-y-1">
						<div className="h-1.5 w-5 bg-primary/20 rounded" />
						<div className="h-2.5 bg-muted rounded" />
						<div className="flex gap-0.5">
							<div className="h-2 flex-1 bg-muted rounded" />
							<div className="h-2 flex-1 bg-muted rounded" />
						</div>
					</div>
				) : (
					<div className="p-1.5 space-y-1">
						<div className="h-1.5 w-5 bg-primary/20 rounded" />
						<div
							className="h-2.5 rounded"
							style={{
								background: "oklch(0.92 0.005 250)",
								boxShadow:
									"2px 2px 4px oklch(0.7 0.01 250 / 0.35), -2px -2px 4px oklch(1 0 0 / 0.7)",
							}}
						/>
						<div className="flex gap-0.5">
							<div
								className="h-2 flex-1 rounded"
								style={{
									background: "oklch(0.92 0.005 250)",
									boxShadow:
										"2px 2px 4px oklch(0.7 0.01 250 / 0.35), -2px -2px 4px oklch(1 0 0 / 0.7)",
								}}
							/>
							<div
								className="h-2 flex-1 rounded"
								style={{
									background: "oklch(0.92 0.005 250)",
									boxShadow:
										"2px 2px 4px oklch(0.7 0.01 250 / 0.35), -2px -2px 4px oklch(1 0 0 / 0.7)",
								}}
							/>
						</div>
					</div>
				)}
			</div>

			<div className="flex-1 min-w-0">
				<p className="text-sm font-semibold">{label}</p>
				<p className="text-xs text-muted-foreground leading-tight truncate">
					{description}
				</p>
			</div>

			{isActive && (
				<div className="w-3 h-3 rounded-full bg-primary shrink-0" />
			)}
		</button>
	);
}
