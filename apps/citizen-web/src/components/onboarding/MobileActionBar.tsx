"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

export function OnboardingMobileActionBar({
	onPrev,
	onNext,
	canPrev,
	canNext,
	nextLabel = "Continuer",
}: {
	onPrev?: () => void;
	onNext?: () => void;
	canPrev?: boolean;
	canNext?: boolean;
	nextLabel?: string;
}) {
	return (
		<div className="sticky bottom-0 z-20 flex items-center gap-3 border-t border-border bg-background/95 px-3 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur supports-[backdrop-filter]:bg-background/80">
			<Button
				variant="outline"
				size="icon"
				onClick={onPrev}
				disabled={!canPrev}
				aria-label="Précédent"
				className="size-11 shrink-0"
			>
				<ArrowLeft className="size-5" />
			</Button>
			<Button
				className="h-11 flex-1 text-base"
				onClick={onNext}
				disabled={!canNext}
			>
				{nextLabel}
				<ArrowRight className="ml-1 size-4" />
			</Button>
		</div>
	);
}
