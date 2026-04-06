"use client";

import type { Doc, Id } from "@convex/_generated/dataModel";
import { DetailedDocumentType } from "@convex/lib/constants";
import { getLocalized } from "@convex/lib/utils";
import type { FormDocument } from "@convex/lib/validators";
import { AnimatePresence, motion } from "motion/react";
import {
	ArrowLeft,
	ArrowRight,
	Check,
	CheckCircle2,
	FileText,
	Loader2,
	User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DocumentField } from "@/components/documents/DocumentField";
import { ProfileVerificationStep } from "@/components/services/ProfileVerificationStep";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn, scrollToTop } from "@/lib/utils";

interface RegistrationFormProps {
	/** User profile */
	profile: Doc<"profiles">;
	/** Required documents for registration */
	requiredDocuments: FormDocument[];
	/** Submit handler */
	onSubmit: () => Promise<void>;
	/** Is submission in progress */
	isSubmitting?: boolean;
	/** Type of request to track in analytics */
	requestType?: string;
}

// Map profile document keys to document types
const PROFILE_DOC_TO_TYPE: Record<string, DetailedDocumentType> = {
	passport: DetailedDocumentType.Passport,
	identityPhoto: DetailedDocumentType.IdentityPhoto,
	proofOfAddress: DetailedDocumentType.ProofOfAddress,
	birthCertificate: DetailedDocumentType.BirthCertificate,
	proofOfResidency: DetailedDocumentType.ResidencePermit,
};

// Registration steps
type RegistrationStep = "profile" | "documents" | "confirmation";

const STEPS: RegistrationStep[] = ["profile", "documents", "confirmation"];

