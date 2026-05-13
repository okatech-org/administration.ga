"use client";

import { cn } from "@/lib/utils";
import {
	Briefcase,
	Eye,
	FileText,
	MapPin,
	Shield,
	User,
	Users,
} from "lucide-react";
import type { OnboardingStepDef } from "./lib/onboardingFlow";

const ICONS = {
	user: User,
	shield: Shield,
	users: Users,
	"map-pin": MapPin,
	briefcase: Briefcase,
	"file-text": FileText,
	eye: Eye,
} as const;

export function OnboardingMobileProgressHeader({
	step,
	currentIndex,
	totalSteps,
}: {
	step: OnboardingStepDef;
	currentIndex: number;
	totalSteps: number;
}) {
	const Icon = ICONS[step.icon] ?? User;
	const pct = ((currentIndex + 1) / totalSteps) * 100;
	return (
		<div className="flex flex-col gap-2 border-b border-border bg-background px-4 pb-3 pt-3">
			<div className="flex items-center gap-3">
				<span className="flex size-9 items-center justify-center rounded-lg bg-gabon-blue-tint text-gabon-blue">
					<Icon className="size-4" />
				</span>
				<div className="min-w-0 flex-1">
					<div className="truncate text-sm font-semibold">{step.label}</div>
					<div className="text-xs font-mono tabular-nums text-muted-foreground">
						{String(currentIndex + 1).padStart(2, "0")} /{" "}
						{String(totalSteps).padStart(2, "0")}
					</div>
				</div>
			</div>
			<div className="h-1 w-full overflow-hidden rounded-full bg-muted">
				<div
					className={cn(
						"h-full bg-gabon-blue transition-[width] duration-300 ease-out",
					)}
					style={{ width: `${pct}%` }}
				/>
			</div>
		</div>
	);
}
