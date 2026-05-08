/**
 * ForeignerRegistrationForm - Multi-Step Registration for Foreign Users
 * Architecture mirrors CitizenRegistrationForm:
 * - React Hook Form + Zod validation
 * - registrationConfig-driven steps
 * - IndexedDB deferred file storage + localStorage form persistence
 * - AI document extraction (passport scan → pre-fill)
 * - Submission: createProfile only (NO consular registration request)
 */

import { api } from "@convex/_generated/api";
import { CountryCode, Gender, PublicUserType } from "@convex/lib/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import { useConvexAuth, useMutation } from "convex/react";
import {
	AlertTriangle,
	ArrowRight,
	CheckCircle2,
	Compass,
	CreditCard,
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
} from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
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
import { CountrySelect } from "@/components/ui/country-select";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
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
// VALIDATION SCHEMA
// ============================================================================

function buildForeignerSchema(_config: RegistrationConfig) {
	return z.object({
		// Documents (checked by step logic, optional at schema level)
		documents: z
			.object({
				identityPhoto: z.string().optional(),
				passport: z.string().optional(),
			})
			.optional(),

		// Basic Info
		basicInfo: z.object({
			firstName: z.string().min(1),
			lastName: z.string().min(1),
			gender: z.string().optional(),
			birthDate: z.string().optional(),
			birthPlace: z.string().optional(),
			birthCountry: z.string().optional(),
			nationality: z.string().optional(),
			// Passport fields
			passportNumber: z.string().min(6).optional().or(z.literal("")),
			passportIssueDate: z.string().optional(),
			passportExpiryDate: z.string().optional(),
			passportIssuingAuthority: z.string().optional(),
		}),

		// Contact Info
		contactInfo: z.object({
			email: z.string().email().optional().or(z.literal("")),
			phone: z.string().optional(),
			street: z.string().optional(),
			city: z.string().optional(),
			postalCode: z.string().optional(),
			country: z.string().optional(),
			// GPS coordinates of the residence (set by Places autocomplete)
			coordinates: z
				.object({
					lat: z.number(),
					lng: z.number(),
				})
				.optional(),
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
						email: z.string().optional(),
						country: z.string().optional(),
					}),
				)
				.min(1, { message: "errors.profile.contacts.emergency.atLeastOne" }),
		}),

		acceptTerms: z.boolean().refine((v) => v === true),
	});
}

// Inferred type
type ForeignerFormValues = {
	documents?: {
		identityPhoto?: string;
		passport?: string;
	};
	basicInfo: {
		firstName: string;
		lastName: string;
		gender?: string;
		birthDate?: string;
		birthPlace?: string;
		birthCountry?: string;
		nationality?: string;
		passportNumber?: string;
		passportIssueDate?: string;
		passportExpiryDate?: string;
		passportIssuingAuthority?: string;
	};
	contactInfo: {
		email?: string;
		phone?: string;
		street?: string;
		city?: string;
		postalCode?: string;
		country?: string;
		coordinates?: { lat: number; lng: number };
		emergencyContacts: Array<{
			firstName: string;
			lastName: string;
			phone: string;
			email?: string;
			country?: string;
		}>;
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
	MapPin,
	Eye,
	CreditCard,
	Compass,
};

// ============================================================================
// EMERGENCY CONTACTS SECTION
// ============================================================================

function ForeignerEmergencyContactsSection({
	form,
	t,
}: {
	form: ReturnType<typeof useForm<ForeignerFormValues>>;
	t: ReturnType<typeof useTranslation>["t"];
}) {
	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "contactInfo.emergencyContacts",
	});

	return (
		<FieldSet className="mt-6">
			<FieldLegend>{t("profile.sections.emergencyContacts")}</FieldLegend>

			{/* Recommendation */}
			<div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 mb-4 dark:border-blue-800 dark:bg-blue-950">
				<Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
				<p className="text-xs text-blue-800 dark:text-blue-200">
					{t("profile.emergencyContacts.recommendation")}
				</p>
			</div>

			<FieldGroup className="space-y-4">
				{fields.map((field, index) => (
					<div
						key={field.id}
						className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-100 dark:border-red-900 relative"
					>
						<p className="text-sm font-medium text-red-800 dark:text-red-200 mb-3">
							{t("profile.emergencyContacts.contactNumber", {
								number: index + 1,
							})}
						</p>
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
						<div className="mb-3">
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
										<Input {...f} />
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
										<Input {...f} />
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
										<Input type="tel" {...f} />
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
										<Input type="email" {...f} />
									</Field>
								)}
							/>
						</div>
					</div>
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
			</FieldGroup>
		</FieldSet>
	);
}

