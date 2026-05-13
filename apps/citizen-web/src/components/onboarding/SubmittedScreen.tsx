"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

export function SubmittedScreen({
	reference,
}: {
	reference?: string;
	onRestart?: () => void;
}) {
	const router = useRouter();
	const { t } = useTranslation();
	return (
		<div className="mx-auto flex w-full max-w-md flex-col items-center gap-5 px-6 py-12 text-center md:py-20">
			<div className="flex size-[72px] items-center justify-center rounded-full bg-gabon-green-tint text-gabon-green">
				<Check className="size-9" strokeWidth={2.5} />
			</div>
			<div className="flex flex-col gap-2">
				<h1
					className="text-2xl font-semibold tracking-tight md:text-3xl"
					suppressHydrationWarning
				>
					{t("onboarding.submitted.title")}
				</h1>
				<p className="text-sm text-muted-foreground" suppressHydrationWarning>
					{t("onboarding.submitted.description")}
				</p>
			</div>

			{reference && (
				<Card className="w-full text-left">
					<CardContent className="flex flex-col gap-2 p-5">
						<p
							className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground"
							suppressHydrationWarning
						>
							{t("onboarding.submitted.refLabel")}
						</p>
						<p className="font-mono text-xl font-semibold tabular-nums">
							{reference}
						</p>
						<p className="text-xs text-muted-foreground" suppressHydrationWarning>
							{t("onboarding.submitted.refHelp")}
						</p>
					</CardContent>
				</Card>
			)}

			<Button
				type="button"
				className="h-11 w-full bg-gabon-blue text-white hover:bg-gabon-blue-deep"
				onClick={() => router.push("/my-space")}
			>
				<span suppressHydrationWarning>{t("onboarding.submitted.cta")}</span>
				<ArrowRight className="ml-1 size-4" />
			</Button>
		</div>
	);
}
