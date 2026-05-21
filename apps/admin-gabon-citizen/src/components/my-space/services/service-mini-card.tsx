/**
 * Service Mini Card — Card compacte neumorphique pour le catalogue
 */

import {
	Calendar,
	ChevronRight,
	Clock,
	Globe,
	type LucideIcon,
	MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FlatCard } from "@/components/my-space/flat-card";
import { CATEGORY_LIST, CATEGORY_STYLE } from "./category-nav";
import { cn } from "@/lib/utils";

interface ServiceMiniCardProps {
	name: string;
	description?: string;
	category: string;
	estimatedDays?: number;
	requiresAppointment?: boolean;
	isAvailableOnline?: boolean;
	isEligible?: boolean;
	onClick: () => void;
}

export function ServiceMiniCard({
	name,
	description,
	category,
	estimatedDays,
	requiresAppointment,
	isAvailableOnline,
	isEligible = true,
	onClick,
}: ServiceMiniCardProps) {
	const catConfig = CATEGORY_LIST.find((c) => c.id === category);
	const style = CATEGORY_STYLE[category] ?? CATEGORY_STYLE.other;
	const Icon: LucideIcon = catConfig?.icon ?? Globe;

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={!isEligible}
			className={cn(
				"w-full text-left group",
				!isEligible && "opacity-50 cursor-not-allowed",
			)}
		>
			<FlatCard
				className={cn(
					"p-3 transition-all",
					isEligible && "hover:bg-secondary/80 active:scale-[0.97]",
				)}
			>
				<div className="flex items-start gap-3">
					{/* Icone categorie */}
					<div
						className={cn(
							"p-2 rounded-lg shrink-0",
							style.bgColor,
						)}
					>
						<Icon className={cn("w-4.5 h-4.5", style.color)} />
					</div>

					{/* Contenu */}
					<div className="flex-1 min-w-0">
						<p className="text-sm font-semibold line-clamp-1 group-hover:text-primary transition-colors">
							{name}
						</p>
						{description && (
							<p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
								{description}
							</p>
						)}

						{/* Metadata row */}
						<div className="flex items-center gap-2 mt-1.5 flex-wrap">
							{estimatedDays !== undefined && (
								<span className="flex items-center gap-1 text-[10px] text-muted-foreground">
									<Clock className="w-3 h-3" />
									{estimatedDays}j
								</span>
							)}
							{requiresAppointment && (
								<span className="flex items-center gap-1 text-[10px] text-muted-foreground">
									<Calendar className="w-3 h-3" />
									RDV
								</span>
							)}
							{isAvailableOnline !== undefined && (
								<Badge
									variant="outline"
									className={cn(
										"text-[9px] px-1.5 py-0 h-4 gap-0.5",
										isAvailableOnline
											? "text-green-600 dark:text-green-400 border-green-500/20"
											: "text-muted-foreground border-border",
									)}
								>
									{isAvailableOnline ? (
										<>
											<Globe className="w-2.5 h-2.5" />
											En ligne
										</>
									) : (
										<>
											<MapPin className="w-2.5 h-2.5" />
											Sur place
										</>
									)}
								</Badge>
							)}
							{!isEligible && (
								<Badge
									variant="outline"
									className="text-[9px] px-1.5 py-0 h-4 text-rose-600 dark:text-rose-400 border-rose-500/20"
								>
									Non eligible
								</Badge>
							)}
						</div>
					</div>

					{/* Fleche navigation */}
					<ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary shrink-0 mt-1 transition-colors" />
				</div>
			</FlatCard>
		</button>
	);
}