// ============================================================================
// COMPONENT
// ============================================================================

interface ForeignerRegistrationFormProps {
	initialVisaType?: PublicUserType;
	onComplete?: () => void;
}

export function ForeignerRegistrationForm({
	initialVisaType = PublicUserType.VisaTourism,
	onComplete,
}: ForeignerRegistrationFormProps) {
	const { t } = useTranslation();
	const formId = useId();
	const { isLoading: isAuthLoading } = useConvexAuth();
	const { userData } = useCitizenData();
	const { mutateAsync: createProfile } = useConvexMutationQuery(
		api.functions.profiles.createFromRegistration,
	);

	// Convex mutations for deferred upload
	const generateUploadUrl = useMutation(
		api.functions.documents.generateUploadUrl,
	);
	const createDocument = useMutation(api.functions.documents.create);

	// Stay purpose determines the PublicUserType and hence the form config
	const [stayPurpose, setStayPurpose] = useState<PublicUserType>(
		initialVisaType || PublicUserType.VisaTourism,
	);

	// Use the selected purpose as the userType for config
	const userType = stayPurpose;
	const regConfig = getRegistrationConfig(userType);
	const registrationSchema = buildForeignerSchema(regConfig);

	// Local persistence (IndexedDB + localStorage)
	const userEmail = userData?.email;
	const regStorage = useRegistrationStorage(userEmail);

	// Local file state for DocumentUploadZone (localOnly mode)
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

	// Step index — 0 = first form step from config
	const [step, setStep] = useState(0);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isScanning, setIsScanning] = useState(false);
	const [formRestored, setFormRestored] = useState(false);

	// Submission progress state
	type SubmissionState =
		| "idle"
		| "uploading_documents"
		| "creating_profile"
		| "success"
		| "error";
	const [submissionState, setSubmissionState] =
		useState<SubmissionState>("idle");

	// AI document extraction (base64 variant for local files)
	const { mutateAsync: extractDataFromImages } = useConvexActionQuery(
		api.ai.documentExtraction.extractRegistrationDataFromImages,
	);

	// Initialize form with dynamic schema
	const form = useForm<ForeignerFormValues>({
		resolver: zodResolver(registrationSchema as any),
		mode: "onChange",
		defaultValues: {
			documents: {},
			basicInfo: {
				firstName: "",
				lastName: "",
			},
			contactInfo: {
				email: userData?.email || "",
				phone: userData?.phone || "",
				country: CountryCode.FR,
				emergencyContacts: [
					{ firstName: "", lastName: "", phone: "", email: "", country: "" },
				],
			},
			acceptTerms: false,
		},
	});

	// Track registration start on mount
	useEffect(() => {
		captureEvent("registration_started");
	}, []);

	// Dynamic steps from config
	const steps = useMemo(
		() =>
			regConfig.steps.map((s, index) => ({
				id: index,
				stepId: s.id,
				label: t(s.labelKey),
				icon: STEP_ICON_MAP[s.icon] || User,
			})),
		[regConfig.steps, t],
	);

	const currentStepId = steps[step]?.stepId;
	const lastStepIndex = steps.length - 1;

	// Auto-save debounce
	const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const handleAutoSave = useCallback(() => {
		if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
		autoSaveTimerRef.current = setTimeout(() => {
			const stepId = steps[step]?.stepId;
			if (stepId && stepId !== "documents" && stepId !== "review" && stepId !== "purpose") {
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
		Record<RegistrationStepId, (keyof ForeignerFormValues)[]>
	> = {
		purpose: [],
		documents: [],
		basicInfo: ["basicInfo"],
		contacts: ["contactInfo"],
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

			const result = await form.trigger(
				fields as Parameters<typeof form.trigger>[0],
			);
			return result;
		},
		[form, steps, localFileInfos, regConfig.documents, t],
	);

	// Restore form data from localStorage on mount
	useEffect(() => {
		if (!regStorage.isReady || !userEmail || formRestored) return;

		const stored = regStorage.getStoredData();
		if (stored) {
			for (const [, stepData] of Object.entries(stored.steps)) {
				if (stepData && typeof stepData === "object") {
					for (const [fieldPath, value] of Object.entries(
						stepData as Record<string, unknown>,
					)) {
						if (value !== undefined && value !== null && value !== "") {
							// @ts-expect-error Trust localStorage structure matches form schema
							form.setValue(fieldPath, value);
						}
					}
				}
			}

			if (stored.lastStep > 0 && stored.lastStep <= lastStepIndex) {
				setStep(stored.lastStep);
			}

			toast.info(t("register.dataRestored"));
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
					form.setValue(`documents.${docKey}` as any, `local_${docKey}`);
				} else {
					infos[docKey] = null;
				}
			}
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
		regConfig.documents,
		lastStepIndex,
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
				contacts: ["contactInfo"],
			};

			const fieldsToSave = currentStepId
				? stepFieldMapById[currentStepId]
				: undefined;
			if (fieldsToSave) {
				const stepData: Record<string, unknown> = {};
				for (const field of fieldsToSave) {
					// @ts-expect-error Safely retrieving path-based fields
					const values = form.getValues(field);
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

			// Step 2: Create profile in Convex (profile only — no consular request)
			setSubmissionState("creating_profile");
			await createProfile({
				userType,
				email: data.contactInfo?.email || undefined,
				phone: data.contactInfo?.phone || undefined,
				identity: {
					firstName: data.basicInfo.firstName,
					lastName: data.basicInfo.lastName,
					gender: data.basicInfo.gender as Gender | undefined,
					birthDate: data.basicInfo.birthDate,
					birthPlace: data.basicInfo.birthPlace,
					birthCountry: data.basicInfo.birthCountry as CountryCode | undefined,
					nationality: data.basicInfo.nationality as CountryCode | undefined,
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
									country:
										(data.contactInfo.country as CountryCode) || CountryCode.FR,
									...(data.contactInfo.coordinates
										? { coordinates: data.contactInfo.coordinates }
										: {}),
								},
							}
						: {}),
				},
				emergencyContacts: data.contactInfo.emergencyContacts
					?.filter((c) => c.firstName || c.lastName || c.phone)
					.map((c) => ({
						firstName: c.firstName || "",
						lastName: c.lastName || "",
						phone: c.phone || "",
						email: c.email || undefined,
						country: c.country || undefined,
					})),
				documents:
					Object.keys(documentIds).length > 0
						? {
								passport: documentIds.passport as any,
								identityPhoto: documentIds.identityPhoto as any,
							}
						: undefined,
			});

			// No consular registration request for foreigners — just profile
			setSubmissionState("success");
			captureEvent("registration_submitted", {
				marital_status: undefined,
				has_children: false,
				jurisdiction_country: data.contactInfo.country,
			});

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
		const docTypes = ["identityPhoto", "passport"];

		for (const docType of docTypes) {
			const result = await regStorage.fileToBase64(docType);
			if (result) {
				images.push(result);
			}
		}

		if (images.length === 0) {
			toast.error(t("register.scan.noDocuments"));
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
			const { basicInfo, passportInfo, contactInfo } = result.data;
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
				form.setValue("basicInfo.gender", basicInfo.gender as string);
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
					basicInfo.birthCountry.toUpperCase(),
				);
				fieldsUpdated++;
			}
			if (basicInfo.nationality && !form.getValues("basicInfo.nationality")) {
				form.setValue(
					"basicInfo.nationality",
					basicInfo.nationality.toUpperCase(),
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

			// Contact info — residence address
			if (contactInfo.street && !form.getValues("contactInfo.street")) {
				form.setValue("contactInfo.street", contactInfo.street);
				fieldsUpdated++;
			}
			if (contactInfo.city && !form.getValues("contactInfo.city")) {
				form.setValue("contactInfo.city", contactInfo.city);
				fieldsUpdated++;
			}
			if (contactInfo.postalCode && !form.getValues("contactInfo.postalCode")) {
				form.setValue("contactInfo.postalCode", contactInfo.postalCode);
				fieldsUpdated++;
			}
			if (contactInfo.country && !form.getValues("contactInfo.country")) {
				form.setValue("contactInfo.country", contactInfo.country.toUpperCase());
				fieldsUpdated++;
			}

			captureEvent("registration_ai_scan_used", {
				documents_scanned: images.length,
				fields_extracted: fieldsUpdated,
				scan_duration_ms: Date.now() - scanStart,
				confidence: result.confidence ?? 0,
			});

			if (fieldsUpdated > 0) {
				toast.success(
					t("register.scan.success", {
						count: fieldsUpdated,
					}),
				);
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
				<Loader2 className="h-8 w-8 animate-spin text-gabon-blue" />
			</div>
		);
	}

	// ============================================================================
	// SUBMISSION PROGRESS / SUCCESS / ERROR SCREEN
	// ============================================================================

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
											? "bg-gabon-blue/20 animate-pulse"
											: "bg-gabon-blue text-white"
									}`}
								>
									{submissionState === "uploading_documents" ? (
										<Loader2 className="h-5 w-5 animate-spin text-gabon-blue" />
									) : (
										<CheckCircle2 className="h-5 w-5" />
									)}
								</div>
								<span
									className={`font-medium ${
										submissionState === "uploading_documents"
											? "text-gabon-blue"
											: "text-foreground"
									}`}
								>
									{t("register.submitting.uploading")}
								</span>
							</div>

							{/* Step 1: Creating Profile */}
							<div className="flex items-center gap-4">
								<div
									className={`w-10 h-10 rounded-full flex items-center justify-center ${
										submissionState === "creating_profile"
											? "bg-gabon-blue/20 animate-pulse"
											: submissionState === "uploading_documents"
												? "bg-muted text-muted-foreground"
												: "bg-gabon-blue text-white"
									}`}
								>
									{submissionState === "creating_profile" ? (
										<Loader2 className="h-5 w-5 animate-spin text-gabon-blue" />
									) : submissionState === "uploading_documents" ? (
										<User className="h-5 w-5" />
									) : (
										<CheckCircle2 className="h-5 w-5" />
									)}
								</div>
								<span
									className={`font-medium ${
										submissionState === "creating_profile"
											? "text-gabon-blue"
											: submissionState === "uploading_documents"
												? "text-muted-foreground"
												: "text-foreground"
									}`}
								>
									{t("register.submitting.creatingProfile")}
								</span>
							</div>
						</div>

						{/* Success */}
						{submissionState === "success" && (
							<div className="text-center space-y-4 pt-4">
								<div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto">
									<CheckCircle2 className="h-8 w-8 text-gabon-blue" />
								</div>
								<h3 className="text-xl font-semibold">
									{t("register.success.profileCreated")}
								</h3>
								<p className="text-muted-foreground text-sm">
									{t("register.success.profileCreatedDesc")}
								</p>
								<Button onClick={onComplete} className="mt-4">
									{t("register.success.goToSpace")}
									<ArrowRight className="ml-2 h-4 w-4" />
								</Button>
							</div>
						)}

						{/* Error */}
						{submissionState === "error" && (
							<div className="text-center space-y-4 pt-4">
								<div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
									<AlertTriangle className="h-8 w-8 text-red-600" />
								</div>
								<h3 className="text-xl font-semibold text-destructive">
									{t("register.error.title")}
								</h3>
								<p className="text-muted-foreground text-sm">
									{t("register.error.description")}
								</p>
								<Button
									onClick={() => {
										setSubmissionState("idle");
										setIsSubmitting(false);
									}}
									variant="outline"
								>
									{t("common.back")}
								</Button>
							</div>
						)}
					</div>
				</Card>
			</div>
		);
	}

	// ============================================================================
	// STEPPER
	// ============================================================================

	const renderStepper = () => (
		<div className="mb-8">
			{/* Mobile: compact progress indicator */}
			<div className="md:hidden space-y-2">
				{(() => {
					const currentStep = steps[step];
					const StepIcon = currentStep?.icon;
					return (
						<>
							<div className="flex items-center justify-between text-sm">
								<div className="flex items-center gap-2">
									{StepIcon && <StepIcon className="h-4 w-4 text-gabon-blue" />}
									<span className="font-medium text-foreground">
										{step === 0
											? t("register.foreigner.steps.account.title")
											: currentStep?.label}
									</span>
								</div>
								<span className="text-muted-foreground text-xs">
									{step + 1}/{steps.length}
								</span>
							</div>
							<div className="w-full bg-muted rounded-full h-1.5">
								<div
									className="bg-gabon-blue h-1.5 rounded-full transition-all duration-300"
									style={{ width: `${((step + 1) / steps.length) * 100}%` }}
								/>
							</div>
						</>
					);
				})()}
			</div>

			{/* Desktop: full horizontal step icons */}
			<div className="hidden md:flex items-center justify-between relative">
				{steps.map((s, index) => {
					const StepIcon = s.icon;
					const isCompleted = index < step;
					const isCurrent = index === step;

					return (
						<div
							key={s.stepId}
							className="flex flex-col items-center relative z-10"
							style={{ flex: 1 }}
						>
							{/* Connector line */}
							{index < steps.length - 1 && (
								<div
									className="absolute top-5 h-0.5"
									style={{
										left: "calc(50% + 20px)",
										width: "calc(100% - 40px)",
									}}
								>
									<div
										className={`h-full ${isCompleted ? "bg-gabon-blue" : "bg-muted"}`}
									/>
								</div>
							)}

							{/* Step circle */}
							<div
								className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
									isCompleted
										? "bg-gabon-blue text-white shadow-sm"
										: isCurrent
											? "bg-gabon-blue/20 text-gabon-blue border-2 border-gabon-blue"
											: "bg-muted text-muted-foreground"
								}`}
							>
								{isCompleted ? (
									<CheckCircle2 className="h-5 w-5" />
								) : (
									<StepIcon className="h-5 w-5" />
								)}
							</div>

							{/* Label */}
							<span
								className={`text-xs mt-2 text-center max-w-[80px] truncate ${
									isCurrent
										? "text-gabon-blue font-semibold"
										: isCompleted
											? "text-foreground"
											: "text-muted-foreground"
								}`}
							>
								{index === 0
									? t("register.foreigner.steps.account.title")
									: s.label}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);

	// ============================================================================
	// STEP RENDERERS
	// ============================================================================

	// --------------------------------------------------------------------------
	// Purpose Step — Choose the stay reason (determines PublicUserType)
	// --------------------------------------------------------------------------
	const PURPOSE_OPTIONS = [
		{
			type: PublicUserType.VisaTourism,
			titleKey: "register.foreigner.purpose.tourism.title",
			descKey: "register.foreigner.purpose.tourism.description",
			icon: "",
			features: [
				"register.foreigner.purpose.tourism.feature1",
				"register.foreigner.purpose.tourism.feature2",
			],
		},
		{
			type: PublicUserType.VisaBusiness,
			titleKey: "register.foreigner.purpose.business.title",
			descKey: "register.foreigner.purpose.business.description",
			icon: "",
			features: [
				"register.foreigner.purpose.business.feature1",
				"register.foreigner.purpose.business.feature2",
			],
		},
		{
			type: PublicUserType.VisaLongStay,
			titleKey: "register.foreigner.purpose.longStay.title",
			descKey: "register.foreigner.purpose.longStay.description",
			icon: "",
			features: [
				"register.foreigner.purpose.longStay.feature1",
				"register.foreigner.purpose.longStay.feature2",
			],
		},
		{
			type: PublicUserType.AdminServices,
			titleKey: "register.foreigner.purpose.admin.title",
			descKey: "register.foreigner.purpose.admin.description",
			icon: "",
			features: [
				"register.foreigner.purpose.admin.feature1",
				"register.foreigner.purpose.admin.feature2",
			],
		},
	];

	const renderPurposeStep = () => (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Compass className="h-5 w-5 text-gabon-blue" />
					{t("register.foreigner.purpose.title")}
				</CardTitle>
				<CardDescription>
					{t("register.foreigner.purpose.description")}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid gap-4 sm:grid-cols-2">
					{PURPOSE_OPTIONS.map((opt) => {
						const isSelected = stayPurpose === opt.type;
						return (
							<button
								key={opt.type}
								type="button"
								onClick={() => setStayPurpose(opt.type)}
								className={`relative rounded-xl border-2 p-5 text-left transition-all hover:shadow-md ${
									isSelected
										? "border-gabon-blue bg-gabon-blue/5 shadow-sm"
										: "border-muted hover:border-gabon-blue/30"
								}`}
							>
								{isSelected && (
									<div className="absolute top-3 right-3">
										<CheckCircle2 className="h-5 w-5 text-gabon-blue" />
									</div>
								)}
								<div className="text-2xl mb-2">{opt.icon}</div>
								<h4 className="font-semibold text-base">{t(opt.titleKey)}</h4>
								<p className="text-sm text-muted-foreground mt-1">
									{t(opt.descKey)}
								</p>
								<ul className="mt-3 space-y-1">
									{opt.features.map((fKey) => (
										<li
											key={fKey}
											className="text-xs text-muted-foreground flex items-center gap-1.5"
										>
											<CheckCircle2 className="h-3 w-3 text-gabon-blue/60" />
											{t(fKey)}
										</li>
									))}
								</ul>
							</button>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);

	// --------------------------------------------------------------------------
	// Documents Step
	// --------------------------------------------------------------------------
	const renderDocumentsStep = () => (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<FileText className="h-5 w-5 text-gabon-blue" />
					{t("register.foreigner.steps.documents.title")}
				</CardTitle>
				<CardDescription>
					{t("register.foreigner.steps.documents.description")}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* AI Scan Panel - visible when at least one document is uploaded */}
				{Object.values(localFileInfos).some(Boolean) && (
					<div className="p-4 rounded-lg border border-dashed border-gabon-blue/50 bg-gabon-blue/5">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<h4 className="text-sm font-medium text-gabon-blue flex items-center gap-2">
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

				{/* Document Upload Zones */}
				<div className="grid gap-4">
					{regConfig.documents.map((docDef) => (
						<DocumentUploadZone
							key={docDef.key}
							label={t(docDef.labelKey)}
							documentType={docDef.documentType}
							category={docDef.category}
							required={docDef.required}
							multiple={false}
							localOnly
							localFile={localFileInfos[docDef.key]}
							externalError={docErrors[docDef.key]}
							onLocalFileSelected={async (file: File) => {
								// Save to IndexedDB
								await regStorage.saveFile(docDef.key, file);
								setLocalFileInfos((prev) => ({
									...prev,
									[docDef.key]: {
										filename: file.name,
										mimeType: file.type,
									},
								}));
								// Clear inline error for this document
								setDocErrors((prev) => ({ ...prev, [docDef.key]: null }));
								// Mark in form state
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
								form.setValue(`documents.${docDef.key}` as any, undefined);
							}}
						/>
					))}
				</div>
			</CardContent>
		</Card>
	);

	const renderIdentityStep = () => (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<User className="h-5 w-5 text-gabon-blue" />
					{t("register.foreigner.steps.basicInfo.title")}
				</CardTitle>
				<CardDescription>
					{t("register.foreigner.steps.basicInfo.description")}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<FieldSet>
					<FieldGroup>
						{/* First Name / Last Name */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<Controller
								name="basicInfo.firstName"
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor={`${formId}-firstName`}>
											{t("common.firstName")} *
										</FieldLabel>
										<Input
											id={`${formId}-firstName`}
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
										<FieldLabel htmlFor={`${formId}-lastName`}>
											{t("common.lastName")} *
										</FieldLabel>
										<Input
											id={`${formId}-lastName`}
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

						{/* Birth Date / Birth Place */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<Controller
								name="basicInfo.birthDate"
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor={`${formId}-birthDate`}>
											{t("profile.fields.birthDate")}
										</FieldLabel>
										<Input
											id={`${formId}-birthDate`}
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
										<FieldLabel htmlFor={`${formId}-birthPlace`}>
											{t("profile.fields.birthPlace")}
										</FieldLabel>
										<Input
											id={`${formId}-birthPlace`}
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

						{/* Gender */}
						<Controller
							name="basicInfo.gender"
							control={form.control}
							render={({ field }) => (
								<Field>
									<FieldLabel>{t("profile.fields.gender")}</FieldLabel>
									<MultiSelect
										type="single"
										options={[
											{ value: Gender.Male, label: t("profile.gender.male") },
											{
												value: Gender.Female,
												label: t("profile.gender.female"),
											},
										]}
										selected={field.value}
										onChange={field.onChange}
										placeholder={t("profile.placeholders.select")}
									/>
								</Field>
							)}
						/>

						{/* Nationality */}
						<Controller
							name="basicInfo.nationality"
							control={form.control}
							render={({ field }) => (
								<Field>
									<FieldLabel>{t("profile.fields.nationality")}</FieldLabel>
									<CountrySelect
										type="single"
										selected={field.value as CountryCode}
										onChange={field.onChange}
									/>
								</Field>
							)}
						/>
					</FieldGroup>
				</FieldSet>

				{/* Passport Section */}
				<FieldSet className="mt-6">
					<FieldLegend>{t("register.foreigner.step2.title")}</FieldLegend>
					<FieldGroup>
						{/* Passport Number */}
						<Controller
							name="basicInfo.passportNumber"
							control={form.control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor={`${formId}-passportNumber`}>
										{t("register.foreigner.passportNumber")}
									</FieldLabel>
									<Input
										id={`${formId}-passportNumber`}
										aria-invalid={fieldState.invalid}
										{...field}
									/>
									{fieldState.error && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<Controller
								name="basicInfo.passportIssueDate"
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor={`${formId}-passportIssueDate`}>
											{t("register.foreigner.passportIssueDate")}
										</FieldLabel>
										<Input
											id={`${formId}-passportIssueDate`}
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
								name="basicInfo.passportExpiryDate"
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor={`${formId}-passportExpiryDate`}>
											{t("register.foreigner.passportExpiryDate")}
										</FieldLabel>
										<Input
											id={`${formId}-passportExpiryDate`}
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
						</div>

						<Controller
							name="basicInfo.passportIssuingAuthority"
							control={form.control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor="passportIssuingAuthority">
										{t("register.foreigner.passportIssuingCountry")}
									</FieldLabel>
									<Input
										id="passportIssuingAuthority"
										aria-invalid={fieldState.invalid}
										{...field}
									/>
									{fieldState.error && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>
					</FieldGroup>
				</FieldSet>
			</CardContent>
		</Card>
	);

	const renderContactsStep = () => (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<MapPin className="h-5 w-5 text-gabon-blue" />
					{t("register.foreigner.steps.contacts.title")}
				</CardTitle>
				<CardDescription>
					{t("register.foreigner.steps.contacts.description")}
				</CardDescription>
			</CardHeader>
			<CardContent>
				{/* Email & Phone */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
					<Controller
						name="contactInfo.email"
						control={form.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={`${formId}-contactEmail`}>
									{t("profile.fields.email")}
								</FieldLabel>
								<Input
									id={`${formId}-contactEmail`}
									type="email"
									placeholder="email@example.com"
									{...field}
								/>
								{fieldState.error && <FieldError errors={[fieldState.error]} />}
							</Field>
						)}
					/>
					<Controller
						name="contactInfo.phone"
						control={form.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={`${formId}-contactPhone`}>
									{t("profile.fields.phone")}
								</FieldLabel>
								<Input
									id={`${formId}-contactPhone`}
									type="tel"
									placeholder="+33..."
									{...field}
								/>
								{fieldState.error && <FieldError errors={[fieldState.error]} />}
							</Field>
						)}
					/>
				</div>

				<FieldSet>
					<FieldLegend>{t("profile.sections.addressAbroad")}</FieldLegend>
					<FieldGroup>
						<AddressWithAutocomplete form={form} t={t} />
					</FieldGroup>
				</FieldSet>

				{/* Emergency Contacts — Dynamic list */}
				<ForeignerEmergencyContactsSection form={form} t={t} />
			</CardContent>
		</Card>
	);

	const renderReviewStep = () => {
		const data = form.getValues();
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Eye className="h-5 w-5 text-gabon-blue" />
						{t("register.foreigner.step5.title")}
					</CardTitle>
					<CardDescription>
						{t("register.foreigner.step5.description")}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Summary sections */}
					<div className="space-y-4">
						{/* Identity */}
						<div className="p-4 rounded-lg bg-muted/50">
							<h4 className="font-medium text-sm mb-2 flex items-center gap-2">
								<User className="h-4 w-4" />
								{t("register.foreigner.steps.basicInfo.title")}
							</h4>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
								<div>
									<span className="text-muted-foreground">
										{t("register.review.fields.firstName")}:
									</span>{" "}
									{data.basicInfo.firstName || "—"}
								</div>
								<div>
									<span className="text-muted-foreground">
										{t("register.review.fields.lastName")}:
									</span>{" "}
									{data.basicInfo.lastName || "—"}
								</div>
								{data.basicInfo.birthDate && (
									<div>
										<span className="text-muted-foreground">
											{t("profile.fields.birthDate")}:
										</span>{" "}
										{data.basicInfo.birthDate}
									</div>
								)}
							</div>
						</div>

						{/* Passport */}
						{data.basicInfo.passportNumber && (
							<div className="p-4 rounded-lg bg-muted/50">
								<h4 className="font-medium text-sm mb-2 flex items-center gap-2">
									<CreditCard className="h-4 w-4" />
									{t("register.foreigner.steps.passport.title")}
								</h4>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
									<div>
										<span className="text-muted-foreground">
											{t("register.review.fields.passportNumber")}:
										</span>{" "}
										{data.basicInfo.passportNumber}
									</div>
									{data.basicInfo.passportExpiryDate && (
										<div>
											<span className="text-muted-foreground">
												{t("register.foreigner.passportExpiryDate")}:
											</span>{" "}
											{data.basicInfo.passportExpiryDate}
										</div>
									)}
								</div>
							</div>
						)}

						{/* Address */}
						{data.contactInfo.street && (
							<div className="p-4 rounded-lg bg-muted/50">
								<h4 className="font-medium text-sm mb-2 flex items-center gap-2">
									<MapPin className="h-4 w-4" />
									{t("register.foreigner.steps.contacts.title")}
								</h4>
								<p className="text-sm">
									{data.contactInfo.street}
									{data.contactInfo.city && `, ${data.contactInfo.city}`}
									{data.contactInfo.postalCode &&
										` ${data.contactInfo.postalCode}`}
								</p>
							</div>
						)}

						{/* Documents */}
						<div className="p-4 rounded-lg bg-muted/50">
							<h4 className="font-medium text-sm mb-2 flex items-center gap-2">
								<FileText className="h-4 w-4" />
								{t("register.foreigner.steps.documents.title")}
							</h4>
							<div className="space-y-1 text-sm">
								{regConfig.documents.map((doc) => (
									<div key={doc.key} className="flex items-center gap-2">
										{localFileInfos[doc.key] ? (
											<CheckCircle2 className="h-4 w-4 text-green-500" />
										) : (
											<AlertTriangle className="h-4 w-4 text-yellow-500" />
										)}
										<span>
											{t(doc.labelKey)}:{" "}
											{localFileInfos[doc.key]
												? localFileInfos[doc.key]!.filename
												: t("register.scan.notReady")}
										</span>
									</div>
								))}
							</div>
						</div>
					</div>

					{/* Note */}
					<Alert>
						<CheckCircle2 className="h-4 w-4" />
						<AlertTitle>{t("register.foreigner.readyToSubmit")}</AlertTitle>
						<AlertDescription>
							{t("register.foreigner.submissionNote")}
						</AlertDescription>
					</Alert>

					{/* Certifications */}
					<div className="space-y-3">
						<Controller
							name="acceptTerms"
							control={form.control}
							render={({ field, fieldState }) => (
								<div className="space-y-2">
									<div className="flex items-center gap-3">
										<Checkbox
											id={`${formId}-certify`}
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
										<label
											htmlFor={`${formId}-certify`}
											className="text-sm cursor-pointer"
										>
											{t("register.foreigner.certifyInfo")}
										</label>
									</div>
									{fieldState.error && (
										<p className="text-xs text-destructive">
											{t("register.foreigner.certifyInfo")}
										</p>
									)}
								</div>
							)}
						/>
					</div>
				</CardContent>
			</Card>
		);
	};

	// ============================================================================
	// MAIN RENDER
	// ============================================================================

	// Map step IDs to render functions
	const renderStepContent = () => {
		switch (currentStepId) {
			case "purpose":
				return renderPurposeStep();
			case "documents":
				return renderDocumentsStep();
			case "basicInfo":
				return renderIdentityStep();
			case "contacts":
				return renderContactsStep();
			case "review":
				return renderReviewStep();
			default:
				return null;
		}
	};

	return (
		<FormProvider {...form}>
			<div className="w-full space-y-6">
				{/* Header */}
				<div className="text-center">
					<h1 className="text-2xl font-bold">
						{t("register.foreigner.title")}
					</h1>
					<p className="text-muted-foreground mt-1">
						{t("register.foreigner.subtitle")}
					</p>
				</div>

				{/* Stepper */}
				{renderStepper()}

				{/* Save indicator */}
				{regStorage.lastSavedAt &&
					currentStepId !== "documents" &&
					currentStepId !== "review" &&
					currentStepId !== "purpose" && (
						<div className="flex items-center gap-1.5 text-xs text-muted-foreground justify-end">
							<CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
							Brouillon sauvegardé ·{" "}
							{regStorage.lastSavedAt.toLocaleTimeString("fr-FR", {
								hour: "2-digit",
								minute: "2-digit",
							})}
						</div>
					)}

				{/* Step Content */}
				<div onBlur={handleAutoSave}>
					{renderStepContent()}
				</div>

				{/* Navigation Buttons */}
				{step >= 0 && (
					<div className="flex justify-between">
						<Button
							type="button"
							variant="outline"
							onClick={handlePrevious}
							disabled={step <= 0 || isSubmitting}
						>
							{t("common.previous")}
						</Button>

						{step < lastStepIndex ? (
							<Button
								type="button"
								onClick={handleNext}
								disabled={isSubmitting}
							>
								{t("common.next")}
								<ArrowRight className="ml-2 h-4 w-4" />
							</Button>
						) : (
							<Button
								type="button"
								onClick={handleSubmit}
								disabled={isSubmitting || !form.getValues("acceptTerms")}
								className="bg-gabon-blue hover:bg-gabon-blue/90"
							>
								{isSubmitting ? (
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
								) : (
									<CheckCircle2 className="h-4 w-4 mr-2" />
								)}
								{t("register.foreigner.submit")}
							</Button>
						)}
					</div>
				)}
			</div>
		</FormProvider>
	);
}
