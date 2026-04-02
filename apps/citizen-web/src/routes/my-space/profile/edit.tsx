import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import {
	CountryCode,
	Gender,
	MaritalStatus,
	NationalityAcquisition,
} from "@convex/lib/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	AlertCircle,
	ArrowLeft,
	Briefcase,
	ChevronLeft,
	ChevronRight,
	FileText,
	Loader2,
	type LucideIcon,
	Phone,
	Save,
	User,
	Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
	PROFILE_FIELD_MAPPING,
	useFormFillEffect,
} from "@/components/ai/useFormFillEffect";
import { ContactsStep } from "@/components/registration/steps/ContactsStep";
import { DocumentsStep } from "@/components/registration/steps/DocumentsStep";
import { FamilyStep } from "@/components/registration/steps/FamilyStep";
import { IdentityStep } from "@/components/registration/steps/IdentityStep";
import { ProfessionalStep } from "@/components/registration/steps/ProfessionalStep";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { captureEvent } from "@/lib/analytics";
import {
	getChangedFields,
	transformFormDataToPayload,
} from "@/lib/profile-utils";
import { cn } from "@/lib/utils";
import {
	type ProfileFormValues,
	profileFormSchema,
} from "@/lib/validation/profile";

export const Route = createFileRoute("/my-space/profile/edit")({
	component: ProfileEditPage,
});

function ProfileEditPage() {
	const { t } = useTranslation();
	const {
		data: profile,
		isPending,
		isError,
	} = useAuthenticatedConvexQuery(api.functions.profiles.getMine, {});
	const { mutateAsync: updateProfile } = useConvexMutationQuery(
		api.functions.profiles.update,
	);

	if (isPending) {
		return (
			<div className="p-8 flex justify-center">
				<Loader2 className="animate-spin text-primary" />
			</div>
		);
	}

	if (isError || !profile)
		return <div className="p-8">{t("profile.notFound")}</div>;

	return <ProfileForm profile={profile} updateProfile={updateProfile} />;
}

interface ProfileFormProps {
	profile: Doc<"profiles">;
	updateProfile: (args: any) => Promise<any>;
}

const STEPS = [
	"personal",
	"contacts",
	"family",
	"profession",
	"documents",
] as const;
type Step = (typeof STEPS)[number];

