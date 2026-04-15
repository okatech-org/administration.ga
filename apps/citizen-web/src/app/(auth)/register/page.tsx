"use client";

import { PublicUserType } from "@convex/lib/constants";
import { useRouter, useSearchParams } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CitizenRegistrationForm } from "@/components/auth/CitizenRegistrationForm";
import { ForeignerRegistrationForm } from "@/components/auth/ForeignerRegistrationForm";
import { ProfileTypeSelector } from "@/components/auth/ProfileTypeSelector";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";

const VALID_TYPES = [
	PublicUserType.LongStay,
	PublicUserType.ShortStay,
	PublicUserType.VisaTourism,
	PublicUserType.VisaBusiness,
	PublicUserType.VisaLongStay,
	PublicUserType.AdminServices,
] as const;

const VALID_MODES = ["sign-up", "sign-in"] as const;

export default function RegisterPage() {
	return (
		<Suspense fallback={null}>
			<RegisterPageContent />
		</Suspense>
	);
}

function RegisterPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { t } = useTranslation();
	const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();

	// Parse search params manually (replaces Route.useSearch())
	const urlTypeRaw = searchParams.get("type");
	const urlType = VALID_TYPES.includes(urlTypeRaw as any)
		? (urlTypeRaw as PublicUserType)
		: undefined;
	const urlModeRaw = searchParams.get("mode");
	const urlMode = (VALID_MODES as readonly string[]).includes(urlModeRaw ?? "")
		? (urlModeRaw as "sign-up" | "sign-in")
		: undefined;

	// Selected profile type (from URL or user selection)
	const [selectedType, setSelectedType] = useState<PublicUserType | null>(
		urlType || null,
	);

	// Sync URL param to state
	useEffect(() => {
		if (urlType) {
			setSelectedType(urlType);
		}
	}, [urlType]);

	// Auth guard: redirect to sign-up if not authenticated and a type is selected
	useEffect(() => {
		if (!isAuthLoading && !isAuthenticated && selectedType) {
			const redirectUrl = `/register?type=${selectedType}`;
			window.location.href = `/sign-up?redirect=${encodeURIComponent(redirectUrl)}`;
		}
	}, [isAuthLoading, isAuthenticated, selectedType]);

	const handleProfileSelect = (type: PublicUserType) => {
		setSelectedType(type);
		router.replace(`/register?type=${type}`);
	};

	const handleComplete = () => {
		router.push("/my-space");
	};

	const handleBack = () => {
		setSelectedType(null);
		router.replace("/register");
	};

	// Determine user type category
	const isForeigner =
		selectedType &&
		[
			PublicUserType.VisaTourism,
			PublicUserType.VisaBusiness,
			PublicUserType.VisaLongStay,
			PublicUserType.AdminServices,
		].includes(selectedType);

	const isCitizen =
		selectedType &&
		[PublicUserType.LongStay, PublicUserType.ShortStay].includes(selectedType);

	return (
		<div className="flex flex-col min-h-dvh">
			<Header />
			<main className="flex-1 py-4 px-0 sm:py-8 sm:px-4">
				{/* Step 0: Profile selection (always shown first if no type selected) */}
				{!selectedType && (
					<div className="flex items-center justify-center min-h-[calc(100vh-300px)] px-3 sm:px-0">
						<ProfileTypeSelector onSelect={handleProfileSelect} />
					</div>
				)}

				{/* Citizen Registration Form */}
				{isCitizen && isAuthenticated && (
					<div className="register-forms max-w-4xl mx-auto px-3 sm:px-0">
						<button
							onClick={handleBack}
							className="mb-4 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
						>
							{t("register.backToProfile")}
						</button>
						<CitizenRegistrationForm
							userType={
								selectedType as PublicUserType.LongStay | PublicUserType.ShortStay
							}
							authMode={urlMode || "sign-up"}
							onComplete={handleComplete}
						/>
					</div>
				)}

				{/* Foreigner Registration Form */}
				{isForeigner && isAuthenticated && (
					<div className="register-forms max-w-4xl mx-auto px-3 sm:px-0">
						<button
							onClick={handleBack}
							className="mb-4 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
						>
							{t("register.backToProfile")}
						</button>
						<ForeignerRegistrationForm
							initialVisaType={selectedType}
							onComplete={handleComplete}
						/>
					</div>
				)}

				<div className="mt-12">
					<Footer />
				</div>
			</main>
		</div>
	);
}
