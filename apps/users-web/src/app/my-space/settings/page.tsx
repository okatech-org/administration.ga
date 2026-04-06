"use client";

import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import {
	CountryCode,
	Gender,
	MaritalStatus,
	NationalityAcquisition,
} from "@convex/lib/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import {
	Bell,
	Briefcase,
	Check,
	ChevronDown,
	FileText,
	FolderOpen,
	KeyRound,
	Loader2,
	Lock,
	LogOut,
	Mail,
	MapPin,
	Palette,
	Save,
	Trash2,
	User,
	Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
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
import {
	SettingsDivider,
	SettingsLayout,
	SettingsRow,
	SettingsSectionHeader,
	type SettingsTab,
} from "@/components/shared/settings-layout";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { FlagIcon } from "@/components/ui/flag-icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { type ConsularTheme, useConsularTheme } from "@/hooks/useConsularTheme";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { captureEvent } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import {
	getChangedFields,
	transformFormDataToPayload,
} from "@/lib/profile-utils";
import { cn } from "@/lib/utils";
import {
	type ProfileFormValues,
	profileFormSchema,
} from "@/lib/validation/profile";

function ThemePreview({
	themeId,
	label,
	description,
	isActive,
	onClick,
}: {
	themeId: ConsularTheme;
	label: string;
	description: string;
	isActive: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer w-full text-left",
				isActive
					? "border-primary bg-primary/5 ring-2 ring-primary/20"
					: "border-border hover:border-muted-foreground/30 hover:bg-muted/30",
			)}
		>
			<div
				className={cn(
					"w-16 h-12 rounded-lg overflow-hidden relative shrink-0",
					themeId === "default"
						? "bg-card border border-border"
						: "bg-[oklch(0.92_0.005_250)]",
				)}
			>
				{themeId === "default" ? (
					<div className="p-1.5 space-y-1">
						<div className="h-1.5 w-5 bg-primary/20 rounded" />
						<div className="h-2.5 bg-muted rounded border border-border" />
						<div className="flex gap-0.5">
							<div className="h-2 flex-1 bg-muted rounded border border-border" />
							<div className="h-2 flex-1 bg-muted rounded border border-border" />
						</div>
					</div>
				) : (
					<div className="p-1.5 space-y-1">
						<div className="h-1.5 w-5 bg-primary/20 rounded" />
						<div
							className="h-2.5 rounded"
							style={{
								background: "oklch(0.92 0.005 250)",
								boxShadow:
									"2px 2px 4px oklch(0.7 0.01 250 / 0.35), -2px -2px 4px oklch(1 0 0 / 0.7)",
							}}
						/>
						<div className="flex gap-0.5">
							<div
								className="h-2 flex-1 rounded"
								style={{
									background: "oklch(0.92 0.005 250)",
									boxShadow:
										"2px 2px 4px oklch(0.7 0.01 250 / 0.35), -2px -2px 4px oklch(1 0 0 / 0.7)",
								}}
							/>
							<div
								className="h-2 flex-1 rounded"
								style={{
									background: "oklch(0.92 0.005 250)",
									boxShadow:
										"2px 2px 4px oklch(0.7 0.01 250 / 0.35), -2px -2px 4px oklch(1 0 0 / 0.7)",
								}}
							/>
						</div>
					</div>
				)}
			</div>

			<div className="flex-1 min-w-0">
				<p className="text-sm font-semibold">{label}</p>
				<p className="text-xs text-muted-foreground leading-tight truncate">
					{description}
				</p>
			</div>

			{isActive && <div className="w-3 h-3 rounded-full bg-primary shrink-0" />}
		</button>
	);
}

// ─── Accordion Section ────────────────────────────────────────
interface AccordionSectionProps {
	icon: React.ReactNode;
	title: string;
	description?: string;
	isOpen: boolean;
	onToggle: () => void;
	children: React.ReactNode;
	color?: string;
}

