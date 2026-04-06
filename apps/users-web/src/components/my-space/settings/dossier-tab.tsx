import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import {
	CountryCode,
	Gender,
	MaritalStatus,
	NationalityAcquisition,
} from "@convex/lib/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	Briefcase,
	ChevronLeft,
	ChevronRight,
	FileText,
	FolderOpen,
	Loader2,
	MapPin,
	Save,
	User,
	Users,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { FlatCard } from "@/components/my-space/flat-card";
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

interface DossierSection {
	id: string;
	icon: React.ReactNode;
	title: string;
	description: string;
}

export function DossierTab() {
	const { t } = useTranslation();
	const { data: profile, isPending } = useAuthenticatedConvexQuery(
		api.functions.profiles.getMine,
		{},
	);
	const { mutateAsync: updateProfile, isPending: isSaving } =
		useConvexMutationQuery(api.functions.profiles.update);

	const [activeSection, setActiveSection] = useState(0);

	const form = useForm<ProfileFormValues>({
		resolver: zodResolver(profileFormSchema),
		mode: "onChange",
		defaultValues: buildDefaults(profile),
	});

	useEffect(() => {
		if (profile) form.reset(buildDefaults(profile));
	}, [profile]);

	useFormFillEffect(form, "profile", PROFILE_FIELD_MAPPING);

	const handleSaveAll = async () => {
		if (!profile) return;
		try {
			const data = form.getValues();
			const changedFields = getChangedFields(data, profile as Doc<"profiles">);
			const payload = transformFormDataToPayload(changedFields);
			if (Object.keys(payload).length > 0) {
				await updateProfile({ id: (profile as any)._id, ...payload });
				captureEvent("myspace_profile_updated");
				toast.success(t("common.saved"));
			} else {
				toast.info(t("settings.dossier.noChanges"));
			}
		} catch (e: unknown) {
			const error = e as Error;
			console.error(error);
			toast.error(error.message || t("settings.dossier.saveError"));
		}
	};

	if (isPending) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="rounded-xl border flat-card-border bg-card p-6">
					<Loader2 className="h-6 w-6 animate-spin text-primary" />
				</div>
			</div>
		);
	}

	if (!profile) {
		return (
			<FlatCard>
				<div className="p-6 text-center text-muted-foreground text-sm">
					{t("profile.notFound")}
				</div>
			</FlatCard>
		);
	}

	const SECTIONS: DossierSection[] = [
		{ id: "identity", icon: <User className="h-3.5 w-3.5" />, title: t("profile.tabs.personal"), description: t("registration.steps.identity.description") },
		{ id: "contacts", icon: <MapPin className="h-3.5 w-3.5" />, title: t("profile.tabs.contacts"), description: t("registration.steps.contacts.description") },
		{ id: "family", icon: <Users className="h-3.5 w-3.5" />, title: t("profile.tabs.family"), description: t("settings.dossier.familyDesc") },
		{ id: "profession", icon: <Briefcase className="h-3.5 w-3.5" />, title: t("profile.tabs.profession"), description: t("settings.dossier.professionDesc") },
		{ id: "documents", icon: <FileText className="h-3.5 w-3.5" />, title: t("profile.tabs.documents"), description: t("settings.dossier.documentsDesc") },
	];

	const SECTION_CONTENT = [
		<IdentityStep key="identity" control={form.control} errors={form.formState.errors} />,
		<ContactsStep key="contacts" control={form.control} errors={form.formState.errors} />,
		<FamilyStep key="family" control={form.control} errors={form.formState.errors} />,
		<ProfessionalStep key="profession" control={form.control} errors={form.formState.errors} />,
		<DocumentsStep key="documents" profileId={(profile as any)._id} documents={(profile as any).documents} />,
	];

	const currentSection = SECTIONS[activeSection];

	return (
		<div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full overflow-hidden">
			{/* ─── Colonne gauche : navigation sections (4/12) ─── */}
			<div className="lg:col-span-4 flex flex-col gap-3">
				{/* Mini-nav horizontale mobile */}
				<div className="flex lg:hidden overflow-x-auto gap-1 p-1 bg-card border flat-card-border rounded-xl">
					{SECTIONS.map((s, i) => (
						<button
							key={s.id}
							type="button"
							onClick={() => setActiveSection(i)}
							className={cn(
								"flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all shrink-0 flex-1 justify-center",
								i === activeSection
									? "bg-primary text-primary-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground hover:bg-muted/50",
							)}
						>
							{s.icon}
						</button>
					))}
				</div>

				{/* Navigation desktop */}
				<FlatCard className="hidden lg:block">
					<div className="flex items-center gap-2.5 p-4 pb-3 border-b border-foreground/5">
						<div className="p-1 rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.12]">
							<FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
						</div>
						<span className="text-sm font-bold text-muted-foreground">{t("settings.dossier.title")}</span>
					</div>
					<div className="p-2 flex flex-col gap-0.5">
						{SECTIONS.map((s, i) => (
							<button
								key={s.id}
								type="button"
								onClick={() => setActiveSection(i)}
								className={cn(
									"w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all text-left",
									i === activeSection
										? "bg-primary/10 text-primary font-bold"
										: "text-muted-foreground hover:bg-muted hover:text-foreground font-medium",
								)}
							>
								<div className={cn(
									"p-1 rounded-md shrink-0",
									i === activeSection ? "bg-primary/15" : "bg-foreground/[0.06] dark:bg-foreground/[0.12]",
								)}>
									{s.icon}
								</div>
								<div className="flex-1 min-w-0">
									<p className="truncate">{s.title}</p>
									<p className={cn("text-[10px] truncate", i === activeSection ? "text-primary/70" : "text-muted-foreground/60")}>{s.description}</p>
								</div>
								{i === activeSection && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
							</button>
						))}
					</div>
				</FlatCard>

				{/* Bouton sauvegarder desktop */}
				<Button
					onClick={handleSaveAll}
					disabled={isSaving}
					className="hidden lg:flex gap-2 w-full rounded-xl"
				>
					{isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
					{t("common.save")}
				</Button>
			</div>

			{/* ─── Colonne droite : formulaire section active (8/12) ─── */}
			<div className="lg:col-span-8 min-h-0 overflow-y-auto citizen-scrollbar">
				<FlatCard className="min-h-full">
					{/* Header section active */}
					<div className="flex items-center justify-between p-4 border-b border-foreground/5">
						<div className="flex items-center gap-2.5">
							<div className="p-1 rounded-md bg-primary/10">
								<span className="text-primary">{currentSection.icon}</span>
							</div>
							<div>
								<span className="text-sm font-bold">{currentSection.title}</span>
								<p className="text-[10px] text-muted-foreground">{currentSection.description}</p>
							</div>
						</div>

						{/* Navigation prev/next */}
						<div className="flex items-center gap-1.5">
							<span className="text-[10px] font-bold text-muted-foreground mr-1">{activeSection + 1}/{SECTIONS.length}</span>
							<Button
								variant="ghost"
								size="icon"
								className="h-7 w-7 rounded-lg"
								onClick={() => setActiveSection((p) => Math.max(0, p - 1))}
								disabled={activeSection === 0}
							>
								<ChevronLeft className="h-3.5 w-3.5" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								className="h-7 w-7 rounded-lg"
								onClick={() => setActiveSection((p) => Math.min(SECTIONS.length - 1, p + 1))}
								disabled={activeSection === SECTIONS.length - 1}
							>
								<ChevronRight className="h-3.5 w-3.5" />
							</Button>
						</div>
					</div>

					{/* Formulaire */}
					<FormProvider {...form}>
						<form id="settings-dossier-form" onSubmit={(e) => { e.preventDefault(); handleSaveAll(); }}>
							<div className="p-4">
								{SECTION_CONTENT[activeSection]}
							</div>
						</form>
					</FormProvider>

					{/* Footer mobile : boutons nav + save */}
					<div className="flex items-center justify-between p-4 border-t border-foreground/5 lg:hidden">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setActiveSection((p) => Math.max(0, p - 1))}
							disabled={activeSection === 0}
							className="gap-1.5 rounded-xl"
						>
							<ChevronLeft className="h-3.5 w-3.5" />
							{t("common.previous")}
						</Button>

						<Button onClick={handleSaveAll} disabled={isSaving} size="sm" className="gap-1.5 rounded-xl">
							{isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
							{t("common.save")}
						</Button>

						<Button
							variant="ghost"
							size="sm"
							onClick={() => setActiveSection((p) => Math.min(SECTIONS.length - 1, p + 1))}
							disabled={activeSection === SECTIONS.length - 1}
							className="gap-1.5 rounded-xl"
						>
							{t("common.next")}
							<ChevronRight className="h-3.5 w-3.5" />
						</Button>
					</div>
				</FlatCard>
			</div>
		</div>
	);
}

// ─── Helpers ─────────────────────────────────────────────────

function buildDefaults(profile: any): ProfileFormValues {
	const p = profile ?? {};
	return {
		countryOfResidence: p?.countryOfResidence || undefined,
		identity: {
			firstName: p?.identity?.firstName || "",
			lastName: p?.identity?.lastName || "",
			birthDate: p?.identity?.birthDate ? new Date(p.identity.birthDate) : undefined,
			birthPlace: p?.identity?.birthPlace || "",
			birthCountry: p?.identity?.birthCountry || CountryCode.GA,
			gender: p?.identity?.gender || Gender.Male,
			nationality: p?.identity?.nationality || CountryCode.GA,
			nationalityAcquisition: p?.identity?.nationalityAcquisition || NationalityAcquisition.Birth,
		},
		passportInfo: p?.passportInfo
			? {
					number: p.passportInfo.number || "",
					issueDate: p.passportInfo.issueDate ? new Date(p.passportInfo.issueDate) : undefined,
					expiryDate: p.passportInfo.expiryDate ? new Date(p.passportInfo.expiryDate) : undefined,
					issuingAuthority: p.passportInfo.issuingAuthority || "",
				}
			: undefined,
		addresses: {
			homeland: p?.addresses?.homeland
				? { street: p.addresses.homeland.street || "", city: p.addresses.homeland.city || "", postalCode: p.addresses.homeland.postalCode || "", country: p.addresses.homeland.country || CountryCode.GA }
				: { street: "", city: "", postalCode: "", country: CountryCode.GA },
			residence: p?.addresses?.residence
				? { street: p.addresses.residence.street || "", city: p.addresses.residence.city || "", postalCode: p.addresses.residence.postalCode || "", country: p.addresses.residence.country || CountryCode.FR }
				: { street: "", city: "", postalCode: "", country: CountryCode.FR },
		},
		contacts: {
			email: p?.contacts?.email || "",
			phone: p?.contacts?.phone || "",
			emergencyContacts: p?.contacts?.emergencyContacts || [],
		},
		family: {
			maritalStatus: p?.family?.maritalStatus || MaritalStatus.Single,
			father: p?.family?.father || { firstName: "", lastName: "" },
			mother: p?.family?.mother || { firstName: "", lastName: "" },
			spouse: p?.family?.spouse || { firstName: "", lastName: "" },
		},
		profession: p?.profession
			? { status: p.profession.status || undefined, title: p.profession.title || "", employer: p.profession.employer || "" }
			: { status: undefined, title: "", employer: "" },
	};
}
