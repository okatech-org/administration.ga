"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

/**
 * Placeholder utilisé pendant la phase de montage du wizard.
 * Sera remplacé par les vrais steps (Identity, Pin, Family, …) au fur et à
 * mesure de leur implémentation.
 */
export function StepPlaceholder({
	title,
	description,
}: {
	title: string;
	description?: string;
}) {
	return (
		<Card className="border-dashed">
			<CardContent className="flex flex-col items-center gap-3 py-12 text-center">
				<span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
					<Construction className="size-6" />
				</span>
				<h2 className="text-xl font-semibold">{title}</h2>
				{description && (
					<p className="max-w-md text-sm text-muted-foreground">
						{description}
					</p>
				)}
				<p className="text-xs text-muted-foreground">
					Cette étape sera disponible prochainement.
				</p>
			</CardContent>
		</Card>
	);
}
