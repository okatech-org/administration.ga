"use client";

import { cn } from "@/lib/utils";
import {
	Briefcase,
	Check,
	Eye,
	FileText,
	MapPin,
	Shield,
	User,
	Users,
} from "lucide-react";
import type { OnboardingStepDef } from "../lib/onboardingFlow";

const ICONS = {
	user: User,
	shield: Shield,
	users: Users,
	"map-pin": MapPin,
	briefcase: Briefcase,
	"file-text": FileText,
	eye: Eye,
} as const;

type StepperProps = {
	steps: OnboardingStepDef[];
	current: number;
	onJump?: (index: number) => void;
	orientation?: "vertical" | "horizontal";
	className?: string;
};

/**
 * Stepper desktop (sidebar gauche, vertical) ou mobile (horizontal compact).
 * - Étape courante : pastille bleue, label gras.
 * - Étapes passées : pastille verte + check, cliquables.
 * - Étapes à venir : pastille grise, non-cliquables.
 */
export function Stepper({
	steps,
	current,
	onJump,
	orientation = "vertical",
	className,
}: StepperProps) {
	if (orientation === "horizontal") {
		return (
			<ol
				className={cn(
					"flex items-center gap-1 overflow-x-auto py-1",
					className,
				)}
			>
				{steps.map((s, i) => {
					const done = i < current;
					const cur = i === current;
					return (
						<li key={s.key} className="flex items-center gap-1">
							<span
								className={cn(
									"flex size-6 items-center justify-center rounded-full text-xs font-semibold transition-colors",
									done && "bg-gabon-green text-white",
									cur &&
										"bg-gabon-blue text-white ring-2 ring-gabon-blue/30",
									!done && !cur && "bg-muted text-muted-foreground",
								)}
							>
								{done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
							</span>
							{i < steps.length - 1 && (
								<span
									className={cn(
										"h-px w-4 transition-colors",
										done ? "bg-gabon-green" : "bg-border",
									)}
								/>
							)}
						</li>
					);
				})}
			</ol>
		);
	}

	return (
		<ol className={cn("flex flex-col gap-1", className)}>
			{steps.map((s, i) => {
				const done = i < current;
				const cur = i === current;
				const Icon = ICONS[s.icon] ?? User;
				const clickable = (done || cur) && Boolean(onJump);
				return (
					<li key={s.key}>
						<button
							type="button"
							onClick={() => clickable && onJump?.(i)}
							disabled={!clickable}
							className={cn(
								"group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
								cur && "bg-muted",
								clickable && "cursor-pointer hover:bg-muted/70",
								!clickable && "cursor-default",
							)}
						>
							<span
								className={cn(
									"relative flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
									done && "bg-gabon-green text-white",
									cur &&
										"bg-gabon-blue text-white shadow-[0_0_0_4px_var(--gabon-blue-tint,rgba(58,117,196,0.15))]",
									!done && !cur && "bg-muted text-muted-foreground",
								)}
							>
								{done ? (
									<Check className="size-4" strokeWidth={3} />
								) : (
									<Icon className="size-4" />
								)}
							</span>
							<span className="flex min-w-0 flex-1 flex-col">
								<span
									className={cn(
										"truncate text-sm",
										cur ? "font-semibold text-foreground" : "text-foreground/80",
										done && "text-foreground/60",
									)}
								>
									{s.label}
								</span>
								<span className="truncate text-xs text-muted-foreground">
									Étape {i + 1}
								</span>
							</span>
						</button>
					</li>
				);
			})}
		</ol>
	);
}
