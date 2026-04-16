"use client";

import {
	Activity,
	Calendar,
	ClipboardList,
	FileText,
	IdCard,
	Mail,
	User,
	UserCog,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { RelativeTime } from "./shared/relative-time";
import type { ActivityEvent } from "./shared/types";

interface ActivityTimelineProps {
	orgId: Id<"orgs">;
	limit?: number;
}

const TARGET_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
	requests: ClipboardList,
	appointments: Calendar,
	consularRegistrations: IdCard,
	memberships: UserCog,
	orgs: UserCog,
	orgServices: FileText,
	positions: UserCog,
	correspondanceItems: Mail,
};

const OPERATION_COLOR: Record<ActivityEvent["operation"], string> = {
	insert: "text-emerald-600 dark:text-emerald-400",
	update: "text-sky-600 dark:text-sky-400",
	delete: "text-rose-600 dark:text-rose-400",
	read: "text-muted-foreground",
};

/**
 * W-F — Feed vertical des derniers événements. Consomme orgOverview.getRecentActivity.
 */
export function ActivityTimeline({ orgId, limit = 12 }: ActivityTimelineProps) {
	const { t } = useTranslation();

	const { data, isPending } = useAuthenticatedConvexQuery(
		api.functions.orgOverview.getRecentActivity,
		{ orgId, limit },
	);

	const events = (data as ActivityEvent[] | undefined) ?? [];

	return (
		<FlatCard>
			<div className="p-3 lg:p-4">
				<SectionHeader
					icon={<Activity className="h-4 w-4" />}
					title={t(
						"superadmin.organizations.overview.activity.title",
						"Activité récente",
					)}
					actions={
						events.length > 0 && (
							<span className="text-[10px] text-muted-foreground uppercase tracking-wider tabular-nums">
								{events.length}
							</span>
						)
					}
				/>

				{isPending ? (
					<div className="space-y-2">
						{[1, 2, 3, 4].map((i) => (
							<Skeleton key={i} className="h-10 w-full" />
						))}
					</div>
				) : events.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
						<Activity className="h-8 w-8 mb-2 opacity-30" />
						<p className="text-xs">Aucune activité récente</p>
					</div>
				) : (
					<ul className="space-y-2 max-h-[280px] overflow-y-auto citizen-scrollbar -mr-2 pr-2">
						{events.map((evt) => {
							const Icon = TARGET_ICON[evt.targetType] ?? User;
							const actorName = evt.actor?.name ?? "Système";
							return (
								<li
									key={evt._id}
									className="flex items-start gap-2.5 rounded-md px-1 py-1.5"
								>
									<div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted/40 shrink-0 mt-0.5">
										<Icon
											className={`h-3.5 w-3.5 ${OPERATION_COLOR[evt.operation] ?? "text-muted-foreground"}`}
										/>
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-xs leading-tight">
											<span className="font-medium">{actorName}</span>
											<span className="text-muted-foreground">
												{" "}
												· {evt.summary}
											</span>
										</p>
										<RelativeTime
											timestamp={evt.timestamp}
											className="text-[10px] text-muted-foreground"
										/>
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</div>
		</FlatCard>
	);
}
