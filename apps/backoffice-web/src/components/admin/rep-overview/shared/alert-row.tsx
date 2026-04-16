import Link from "next/link";
import {
	AlertCircle,
	AlertTriangle,
	ChevronRight,
	Clock,
	FileWarning,
	IdCard,
	Info,
	Printer,
	UserMinus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrgAlert } from "./types";

interface AlertRowProps {
	alert: OrgAlert;
}

const ALERT_ICON: Record<OrgAlert["type"], React.ComponentType<{ className?: string }>> = {
	sla_breach: Clock,
	vacant_critical: UserMinus,
	registry_expiring: IdCard,
	cards_pending: Printer,
	correspondance_overdue: FileWarning,
	approval_pending: Info,
};

const SEVERITY_STYLES = {
	critical: {
		bg: "bg-rose-500/5 border-rose-500/30 hover:bg-rose-500/10",
		icon: "text-rose-600 dark:text-rose-400",
		iconBg: "bg-rose-500/10",
		badge: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
	},
	warning: {
		bg: "bg-amber-500/5 border-amber-500/30 hover:bg-amber-500/10",
		icon: "text-amber-700 dark:text-amber-400",
		iconBg: "bg-amber-500/10",
		badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
	},
	info: {
		bg: "bg-sky-500/5 border-sky-500/30 hover:bg-sky-500/10",
		icon: "text-sky-700 dark:text-sky-400",
		iconBg: "bg-sky-500/10",
		badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
	},
};

export function AlertRow({ alert }: AlertRowProps) {
	const Icon = ALERT_ICON[alert.type] ?? AlertCircle;
	const styles = SEVERITY_STYLES[alert.severity];

	return (
		<Link
			href={alert.ctaHref}
			className={cn(
				"flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors",
				styles.bg,
			)}
		>
			<div
				className={cn(
					"flex h-8 w-8 items-center justify-center rounded-md shrink-0",
					styles.iconBg,
				)}
			>
				<Icon className={cn("h-4 w-4", styles.icon)} />
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-medium truncate">{alert.label}</p>
			</div>
			<span
				className={cn(
					"tabular-nums text-xs font-bold rounded-md px-2 py-0.5 shrink-0",
					styles.badge,
				)}
			>
				{alert.count}
			</span>
			<ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
		</Link>
	);
}

export function AlertRowIcon({ type }: { type: OrgAlert["type"] }) {
	const Icon = ALERT_ICON[type] ?? AlertTriangle;
	return <Icon className="h-4 w-4" />;
}
