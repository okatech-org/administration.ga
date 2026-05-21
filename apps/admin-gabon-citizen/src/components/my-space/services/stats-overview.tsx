/**
 * Stats Overview — 3 mini-cards de synthese pour Services & Demarches
 */

import {
	AlertTriangle,
	Clock,
	Globe,
} from "lucide-react";
import { motion } from "motion/react";
import { FlatCard } from "@/components/my-space/flat-card";
import { cn } from "@/lib/utils";

interface StatsOverviewProps {
	serviceCount: number;
	activeCount: number;
	pendingActionsCount: number;
	isLoading?: boolean;
}

const stats = [
	{
		key: "services",
		icon: Globe,
		label: "Services disponibles",
		iconBg: "bg-blue-500/10",
		iconColor: "text-blue-600 dark:text-blue-400",
		valueColor: "text-blue-600 dark:text-blue-400",
	},
	{
		key: "active",
		icon: Clock,
		label: "Demarches en cours",
		iconBg: "bg-amber-500/10",
		iconColor: "text-amber-600 dark:text-amber-400",
		valueColor: "text-amber-600 dark:text-amber-400",
	},
	{
		key: "actions",
		icon: AlertTriangle,
		label: "Actions en attente",
		iconBg: "bg-rose-500/10",
		iconColor: "text-rose-600 dark:text-rose-400",
		valueColor: "text-rose-600 dark:text-rose-400",
	},
] as const;

export function StatsOverview({
	serviceCount,
	activeCount,
	pendingActionsCount,
	isLoading,
}: StatsOverviewProps) {
	const values = {
		services: serviceCount,
		active: activeCount,
		actions: pendingActionsCount,
	};

	return (
		<div className="flex gap-3 overflow-x-auto pb-1 snap-x citizen-scrollbar">
			{stats.map((stat, index) => (
				<motion.div
					key={stat.key}
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.25, delay: index * 0.06 }}
					className="min-w-[140px] flex-1 snap-start"
				>
					<FlatCard className="p-3.5">
						<div className="flex items-center gap-3">
							<div
								className={cn(
									"p-2 rounded-lg shrink-0",
									stat.iconBg,
								)}
							>
								<stat.icon
									className={cn("w-4 h-4", stat.iconColor)}
								/>
							</div>
							<div className="min-w-0">
								{isLoading ? (
									<div className="h-6 w-10 bg-muted rounded animate-pulse" />
								) : (
									<p
										className={cn(
											"text-xl font-bold leading-none",
											stat.valueColor,
										)}
									>
										{values[stat.key]}
									</p>
								)}
								<p className="text-[10px] text-muted-foreground font-medium mt-0.5 truncate">
									{stat.label}
								</p>
							</div>
						</div>
					</FlatCard>
				</motion.div>
			))}
		</div>
	);
}