function ProfileForm({ profile, updateProfile }: ProfileFormProps) {
	const { t } = useTranslation();
	const [currentStep, setCurrentStep] = useState<Step>("personal");

	const form = useForm<ProfileFormValues>({
		resolver: zodResolver(profileFormSchema),
		mode: "onChange",
		defaultValues: {
			countryOfResidence: profile.countryOfResidence || undefined,
			identity: {
				firstName: profile.identity?.firstName || "",
				lastName: profile.identity?.lastName || "",
				birthDate: profile.identity?.birthDate
					? new Date(profile.identity.birthDate)
					: undefined,
				birthPlace: profile.identity?.birthPlace || "",
				birthCountry: profile.identity?.birthCountry || CountryCode.GA,
				gender: profile.identity?.gender || Gender.Male,
				nationality: profile.identity?.nationality || CountryCode.GA,
				nationalityAcquisition:
					profile.identity?.nationalityAcquisition ||
					NationalityAcquisition.Birth,
			},
			passportInfo: profile.passportInfo
				? {
						number: profile.passportInfo.number || "",
						issueDate: profile.passportInfo.issueDate
							? new Date(profile.passportInfo.issueDate)
							: undefined,
						expiryDate: profile.passportInfo.expiryDate
							? new Date(profile.passportInfo.expiryDate)
							: undefined,
						issuingAuthority: profile.passportInfo.issuingAuthority || "",
					}
				: undefined,
			addresses: {
				homeland: profile.addresses?.homeland
					? {
							street: profile.addresses.homeland.street || "",
							city: profile.addresses.homeland.city || "",
							postalCode: profile.addresses.homeland.postalCode || "",
							country: profile.addresses.homeland.country || CountryCode.GA,
						}
					: { street: "", city: "", postalCode: "", country: CountryCode.GA },
				residence: profile.addresses?.residence
					? {
							street: profile.addresses.residence.street || "",
							city: profile.addresses.residence.city || "",
							postalCode: profile.addresses.residence.postalCode || "",
							country: profile.addresses.residence.country || CountryCode.FR,
						}
					: { street: "", city: "", postalCode: "", country: CountryCode.FR },
			},
			contacts: {
				email: profile.contacts?.email || "",
				phone: profile.contacts?.phone || "",
				emergencyResidence: profile.contacts?.emergencyResidence || undefined,
				emergencyHomeland: profile.contacts?.emergencyHomeland || undefined,
			},
			family: {
				maritalStatus: profile.family?.maritalStatus || MaritalStatus.Single,
				father: profile.family?.father || { firstName: "", lastName: "" },
				mother: profile.family?.mother || { firstName: "", lastName: "" },
				spouse: profile.family?.spouse || { firstName: "", lastName: "" },
			},
			profession: profile.profession
				? {
						status: profile.profession.status || undefined,
						title: profile.profession.title || "",
						employer: profile.profession.employer || "",
					}
				: { status: undefined, title: "", employer: "" },
		},
	});

	// Apply AI form fill data when available
	useFormFillEffect(form, "profile", PROFILE_FIELD_MAPPING);

	const getStepFields = (step: Step): (keyof ProfileFormValues)[] => {
		switch (step) {
			case "personal":
				return ["identity", "passportInfo"];
			case "contacts":
				return ["countryOfResidence", "addresses", "contacts"];
			case "family":
				return ["family"];
			case "profession":
				return ["profession"];
			case "documents":
				return ["documents"];
		}
	};

	const isStepValid = async (step: Step): Promise<boolean> => {
		const fields = getStepFields(step);
		const result = await form.trigger(fields as any);
		return result;
	};

	const getStepErrors = (
		errors: typeof form.formState.errors,
		step: Step,
	): Array<{ path: string; message: string; label: string }> => {
		const stepFields = getStepFields(step);
		const stepErrors: Array<{ path: string; message: string; label: string }> =
			[];

		const maritalStatus = form.getValues("family.maritalStatus");
		const requiresSpouse =
			maritalStatus &&
			[MaritalStatus.Married, MaritalStatus.CivilUnion].includes(maritalStatus);

		const getFieldLabel = (path: string): string => {
			const labelMap: Record<string, string> = {
				"identity.firstName": t("profile.fields.firstName"),
				"identity.lastName": t("profile.fields.lastName"),
				"identity.birthDate": t("profile.fields.birthDate"),
				"identity.birthPlace": t("profile.fields.birthPlace"),
				"identity.birthCountry": t("profile.fields.birthCountry"),
				"identity.gender": t("profile.fields.gender"),
				"identity.nationality": t("profile.fields.nationality"),
				"passportInfo.number": t("profile.passport.number"),
				"passportInfo.issuingAuthority": t("profile.passport.authority"),
				"passportInfo.issueDate": t("profile.passport.issueDate"),
				"passportInfo.expiryDate": t("profile.passport.expiryDate"),
				"contacts.email": t("profile.fields.email"),
				"contacts.phone": t("profile.fields.phone"),
				"family.maritalStatus": t("profile.fields.maritalStatus"),
			};
			return labelMap[path] || path;
		};

		const collectErrors = (obj: any, path: string[] = []) => {
			if (!obj) return;

			for (const [key, value] of Object.entries(obj)) {
				const currentPath = [...path, key];
				const pathString = currentPath.join(".");

				const belongsToStep = stepFields.some((field) => {
					const fieldStr = Array.isArray(field)
						? field.join(".")
						: String(field);
					return pathString.startsWith(fieldStr);
				});

				if (!belongsToStep) continue;

				if (pathString.startsWith("family.spouse") && !requiresSpouse) {
					continue;
				}

				if (value && typeof value === "object") {
					if (
						"message" in value &&
						typeof (value as any).message === "string"
					) {
						const errorMessage = (value as any).message;
						const translatedMessage = t(errorMessage, errorMessage);

						stepErrors.push({
							path: pathString,
							message: String(translatedMessage),
							label: getFieldLabel(pathString),
						});
					} else {
						collectErrors(value, currentPath);
					}
				}
			}
		};

		collectErrors(errors);
		return stepErrors;
	};

	const [showErrors, setShowErrors] = useState(false);

	const currentStepErrors = useMemo(() => {
		return getStepErrors(form.formState.errors, currentStep);
	}, [form.formState.errors, currentStep, t]);

	const saveStep = async (step: Step) => {
		const isValid = await isStepValid(step);
		if (!isValid) {
			setShowErrors(true);
			toast.error(t("profile.step.invalid"));
			return false;
		}
		setShowErrors(false);

		try {
			const data = form.getValues();
			const changedFields = getChangedFields(data, profile);
			const stepFieldsData: Partial<ProfileFormValues> = {};

			switch (step) {
				case "personal":
					if (changedFields.identity)
						stepFieldsData.identity = changedFields.identity;
					if (changedFields.passportInfo !== undefined)
						stepFieldsData.passportInfo = changedFields.passportInfo;
					break;
				case "contacts":
					if (changedFields.countryOfResidence)
						stepFieldsData.countryOfResidence =
							changedFields.countryOfResidence;
					if (changedFields.addresses)
						stepFieldsData.addresses = changedFields.addresses;
					if (changedFields.contacts)
						stepFieldsData.contacts = changedFields.contacts;
					break;
				case "family":
					if (changedFields.family)
						stepFieldsData.family = changedFields.family;
					break;
				case "profession":
					if (changedFields.profession)
						stepFieldsData.profession = changedFields.profession;
					break;
			}

			const payload = transformFormDataToPayload(stepFieldsData);

			if (Object.keys(payload).length > 0) {
				await updateProfile({
					id: profile._id,
					...payload,
				});
				captureEvent("myspace_profile_updated");
			}

			toast.success(t("common.saved"));
			return true;
		} catch (e: unknown) {
			const error = e as Error;
			console.error(error);
			toast.error(error.message || "Erreur lors de l'enregistrement");
			return false;
		}
	};

	const handleNext = () => {
		setShowErrors(false);
		const currentIndex = STEPS.indexOf(currentStep);
		if (currentIndex < STEPS.length - 1) {
			setCurrentStep(STEPS[currentIndex + 1]);
		}
	};

	const handlePrevious = () => {
		setShowErrors(false);
		const currentIndex = STEPS.indexOf(currentStep);
		if (currentIndex > 0) {
			setCurrentStep(STEPS[currentIndex - 1]);
		}
	};

	const handleStepClick = (step: Step) => {
		if (step === currentStep) return;
		setShowErrors(false);
		setCurrentStep(step);
	};

	const renderStepContent = () => {
		switch (currentStep) {
			case "personal":
				return (
					<IdentityStep control={form.control} errors={form.formState.errors} />
				);
			case "contacts":
				return (
					<ContactsStep control={form.control} errors={form.formState.errors} />
				);
			case "family":
				return (
					<FamilyStep control={form.control} errors={form.formState.errors} />
				);
			case "profession":
				return (
					<ProfessionalStep
						control={form.control}
						errors={form.formState.errors}
					/>
				);
			case "documents":
				return (
					<DocumentsStep
						profileId={profile._id}
						documents={profile.documents}
					/>
				);
		}
	};

	const stepIconsMap: Record<Step, LucideIcon> = {
		personal: User,
		contacts: Phone,
		family: Users,
		profession: Briefcase,
		documents: FileText,
	};

	const currentStepIndex = STEPS.indexOf(currentStep);

	return (
		<div className="space-y-6 pb-20 p-1">
			{/* Header with back button */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2 }}
			>
				<Button variant="ghost" size="sm" asChild className="mb-4">
					<Link to="/my-space">
						<ArrowLeft className="h-4 w-4 mr-2" />
						{t("common.back")}
					</Link>
				</Button>
				<h1 className="text-2xl font-bold">{t("profile.edit.heading")}</h1>
				<p className="text-muted-foreground text-sm mt-1">
					{t("profile.edit.subtitle")}
				</p>
			</motion.div>

			{/* Step indicators */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2 }}
				className="overflow-x-auto mb-8 -mx-4 px-4 sm:mx-0 sm:px-0"
			>
				<div className="flex items-center gap-2 sm:gap-4 min-w-max sm:min-w-0 sm:w-full">
					{STEPS.map((step, index) => {
						const Icon = stepIconsMap[step];
						const isActive = step === currentStep;

						return (
							<div key={step} className="flex items-center shrink-0 sm:flex-1">
								<button
									type="button"
									onClick={() => handleStepClick(step)}
									className={cn(
										"flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-1 p-2 sm:p-4 rounded-lg transition-all cursor-pointer",
										"min-w-[140px] sm:min-w-0",
										isActive && "bg-primary/10 border-2 border-primary",
										!isActive &&
											"border-2 border-muted hover:border-primary/30",
									)}
								>
									<div
										className={cn(
											"shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition-colors",
											isActive && "bg-primary text-primary-foreground",
											!isActive && "bg-muted text-muted-foreground",
										)}
									>
										<span>{index + 1}</span>
									</div>
									<div className="flex-1 min-w-0 text-left">
										<div className="flex items-center gap-1 sm:gap-2">
											<Icon
												className={cn(
													"h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0",
													isActive ? "text-primary" : "text-muted-foreground",
												)}
											/>
											<span
												className={cn(
													"text-xs sm:text-sm font-semibold whitespace-nowrap",
													isActive
														? "text-foreground"
														: "text-muted-foreground",
												)}
											>
												{t(`profile.tabs.${step}`)}
											</span>
										</div>
									</div>
								</button>
								{index < STEPS.length - 1 && (
									<ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground mx-1 sm:mx-2 shrink-0 hidden sm:block" />
								)}
							</div>
						);
					})}
				</div>
			</motion.div>

			{/* Step content */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2, delay: 0.1 }}
				className="space-y-6"
			>
				<FormProvider {...form}>
					<form id="profile-form">
						<div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
							{renderStepContent()}
						</div>
					</form>
				</FormProvider>

				{/* Navigation buttons */}
				<div className="space-y-4">
					<div className="flex justify-between gap-4 pt-6 border-t">
						<Button
							type="button"
							variant="outline"
							onClick={handlePrevious}
							disabled={currentStepIndex === 0}
						>
							<ChevronLeft className="mr-2 h-4 w-4" />
							{t("common.previous")}
						</Button>
						<div className="flex gap-2">
							{currentStep !== "documents" && (
								<Button
									type="button"
									variant="outline"
									onClick={() => saveStep(currentStep)}
									disabled={form.formState.isSubmitting}
								>
									{form.formState.isSubmitting && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									<Save className="mr-2 h-4 w-4" />
									{t("common.save")}
								</Button>
							)}
							{currentStepIndex < STEPS.length - 1 && (
								<Button type="button" onClick={handleNext}>
									{t("common.next")}
									<ChevronRight className="ml-1 h-4 w-4" />
								</Button>
							)}
						</div>
					</div>

					{/* Error list */}
					{(showErrors || currentStepErrors.length > 0) &&
						currentStepErrors.length > 0 && (
							<Alert variant="destructive" role="alert">
								<AlertCircle className="h-4 w-4" />
								<AlertTitle>{t("profile.errors.title")}</AlertTitle>
								<AlertDescription>
									<ul className="mt-2 ml-6 list-disc space-y-1">
										{currentStepErrors.map((error, index) => (
											<li key={index}>
												<strong>{error.label}</strong>: {error.message}
											</li>
										))}
									</ul>
								</AlertDescription>
							</Alert>
						)}
				</div>
			</motion.div>
		</div>
	);
}