export function RegistrationForm({
	profile,
	requiredDocuments,
	onSubmit,
	isSubmitting = false,
	requestType,
}: RegistrationFormProps) {
	const { i18n, t } = useTranslation();
	const lang = i18n.language;
	const [currentStep, setCurrentStep] = useState(0);
	const [profileVerified, setProfileVerified] = useState(false);

	// Calculate documents from profile
	const documentsStatus = useMemo(() => {
		const profileDocs = profile.documents ?? {};
		const required = requiredDocuments.filter((d) => d.required);
		const optional = requiredDocuments.filter((d) => !d.required);

		// Map profile docs to provided list
		const providedDocs = new Set<string>();
		for (const [key, docId] of Object.entries(profileDocs)) {
			if (docId && PROFILE_DOC_TO_TYPE[key]) {
				providedDocs.add(PROFILE_DOC_TO_TYPE[key]);
			}
		}

		const missingRequired = required.filter((d) => !providedDocs.has(d.type));
		const missingOptional = optional.filter((d) => !providedDocs.has(d.type));
		const allRequiredProvided = missingRequired.length === 0;

		return {
			providedDocs,
			missingRequired,
			missingOptional,
			allRequiredProvided,
			total: requiredDocuments.length,
			provided: providedDocs.size,
		};
	}, [profile.documents, requiredDocuments]);

	// Navigation handlers
	const handleNext = () => {
		if (currentStep < STEPS.length - 1) {
			setCurrentStep((prev) => prev + 1);
		}
	};

	const handleBack = () => {
		if (currentStep > 0) {
			setCurrentStep((prev) => prev - 1);
		}
	};

	const handleSubmit = async () => {
		await onSubmit();
	};

	const currentStepName = STEPS[currentStep];

	useEffect(() => {
		scrollToTop();
	}, [currentStep]);

	// Can proceed to next step
	const canProceed = useMemo(() => {
		switch (currentStepName) {
			case "profile":
				return profileVerified;
			case "documents":
				return documentsStatus.allRequiredProvided;
			case "confirmation":
				return true;
			default:
				return false;
		}
	}, [currentStepName, profileVerified, documentsStatus.allRequiredProvided]);

	return (
		<Card className="w-full">
			{/* Step Indicator */}
			<CardHeader className="border-b pb-4">
				<div className="flex items-center justify-between mb-4">
					{STEPS.map((step, index) => (
						<div key={step} className="flex items-center">
							<div
								className={cn(
									"flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
									index < currentStep
										? "bg-primary border-primary text-primary-foreground"
										: index === currentStep
											? "border-primary text-primary"
											: "border-muted-foreground/30 text-muted-foreground",
								)}
							>
								{index < currentStep ? (
									<Check className="h-4 w-4" />
								) : (
									<span className="text-sm font-medium">{index + 1}</span>
								)}
							</div>
							{index < STEPS.length - 1 && (
								<div
									className={cn(
										"w-12 md:w-24 h-0.5 mx-2",
										index < currentStep
											? "bg-primary"
											: "bg-muted-foreground/20",
									)}
								/>
							)}
						</div>
					))}
				</div>
				<CardTitle className="text-lg">
					{currentStepName === "profile" && t("registration.step.profile")}
					{currentStepName === "documents" && t("registration.step.documents")}
					{currentStepName === "confirmation" &&
						t("registration.step.confirmation")}
				</CardTitle>
				<CardDescription>
					{currentStepName === "profile" &&
						t(
							"registration.step.profileDesc",
							"Vérifiez que vos informations sont à jour",
						)}
					{currentStepName === "documents" &&
						t(
							"registration.step.documentsDesc",
							"Téléchargez les documents requis pour votre inscription",
						)}
					{currentStepName === "confirmation" &&
						t(
							"registration.step.confirmationDesc",
							"Vérifiez vos informations avant de soumettre",
						)}
				</CardDescription>
			</CardHeader>

			<CardContent className="pt-6">
				<AnimatePresence mode="wait">
					<motion.div
						key={currentStepName}
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: -20 }}
						transition={{ duration: 0.2 }}
					>
						{/* Profile Verification Step */}
						{currentStepName === "profile" && (
							<ProfileVerificationStep
								profile={profile}
								onComplete={() => setProfileVerified(true)}
							/>
						)}

						{/* Documents Step */}
						{currentStepName === "documents" && (
							<div className="space-y-4">
								{/* Required documents */}
								{requiredDocuments
									.filter((d) => d.required)
									.map((doc) => {
										const profileKey = Object.entries(PROFILE_DOC_TO_TYPE).find(
											([_, type]) => type === doc.type,
										)?.[0];
										const existingDocId = profileKey
											? (profile.documents?.[
													profileKey as keyof typeof profile.documents
												] as Id<"documents"> | undefined)
											: undefined;

										return (
											<DocumentField
												key={doc.type}

												documentKey={
													profileKey as
														| "passport"
														| "identityPhoto"
														| "proofOfAddress"
														| "birthCertificate"
														| "proofOfResidency"
												}
												documentId={existingDocId}
												label={getLocalized(doc.label, lang)}
												description={
													doc.required ? t("required") : t("optional")
												}
												requestType={requestType}
											/>
										);
									})}

								{/* Optional documents */}
								{requiredDocuments.filter((d) => !d.required).length > 0 && (
									<>
										<div className="relative my-6">
											<div className="absolute inset-0 flex items-center">
												<div className="w-full border-t" />
											</div>
											<div className="relative flex justify-center text-xs uppercase">
												<span className="bg-background px-2 text-muted-foreground">
													{t("optional_documents")}
												</span>
											</div>
										</div>

										{requiredDocuments
											.filter((d) => !d.required)
											.map((doc) => {
												const profileKey = Object.entries(
													PROFILE_DOC_TO_TYPE,
												).find(([_, type]) => type === doc.type)?.[0];
												const existingDocId = profileKey
													? (profile.documents?.[
															profileKey as keyof typeof profile.documents
														] as Id<"documents"> | undefined)
													: undefined;

												return (
													<DocumentField
														key={doc.type}

														documentKey={
															profileKey as
																| "passport"
																| "identityPhoto"
																| "proofOfAddress"
																| "birthCertificate"
																| "proofOfResidency"
														}
														documentId={existingDocId}
														label={getLocalized(doc.label, lang)}
														description={t("optional")}
														requestType={requestType}
													/>
												);
											})}
									</>
								)}

								{/* Status summary */}
								<div className="mt-6 p-4 rounded-lg bg-muted">
									<div className="flex items-center gap-2 text-sm">
										{documentsStatus.allRequiredProvided ? (
											<>
												<CheckCircle2 className="h-4 w-4 text-green-500" />
												<span className="text-green-700 dark:text-green-400">
													{t(
														"registration.all_required_docs",
														"Tous les documents requis sont fournis",
													)}
												</span>
											</>
										) : (
											<>
												<FileText className="h-4 w-4 text-amber-500" />
												<span className="text-amber-700 dark:text-amber-400">
													{t(
														"registration.missing_docs",
														"{{count}} document(s) requis manquant(s)",
														{ count: documentsStatus.missingRequired.length },
													)}
												</span>
											</>
										)}
									</div>
								</div>
							</div>
						)}

						{/* Confirmation Step */}
						{currentStepName === "confirmation" && (
							<div className="space-y-6">
								{/* Profile Summary */}
								<div className="p-4 rounded-lg border">
									<div className="flex items-center gap-2 mb-3">
										<User className="h-4 w-4 text-primary" />
										<h4 className="font-medium">
											{t(
												"registration.profile_summary",
												"Informations personnelles",
											)}
										</h4>
									</div>
									<dl className="grid grid-cols-2 gap-2 text-sm">
										<dt className="text-muted-foreground">{t("name")}</dt>
										<dd>
											{profile.identity?.lastName} {profile.identity?.firstName}
										</dd>
										<dt className="text-muted-foreground">{t("email")}</dt>
										<dd>{profile.contacts?.email}</dd>
										<dt className="text-muted-foreground">
											{t("nationality")}
										</dt>
										<dd>{profile.identity?.nationality}</dd>
									</dl>
								</div>

								{/* Documents Summary */}
								<div className="p-4 rounded-lg border">
									<div className="flex items-center gap-2 mb-3">
										<FileText className="h-4 w-4 text-primary" />
										<h4 className="font-medium">
											{t("registration.documents_summary")}
										</h4>
									</div>
									<ul className="space-y-1 text-sm">
										{requiredDocuments.map((doc) => {
											const profileKey = Object.entries(
												PROFILE_DOC_TO_TYPE,
											).find(([_, type]) => type === doc.type)?.[0];
											const hasDoc = profileKey
												? !!profile.documents?.[
														profileKey as keyof typeof profile.documents
													]
												: false;

											return (
												<li key={doc.type} className="flex items-center gap-2">
													{hasDoc ? (
														<CheckCircle2 className="h-3 w-3 text-green-500" />
													) : (
														<div className="h-3 w-3 rounded-full border" />
													)}
													<span
														className={cn(
															hasDoc
																? "text-foreground"
																: "text-muted-foreground",
														)}
													>
														{getLocalized(doc.label, lang)}
													</span>
													{doc.required && !hasDoc && (
														<span className="text-xs text-destructive">
															({t("required")})
														</span>
													)}
												</li>
											);
										})}
									</ul>
								</div>

								{/* Submit notice */}
								<div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
									<p className="text-sm text-muted-foreground">
										{t(
											"registration.submit_notice",
											"En soumettant cette demande, vous confirmez que les informations fournies sont exactes et que vous acceptez les conditions d'inscription consulaire.",
										)}
									</p>
								</div>
							</div>
						)}
					</motion.div>
				</AnimatePresence>
			</CardContent>

			{/* Navigation Footer */}
			<CardFooter className="border-t pt-4 flex justify-between">
				<Button
					variant="outline"
					onClick={handleBack}
					disabled={currentStep === 0 || isSubmitting}
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					{t("back")}
				</Button>

				{currentStepName === "confirmation" ? (
					<Button
						onClick={handleSubmit}
						disabled={isSubmitting || !documentsStatus.allRequiredProvided}
					>
						{isSubmitting ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<Check className="mr-2 h-4 w-4" />
						)}
						{t("submit")}
					</Button>
				) : (
					<Button onClick={handleNext} disabled={!canProceed || isSubmitting}>
						{t("next")}
						<ArrowRight className="ml-1 h-4 w-4" />
					</Button>
				)}
			</CardFooter>
		</Card>
	);
}
