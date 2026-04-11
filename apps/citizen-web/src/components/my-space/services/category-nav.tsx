/**
 * Category Nav — Navigation par categorie de services
 * Desktop : liste verticale dans FlatCard
 * Mobile : pills horizontales scroll
 */

import {
	BookOpen,
	BookOpenCheck,
	Building2,
	FileCheck,
	FileText,
	Globe,
	type LucideIcon,
	ShieldAlert,
	SlidersHorizontal,
} from "lucide-react";
import { ServiceCategory } from "@convex/lib/constants";
import { FlatCard } from "@/components/my-space/flat-card";
import { SectionHeader } from "@/components/my-space/section-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Constantes partagees ─────────────────────────────────────────────────────

export const CATEGORY_LIST: {
	id: string;
	icon: LucideIcon;
	label: string;
}[] = [
	{ id: "ALL", icon: SlidersHorizontal, label: "Tous" },
	{ id: ServiceCategory.Passport, icon: BookOpenCheck, label: "Passeport" },
	{ id: ServiceCategory.Visa, icon: Globe, label: "Visa" },
	{ id: ServiceCategory.CivilStatus, icon: FileText, label: "Etat civil" },
	{ id: ServiceCategory.Registration, icon: BookOpen, label: "Inscription" },
	{ id: ServiceCategory.Certification, icon: FileCheck, label: "Certification" },
	{ id: ServiceCategory.Assistance, icon: ShieldAlert, label: "Assistance" },
	{ id: ServiceCategory.Declaration, icon: Building2, label: "Declaration" },
];

export const CATEGORY_STYLE: Record<string, { color: string; bgColor: string }> = {
	[ServiceCategory.Passport]: {
		color: "text-blue-600 dark:text-blue-400",
		bgColor: "bg-blue-500/10",
	},
	[ServiceCategory.Visa]: {
		color: "text-green-600 dark:text-green-400",
		bgColor: "bg-green-500/10",
	},
	[ServiceCategory.CivilStatus]: {
		color: "text-yellow-600 dark:text-yellow-400",
		bgColor: "bg-yellow-500/10",
	},
	[ServiceCategory.Registration]: {
		color: "text-purple-600 dark:text-purple-400",
		bgColor: "bg-purple-500/10",
	},
	[ServiceCategory.Certification]: {
		color: "text-orange-600 dark:text-orange-400",
		bgColor: "bg-orange-500/10",
	},
	[ServiceCategory.Assistance]: {
		color: "text-red-600 dark:text-red-400",
		bgColor: "bg-red-500/10",
	},
	[ServiceCategory.Declaration]: {
		color: "text-indigo-600 dark:text-indigo-400",
		bgColor: "bg-indigo-500/10",
	},
	[ServiceCategory.Other]: {
		color: "text-zinc-600 dark:text-zinc-400",
		bgColor: "bg-zinc-500/10",
	},
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface CategoryNavProps {
	selectedCategory: string;
	onSelect: (id: string) => void;
	/** { [categoryId]: count } */
	serviceCounts?: Record<string, number>;
	onNewRequest?: () => void;
}

// ─── Desktop — Sidebar verticale ──────────────────────────────────────────────

export function CategoryNavDesktop({
	selectedCategory,
	onSelect,
	serviceCounts,
	onNewRequest,
}: CategoryNavProps) {
	return (
		<FlatCard className="p-3 space-y-1 sticky top-0">
			<SectionHeader
				icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
				title="Categories"
				className="mb-3"
			/>

			{CATEGORY_LIST.map((cat) => {
				const isActive = selectedCategory === cat.id;
				const count = cat.id === "ALL"
					? undefined
					: serviceCounts?.[cat.id];
				const style = CATEGORY_STYLE[cat.id];

				return (
					<button
						key={cat.id}
						type="button"
						onClick={() => onSelect(cat.id)}
						className={cn(
							"w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-sm",
							isActive
								? "bg-foreground/[0.06] dark:bg-foreground/[0.08] font-semibold text-foreground"
								: "text-muted-foreground hover:text-foreground hover:bg-muted/50",
						)}
					>
						<div
							className={cn(
								"p-1 rounded-md shrink-0",
								isActive
									? (style?.bgColor ?? "bg-muted")
									: "bg-transparent",
							)}
						>
							<cat.icon
								className={cn(
									"w-3.5 h-3.5",
									isActive
										? (style?.color ?? "text-foreground")
										: "text-muted-foreground",
								)}
							/>
						</div>
						<span className="flex-1 truncate">{cat.label}</span>
						{count !== undefined && count > 0 && (
							<span className="text-[10px] font-medium text-muted-foreground/70 bg-foreground/[0.04] px-1.5 py-0.5 rounded-md">
								{count}
							</span>
						)}
						{isActive && (
							<div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
						)}
					</button>
				);
			})}

			{onNewRequest && (
				<div className="pt-3 mt-2 border-t border-border">
					<Button
						size="sm"
						className="w-full gap-2 rounded-lg"
						onClick={onNewRequest}
					>
						Nouvelle demande
					</Button>
				</div>
			)}
		</FlatCard>
	);
}

// ─── Mobile — Pills horizontales ──────────────────────────────────────────────

export function CategoryNavMobile({
	selectedCategory,
	onSelect,
	serviceCounts,
}: Omit<CategoryNavProps, "onNewRequest">) {
	return (
		<div className="flex gap-2 overflow-x-auto pb-1 snap-x citizen-scrollbar">
			{CATEGORY_LIST.map((cat) => {
				const isActive = selectedCategory === cat.id;
				const count = cat.id === "ALL" ? undefined : serviceCounts?.[cat.id];
				const style = CATEGORY_STYLE[cat.id];

				return (
					<button
						key={cat.id}
						type="button"
						onClick={() => onSelect(cat.id)}
						className={cn(
							"flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all snap-start shrink-0 border",
							isActive
								? "bg-foreground/[0.06] dark:bg-foreground/[0.08] text-foreground border-foreground/5"
								: "text-muted-foreground border-transparent hover:bg-[#EBE6DC]/50 dark:hover:bg-[#383633]/50",
						)}
					>
						<cat.icon
							className={cn(
								"w-3.5 h-3.5 shrink-0",
								isActive
									? (style?.color ?? "text-foreground")
									: "text-muted-foreground",
							)}
						/>
						{cat.label}
						{count !== undefined && count > 0 && (
							<span className="text-[10px] opacity-60">{count}</span>
						)}
					</button>
				);
			})}
		</div>
	);
}
