import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
	type Continent,
	getActiveContinents,
	getContinent,
	getContinentEmoji,
	getContinentLabel,
} from "@/lib/country-utils";

interface ContinentTabsProps<T> {
	/** The data array to segment */
	data: T[];
	/** Extract the country code from each item */
	getCountryCode: (item: T) => string | undefined;
	/** Render function that receives the filtered data */
	children: (filteredData: T[], activeContinent: Continent | null) => React.ReactNode;
	/** Optional class for the tab bar */
	className?: string;
}

/**
 * Reusable continent tabs component.
 * Automatically detects which continents exist in the data
 * and provides filtered data to children.
 */
export function ContinentTabs<T>({
	data,
	getCountryCode,
	children,
	className,
}: ContinentTabsProps<T>) {
	const [activeContinent, setActiveContinent] = useState<Continent | null>(null);

	// Detect active continents and count per continent
	const { continents, counts, filteredData } = useMemo(() => {
		const countryCodes = data
			.map((item) => getCountryCode(item))
			.filter(Boolean) as string[];

		const activeContinents = getActiveContinents(countryCodes);

		// Count per continent
		const countMap = new Map<Continent | "all", number>();
		countMap.set("all", data.length);

		for (const c of activeContinents) {
			countMap.set(c, 0);
		}

		for (const item of data) {
			const code = getCountryCode(item);
			const continent = code ? getContinent(code) : null;
			if (continent && countMap.has(continent)) {
				countMap.set(continent, (countMap.get(continent) || 0) + 1);
			}
		}

		// Filter data
		let filtered = data;
		if (activeContinent) {
			filtered = data.filter((item) => {
				const code = getCountryCode(item);
				return code ? getContinent(code) === activeContinent : false;
			});
		}

		return {
			continents: activeContinents,
			counts: countMap,
			filteredData: filtered,
		};
	}, [data, getCountryCode, activeContinent]);

	if (continents.length <= 1) {
		// No point showing tabs if only one continent
		return <>{children(data, null)}</>;
	}

	return (
		<div className={cn("space-y-4", className)}>
			{/* Tab bar */}
			<div className="flex flex-wrap gap-1.5 p-1 bg-muted/50 rounded-xl">
				{/* Tab: All */}
				<button
					type="button"
					onClick={() => setActiveContinent(null)}
					className={cn(
						"flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
						activeContinent === null
							? "bg-background text-foreground shadow-sm"
							: "text-muted-foreground hover:text-foreground hover:bg-background/50",
					)}
				>
					<span></span>
					<span>Tous</span>
					<Badge
						variant="secondary"
						className={cn(
							"ml-0.5 h-5 min-w-[20px] px-1.5 text-[10px]",
							activeContinent === null && "bg-primary/10 text-primary",
						)}
					>
						{counts.get("all") || 0}
					</Badge>
				</button>

				{/* Tab per continent */}
				{continents.map((continent) => (
					<button
						key={continent}
						type="button"
						onClick={() => setActiveContinent(continent)}
						className={cn(
							"flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
							activeContinent === continent
								? "bg-background text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground hover:bg-background/50",
						)}
					>
						<span>{getContinentEmoji(continent)}</span>
						<span className="hidden sm:inline">{getContinentLabel(continent)}</span>
						<Badge
							variant="secondary"
							className={cn(
								"ml-0.5 h-5 min-w-[20px] px-1.5 text-[10px]",
								activeContinent === continent && "bg-primary/10 text-primary",
							)}
						>
							{counts.get(continent) || 0}
						</Badge>
					</button>
				))}
			</div>

			{/* Content */}
			{children(filteredData, activeContinent)}
		</div>
	);
}
