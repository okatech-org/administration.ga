"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";

export function SubmittedScreen({
	reference,
}: {
	reference?: string;
	onRestart?: () => void;
}) {
	const router = useRouter();
	return (
		<div className="mx-auto flex w-full max-w-md flex-col items-center gap-5 px-6 py-12 text-center md:py-20">
			<div className="flex size-[72px] items-center justify-center rounded-full bg-gabon-green-tint text-gabon-green">
				<Check className="size-9" strokeWidth={2.5} />
			</div>
			<div className="flex flex-col gap-2">
				<h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
					Dossier soumis
				</h1>
				<p className="text-sm text-muted-foreground">
					Votre dossier a été transmis au service consulaire. Vous recevrez une
					notification par email dès qu'il sera traité.
				</p>
			</div>

			{reference && (
				<Card className="w-full text-left">
					<CardContent className="flex flex-col gap-2 p-5">
						<p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
							Référence du dossier
						</p>
						<p className="font-mono text-xl font-semibold tabular-nums">
							{reference}
						</p>
						<p className="text-xs text-muted-foreground">
							Conservez cette référence pour suivre l'avancement de votre
							demande dans votre espace personnel.
						</p>
					</CardContent>
				</Card>
			)}

			<Button
				type="button"
				className="h-11 w-full bg-gabon-blue text-white hover:bg-gabon-blue-deep"
				onClick={() => router.push("/my-space")}
			>
				Accéder à mon espace
				<ArrowRight className="ml-1 size-4" />
			</Button>
		</div>
	);
}
