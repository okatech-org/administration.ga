"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Info } from "lucide-react";

export function OnboardingMobileHeader({
	onBack,
	savedAt,
}: {
	onBack?: () => void;
	savedAt?: string;
}) {
	return (
		<header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
			{onBack ? (
				<Button
					variant="ghost"
					size="icon"
					onClick={onBack}
					aria-label="Retour"
					className="size-9"
				>
					<ArrowLeft className="size-5" />
				</Button>
			) : (
				<span className="size-9" />
			)}
			{savedAt ? (
				<span className="inline-flex items-center gap-1.5 rounded-full bg-gabon-green-tint px-2.5 py-1 text-[11px] font-medium text-gabon-green">
					<Check className="size-3" strokeWidth={3} />
					Brouillon · {savedAt}
				</span>
			) : (
				<span />
			)}
			<Button
				variant="ghost"
				size="icon"
				aria-label="Aide"
				className="size-9"
			>
				<Info className="size-5" />
			</Button>
		</header>
	);
}