function AccordionSection({
	icon,
	title,
	description,
	isOpen,
	onToggle,
	children,
	color = "text-teal-600 dark:text-teal-400",
}: AccordionSectionProps) {
	return (
		<div className="border border-border/60 rounded-xl overflow-hidden transition-all duration-200">
			<button
				type="button"
				onClick={onToggle}
				className={cn(
					"w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors",
					isOpen
						? "bg-primary/5 border-b border-border/40"
						: "hover:bg-muted/50",
				)}
			>
				<div
					className={cn(
						"p-1.5 rounded-lg shrink-0",
						isOpen ? "bg-primary/10" : "bg-muted",
					)}
				>
					<span className={cn("block", isOpen ? color : "text-muted-foreground")}>
						{icon}
					</span>
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-sm font-semibold">{title}</p>
					{description && (
						<p className="text-xs text-muted-foreground mt-0.5 truncate">
							{description}
						</p>
					)}
				</div>
				<ChevronDown
					className={cn(
						"h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0",
						isOpen && "rotate-180",
					)}
				/>
			</button>
			<div
				className={cn(
					"transition-all duration-300 ease-in-out overflow-hidden",
					isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0",
				)}
			>
				<div className="p-4">{children}</div>
			</div>
		</div>
	);
}

// ─── Mon Dossier Tab ──────────────────────────────────────────
function MonDossierTab() {
	const { t } = useTranslation();
	const {
		data: profile,
		isPending,
	} = useAuthenticatedConvexQuery(api.functions.profiles.getMine, {});
	const { mutateAsync: updateProfile, isPending: isSaving } =
		useConvexMutationQuery(api.functions.profiles.update);

	const [openSections, setOpenSections] = useState<Set<string>>(
		new Set(["identity"]),
	);

	const toggleSection = (id: string) => {
		setOpenSections((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const form = useForm<ProfileFormValues>({
		resolver: zodResolver(profileFormSchema),
		mode: "onChange",
		defaultValues: {
			countryOfResidence: (profile as any)?.countryOfResidence || undefined,
			identity: {
				firstName: (profile as any)?.identity?.firstName || "",
				lastName: (profile as any)?.identity?.lastName || "",
				birthDate: (profile as any)?.identity?.birthDate
					? new Date((profile as any).identity.birthDate)
					: undefined,
				birthPlace: (profile as any)?.identity?.birthPlace || "",
				birthCountry:
					(profile as any)?.identity?.birthCountry || CountryCode.GA,
				gender: (profile as any)?.identity?.gender || Gender.Male,
				nationality: (profile as any)?.identity?.nationality || CountryCode.GA,
				nationalityAcquisition:
					(profile as any)?.identity?.nationalityAcquisition ||
					NationalityAcquisition.Birth,
			},
			passportInfo: (profile as any)?.passportInfo
				? {
						number: (profile as any).passportInfo.number || "",
						issueDate: (profile as any).passportInfo.issueDate
							? new Date((profile as any).passportInfo.issueDate)
							: undefined,
						expiryDate: (profile as any).passportInfo.expiryDate
							? new Date((profile as any).passportInfo.expiryDate)
							: undefined,
						issuingAuthority:
							(profile as any).passportInfo.issuingAuthority || "",
					}
				: undefined,
			addresses: {
				homeland: (profile as any)?.addresses?.homeland
					? {
							street: (profile as any).addresses.homeland.street || "",
							city: (profile as any).addresses.homeland.city || "",
							postalCode:
								(profile as any).addresses.homeland.postalCode || "",
							country:
								(profile as any).addresses.homeland.country ||
								CountryCode.GA,
						}
					: { street: "", city: "", postalCode: "", country: CountryCode.GA },
				residence: (profile as any)?.addresses?.residence
					? {
							street: (profile as any).addresses.residence.street || "",
							city: (profile as any).addresses.residence.city || "",
							postalCode:
								(profile as any).addresses.residence.postalCode || "",
							country:
								(profile as any).addresses.residence.country ||
								CountryCode.FR,
						}
					: { street: "", city: "", postalCode: "", country: CountryCode.FR },
			},
			contacts: {
				email: (profile as any)?.contacts?.email || "",
				phone: (profile as any)?.contacts?.phone || "",
				emergencyResidence:
					(profile as any)?.contacts?.emergencyResidence || undefined,
				emergencyHomeland:
					(profile as any)?.contacts?.emergencyHomeland || undefined,
			} as any,
			family: {
				maritalStatus:
					(profile as any)?.family?.maritalStatus || MaritalStatus.Single,
				father: (profile as any)?.family?.father || {
					firstName: "",
					lastName: "",
				},
				mother: (profile as any)?.family?.mother || {
					firstName: "",
					lastName: "",
				},
				spouse: (profile as any)?.family?.spouse || {
					firstName: "",
					lastName: "",
				},
			},
			profession: (profile as any)?.profession
				? {
						status: (profile as any).profession.status || undefined,
						title: (profile as any).profession.title || "",
						employer: (profile as any).profession.employer || "",
					}
				: { status: undefined, title: "", employer: "" },
		},
	});

	// Reset form when profile loads
	useEffect(() => {
		if (profile) {
			const p = profile as any;
			form.reset({
				countryOfResidence: p?.countryOfResidence || undefined,
				identity: {
					firstName: p?.identity?.firstName || "",
					lastName: p?.identity?.lastName || "",
					birthDate: p?.identity?.birthDate
						? new Date(p.identity.birthDate)
						: undefined,
					birthPlace: p?.identity?.birthPlace || "",
					birthCountry: p?.identity?.birthCountry || CountryCode.GA,
					gender: p?.identity?.gender || Gender.Male,
					nationality: p?.identity?.nationality || CountryCode.GA,
					nationalityAcquisition:
						p?.identity?.nationalityAcquisition ||
						NationalityAcquisition.Birth,
				},
				passportInfo: p?.passportInfo
					? {
							number: p.passportInfo.number || "",
							issueDate: p.passportInfo.issueDate
								? new Date(p.passportInfo.issueDate)
								: undefined,
							expiryDate: p.passportInfo.expiryDate
								? new Date(p.passportInfo.expiryDate)
								: undefined,
							issuingAuthority: p.passportInfo.issuingAuthority || "",
						}
					: undefined,
				addresses: {
					homeland: p?.addresses?.homeland
						? {
								street: p.addresses.homeland.street || "",
								city: p.addresses.homeland.city || "",
								postalCode: p.addresses.homeland.postalCode || "",
								country: p.addresses.homeland.country || CountryCode.GA,
							}
						: {
								street: "",
								city: "",
								postalCode: "",
								country: CountryCode.GA,
							},
					residence: p?.addresses?.residence
						? {
								street: p.addresses.residence.street || "",
								city: p.addresses.residence.city || "",
								postalCode: p.addresses.residence.postalCode || "",
								country: p.addresses.residence.country || CountryCode.FR,
							}
						: {
								street: "",
								city: "",
								postalCode: "",
								country: CountryCode.FR,
							},
				},
				contacts: {
					email: p?.contacts?.email || "",
					phone: p?.contacts?.phone || "",
					emergencyResidence: p?.contacts?.emergencyResidence || undefined,
					emergencyHomeland: p?.contacts?.emergencyHomeland || undefined,
				} as any,
				family: {
					maritalStatus: p?.family?.maritalStatus || MaritalStatus.Single,
					father: p?.family?.father || { firstName: "", lastName: "" },
					mother: p?.family?.mother || { firstName: "", lastName: "" },
					spouse: p?.family?.spouse || { firstName: "", lastName: "" },
				},
				profession: p?.profession
					? {
							status: p.profession.status || undefined,
							title: p.profession.title || "",
							employer: p.profession.employer || "",
						}
					: { status: undefined, title: "", employer: "" },
			});
		}
	}, [profile]);

	// AI form fill
	useFormFillEffect(form, "profile", PROFILE_FIELD_MAPPING);

	const handleSaveAll = async () => {
		if (!profile) return;
		try {
			const data = form.getValues();
			const changedFields = getChangedFields(
				data,
				profile as Doc<"profiles">,
			);
			const payload = transformFormDataToPayload(changedFields);

			if (Object.keys(payload).length > 0) {
				await updateProfile({
					id: (profile as any)._id,
					...payload,
				});
				captureEvent("myspace_profile_updated");
				toast.success(t("common.saved"));
			} else {
				toast.info("Aucune modification détectée");
			}
		} catch (e: unknown) {
			const error = e as Error;
			console.error(error);
			toast.error(error.message || "Erreur lors de l'enregistrement");
		}
	};

	if (isPending) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!profile) {
		return (
			<div className="text-center py-12 text-muted-foreground text-sm">
				{t("profile.notFound")}
			</div>
		);
	}

	const SECTIONS = [
		{
			id: "identity",
			icon: <User className="h-4 w-4" />,
			title: t("profile.tabs.personal"),
			description: t("registration.steps.identity.description"),
			color: "text-teal-600 dark:text-teal-400",
			content: (
				<IdentityStep
					control={form.control}
					errors={form.formState.errors}
				/>
			),
		},
		{
			id: "contacts",
			icon: <MapPin className="h-4 w-4" />,
			title: t("profile.tabs.contacts"),
			description: t("registration.steps.contacts.description"),
			color: "text-blue-500",
			content: (
				<ContactsStep
					control={form.control}
					errors={form.formState.errors}
				/>
			),
		},
		{
			id: "family",
			icon: <Users className="h-4 w-4" />,
			title: t("profile.tabs.family"),
			description: "Situation familiale et filiation",
			color: "text-amber-500",
			content: (
				<FamilyStep
					control={form.control}
					errors={form.formState.errors}
				/>
			),
		},
		{
			id: "profession",
			icon: <Briefcase className="h-4 w-4" />,
			title: t("profile.tabs.profession"),
			description: "Statut professionnel et employeur",
			color: "text-teal-600 dark:text-teal-400",
			content: (
				<ProfessionalStep
					control={form.control}
					errors={form.formState.errors}
				/>
			),
		},
		{
			id: "documents",
			icon: <FileText className="h-4 w-4" />,
			title: t("profile.tabs.documents"),
			description: "Pièces justificatives du dossier",
			color: "text-purple-500",
			content: (
				<DocumentsStep
					profileId={(profile as any)._id}
					documents={(profile as any).documents}
				/>
			),
		},
	];

	return (
		<div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
			<SettingsSectionHeader
				title="Mon Dossier Consulaire"
				description="Gérez vos informations personnelles et documents consulaires"
				action={
					<Button
						onClick={handleSaveAll}
						disabled={isSaving}
						size="sm"
						className="gap-2"
					>
						{isSaving ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : (
							<Save className="h-3.5 w-3.5" />
						)}
						{t("common.save")}
					</Button>
				}
			/>

			<FormProvider {...form}>
				<form
					id="settings-dossier-form"
					onSubmit={(e) => {
						e.preventDefault();
						handleSaveAll();
					}}
				>
					<div className="space-y-2">
						{SECTIONS.map((section) => (
							<AccordionSection
								key={section.id}
								icon={section.icon}
								title={section.title}
								description={section.description}
								color={section.color}
								isOpen={openSections.has(section.id)}
								onToggle={() => toggleSection(section.id)}
							>
								{section.content}
							</AccordionSection>
						))}
					</div>
				</form>
			</FormProvider>
		</div>
	);
}

function SettingsPageContent() {
	const { t, i18n } = useTranslation();
	const { theme, setTheme } = useTheme();
	const { consularTheme, setConsularTheme } = useConsularTheme();

	// Read tab from URL search params (replaces Route.useSearch())
	const searchParams = useSearchParams();
	const urlTab = searchParams.get("tab");
	const [activeTab, setActiveTab] = useState(urlTab === "dossier" ? "dossier" : "dossier");

	const [showLogoutDialog, setShowLogoutDialog] = useState(false);

	const { data: session } = authClient.useSession();

	const [resetStep, setResetStep] = useState<"idle" | "otp_sent" | "done">(
		"idle",
	);
	const [resetOtp, setResetOtp] = useState("");
	const [resetNewPassword, setResetNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [resetLoading, setResetLoading] = useState(false);
	const [resetError, setResetError] = useState<string | null>(null);
	const [resetSuccess, setResetSuccess] = useState(false);

	const preferences = useQuery(api.functions.userPreferences.getMyPreferences);
	const updatePreferences = useMutation(
		api.functions.userPreferences.updateMyPreferences,
	);

	// Sync URL tab param with active tab
	useEffect(() => {
		if (urlTab === "dossier") {
			setActiveTab("dossier");
		}
	}, [urlTab]);

	const handlePrefToggle = (
		key:
			| "emailNotifications"
			| "pushNotifications"
			| "smsNotifications"
			| "shareAnalytics",
		value: boolean,
	) => {
		updatePreferences({ [key]: value });
		captureEvent("myspace_preferences_updated");
	};

	const handleLanguageChange = (lang: "fr" | "en") => {
		updatePreferences({ language: lang });
		i18n.changeLanguage(lang);
		captureEvent("myspace_preferences_updated");
	};

	const handleSendResetOtp = async () => {
		const email = session?.user?.email;
		if (!email) return;
		setResetError(null);
		setResetLoading(true);
		try {
			const result = await authClient.emailOtp.sendVerificationOtp({
				email,
				type: "forget-password",
			});
			if (result.error) {
				setResetError(
					result.error.message || t("settings.security.changeFailed"),
				);
			} else {
				setResetStep("otp_sent");
			}
		} catch {
			setResetError(t("settings.security.changeFailed"));
		} finally {
			setResetLoading(false);
		}
	};

	const handleResetWithOtp = async (e: React.FormEvent) => {
		e.preventDefault();
		const email = session?.user?.email;
		if (!email) return;
		if (resetNewPassword.length < 8) {
			setResetError(t("settings.security.passwordTooShort"));
			return;
		}
		if (resetNewPassword !== confirmPassword) {
			setResetError(t("settings.security.passwordMismatch"));
			return;
		}
		setResetError(null);
		setResetLoading(true);
		try {
			const result = await authClient.emailOtp.resetPassword({
				email,
				otp: resetOtp,
				password: resetNewPassword,
			});
			if (result.error) {
				setResetError(
					result.error.message || t("settings.security.changeFailed"),
				);
			} else {
				setResetSuccess(true);
				setResetStep("done");
				setResetOtp("");
				setResetNewPassword("");
				setConfirmPassword("");
				setTimeout(() => {
					setResetSuccess(false);
					setResetStep("idle");
				}, 4000);
			}
		} catch {
			setResetError(t("settings.security.changeFailed"));
		} finally {
			setResetLoading(false);
		}
	};

	const TABS: SettingsTab[] = [
		{
			id: "dossier",
			label: "Mon Dossier",
			icon: <FolderOpen className="size-4" />,
		},
		{
			id: "accountSecurity",
			label: t("settings.security.accountInfo"),
			icon: <User className="size-4" />,
		},
		{
			id: "notifications",
			label: t("settings.notifications.title"),
			icon: <Bell className="size-4" />,
		},
		{
			id: "appearance",
			label: t("settings.display.title"),
			icon: <Palette className="size-4" />,
		},
	];

	return (
		<>
			<SettingsLayout
				title={t("mySpace.screens.settings.heading")}
				description={t("mySpace.screens.settings.subtitle")}
				tabs={TABS}
				activeTab={activeTab}
				onTabChange={setActiveTab}
			>
				<div className="max-w-3xl">
					{activeTab === "dossier" && <MonDossierTab />}

					{activeTab === "accountSecurity" && (
						<div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
							<SettingsSectionHeader
								title={t("settings.security.accountInfo")}
								description={t("settings.security.accountInfoDesc")}
							/>
							<div className="mb-10">
								<SettingsRow
									title={t("common.name")}
									value={session?.user?.name || "\u2014"}
								/>
								<SettingsRow
									title={t("common.email")}
									value={session?.user?.email || "\u2014"}
								/>
								<SettingsRow
									title={t("settings.security.memberSince")}
									value={
										session?.user?.createdAt
											? new Date(session.user.createdAt).toLocaleDateString(
													i18n.language,
													{
														year: "numeric",
														month: "long",
														day: "numeric",
													},
												)
											: "\u2014"
									}
								/>
							</div>

							<SettingsSectionHeader
								title={t("settings.privacy.title")}
								description={t("settings.privacy.description")}
							/>
							<div>
								<SettingsRow
									title={t("settings.privacy.analytics")}
									description={t("settings.privacy.analyticsDesc")}
									action={
										<Switch
											checked={preferences?.shareAnalytics ?? true}
											onCheckedChange={(checked) =>
												handlePrefToggle("shareAnalytics", checked)
											}
										/>
									}
								/>
							</div>

							<SettingsDivider />

							<SettingsSectionHeader
								title={t("settings.security.changePassword")}
								description={t("settings.security.changePasswordDesc")}
							/>
							<div className="max-w-md space-y-4 py-2">
								{resetError && (
									<div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
										{resetError}
									</div>
								)}
								{resetSuccess && (
									<div className="rounded-lg border border-primary/50 bg-primary/10 px-3 py-2 text-sm text-primary flex items-center gap-2">
										<Check className="size-4" />
										{t("settings.security.resetSuccess")}
									</div>
								)}

								{resetStep === "idle" && (
									<Button
										variant="outline"
										onClick={handleSendResetOtp}
										disabled={resetLoading || !session?.user?.email}
									>
										{resetLoading ? (
											<Loader2 className="mr-2 size-4 animate-spin" />
										) : (
											<Mail className="mr-2 size-4" />
										)}
										{t("settings.security.sendResetCode")}
									</Button>
								)}

								{resetStep === "otp_sent" && (
									<form onSubmit={handleResetWithOtp} className="space-y-4">
										<p className="text-sm text-muted-foreground">
											{t("settings.security.otpSentTo", {
												email: session?.user?.email,
											})}
										</p>
										<div className="space-y-2">
											<Label>{t("settings.security.otpCode")}</Label>
											<Input
												value={resetOtp}
												onChange={(e) => setResetOtp(e.target.value)}
												placeholder="123456"
												required
												autoComplete="one-time-code"
											/>
										</div>
										<div className="space-y-2">
											<Label>{t("settings.security.newPassword")}</Label>
											<Input
												type="password"
												value={resetNewPassword}
												onChange={(e) => setResetNewPassword(e.target.value)}
												required
												minLength={8}
												autoComplete="new-password"
											/>
										</div>
										<div className="space-y-2">
											<Label>{t("settings.security.confirmPassword")}</Label>
											<Input
												type="password"
												value={confirmPassword}
												onChange={(e) => setConfirmPassword(e.target.value)}
												required
												minLength={8}
												autoComplete="new-password"
											/>
										</div>
										<div className="flex gap-2">
											<Button
												type="submit"
												disabled={
													resetLoading ||
													!resetOtp ||
													!resetNewPassword ||
													!confirmPassword ||
													resetNewPassword !== confirmPassword
												}
											>
												{resetLoading && (
													<Loader2 className="mr-2 size-4 animate-spin" />
												)}
												{t("settings.security.resetPassword")}
											</Button>
											<Button
												type="button"
												variant="ghost"
												onClick={() => {
													setResetStep("idle");
													setResetError(null);
													setResetOtp("");
													setResetNewPassword("");
													setConfirmPassword("");
												}}
											>
												{t("common.cancel")}
											</Button>
										</div>
									</form>
								)}
							</div>

							<SettingsDivider />

							{/* ─── PIN Code Section ─── */}
							<PinCodeSection />

							<SettingsDivider />

							<SettingsSectionHeader
								title={t("settings.account.title")}
								description={t("settings.account.description")}
							/>
							<div className="py-2">
								<SettingsRow
									title={t("common.logout")}
									description={t("common.logoutConfirmDescription")}
									action={
										<Button
											variant="destructive"
											onClick={() => setShowLogoutDialog(true)}
										>
											<LogOut className="mr-2 size-4" />
											{t("common.logout")}
										</Button>
									}
								/>
							</div>
						</div>
					)}

					{activeTab === "notifications" && (
						<div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
							<SettingsSectionHeader
								title={t("settings.notifications.title")}
								description={t("settings.notifications.description")}
							/>
							<div>
								<SettingsRow
									title={t("settings.notifications.email")}
									description={t("settings.notifications.emailDesc")}
									action={
										<Switch
											checked={preferences?.emailNotifications ?? true}
											onCheckedChange={(checked) =>
												handlePrefToggle("emailNotifications", checked)
											}
										/>
									}
								/>
								<SettingsRow
									title={t("settings.notifications.push")}
									description={t("settings.notifications.pushDesc")}
									action={
										<Switch
											checked={preferences?.pushNotifications ?? true}
											onCheckedChange={(checked) =>
												handlePrefToggle("pushNotifications", checked)
											}
										/>
									}
								/>
								<SettingsRow
									title={t("settings.notifications.sms")}
									description={t("settings.notifications.smsDesc")}
									action={
										<Switch
											checked={preferences?.smsNotifications ?? false}
											onCheckedChange={(checked) =>
												handlePrefToggle("smsNotifications", checked)
											}
										/>
									}
								/>
							</div>
						</div>
					)}

					{activeTab === "appearance" && (
						<div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
							<SettingsSectionHeader
								title={t("settings.language.title")}
								description={t("settings.language.description")}
							/>
							<div className="mb-10 py-2 flex gap-2">
								<Button
									variant={
										(preferences?.language ?? i18n.language) === "fr"
											? "default"
											: "outline"
									}
									size="sm"
									onClick={() => handleLanguageChange("fr")}
								>
									<FlagIcon countryCode={CountryCode.FR} />{" "}
									{t("header.language.fr")}
								</Button>
								<Button
									variant={
										(preferences?.language ?? i18n.language) === "en"
											? "default"
											: "outline"
									}
									size="sm"
									onClick={() => handleLanguageChange("en")}
								>
									<FlagIcon countryCode={CountryCode.US} />{" "}
									{t("header.language.en")}
								</Button>
							</div>

							<SettingsDivider />

							<SettingsSectionHeader
								title={t("settings.display.title")}
								description={t("settings.display.description")}
							/>
							<div className="mb-10">
								<SettingsRow
									title={t("settings.display.darkMode")}
									description={t("settings.display.darkModeDesc")}
									action={
										<Switch
											checked={theme === "dark"}
											onCheckedChange={(checked) => {
												setTheme(checked ? "dark" : "light");
												captureEvent("myspace_preferences_updated");
											}}
										/>
									}
								/>
							</div>

							<SettingsSectionHeader
								title={t("settings.consularTheme.title")}
								description={t("settings.consularTheme.description")}
							/>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
								<ThemePreview
									themeId="default"
									label={t("settings.consularTheme.default")}
									description={t("settings.consularTheme.defaultDesc")}
									isActive={consularTheme === "default"}
									onClick={() => {
										setConsularTheme("default");
										captureEvent("myspace_preferences_updated");
									}}
								/>
								<ThemePreview
									themeId="homeomorphism"
									label={t("settings.consularTheme.homeomorphism")}
									description={t("settings.consularTheme.homeomorphismDesc")}
									isActive={consularTheme === "homeomorphism"}
									onClick={() => {
										setConsularTheme("homeomorphism");
										captureEvent("myspace_preferences_updated");
									}}
								/>
							</div>
						</div>
					)}
				</div>
			</SettingsLayout>

			<AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t("common.logoutConfirmTitle")}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t("common.logoutConfirmDescription")}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
						<AlertDialogAction
							onClick={async () => {
								await authClient.signOut();
								window.location.href = "/";
							}}
						>
							{t("common.logout")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

// ─── PIN Code Section ─────────────────────────────────────
function PinCodeSection() {
	const pinStatus = useQuery(api.functions.pin.getPinStatus, {});
	const createPinMut = useMutation(api.functions.pin.createPin);
	const updatePinMut = useMutation(api.functions.pin.updatePin);
	const deletePinMut = useMutation(api.functions.pin.deletePin);
	const [mode, setMode] = useState<"idle" | "create" | "modify" | "delete">("idle");
	const [newPin, setNewPin] = useState("");
	const [confirmPin, setConfirmPin] = useState("");
	const [currentPin, setCurrentPin] = useState("");
	const [pinError, setPinError] = useState<string | null>(null);
	const [pinLoading, setPinLoading] = useState(false);
	const resetForm = () => { setMode("idle"); setNewPin(""); setConfirmPin(""); setCurrentPin(""); setPinError(null); };
	if (pinStatus === undefined) return null;
	const daysLeft = pinStatus.lastOtpVerifiedAt ? Math.max(0, Math.floor((pinStatus.lastOtpVerifiedAt + 90*24*60*60*1000 - Date.now()) / (24*60*60*1000))) : 0;
	return (
		<div>
			<SettingsSectionHeader title="Code PIN" description={pinStatus.hasPin ? `Actif depuis le ${pinStatus.pinCreatedAt ? new Date(pinStatus.pinCreatedAt).toLocaleDateString("fr-FR") : "\u2014"}` : "Créez un code PIN pour vous connecter plus rapidement"} />
			<div className="py-3 space-y-3">
				{!pinStatus.hasPin && mode === "idle" && <Button variant="outline" onClick={() => setMode("create")} className="gap-2"><Lock className="h-4 w-4" />Créer mon code PIN</Button>}
				{pinStatus.hasPin && mode === "idle" && (
					<div className="space-y-2">
						{daysLeft > 0 && daysLeft <= 15 && <p className="text-xs text-amber-600">Vérification OTP requise dans {daysLeft} jours</p>}
						<div className="flex gap-2">
							<Button variant="outline" size="sm" onClick={() => setMode("modify")} className="gap-1.5"><KeyRound className="h-3.5 w-3.5" />Modifier</Button>
							<Button variant="ghost" size="sm" onClick={() => setMode("delete")} className="gap-1.5 text-destructive"><Trash2 className="h-3.5 w-3.5" />Supprimer</Button>
						</div>
					</div>
				)}
				{mode === "create" && (
					<div className="space-y-3 p-3 border rounded-lg">
						<div className="space-y-1"><label className="text-xs font-medium">Nouveau PIN (6 chiffres)</label><input type="password" inputMode="numeric" maxLength={6} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0,6))} placeholder="------" className="w-full h-10 text-center text-lg tracking-[0.3em] font-mono border rounded-md bg-background px-3" /></div>
						<div className="space-y-1"><label className="text-xs font-medium">Confirmer</label><input type="password" inputMode="numeric" maxLength={6} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0,6))} placeholder="------" className="w-full h-10 text-center text-lg tracking-[0.3em] font-mono border rounded-md bg-background px-3" /></div>
						{pinError && <p className="text-xs text-destructive">{pinError}</p>}
						<div className="flex gap-2"><Button size="sm" onClick={async () => { if(newPin.length!==6||newPin!==confirmPin){setPinError("Codes différents");return;} setPinLoading(true);setPinError(null);try{await createPinMut({pin:newPin});resetForm();}catch(e:any){setPinError(e.message?.includes("OTP")?"Reconnectez-vous par OTP d'abord":(e.message??"Erreur"));}finally{setPinLoading(false);} }} disabled={pinLoading||newPin.length!==6||newPin!==confirmPin}>{pinLoading&&<Loader2 className="mr-1 h-3.5 w-3.5 animate-spin"/>}Enregistrer</Button><Button size="sm" variant="ghost" onClick={resetForm}>Annuler</Button></div>
					</div>
				)}
				{mode === "modify" && (
					<div className="space-y-3 p-3 border rounded-lg">
						<div className="space-y-1"><label className="text-xs font-medium">PIN actuel</label><input type="password" inputMode="numeric" maxLength={6} value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0,6))} placeholder="------" className="w-full h-10 text-center text-lg tracking-[0.3em] font-mono border rounded-md bg-background px-3" /></div>
						<div className="space-y-1"><label className="text-xs font-medium">Nouveau PIN</label><input type="password" inputMode="numeric" maxLength={6} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0,6))} placeholder="------" className="w-full h-10 text-center text-lg tracking-[0.3em] font-mono border rounded-md bg-background px-3" /></div>
						<div className="space-y-1"><label className="text-xs font-medium">Confirmer</label><input type="password" inputMode="numeric" maxLength={6} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0,6))} placeholder="------" className="w-full h-10 text-center text-lg tracking-[0.3em] font-mono border rounded-md bg-background px-3" /></div>
						{pinError && <p className="text-xs text-destructive">{pinError}</p>}
						<div className="flex gap-2"><Button size="sm" onClick={async () => { if(newPin.length!==6||newPin!==confirmPin){setPinError("Codes différents");return;} setPinLoading(true);setPinError(null);try{await updatePinMut({currentPin,newPin});resetForm();}catch(e:any){setPinError(e.message?.includes("INVALID")?"PIN actuel incorrect":(e.message??"Erreur"));}finally{setPinLoading(false);} }} disabled={pinLoading}>{pinLoading&&<Loader2 className="mr-1 h-3.5 w-3.5 animate-spin"/>}Enregistrer</Button><Button size="sm" variant="ghost" onClick={resetForm}>Annuler</Button></div>
					</div>
				)}
				{mode === "delete" && (
					<div className="space-y-3 p-3 border border-destructive/20 rounded-lg bg-destructive/5">
						<p className="text-sm">Supprimer votre code PIN ?</p>
						{pinError && <p className="text-xs text-destructive">{pinError}</p>}
						<div className="flex gap-2"><Button size="sm" variant="destructive" onClick={async () => { setPinLoading(true);try{await deletePinMut({});resetForm();}catch(e:any){setPinError(e.message??"Erreur");}finally{setPinLoading(false);} }} disabled={pinLoading}>{pinLoading&&<Loader2 className="mr-1 h-3.5 w-3.5 animate-spin"/>}Supprimer</Button><Button size="sm" variant="ghost" onClick={resetForm}>Annuler</Button></div>
					</div>
				)}
			</div>
		</div>
	);
}

export default function SettingsPage() {
	return (
		<Suspense fallback={null}>
			<SettingsPageContent />
		</Suspense>
	);
}
