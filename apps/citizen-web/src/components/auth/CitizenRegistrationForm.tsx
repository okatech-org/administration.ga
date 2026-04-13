/**
 * CitizenRegistrationForm - Functional Multi-Step Registration
 * Based on Consul Accords GabonaisRegistrationForm pattern
 * Uses React Hook Form with Zod validation and localized error messages
 */

import { api } from "@convex/_generated/api";
import {
	CountryCode,
	// DetailedDocumentType and DocumentTypeCategory now come from registrationConfig
	Gender,
	MaritalStatus,
	NationalityAcquisition,
	PublicUserType,
	WorkStatus,
} from "@convex/lib/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import { useConvexAuth, useMutation } from "convex/react";
import {
	AlertTriangle,
	ArrowRight,
	Briefcase,
	Building2,
	CheckCircle2,
	Eye,
	FileText,
	Info,
	Loader2,
	MapPin,
	Plus,
	Sparkles,
	Trash2,
	User,
	UserPlus,
	Users,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Controller, FormProvider, useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { DocumentUploadZone } from "@/components/documents/DocumentUploadZone";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import { CountrySelect } from "@/components/ui/country-select";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { useCitizenData } from "@/hooks/use-citizen-data";
import { useRegistrationStorage } from "@/hooks/useRegistrationStorage";
import {
	useConvexActionQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { captureEvent } from "@/lib/analytics";
import { scrollToTop } from "@/lib/utils";
import {
	getRegistrationConfig,
	type RegistrationConfig,
	type RegistrationStepId,
} from "@/lib/registrationConfig";
import { AddressWithAutocomplete } from "./AddressWithAutocomplete";

// ============================================================================
// VALIDATION SCHEMA (dynamic per userType)
// ============================================================================

function buildRegistrationSchema(config: RegistrationConfig) {
	const hasFamily = config.steps.some((s) => s.id === "family");
	const hasProfession = config.steps.some((s) => s.id === "profession");

	return z.object({
		// Documents (always optional at schema level — checked by step logic)
		documents: z
			.object({
				identityPhoto: z.string().optional(),
				passport: z.string().optional(),
				birthCertificate: z.string().optional(),
				addressProof: z.string().optional(),
			})
			.optional(),

		// Basic Info (always present)
		basicInfo: z.object({
			firstName: z.string().min(2, { message: "errors.field.firstName.min" }),
			lastName: z.string().min(2, { message: "errors.field.lastName.min" }),
			nip: z.string().optional(),
			gender: z.enum(Gender).or(z.literal("")).optional(),
			birthDate: z
				.string()
				.min(1, { message: "errors.field.birthDate.required" })
				.optional(),
			birthPlace: z
				.string()
				.min(2, { message: "errors.field.birthPlace.min" })
				.optional(),
			birthCountry: z.enum(CountryCode).or(z.literal("")).optional(),
			nationality: z.enum(CountryCode).or(z.literal("")).optional(),
			nationalityAcquisition: z
				.enum(NationalityAcquisition)
				.or(z.literal(""))
				.optional(),
			// Passport info
			passportNumber: z.string().optional(),
			passportIssueDate: z.string().optional(),
			passportExpiryDate: z.string().optional(),
			passportIssuingAuthority: z.string().optional(),
		}),

		// Family (only if step exists)
		...(hasFamily
			? {
					familyInfo: z.object({
						maritalStatus: z.enum(MaritalStatus).or(z.literal("")).optional(),
						fatherFirstName: z.string().optional(),
						fatherLastName: z.string().optional(),
						motherFirstName: z.string().optional(),
						motherLastName: z.string().optional(),
						spouseFirstName: z.string().optional(),
						spouseLastName: z.string().optional(),
					}),
				}
			: {}),

		// Contacts (always present)
		contactInfo: z.object({
			email: z.email().optional().or(z.literal("")),
			phone: z.string().optional(),
			// Residence address
			street: z
				.string()
				.min(3, { message: "errors.field.address.street.min" })
				.optional(),
			city: z
				.string()
				.min(2, { message: "errors.field.address.city.min" })
				.optional(),
			postalCode: z.string().optional(),
			country: z.enum(CountryCode).or(z.literal("")).optional(),
			// Homeland address
			homelandStreet: z.string().optional(),
			homelandCity: z.string().optional(),
			homelandPostalCode: z.string().optional(),
			homelandCountry: z.enum(CountryCode).or(z.literal("")).optional(),
			// Emergency contacts — dynamic list
			emergencyContacts: z
				.array(
					z.object({
						firstName: z
							.string({ message: "errors.field.required" })
							.min(1, { message: "errors.field.required" }),
						lastName: z
							.string({ message: "errors.field.required" })
							.min(1, { message: "errors.field.required" }),
						phone: z
							.string({ message: "errors.field.required" })
							.min(1, { message: "errors.field.required" }),
						email: z.email().optional().or(z.literal("")),
						country: z.enum(CountryCode).or(z.literal("")).optional(),
					}),
				)
				.min(1, { message: "errors.profile.contacts.emergency.atLeastOne" }),
		}),

		// Professional (only if step exists)
		...(hasProfession
			? {
					professionalInfo: z.object({
						workStatus: z.enum(WorkStatus).or(z.literal("")).optional(),
						employer: z.string().optional(),
						profession: z.string().optional(),
					}),
				}
			: {}),

		// Terms (always present)
		acceptTerms: z.boolean().refine((val) => val === true, {
			message: "errors.field.terms.required",
		}),
	});
}

// Use a union type so form values always include all possible keys
type RegistrationFormValues = {
	documents?: {
		identityPhoto?: string;
		passport?: string;
		birthCertificate?: string;
		addressProof?: string;
	};
	basicInfo: {
		firstName: string;
		lastName: string;
		nip?: string;
		gender?: (typeof Gender)[keyof typeof Gender];
		birthDate?: string;
		birthPlace?: string;
		birthCountry?: (typeof CountryCode)[keyof typeof CountryCode];
		nationality?: (typeof CountryCode)[keyof typeof CountryCode];
		nationalityAcquisition?: string;
		passportNumber?: string;
		passportIssueDate?: string;
		passportExpiryDate?: string;
		passportIssuingAuthority?: string;
	};
	familyInfo?: {
		maritalStatus?: (typeof MaritalStatus)[keyof typeof MaritalStatus];
		fatherFirstName?: string;
		fatherLastName?: string;
		motherFirstName?: string;
		motherLastName?: string;
		spouseFirstName?: string;
		spouseLastName?: string;
	};
	contactInfo: {
		email?: string;
		phone?: string;
		street?: string;
		city?: string;
		postalCode?: string;
		country?: (typeof CountryCode)[keyof typeof CountryCode];
		homelandStreet?: string;
		homelandCity?: string;
		homelandPostalCode?: string;
		homelandCountry?: (typeof CountryCode)[keyof typeof CountryCode];
		emergencyContacts: Array<{
			firstName: string;
			lastName: string;
			phone: string;
			email?: string;
			country?: string;
		}>;
	};
	professionalInfo?: {
		workStatus?: string;
		employer?: string;
		profession?: string;
	};
	acceptTerms: boolean;
};

// Icon map for dynamic steps
const STEP_ICON_MAP: Record<
	string,
	React.ComponentType<{ className?: string }>
> = {
	UserPlus,
	FileText,
	User,
	Users,
	MapPin,
	Briefcase,
	Eye,
};

// ============================================================================
// EMERGENCY CONTACTS SECTION (used in contacts step)
// ============================================================================

function EmergencyContactsSection({
	form,
	t,
}: {
	form: ReturnType<typeof useForm<RegistrationFormValues>>;
	t: ReturnType<typeof useTranslation>["t"];
}) {
	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "contactInfo.emergencyContacts",
	});

	return (
		<div className="space-y-4">
			<FieldLegend className="text-red-800 dark:text-red-200">
				{t("profile.sections.emergencyContacts")}
			</FieldLegend>

			{/* Recommendation */}
			<div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
				<Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
				<p className="text-xs text-blue-800 dark:text-blue-200">
					{t("profile.emergencyContacts.recommendation")}
				</p>
			</div>

			{fields.map((field, index) => (
				<FieldSet
					key={field.id}
					className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-100 dark:border-red-900 relative"
				>
					<FieldLegend className="text-red-800 dark:text-red-200">
						{t("profile.emergencyContacts.contactNumber", {
							number: index + 1,
						})}
					</FieldLegend>
					{fields.length > 1 && (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="absolute top-2 right-2 text-destructive hover:text-destructive h-7 w-7"
							onClick={() => remove(index)}
						>
							<Trash2 className="h-3.5 w-3.5" />
						</Button>
					)}

					{/* Country */}
					<div className="mt-2 mb-3">
						<Controller
							name={`contactInfo.emergencyContacts.${index}.country`}
							control={form.control}
							render={({ field: f }) => (
								<Field>
									<FieldLabel>
										{t("profile.emergencyContacts.country")}
									</FieldLabel>
									<CountrySelect
										type="single"
										selected={f.value as any}
										onChange={f.onChange as any}
									/>
								</Field>
							)}
						/>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<Controller
							name={`contactInfo.emergencyContacts.${index}.lastName`}
							control={form.control}
							render={({ field: f, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>
										{t("common.lastName")}{" "}
										<span className="text-destructive">*</span>
									</FieldLabel>
									<Input placeholder={t("common.lastName")} {...f} />
									<FieldError errors={[fieldState.error]} />
								</Field>
							)}
						/>
						<Controller
							name={`contactInfo.emergencyContacts.${index}.firstName`}
							control={form.control}
							render={({ field: f, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>
										{t("common.firstName")}{" "}
										<span className="text-destructive">*</span>
									</FieldLabel>
									<Input placeholder={t("common.firstName")} {...f} />
									<FieldError errors={[fieldState.error]} />
								</Field>
							)}
						/>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
						<Controller
							name={`contactInfo.emergencyContacts.${index}.phone`}
							control={form.control}
							render={({ field: f, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>
										{t("profile.fields.phone")}{" "}
										<span className="text-destructive">*</span>
									</FieldLabel>
									<Input placeholder="+33..." {...f} />
									<FieldError errors={[fieldState.error]} />
								</Field>
							)}
						/>
						<Controller
							name={`contactInfo.emergencyContacts.${index}.email`}
							control={form.control}
							render={({ field: f }) => (
								<Field>
									<FieldLabel>{t("profile.fields.email")}</FieldLabel>
									<Input
										type="email"
										placeholder="email@example.com"
										{...f}
									/>
								</Field>
							)}
						/>
					</div>
				</FieldSet>
			))}

			<Button
				type="button"
				variant="outline"
				size="sm"
				className="w-full"
				onClick={() =>
					append({
						firstName: "",
						lastName: "",
						phone: "",
						email: "",
						country: "",
					})
				}
			>
				<Plus className="h-4 w-4 mr-2" />
				{t("profile.emergencyContacts.add")}
			</Button>
		</div>
	);
}

// ============================================================================
// COMPONENT
// ============================================================================

interface CitizenRegistrationFormProps {
	userType: PublicUserType.LongStay | PublicUserType.ShortStay;
	authMode?: "sign-up" | "sign-in";
	onComplete?: () => void;
}

export function CitizenRegistrationForm({
	userType,
	authMode: _authMode = "sign-up",
	onComplete,
}: CitizenRegistrationFormProps) {
	const { t } = useTranslation();
	const { isLoading: isAuthLoading } = useConvexAuth();
	const { userData } = useCitizenData();
	const { mutateAsync: createProfile } = useConvexMutationQuery(
		api.functions.profiles.createFromRegistration,
	);
	const { mutateAsync: submitRequest } = useConvexMutationQuery(
		api.functions.profiles.submitRegistrationRequest,
	);

	// Convex mutations for deferred upload
	const generateUploadUrl = useMutation(
		api.functions.documents.generateUploadUrl,
	);
	const createDocument = useMutation(api.functions.documents.create);

	// Registration config driven by userType
	const regConfig = getRegistrationConfig(userType);
	const hasFamily = regConfig.steps.some((s) => s.id === "family");
	const hasProfession = regConfig.steps.some((s) => s.id === "profession");
	const showResidenceAddress = regConfig.visibleSections.residenceAddress;
	const registrationSchema = buildRegistrationSchema(regConfig);

	// Local persistence (IndexedDB + localStorage)
	const userEmail = userData?.email;
	const regStorage = useRegistrationStorage(userEmail);

	// Local file state for DocumentUploadZone (localOnly mode)
	// Initialize from config documents
	const [localFileInfos, setLocalFileInfos] = useState<
		Record<string, { filename: string; mimeType: string } | null>
	>(() => {
		const initial: Record<
			string,
			{ filename: string; mimeType: string } | null
		> = {};
		for (const doc of regConfig.documents) {
			initial[doc.key] = null;
		}
		return initial;
	});

	// Track inline document validation errors
	const [docErrors, setDocErrors] = useState<Record<string, string | null>>({});

	// Step index — 0 = first form step from config (documents)
	const [step, setStep] = useState(0);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isScanning, setIsScanning] = useState(false);
	const [formRestored, setFormRestored] = useState(false);

	const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	// Submission progress state
	type SubmissionState =
		| "idle"
		| "uploading_documents"
		| "creating_profile"
		| "finding_org"
		| "submitting_request"
		| "success"
		| "no_org_found"
		| "error";
	const [submissionState, setSubmissionState] =
		useState<SubmissionState>("idle");
	const [submissionResult, setSubmissionResult] = useState<{
		orgName?: string;
		reference?: string;
		country?: string;
	} | null>(null);

	// AI document extraction (base64 variant for local files)
	const { mutateAsync: extractDataFromImages } = useConvexActionQuery(
		api.ai.documentExtraction.extractRegistrationDataFromImages,
	);

	// Initialize form with dynamic schema
	const form = useForm<RegistrationFormValues>({
		resolver: zodResolver(registrationSchema as any),
		mode: "onChange",
		defaultValues: {
			documents: {},
			basicInfo: {
				firstName: "",
				lastName: "",
				birthCountry: CountryCode.GA,
				nationality: CountryCode.GA,
				nationalityAcquisition: NationalityAcquisition.Birth,
			},
			...(hasFamily
				? { familyInfo: { maritalStatus: MaritalStatus.Single } }
				: {}),
			contactInfo: {
				email: userData?.email || "",
				phone: userData?.phone || "",
				country: CountryCode.FR,
				emergencyContacts: [
					{ firstName: "", lastName: "", phone: "", email: "", country: "" },
				],
			},
			...(hasProfession
				? {
						professionalInfo: {
							workStatus: WorkStatus.Unemployed,
						},
					}
				: {}),
			acceptTerms: false,
		},
	});

	const showPartnerFields =
		form.watch("familyInfo.maritalStatus") === MaritalStatus.Married ||
		form.watch("familyInfo.maritalStatus") === MaritalStatus.CivilUnion ||
		form.watch("familyInfo.maritalStatus") === MaritalStatus.Cohabiting;

	const showProfessionFields = ![
		WorkStatus.Unemployed,
		WorkStatus.Student,
		WorkStatus.Retired,
		WorkStatus.Entrepreneur,
	].includes(form.watch("professionalInfo.workStatus") as WorkStatus);

	// Track registration start on mount
	useEffect(() => {
		captureEvent("registration_started");
	}, []);

	// Dynamic steps from config
	const steps = regConfig.steps.map((s, index) => ({
		id: index,
		stepId: s.id,
		label: t(s.labelKey, s.labelFallback),
		icon: STEP_ICON_MAP[s.icon] || User,
	}));

	const currentStepId = steps[step]?.stepId;
	const lastStepIndex = steps.length - 1;

	// Auto-save debounce (must be after steps and form declarations)
	const handleAutoSave = useCallback(() => {
		if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
		autoSaveTimerRef.current = setTimeout(() => {
			const stepId = steps[step]?.stepId;
			if (stepId && stepId !== "documents" && stepId !== "review") {
				regStorage.saveFormSnapshot(step, form.getValues());
			}
		}, 1000);
	}, [step, steps, form, regStorage]);

	useEffect(() => {
		scrollToTop();
		const currentStepInfo = steps[step];
		if (currentStepInfo?.stepId) {
			captureEvent("registration_step_viewed", {
				step_name: currentStepInfo.stepId,
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [step]);

	// Map stepId to form fields for validation
	const STEP_FIELDS: Partial<
		Record<RegistrationStepId, (keyof RegistrationFormValues)[]>
	> = {
		documents: [],
		basicInfo: ["basicInfo"],
		family: hasFamily ? ["familyInfo" as keyof RegistrationFormValues] : [],
		contacts: ["contactInfo"],
		profession: hasProfession
			? ["professionalInfo" as keyof RegistrationFormValues]
			: [],
		review: ["acceptTerms"],
	};

	// Validate current step before advancing
	const validateStep = useCallback(
		async (currentStep: number): Promise<boolean> => {
			const sid = steps[currentStep]?.stepId;
			if (!sid) return true;

			// Custom validation for documents step: check required files are uploaded
			if (sid === "documents") {
				const newDocErrors: Record<string, string | null> = {};
				const missingDocs: string[] = [];

				for (const doc of regConfig.documents) {
					if (doc.required && !localFileInfos[doc.key]) {
						newDocErrors[doc.key] = t("register.errors.documentRequired");
						missingDocs.push(t(doc.labelKey, doc.labelFallback));
					} else {
						newDocErrors[doc.key] = null;
					}
				}

				setDocErrors(newDocErrors);

				if (missingDocs.length > 0) {
					toast.error(
						t("register.errors.missingDocuments", {
							documents: missingDocs.join(", "),
							defaultValue: `Veuillez fournir les documents suivants : ${missingDocs.join(", ")}`,
						}),
					);
					return false;
				}
				return true;
			}

			const fields = STEP_FIELDS[sid];
			if (!fields || fields.length === 0) return true;

			const result = await form.trigger(fields as any);
			return result;
		},
		[form, steps, localFileInfos, regConfig.documents, t],
	);

	// Restore form data from localStorage on mount
	useEffect(() => {
		if (!regStorage.isReady || !userEmail || formRestored) return;

		const stored = regStorage.getStoredData();
		if (stored) {
			// Restore each step's data
			for (const [, stepData] of Object.entries(stored.steps)) {
				if (stepData && typeof stepData === "object") {
					for (const [fieldPath, value] of Object.entries(
						stepData as Record<string, unknown>,
					)) {
						if (value !== undefined && value !== null && value !== "") {
							form.setValue(fieldPath as any, value as any);
						}
					}
				}
			}

			// Restore step position (start at stored step or step 1)
			if (stored.lastStep > 0 && stored.lastStep <= lastStepIndex) {
				setStep(stored.lastStep);
			}

			toast.info(
				t(
					"register.dataRestored",
					"Vos données précédentes ont été restaurées",
				),
			);
		}

		// Restore local file infos from IndexedDB
		const restoreFiles = async () => {
			const docKeys = regConfig.documents.map((d) => d.key);
			const infos: Record<
				string,
				{ filename: string; mimeType: string } | null
			> = {};

			for (const docKey of docKeys) {
				const file = await regStorage.getFile(docKey);
				if (file) {
					infos[docKey] = {
						filename: file.filename,
						mimeType: file.mimeType,
					};
					// Mark as having a document in form state
					form.setValue(`documents.${docKey}` as any, `local_${docKey}`);
				} else {
					infos[docKey] = null;
				}
			}

			setLocalFileInfos(infos);
		};

		restoreFiles();
		setFormRestored(true);
	}, [
		regStorage.isReady,
		userEmail,
		formRestored,
		regStorage,
		form,
		t,
		lastStepIndex,
		regConfig.documents,
	]);

	const handleNext = async () => {
		const isValid = await validateStep(step);
		if (!isValid) {
			console.warn("[Registration] Validation errors:", form.formState.errors);
			// Don't show generic toast for documents step — validateStep already shows specific toast
			if (currentStepId !== "documents") {
				toast.error(t("register.errors.fixErrors"));
			}
			return;
		}

		// Save current step data to localStorage
		if (userEmail && regStorage.isReady) {
			const stepFieldMapById: Record<string, string[]> = {
				documents: ["documents"],
				basicInfo: ["basicInfo"],
				family: ["familyInfo"],
				contacts: ["contactInfo"],
				profession: ["professionalInfo"],
			};

			const fieldsToSave = currentStepId
				? stepFieldMapById[currentStepId]
				: undefined;
			if (fieldsToSave) {
				const stepData: Record<string, unknown> = {};
				for (const field of fieldsToSave) {
					const values = form.getValues(field as any);
					if (values && typeof values === "object") {
						for (const [key, val] of Object.entries(values)) {
							stepData[`${field}.${key}`] = val;
						}
					}
				}
				regStorage.saveStepData(step, stepData);
			}
		}

		if (currentStepId) {
			captureEvent("registration_step_completed", { step_name: currentStepId });
		}

		setStep(step + 1);
	};

	const handlePrevious = () => {
		if (step > 0) {
			setStep(step - 1);
		}
	};

	const handleSubmit = async () => {
		// Scroll to top so user sees the submission progress indicators
		scrollToTop();
		setIsSubmitting(true);
		setSubmissionState("uploading_documents");
		try {
			const isValid = await form.trigger();
			if (!isValid) {
				toast.error(t("register.errors.fixErrors"));
				setIsSubmitting(false);
				setSubmissionState("idle");
				return;
			}

			const data = form.getValues();

			// Step 1: Upload documents from IndexedDB to Convex Storage
			const documentIds: Record<string, string> = {};

			for (const docDef of regConfig.documents) {
				const storedFile = await regStorage.getFile(docDef.key);
				if (!storedFile) continue;

				try {
					// Upload to Convex Storage
					const uploadUrl = await generateUploadUrl();
					const uploadResponse = await fetch(uploadUrl, {
						method: "POST",
						headers: { "Content-Type": storedFile.mimeType },
						body: storedFile.blob,
					});

					if (!uploadResponse.ok) {
						throw new Error(`Upload failed for ${docDef.key}`);
					}

					const { storageId } = await uploadResponse.json();

					const docId = await createDocument({
						storageId,
						filename: storedFile.filename,
						mimeType: storedFile.mimeType,
						sizeBytes: storedFile.size,
						documentType: docDef.documentType,
						category: docDef.category,
					});
					captureEvent("registration_document_uploaded", {
						document_type: docDef.documentType,
					});

					documentIds[docDef.key] = docId;
				} catch (err) {
					console.error(`Failed to upload ${docDef.key}:`, err);
				}
			}

			// Step 2: Create profile in Convex (with document references)
			setSubmissionState("creating_profile");
			await createProfile({
				userType,
				email: data.contactInfo?.email || undefined,
				phone: data.contactInfo?.phone || undefined,
				identity: {
					firstName: data.basicInfo.firstName,
					lastName: data.basicInfo.lastName,
					nip: data.basicInfo.nip || undefined,
					gender: data.basicInfo.gender,
					birthDate: data.basicInfo.birthDate,
					birthPlace: data.basicInfo.birthPlace,
					birthCountry: data.basicInfo.birthCountry,
					nationality: data.basicInfo.nationality,
					nationalityAcquisition: data.basicInfo.nationalityAcquisition,
				},
				passportInfo: data.basicInfo.passportNumber
					? {
							number: data.basicInfo.passportNumber,
							issueDate: data.basicInfo.passportIssueDate,
							expiryDate: data.basicInfo.passportExpiryDate,
							issuingAuthority: data.basicInfo.passportIssuingAuthority,
						}
					: undefined,
				addresses: {
					...(data.contactInfo.street
						? {
								residence: {
									street: data.contactInfo.street,
									city: data.contactInfo.city || "",
									postalCode: data.contactInfo.postalCode || "",
									country: data.contactInfo.country || CountryCode.FR,
								},
							}
						: {}),
					...(data.contactInfo.homelandCity
						? {
								homeland: {
									street: data.contactInfo.homelandStreet || "",
									city: data.contactInfo.homelandCity,
									postalCode: data.contactInfo.homelandPostalCode || "",
									country: data.contactInfo.homelandCountry || CountryCode.GA,
								},
							}
						: {}),
				},
				family: data.familyInfo
					? {
							maritalStatus: data.familyInfo.maritalStatus,
							father: data.familyInfo.fatherFirstName
								? {
										firstName: data.familyInfo.fatherFirstName,
										lastName: data.familyInfo.fatherLastName || "",
									}
								: undefined,
							mother: data.familyInfo.motherFirstName
								? {
										firstName: data.familyInfo.motherFirstName,
										lastName: data.familyInfo.motherLastName || "",
									}
								: undefined,
							spouse: data.familyInfo.spouseFirstName
								? {
										firstName: data.familyInfo.spouseFirstName,
										lastName: data.familyInfo.spouseLastName || "",
									}
								: undefined,
						}
					: undefined,
				profession: data.professionalInfo?.workStatus
					? {
							status: data.professionalInfo.workStatus as WorkStatus,
							title: data.professionalInfo.profession,
							employer: data.professionalInfo.employer,
						}
					: undefined,
				emergencyContacts: data.contactInfo.emergencyContacts
					?.filter((c) => c.firstName || c.lastName || c.phone)
					.map((c) => ({
						firstName: c.firstName || "",
						lastName: c.lastName || "",
						phone: c.phone || "",
						email: c.email || undefined,
						country: c.country || undefined,
					})),
				// Link uploaded documents to the profile
				documents:
					Object.keys(documentIds).length > 0
						? {
								passport: documentIds.passport as any,
								proofOfAddress: documentIds.addressProof as any,
								identityPhoto: documentIds.identityPhoto as any,
								birthCertificate: documentIds.birthCertificate as any,
							}
						: undefined,
			});

			// Step 3: For long_stay/short_stay, submit registration request
			if (userType === "long_stay" || userType === "short_stay") {
				setSubmissionState("finding_org");

				// Small delay for better UX
				await new Promise((r) => setTimeout(r, 800));

				setSubmissionState("submitting_request");
				const result = await submitRequest({});

				if (result.status === "success") {
					setSubmissionResult({
						orgName: result.orgName,
						reference: result.reference,
					});
					setSubmissionState("success");
					captureEvent("registration_submitted", {
						marital_status: data.familyInfo?.maritalStatus,
						has_children: false, // We don't ask for children in the wizard directly
						jurisdiction_country: data.contactInfo.country,
					});
				} else if (result.status === "no_org_found") {
					setSubmissionResult({ country: result.country });
					setSubmissionState("no_org_found");
				} else {
					// Profile created but no request needed (tourist, etc) or other statuses
					setSubmissionState("success");
				}
			} else {
				// Non-registration user types just complete
				setSubmissionState("success");
			}

			// Clear local storage after successful submission
			await regStorage.clearRegistration();
		} catch (error) {
			console.error("Registration error:", error);
			setSubmissionState("error");
			toast.error(t("register.errors.submission"));
		} finally {
			setIsSubmitting(false);
		}
	};

	// Handle AI document scanning (using base64 from local files)
	const handleScanDocuments = useCallback(async () => {
		if (!regStorage.isReady) {
			toast.error(t("register.scan.notReady"));
			return;
		}

		// Collect base64 images from IndexedDB
		const images: Array<{ base64: string; mimeType: string }> = [];
		const docTypes = [
			"identityPhoto",
			"passport",
			"birthCertificate",
			"addressProof",
		];

		for (const docType of docTypes) {
			const result = await regStorage.fileToBase64(docType);
			if (result) {
				images.push(result);
			}
		}

		if (images.length === 0) {
			toast.error(
				t(
					"register.scan.noDocuments",
					"Veuillez d'abord uploader au moins un document",
				),
			);
			captureEvent("registration_ai_scan_failed", {
				error_type: "no_documents",
				documents_attempted: 0,
			});
			return;
		}

		const scanStart = Date.now();
		setIsScanning(true);
		try {
			const result = await extractDataFromImages({ images });

			if (!result.success) {
				if (result.error?.startsWith("RATE_LIMITED:")) {
					toast.error(result.error.replace("RATE_LIMITED:", ""));
					captureEvent("registration_ai_scan_failed", {
						error_type: "rate_limited",
						documents_attempted: images.length,
					});
				} else {
					toast.error(t("register.scan.error"));
					captureEvent("registration_ai_scan_failed", {
						error_type: "extraction_error",
						documents_attempted: images.length,
					});
				}
				return;
			}

			// Pre-fill form with extracted data
			const { basicInfo, passportInfo, familyInfo, contactInfo } = result.data;
			let fieldsUpdated = 0;

			// Basic info
			if (basicInfo.firstName && !form.getValues("basicInfo.firstName")) {
				form.setValue("basicInfo.firstName", basicInfo.firstName);
				fieldsUpdated++;
			}
			if (basicInfo.lastName && !form.getValues("basicInfo.lastName")) {
				form.setValue("basicInfo.lastName", basicInfo.lastName);
				fieldsUpdated++;
			}
			if (basicInfo.gender && !form.getValues("basicInfo.gender")) {
				form.setValue(
					"basicInfo.gender",
					basicInfo.gender as unknown as Gender,
				);
				fieldsUpdated++;
			}
			if (basicInfo.birthDate && !form.getValues("basicInfo.birthDate")) {
				form.setValue("basicInfo.birthDate", basicInfo.birthDate);
				fieldsUpdated++;
			}
			if (basicInfo.birthPlace && !form.getValues("basicInfo.birthPlace")) {
				form.setValue("basicInfo.birthPlace", basicInfo.birthPlace);
				fieldsUpdated++;
			}
			if (basicInfo.birthCountry && !form.getValues("basicInfo.birthCountry")) {
				form.setValue(
					"basicInfo.birthCountry",
					basicInfo.birthCountry.toUpperCase() as unknown as CountryCode,
				);
				fieldsUpdated++;
			}
			if (basicInfo.nationality && !form.getValues("basicInfo.nationality")) {
				form.setValue(
					"basicInfo.nationality",
					basicInfo.nationality.toUpperCase() as unknown as CountryCode,
				);
				fieldsUpdated++;
			}

			// Passport info
			if (passportInfo.number && !form.getValues("basicInfo.passportNumber")) {
				form.setValue("basicInfo.passportNumber", passportInfo.number);
				fieldsUpdated++;
			}
			if (
				passportInfo.issueDate &&
				!form.getValues("basicInfo.passportIssueDate")
			) {
				form.setValue("basicInfo.passportIssueDate", passportInfo.issueDate);
				fieldsUpdated++;
			}
			if (
				passportInfo.expiryDate &&
				!form.getValues("basicInfo.passportExpiryDate")
			) {
				form.setValue("basicInfo.passportExpiryDate", passportInfo.expiryDate);
				fieldsUpdated++;
			}
			if (
				passportInfo.issuingAuthority &&
				!form.getValues("basicInfo.passportIssuingAuthority")
			) {
				form.setValue(
					"basicInfo.passportIssuingAuthority",
					passportInfo.issuingAuthority,
				);
				fieldsUpdated++;
			}

			// Family info
			if (
				familyInfo.fatherFirstName &&
				!form.getValues("familyInfo.fatherFirstName")
			) {
				form.setValue("familyInfo.fatherFirstName", familyInfo.fatherFirstName);
				fieldsUpdated++;
			}
			if (
				familyInfo.fatherLastName &&
				!form.getValues("familyInfo.fatherLastName")
			) {
				form.setValue("familyInfo.fatherLastName", familyInfo.fatherLastName);
				fieldsUpdated++;
			}
			if (
				familyInfo.motherFirstName &&
				!form.getValues("familyInfo.motherFirstName")
			) {
				form.setValue("familyInfo.motherFirstName", familyInfo.motherFirstName);
				fieldsUpdated++;
			}
			if (
				familyInfo.motherLastName &&
				!form.getValues("familyInfo.motherLastName")
			) {
				form.setValue("familyInfo.motherLastName", familyInfo.motherLastName);
				fieldsUpdated++;
			}

			// Contact info — residence address (only if visible)
			if (regConfig.visibleSections.residenceAddress !== false) {
				if (contactInfo.street && !form.getValues("contactInfo.street")) {
					form.setValue("contactInfo.street", contactInfo.street);
					fieldsUpdated++;
				}
				if (contactInfo.city && !form.getValues("contactInfo.city")) {
					form.setValue("contactInfo.city", contactInfo.city);
					fieldsUpdated++;
				}
				if (
					contactInfo.postalCode &&
					!form.getValues("contactInfo.postalCode")
				) {
					form.setValue("contactInfo.postalCode", contactInfo.postalCode);
					fieldsUpdated++;
				}
				if (contactInfo.country && !form.getValues("contactInfo.country")) {
					form.setValue(
						"contactInfo.country",
						contactInfo.country.toUpperCase() as unknown as CountryCode,
					);
					fieldsUpdated++;
				}
			}

			// Homeland address (only if visible)
			if (regConfig.visibleSections.homelandAddress) {
				if (
					contactInfo.homelandStreet &&
					!form.getValues("contactInfo.homelandStreet")
				) {
					form.setValue(
						"contactInfo.homelandStreet",
						contactInfo.homelandStreet,
					);
					fieldsUpdated++;
				}
				if (
					contactInfo.homelandCity &&
					!form.getValues("contactInfo.homelandCity")
				) {
					form.setValue("contactInfo.homelandCity", contactInfo.homelandCity);
					fieldsUpdated++;
				}
				if (
					contactInfo.homelandPostalCode &&
					!form.getValues("contactInfo.homelandPostalCode")
				) {
					form.setValue(
						"contactInfo.homelandPostalCode",
						contactInfo.homelandPostalCode,
					);
					fieldsUpdated++;
				}
				if (
					contactInfo.homelandCountry &&
					!form.getValues("contactInfo.homelandCountry")
				) {
					form.setValue(
						"contactInfo.homelandCountry",
						contactInfo.homelandCountry.toUpperCase() as unknown as CountryCode,
					);
					fieldsUpdated++;
				}
			}

			// NIP
			if (basicInfo.nip && !form.getValues("basicInfo.nip")) {
				form.setValue("basicInfo.nip", basicInfo.nip);
				fieldsUpdated++;
			}

			// Nationality Acquisition (only if visible)
			if (
				regConfig.visibleSections.nationalityAcquisition &&
				basicInfo.nationalityAcquisition &&
				!form.getValues("basicInfo.nationalityAcquisition")
			) {
				form.setValue(
					"basicInfo.nationalityAcquisition",
					basicInfo.nationalityAcquisition,
				);
				fieldsUpdated++;
			}

			// Marital status (only if family step exists)
			if (hasFamily) {
				if (
					familyInfo.maritalStatus &&
					!form.getValues("familyInfo.maritalStatus")
				) {
					form.setValue(
						"familyInfo.maritalStatus",
						familyInfo.maritalStatus as MaritalStatus,
					);
					fieldsUpdated++;
				}

				// Spouse (only if visible)
				if (regConfig.visibleSections.spouse) {
					if (
						familyInfo.spouseFirstName &&
						!form.getValues("familyInfo.spouseFirstName")
					) {
						form.setValue(
							"familyInfo.spouseFirstName",
							familyInfo.spouseFirstName,
						);
						fieldsUpdated++;
					}
					if (
						familyInfo.spouseLastName &&
						!form.getValues("familyInfo.spouseLastName")
					) {
						form.setValue(
							"familyInfo.spouseLastName",
							familyInfo.spouseLastName,
						);
						fieldsUpdated++;
					}
				}
			}

			captureEvent("registration_ai_scan_used", {
				documents_scanned: images.length,
				fields_extracted: fieldsUpdated,
				scan_duration_ms: Date.now() - scanStart,
				confidence: result.confidence ?? 0,
			});

			if (fieldsUpdated > 0) {
				toast.success(t("register.scan.success", { count: fieldsUpdated }));
			} else {
				toast.info(t("register.scan.noNewData"));
			}
		} catch (error) {
			console.error("Document scan error:", error);
			toast.error(t("register.scan.error"));
			captureEvent("registration_ai_scan_failed", {
				error_type: "extraction_error",
				documents_attempted: images.length,
			});
		} finally {
			setIsScanning(false);
		}
	}, [form, extractDataFromImages, regStorage, t]);

	// Show loading only while Convex auth is initializing
	if (isAuthLoading) {
		return (
			<div className="flex justify-center items-center min-h-[400px]">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	// Show progress screen during and after submission
	if (submissionState !== "idle") {
		return (
			<div className="max-w-lg mx-auto py-12">
				<Card className="p-8">
					<div className="space-y-8">
						{/* Step indicators */}
						<div className="space-y-4">
							{/* Step 0: Uploading Documents */}
							<div className="flex items-center gap-4">
								<div
									className={`w-10 h-10 rounded-full flex items-center justify-center ${
										submissionState === "uploading_documents"
											? "bg-primary/20 animate-pulse"
											: "bg-primary text-white"
									}`}
								>
									{submissionState === "uploading_documents" ? (
										<Loader2 className="h-5 w-5 animate-spin text-primary" />
									) : (
										<CheckCircle2 className="h-5 w-5" />
									)}
								</div>
								<span
									className={`font-medium ${
										submissionState === "uploading_documents"
											? "text-primary"
											: "text-foreground"
									}`}
								>
									{t("register.progress.uploadingDocuments")}
								</span>
							</div>

							{/* Step 1: Profile */}
							<div className="flex items-center gap-4">
								<div
									className={`w-10 h-10 rounded-full flex items-center justify-center ${
										submissionState === "creating_profile"
											? "bg-primary/20 animate-pulse"
											: submissionState === "uploading_documents"
												? "bg-muted text-muted-foreground"
												: "bg-primary text-white"
									}`}
								>
									{submissionState === "creating_profile" ? (
										<Loader2 className="h-5 w-5 animate-spin text-primary" />
									) : submissionState === "uploading_documents" ? (
										<User className="h-5 w-5" />
									) : (
										<CheckCircle2 className="h-5 w-5" />
									)}
								</div>
								<span
									className={`font-medium ${
										submissionState === "creating_profile"
											? "text-primary"
											: submissionState === "uploading_documents"
												? "text-muted-foreground"
												: "text-foreground"
									}`}
								>
									{t("register.progress.creatingProfile")}
								</span>
							</div>

							{/* Step 2: Finding org (only for long_stay/short_stay) */}
							{(userType === "long_stay" || userType === "short_stay") && (
								<>
									<div className="flex items-center gap-4">
										<div
											className={`w-10 h-10 rounded-full flex items-center justify-center ${
												submissionState === "finding_org"
													? "bg-primary/20 animate-pulse"
													: (
																[
																	"uploading_documents",
																	"creating_profile",
																].includes(submissionState)
															)
														? "bg-muted text-muted-foreground"
														: "bg-primary text-white"
											}`}
										>
											{submissionState === "finding_org" ? (
												<Loader2 className="h-5 w-5 animate-spin text-primary" />
											) : ["uploading_documents", "creating_profile"].includes(
													submissionState,
												) ? (
												<Building2 className="h-5 w-5" />
											) : (
												<CheckCircle2 className="h-5 w-5" />
											)}
										</div>
										<span
											className={`font-medium ${
												submissionState === "finding_org"
													? "text-primary"
													: (
																[
																	"uploading_documents",
																	"creating_profile",
																].includes(submissionState)
															)
														? "text-muted-foreground"
														: "text-foreground"
											}`}
										>
											{t("register.progress.findingOrg")}
										</span>
									</div>

									{/* Step 3: Submitting */}
									<div className="flex items-center gap-4">
										<div
											className={`w-10 h-10 rounded-full flex items-center justify-center ${
												submissionState === "submitting_request"
													? "bg-primary/20 animate-pulse"
													: (
																[
																	"uploading_documents",
																	"creating_profile",
																	"finding_org",
																].includes(submissionState)
															)
														? "bg-muted text-muted-foreground"
														: "bg-primary text-white"
											}`}
										>
											{submissionState === "submitting_request" ? (
												<Loader2 className="h-5 w-5 animate-spin text-primary" />
											) : [
													"uploading_documents",
													"creating_profile",
													"finding_org",
												].includes(submissionState) ? (
												<FileText className="h-5 w-5" />
											) : (
												<CheckCircle2 className="h-5 w-5" />
											)}
										</div>
										<span
											className={`font-medium ${
												submissionState === "submitting_request"
													? "text-primary"
													: (
																[
																	"uploading_documents",
																	"creating_profile",
																	"finding_org",
																].includes(submissionState)
															)
														? "text-muted-foreground"
														: "text-foreground"
											}`}
										>
											{t("register.progress.submitting")}
										</span>
									</div>
								</>
							)}
						</div>

						{/* Success state */}
						{submissionState === "success" && (
							<div className="text-center space-y-4 pt-4 border-t">
								<div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mx-auto flex items-center justify-center">
									<CheckCircle2 className="h-8 w-8 text-green-600" />
								</div>
								<div>
									<h3 className="text-lg font-semibold">
										{t("register.success.title")}
									</h3>
									{submissionResult?.orgName && (
										<p className="text-muted-foreground mt-2">
											{t("register.success.description", {
												orgName: submissionResult.orgName,
											})}
										</p>
									)}
									{submissionResult?.reference && (
										<p className="text-sm text-muted-foreground mt-1">
											{t("register.success.reference")}:{" "}
											<span className="font-mono font-medium">
												{submissionResult.reference}
											</span>
										</p>
									)}
								</div>
								<Button onClick={() => onComplete?.()} className="mt-4">
									{t("register.success.goToSpace")}
									<ArrowRight className="ml-2 h-4 w-4" />
								</Button>
							</div>
						)}

						{/* No org found state */}
						{submissionState === "no_org_found" && (
							<div className="text-center space-y-4 pt-4 border-t">
								<div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full mx-auto flex items-center justify-center">
									<AlertTriangle className="h-8 w-8 text-amber-600" />
								</div>
								<div>
									<h3 className="text-lg font-semibold">
										{t("register.noOrg.title")}
									</h3>
									<p className="text-muted-foreground mt-2">
										{t("register.noOrg.description", {
											country: submissionResult?.country || "",
										})}
									</p>
								</div>
								<Button onClick={() => onComplete?.()} className="mt-4">
									{t("register.noOrg.goToSpace")}
									<ArrowRight className="ml-2 h-4 w-4" />
								</Button>
							</div>
						)}

						{/* Error state */}
						{submissionState === "error" && (
							<div className="text-center space-y-4 pt-4 border-t">
								<div className="w-16 h-16 bg-red-100 dark:bg-red-950/20 rounded-full mx-auto flex items-center justify-center">
									<AlertTriangle className="h-8 w-8 text-red-600" />
								</div>
								<div>
									<h3 className="text-lg font-semibold">
										{t("register.error.title")}
									</h3>
									<p className="text-muted-foreground mt-2">
										{t("register.error.description")}
									</p>
								</div>
								<Button
									variant="outline"
									onClick={() => {
										setSubmissionState("idle");
									}}
									className="mt-4"
								>
									{t("common.retry")}
								</Button>
							</div>
						)}
					</div>
				</Card>
			</div>
		);
	}

	return (
		<div className="max-w-4xl mx-auto">
			{/* Progress Steps — Mobile: compact bar + label, Desktop: full icons */}
			{/* Mobile step indicator */}
			<div className="md:hidden mb-6 space-y-2">
				{(() => {
					const currentStep = steps[step - 1];
					const StepIcon = currentStep?.icon;
					return (
						<>
							<div className="flex items-center justify-between text-sm">
								<div className="flex items-center gap-2">
									{StepIcon && <StepIcon className="h-4 w-4 text-primary" />}
									<span className="font-medium text-foreground">
										{currentStep?.label}
									</span>
								</div>
								<span className="text-muted-foreground text-sm">
									{step}/{steps.length}
								</span>
							</div>
							<div className="w-full bg-muted rounded-full h-2">
								<div
									className="bg-primary h-2 rounded-full transition-all duration-300"
									style={{ width: `${(step / steps.length) * 100}%` }}
								/>
							</div>
						</>
					);
				})()}
			</div>

			{/* Desktop step indicator */}
			<div className="hidden md:flex justify-between mb-8">
				{steps.map((s, index) => (
					<div
						key={s.id}
						className="flex flex-col items-center flex-1 relative z-10"
					>
						<div
							className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${
								step >= s.id
									? "bg-primary text-white"
									: "bg-muted text-muted-foreground"
							}`}
						>
							{step > s.id ? (
								<CheckCircle2 className="h-6 w-6" />
							) : (
								<s.icon className="h-5 w-5" />
							)}
						</div>
						<span
							className={`text-xs mt-2 font-medium ${
								step === s.id ? "text-primary" : "text-muted-foreground"
							}`}
						>
							{s.label}
						</span>
						{index < steps.length - 1 && (
							<div
								className={`absolute top-5 left-[calc(50%+20px)] h-[2px] -z-10 ${
									step > s.id ? "bg-primary" : "bg-muted"
								}`}
								style={{ width: "calc(100% - 40px)" }}
							/>
						)}
					</div>
				))}
			</div>

			{/* Save indicator */}
			{regStorage.lastSavedAt &&
				currentStepId !== "documents" &&
				currentStepId !== "review" && (
					<div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2 justify-end">
						<CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
						Brouillon sauvegardé ·{" "}
						{regStorage.lastSavedAt.toLocaleTimeString("fr-FR", {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</div>
				)}

			<FormProvider {...form}>
				<Card>
					<CardHeader>
						<CardTitle>
							{t(`register.citizen.steps.${currentStepId || "documents"}.title`)}
						</CardTitle>
						<CardDescription>
							{t(
								`register.citizen.steps.${currentStepId || "documents"}.description`,
							)}
						</CardDescription>
					</CardHeader>

					<CardContent className="space-y-6" onBlur={handleAutoSave}>
						{/* Step: Documents */}
						{currentStepId === "documents" && (
							<>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{regConfig.documents.map((docDef) => (
										<DocumentUploadZone
											key={docDef.key}
											data-testid={`doc-upload-${docDef.key}`}
											documentType={docDef.documentType}
											category={docDef.category}
											label={t(docDef.labelKey, docDef.labelFallback)}
											formatHint={docDef.formatHint}
											maxSize={docDef.maxSize}
											accept={docDef.accept}
											required={docDef.required}
											localOnly
											localFile={localFileInfos[docDef.key]}
											externalError={docErrors[docDef.key]}
											onLocalFileSelected={async (file) => {
												await regStorage.saveFile(docDef.key, file);
												setLocalFileInfos((prev) => ({
													...prev,
													[docDef.key]: {
														filename: file.name,
														mimeType: file.type,
													},
												}));
												// Clear inline error for this document
												setDocErrors((prev) => ({
													...prev,
													[docDef.key]: null,
												}));
												form.setValue(
													`documents.${docDef.key}` as any,
													`local_${docDef.key}`,
												);
											}}
											onDelete={async () => {
												await regStorage.removeFile(docDef.key);
												setLocalFileInfos((prev) => ({
													...prev,
													[docDef.key]: null,
												}));
												form.setValue(
													`documents.${docDef.key}` as any,
													undefined,
												);
											}}
										/>
									))}
								</div>

								{/* AI Scan Button - visible when at least one document is uploaded */}
								{Object.values(localFileInfos).some(Boolean) && (
									<div className="mt-6 p-4 rounded-lg border border-dashed border-primary/50 bg-primary/5">
										<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
											<div>
												<h4 className="text-sm font-medium text-primary flex items-center gap-2">
													<Sparkles className="h-4 w-4" />
													{t("register.scan.title")}
												</h4>
												<p className="text-xs text-muted-foreground mt-1">
													{t("register.scan.description")}
												</p>
											</div>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={handleScanDocuments}
												disabled={isScanning}
												className="w-full sm:w-auto"
											>
												{isScanning ? (
													<>
														<Loader2 className="mr-2 h-4 w-4 animate-spin" />
														{t("register.scan.scanning")}
													</>
												) : (
													<>
														<Sparkles className="mr-2 h-4 w-4" />
														{t("register.scan.button")}
													</>
												)}
											</Button>
										</div>
									</div>
								)}
							</>
						)}

						{/* Step: Basic Info */}
						{currentStepId === "basicInfo" && (
							<FieldGroup className="space-y-4">
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<Controller
										name="basicInfo.firstName"
										control={form.control}
										render={({ field, fieldState }) => (
											<Field data-invalid={fieldState.invalid}>
												<FieldLabel htmlFor="firstName">
													{t("common.firstName")} *
												</FieldLabel>
												<Input
													id="firstName"
													placeholder={t("register.placeholders.firstName")}
													aria-invalid={fieldState.invalid}
													{...field}
												/>
												{fieldState.error && (
													<FieldError errors={[fieldState.error]} />
												)}
											</Field>
										)}
									/>
									<Controller
										name="basicInfo.lastName"
										control={form.control}
										render={({ field, fieldState }) => (
											<Field data-invalid={fieldState.invalid}>
												<FieldLabel htmlFor="lastName">
													{t("common.lastName")} *
												</FieldLabel>
												<Input
													id="lastName"
													placeholder={t("register.placeholders.lastName")}
													aria-invalid={fieldState.invalid}
													{...field}
												/>
												{fieldState.error && (
													<FieldError errors={[fieldState.error]} />
												)}
											</Field>
										)}
									/>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<Controller
										name="basicInfo.birthDate"
										control={form.control}
										render={({ field, fieldState }) => (
											<Field data-invalid={fieldState.invalid}>
												<FieldLabel htmlFor="birthDate">
													{t("common.birthDate")} *
												</FieldLabel>
												<Input
													id="birthDate"
													type="date"
													aria-invalid={fieldState.invalid}
													{...field}
												/>
												{fieldState.error && (
													<FieldError errors={[fieldState.error]} />
												)}
											</Field>
										)}
									/>
									<Controller
										name="basicInfo.birthPlace"
										control={form.control}
										render={({ field, fieldState }) => (
											<Field data-invalid={fieldState.invalid}>
												<FieldLabel htmlFor="birthPlace">
													{t("common.birthPlace")} *
												</FieldLabel>
												<Input
													id="birthPlace"
													placeholder={t("register.placeholders.birthPlace")}
													aria-invalid={fieldState.invalid}
													{...field}
												/>
												{fieldState.error && (
													<FieldError errors={[fieldState.error]} />
												)}
											</Field>
										)}
									/>
								</div>

								<Controller
									name="basicInfo.gender"
									control={form.control}
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel htmlFor="gender">
												{t("profile.fields.gender")}
											</FieldLabel>
											<MultiSelect
												type="single"
												data-testid="select-gender"
												options={Object.values(Gender).map((value) => ({
													value,
													label: t(`common.gender.${value}`),
												}))}
												selected={field.value}
												onChange={field.onChange}
												placeholder={t("common.select")}
											/>
											{fieldState.error && (
												<FieldError errors={[fieldState.error]} />
											)}
										</Field>
									)}
								/>

								<Controller
									name="basicInfo.nationality"
									control={form.control}
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel htmlFor="nationality">
												{t("profile.fields.nationality")}
											</FieldLabel>
											<CountrySelect
												id="nationality"
												type="single"
												selected={field.value as CountryCode | undefined}
												onChange={field.onChange}
												placeholder={t("common.select")}
											/>
											{fieldState.error && (
												<FieldError errors={[fieldState.error]} />
											)}
										</Field>
									)}
								/>

								{/* NIP (optional) */}
								<Controller
									name="basicInfo.nip"
									control={form.control}
									render={({ field }) => (
										<Field>
											<FieldLabel htmlFor="nip">
												{t("profile.fields.nip")}
											</FieldLabel>
											<Input id="nip" placeholder={t("register.placeholders.optional")} {...field} />
										</Field>
									)}
								/>

								{/* Nationality Acquisition */}
								{regConfig.visibleSections.nationalityAcquisition && (
									<Controller
										name="basicInfo.nationalityAcquisition"
										control={form.control}
										render={({ field }) => (
											<Field>
												<FieldLabel htmlFor="nationalityAcquisition">
													{t("profile.fields.nationalityAcquisition")}
												</FieldLabel>
												<MultiSelect
													type="single"
													options={Object.values(NationalityAcquisition).map(
														(value) => ({
															value,
															label: t(
																`profile.nationalityAcquisition.${value}`,
															),
														}),
													)}
													selected={field.value}
													onChange={field.onChange}
													placeholder={t("common.select")}
												/>
											</Field>
										)}
									/>
								)}

								{/* Passport Info */}
								<FieldSet className="p-4 bg-muted border border-border rounded-lg">
									<FieldLegend>{t("profile.passport.title")}</FieldLegend>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
										<Controller
											name="basicInfo.passportNumber"
											control={form.control}
											render={({ field }) => (
												<Field>
													<FieldLabel>
														{t("profile.passport.number")}
													</FieldLabel>
													<Input placeholder={t("register.placeholders.passportNumber")} {...field} />
												</Field>
											)}
										/>
										<Controller
											name="basicInfo.passportIssuingAuthority"
											control={form.control}
											render={({ field }) => (
												<Field>
													<FieldLabel>
														{t("profile.passport.issuingAuthority")}
													</FieldLabel>
													<Input placeholder={t("register.placeholders.issuingAuthority")} {...field} />
												</Field>
											)}
										/>
									</div>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
										<Controller
											name="basicInfo.passportIssueDate"
											control={form.control}
											render={({ field }) => (
												<Field>
													<FieldLabel>
														{t("profile.passport.issueDate")}
													</FieldLabel>
													<Input type="date" {...field} />
												</Field>
											)}
										/>
										<Controller
											name="basicInfo.passportExpiryDate"
											control={form.control}
											render={({ field }) => (
												<Field>
													<FieldLabel>
														{t("profile.passport.expiryDate")}
													</FieldLabel>
													<Input type="date" {...field} />
												</Field>
											)}
										/>
									</div>
								</FieldSet>
							</FieldGroup>
						)}

						{/* Step: Family (only if in config) */}
						{currentStepId === "family" && hasFamily && (
							<FieldGroup className="space-y-4">
								<Controller
									name="familyInfo.maritalStatus"
									control={form.control}
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel htmlFor="maritalStatus">
												{t("profile.fields.maritalStatus")} *
											</FieldLabel>
											<MultiSelect
												type="single"
												data-testid="select-maritalStatus"
												options={Object.values(MaritalStatus).map((value) => ({
													value,
													label: t(`profile.maritalStatus.${value}`),
												}))}
												selected={field.value}
												onChange={field.onChange}
												placeholder={t("common.select")}
											/>
											{fieldState.error && (
												<FieldError errors={[fieldState.error]} />
											)}
										</Field>
									)}
								/>

								{/* Spouse (conditional on marital status) */}
								{showPartnerFields && (
									<FieldSet className="p-4 bg-muted border border-border rounded-lg">
										<FieldLegend>
											{t("profile.relationship.spouse")}
										</FieldLegend>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
											<Controller
												name="familyInfo.spouseLastName"
												control={form.control}
												render={({ field }) => (
													<Field>
														<FieldLabel>{t("common.lastName")}</FieldLabel>
														<Input
															placeholder={t("common.lastName")}
															{...field}
														/>
													</Field>
												)}
											/>
											<Controller
												name="familyInfo.spouseFirstName"
												control={form.control}
												render={({ field }) => (
													<Field>
														<FieldLabel>{t("common.firstName")}</FieldLabel>
														<Input
															placeholder={t("common.firstName")}
															{...field}
														/>
													</Field>
												)}
											/>
										</div>
									</FieldSet>
								)}

								<FieldSet className="p-4 bg-muted border border-border rounded-lg">
									<FieldLegend>{t("profile.family.filiation")}</FieldLegend>

									{/* Father */}
									<div className="mt-3">
										<p className="text-sm font-medium text-muted-foreground mb-2">
											{t("profile.family.father")}
										</p>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											<Controller
												name="familyInfo.fatherLastName"
												control={form.control}
												render={({ field }) => (
													<Field>
														<FieldLabel>{t("common.lastName")}</FieldLabel>
														<Input
															placeholder={t("common.lastName")}
															{...field}
														/>
													</Field>
												)}
											/>
											<Controller
												name="familyInfo.fatherFirstName"
												control={form.control}
												render={({ field }) => (
													<Field>
														<FieldLabel>{t("common.firstName")}</FieldLabel>
														<Input
															placeholder={t("common.firstName")}
															{...field}
														/>
													</Field>
												)}
											/>
										</div>
									</div>

									{/* Mother */}
									<div className="mt-4">
										<p className="text-sm font-medium text-muted-foreground mb-2">
											{t("profile.family.mother")}
										</p>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											<Controller
												name="familyInfo.motherLastName"
												control={form.control}
												render={({ field }) => (
													<Field>
														<FieldLabel>{t("common.lastName")}</FieldLabel>
														<Input
															placeholder={t("common.lastName")}
															{...field}
														/>
													</Field>
												)}
											/>
											<Controller
												name="familyInfo.motherFirstName"
												control={form.control}
												render={({ field }) => (
													<Field>
														<FieldLabel>{t("common.firstName")}</FieldLabel>
														<Input
															placeholder={t("common.firstName")}
															{...field}
														/>
													</Field>
												)}
											/>
										</div>
									</div>
								</FieldSet>
							</FieldGroup>
						)}

						{/* Step: Contacts */}
						{currentStepId === "contacts" && (
							<FieldGroup className="space-y-4">
								{/* Email & Phone */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<Controller
										name="contactInfo.email"
										control={form.control}
										render={({ field, fieldState }) => (
											<Field data-invalid={fieldState.invalid}>
												<FieldLabel htmlFor="contactEmail">
													{t("profile.fields.email")}
												</FieldLabel>
												<Input
													id="contactEmail"
													type="email"
													placeholder="email@example.com"
													{...field}
												/>
												{fieldState.error && (
													<FieldError errors={[fieldState.error]} />
												)}
											</Field>
										)}
									/>
									<Controller
										name="contactInfo.phone"
										control={form.control}
										render={({ field, fieldState }) => (
											<Field data-invalid={fieldState.invalid}>
												<FieldLabel htmlFor="contactPhone">
													{t("profile.fields.phone")}
												</FieldLabel>
												<Input
													id="contactPhone"
													type="tel"
													placeholder="+33..."
													{...field}
												/>
												{fieldState.error && (
													<FieldError errors={[fieldState.error]} />
												)}
											</Field>
										)}
									/>
								</div>

								{showResidenceAddress && (
									<AddressWithAutocomplete form={form} t={t} />
								)}

								{/* Emergency Contacts — Dynamic list */}
								<EmergencyContactsSection form={form} t={t} />

								{/* Homeland Address */}
								{regConfig.visibleSections.homelandAddress && (
									<FieldSet className="p-4 bg-muted border border-border rounded-lg">
										<FieldLegend>{t("profile.addresses.homeland")}</FieldLegend>
										<div className="space-y-3 mt-2">
											<Controller
												name="contactInfo.homelandStreet"
												control={form.control}
												render={({ field }) => (
													<Field>
														<FieldLabel>
															{t("profile.address.street")}
														</FieldLabel>
														<Input placeholder="123 Rue..." {...field} />
													</Field>
												)}
											/>
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
												<Controller
													name="contactInfo.homelandCity"
													control={form.control}
													render={({ field }) => (
														<Field>
															<FieldLabel>
																{t("profile.address.city")}
															</FieldLabel>
															<Input placeholder={t("register.placeholders.city")} {...field} />
														</Field>
													)}
												/>
												<Controller
													name="contactInfo.homelandPostalCode"
													control={form.control}
													render={({ field }) => (
														<Field>
															<FieldLabel>
																{t("profile.address.postalCode")}
															</FieldLabel>
															<Input placeholder="..." {...field} />
														</Field>
													)}
												/>
											</div>
										</div>
									</FieldSet>
								)}
							</FieldGroup>
						)}

						{/* Step: Professional (only if in config) */}
						{currentStepId === "profession" && hasProfession && (
							<FieldGroup className="space-y-4">
								<Controller
									name="professionalInfo.workStatus"
									control={form.control}
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel htmlFor="workStatus">
												{t("profile.profession.status")}
											</FieldLabel>
											<MultiSelect
												type="single"
												data-testid="select-workStatus"
												options={Object.values(WorkStatus).map((status) => ({
													value: status,
													label: t(`profile.workStatus.${status}`),
												}))}
												selected={field.value}
												onChange={field.onChange}
												placeholder={t("common.select")}
											/>
											{fieldState.error && (
												<FieldError errors={[fieldState.error]} />
											)}
										</Field>
									)}
								/>

								{showProfessionFields && (
									<>
										<Controller
											name="professionalInfo.employer"
											control={form.control}
											render={({ field }) => (
												<Field>
													<FieldLabel htmlFor="employer">
														{t("profile.profession.employer")}
													</FieldLabel>
													<Input
														id="employer"
														placeholder={t(
															"profile.profession.employerPlaceholder",
														)}
														{...field}
													/>
												</Field>
											)}
										/>

										<Controller
											name="professionalInfo.profession"
											control={form.control}
											render={({ field }) => (
												<Field>
													<FieldLabel htmlFor="profession">
														{t("profile.profession.title")}
													</FieldLabel>
													<Input
														id="profession"
														placeholder={t(
															"profile.profession.titlePlaceholder",
														)}
														{...field}
													/>
												</Field>
											)}
										/>
									</>
								)}
							</FieldGroup>
						)}

						{/* Step: Review */}
						{currentStepId === "review" && (
							<div className="space-y-4">
								<Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
									<CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
									<AlertTitle>{t("register.review.ready")}</AlertTitle>
									<AlertDescription>
										{t("register.review.description")}
									</AlertDescription>
								</Alert>

								{/* Data Summary */}
								<div className="space-y-3 text-sm">
									{/* Identity */}
									<FieldSet className="p-3 bg-muted border border-border rounded-lg">
										<FieldLegend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
											{t("register.review.identity")}
										</FieldLegend>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2">
											<div>
												<span className="text-muted-foreground">
													{t("register.review.fields.lastName")}:
												</span>{" "}
												<strong>
													{form.watch("basicInfo.lastName") || "-"}
												</strong>
											</div>
											<div>
												<span className="text-muted-foreground">
													{t("register.review.fields.firstName")}:
												</span>{" "}
												<strong>
													{form.watch("basicInfo.firstName") || "-"}
												</strong>
											</div>
											<div>
												<span className="text-muted-foreground">
													{t("register.review.fields.birthDate")}:
												</span>{" "}
												{form.watch("basicInfo.birthDate") || "-"}
											</div>
											<div>
												<span className="text-muted-foreground">
													{t("register.review.fields.birthPlace")}:
												</span>{" "}
												{form.watch("basicInfo.birthPlace") || "-"}
											</div>
											<div>
												<span className="text-muted-foreground">
													{t("register.review.fields.birthCountry")}:
												</span>{" "}
												{form.watch("basicInfo.birthCountry") || "-"}
											</div>
											<div>
												<span className="text-muted-foreground">
													{t("register.review.fields.gender")}:
												</span>{" "}
												{form.watch("basicInfo.gender") === "male"
													? t("profile.gender.male")
													: form.watch("basicInfo.gender") === "female"
														? t("profile.gender.female")
														: "-"}
											</div>
											<div>
												<span className="text-muted-foreground">
													{t("register.review.fields.nationality")}:
												</span>{" "}
												{form.watch("basicInfo.nationality") || "-"}
											</div>
											{form.watch("basicInfo.nip") && (
												<div>
													<span className="text-muted-foreground">
														{t("register.review.fields.nip")}:
													</span>{" "}
													{form.watch("basicInfo.nip")}
												</div>
											)}
											{form.watch("basicInfo.nationalityAcquisition") && (
												<div>
													<span className="text-muted-foreground">
														{t("register.review.fields.acquisition")}:
													</span>{" "}
													{form.watch("basicInfo.nationalityAcquisition")}
												</div>
											)}
										</div>
									</FieldSet>

									{/* Passport */}
									{form.watch("basicInfo.passportNumber") && (
										<FieldSet className="p-3 bg-muted border border-border rounded-lg">
											<FieldLegend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
												{t("profile.passport.title")}
											</FieldLegend>
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2">
												<div>
													<span className="text-muted-foreground">
														{t("register.review.fields.passportNumber")}:
													</span>{" "}
													<strong>
														{form.watch("basicInfo.passportNumber")}
													</strong>
												</div>
												<div>
													<span className="text-muted-foreground">
														{t("register.review.fields.passportAuthority")}:
													</span>{" "}
													{form.watch("basicInfo.passportIssuingAuthority") ||
														"-"}
												</div>
												<div>
													<span className="text-muted-foreground">
														{t("register.review.fields.passportIssueDate")}:
													</span>{" "}
													{form.watch("basicInfo.passportIssueDate") || "-"}
												</div>
												<div>
													<span className="text-muted-foreground">
														{t("register.review.fields.passportExpiryDate")}:
													</span>{" "}
													{form.watch("basicInfo.passportExpiryDate") || "-"}
												</div>
											</div>
										</FieldSet>
									)}

									{/* Contact Info (Email / Phone) */}
									{(form.watch("contactInfo.email") ||
										form.watch("contactInfo.phone")) && (
										<FieldSet className="p-3 bg-muted border border-border rounded-lg">
											<FieldLegend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
												{t("register.review.contact")}
											</FieldLegend>
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2">
												{form.watch("contactInfo.email") && (
													<div>
														<span className="text-muted-foreground">
															{t("register.review.fields.email")}:
														</span>{" "}
														{form.watch("contactInfo.email")}
													</div>
												)}
												{form.watch("contactInfo.phone") && (
													<div>
														<span className="text-muted-foreground">
															{t("register.review.fields.phone")}:
														</span>{" "}
														{form.watch("contactInfo.phone")}
													</div>
												)}
											</div>
										</FieldSet>
									)}

									{/* Residence Address */}
									{showResidenceAddress && (
										<FieldSet className="p-3 bg-muted border border-border rounded-lg">
											<FieldLegend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
												{t("register.review.address")}
											</FieldLegend>
											<div className="mt-2">
												<div>{form.watch("contactInfo.street") || "-"}</div>
												<div>
													{form.watch("contactInfo.postalCode")}{" "}
													{form.watch("contactInfo.city")}
												</div>
												{form.watch("contactInfo.country") && (
													<div>{form.watch("contactInfo.country")}</div>
												)}
											</div>
										</FieldSet>
									)}

									{/* Homeland Address */}
									{regConfig.visibleSections.homelandAddress &&
										form.watch("contactInfo.homelandCity") && (
											<FieldSet className="p-3 bg-muted border border-border rounded-lg">
												<FieldLegend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
													{t(
														"profile.sections.addressHome",
														"Adresse au pays d'origine",
													)}
												</FieldLegend>
												<div className="mt-2">
													<div>
														{form.watch("contactInfo.homelandStreet") || "-"}
													</div>
													<div>
														{form.watch("contactInfo.homelandPostalCode")}{" "}
														{form.watch("contactInfo.homelandCity")}
													</div>
													{form.watch("contactInfo.homelandCountry") && (
														<div>
															{form.watch("contactInfo.homelandCountry")}
														</div>
													)}
												</div>
											</FieldSet>
										)}

									{/* Family */}
									{hasFamily && (
										<FieldSet className="p-3 bg-muted border border-border rounded-lg">
											<FieldLegend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
												{t("register.review.family")}
											</FieldLegend>
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2">
												{form.watch("familyInfo.maritalStatus") && (
													<div className="col-span-2">
														<span className="text-muted-foreground">
															{t("register.review.fields.maritalStatus")}:
														</span>{" "}
														<strong>
															{form.watch("familyInfo.maritalStatus")
																? t(
																		`profile.maritalStatus.${form.watch("familyInfo.maritalStatus")}`,
																	)
																: "-"}
														</strong>
													</div>
												)}
												{form.watch("familyInfo.spouseLastName") && (
													<div className="col-span-2">
														<span className="text-muted-foreground">
															{t("register.review.fields.spouse")}:
														</span>{" "}
														{form.watch("familyInfo.spouseLastName")}{" "}
														{form.watch("familyInfo.spouseFirstName")}
													</div>
												)}
												<div>
													<span className="text-muted-foreground">
														{t("register.review.fields.father")}:
													</span>{" "}
													{form.watch("familyInfo.fatherLastName")}{" "}
													{form.watch("familyInfo.fatherFirstName") || "-"}
												</div>
												<div>
													<span className="text-muted-foreground">
														{t("register.review.fields.mother")}:
													</span>{" "}
													{form.watch("familyInfo.motherLastName")}{" "}
													{form.watch("familyInfo.motherFirstName") || "-"}
												</div>
											</div>
										</FieldSet>
									)}

									{/* Emergency Contacts — Review */}
									{form.watch("contactInfo.emergencyContacts")?.map(
										(contact, idx) =>
											(contact.firstName || contact.lastName) && (
												<FieldSet
													key={idx}
													className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg"
												>
													<FieldLegend className="text-xs font-semibold text-red-800 dark:text-red-200 uppercase tracking-wide">
														{t(
															"profile.emergencyContacts.contactNumber",
															{ number: idx + 1 },
														)}
													</FieldLegend>
													<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2">
														<div>
															<span className="text-muted-foreground">
																{t("register.review.fields.lastName")}:
															</span>{" "}
															{contact.lastName} {contact.firstName || "-"}
														</div>
														<div>
															<span className="text-muted-foreground">
																{t("register.review.fields.phone")}:
															</span>{" "}
															{contact.phone || "-"}
														</div>
														{contact.country && (
															<div>
																<span className="text-muted-foreground">
																	{t("profile.emergencyContacts.country")}:
																</span>{" "}
																{t(
																	`superadmin.countryCodes.${contact.country}`,
																	contact.country,
																)}
															</div>
														)}
														{contact.email && (
															<div>
																<span className="text-muted-foreground">
																	{t("register.review.fields.email")}:
																</span>{" "}
																{contact.email}
															</div>
														)}
													</div>
												</FieldSet>
											),
									)}

									{/* Profession */}
									{hasProfession &&
										form.watch("professionalInfo.workStatus") && (
											<FieldSet className="p-3 bg-muted border border-border rounded-lg">
												<FieldLegend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
													{t("register.review.profession")}
												</FieldLegend>
												<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2">
													<div>
														<span className="text-muted-foreground">
															{t("register.review.fields.status")}:
														</span>{" "}
														{form.watch("professionalInfo.workStatus")
															? t(
																	`profile.workStatus.${form.watch("professionalInfo.workStatus")}`,
																)
															: "-"}
													</div>
													{form.watch("professionalInfo.employer") && (
														<div>
															<span className="text-muted-foreground">
																{t("register.review.fields.employer")}:
															</span>{" "}
															{form.watch("professionalInfo.employer")}
														</div>
													)}
													{form.watch("professionalInfo.profession") && (
														<div>
															<span className="text-muted-foreground">
																{t("register.review.fields.professionTitle")}:
															</span>{" "}
															{form.watch("professionalInfo.profession")}
														</div>
													)}
												</div>
											</FieldSet>
										)}
								</div>

								<Controller
									name="acceptTerms"
									control={form.control}
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<div className="flex items-center space-x-2">
												<Checkbox
													id="terms"
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
												<label
													htmlFor="terms"
													className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
												>
													{t(
														"register.terms.certify",
														"Je certifie sur l'honneur l'exactitude des informations fournies",
													)}
												</label>
											</div>
											{fieldState.error && (
												<FieldError errors={[fieldState.error]} />
											)}
										</Field>
									)}
								/>
							</div>
						)}

						{/* Navigation Buttons */}
						<div className="flex justify-between pt-6 gap-3">
							{step > 0 && (
									<Button
										type="button"
										variant="outline"
										onClick={handlePrevious}
										disabled={isSubmitting}
									>
										{t("common.previous")}
									</Button>
								)}
								<div className="ml-auto flex-1 md:flex-none">
									{step < lastStepIndex ? (
										<Button
											type="button"
											className="w-full md:w-auto"
											onClick={handleNext}
											disabled={isSubmitting}
										>
											{t("common.next")}
										</Button>
									) : (
										<Button
											type="button"
											className="w-full md:w-auto"
											onClick={handleSubmit}
											disabled={isSubmitting}
										>
											{isSubmitting && (
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											)}
											{t("register.submit")}
										</Button>
									)}
								</div>
						</div>
					</CardContent>
				</Card>
			</FormProvider>
		</div>
	);
}
