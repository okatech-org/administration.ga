import { PublicUserType } from "@convex/lib/constants";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { CitizenRegistrationForm } from "@/components/auth/CitizenRegistrationForm";
import { ForeignerRegistrationForm } from "@/components/auth/ForeignerRegistrationForm";
import { ProfileTypeSelector } from "@/components/auth/ProfileTypeSelector";

const registerSearchSchema = z.object({
	type: z
		.enum([
			PublicUserType.LongStay,
			PublicUserType.ShortStay,
			PublicUserType.VisaTourism,
			PublicUserType.VisaBusiness,
			PublicUserType.VisaLongStay,
			PublicUserType.AdminServices,
		])
		.optional(),
	mode: z.enum(["sign-up", "sign-in"]).optional(),
});

export const Route = createFileRoute("/register/")({
	component: RegisterPage,
	validateSearch: (search) => registerSearchSchema.parse(search),
});

function RegisterPage() {
	const navigate = useNavigate();
	const { t } = useTranslation();
	const { type: urlType, mode: urlMode } = Route.useSearch();
	const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();

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
		navigate({
			to: "/register",
			search: { type },
			replace: true,
		});
	};

	const handleComplete = () => {
		navigate({ to: "/my-space" });
	};

	const handleBack = () => {
		setSelectedType(null);
		navigate({
			to: "/register",
			search: {},
			replace: true,
		});
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
		<div className="min-h-[calc(100vh-200px)] py-4 px-3 sm:py-8 sm:px-4 bg-gradient-to-br from-background via-background to-muted/30">
			{/* Background decoration */}
			<div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
				<div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
				<div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
			</div>

			{/* Step 0: Profile selection (always shown first if no type selected) */}
			{!selectedType && (
				<div className="flex items-center justify-center min-h-[calc(100vh-300px)]">
					<ProfileTypeSelector onSelect={handleProfileSelect} />
				</div>
			)}

			{/* Citizen Registration Form */}
			{isCitizen && isAuthenticated && (
				<div className="max-w-4xl mx-auto">
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
				<div className="max-w-4xl mx-auto">
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
		</div>
	);
}
