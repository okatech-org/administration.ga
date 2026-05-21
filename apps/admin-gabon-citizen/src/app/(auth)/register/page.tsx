"use client";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { Suspense } from "react";

export default function RegisterPage() {
	return (
		<Suspense fallback={null}>
			<OnboardingShell />
		</Suspense>
	);
}
