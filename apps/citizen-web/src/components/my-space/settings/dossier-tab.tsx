/**
 * DossierTab — Les 4 sections affichees simultanement en grille.
 * Desktop : 2x2 grid (Identite+Contact en haut, Famille+Profession en bas)
 * Mobile : scroll vertical, chaque section dans une FlatCard
 */

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
	Loader2,
	MapPin,
	Save,
	User,
	Users,
} from "lucide-react";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
	PROFILE_FIELD_MAPPING,
	useFormFillEffect,
} from "@/components/ai/useFormFillEffect";
import { ContactsStep } from "@/components/registration/steps/ContactsStep";
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
import {
	type ProfileFormValues,
	profileFormSchema,
} from "@/lib/validation/profile";

export function DossierTab() {
	const { t } = useTranslation();
	const { data: profile, isPending } = useAuthenticatedConvexQuery(
		api.functions.profiles.getMine,
		{},
	);
	const { mutateAsync: updateProfile, isPending: isSaving } =
		useConvexMutationQuery(api.functions.profiles.update);

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
			<div className="flex items-center justify-center h-40">
				<Loader2 className="h-6 w-6 animate-spin text-primary" />
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

	return (
		<FormProvider {...form}>
			<form id="settings-dossier-form" onSubmit={(e) => { e.preventDefault(); handleSaveAll(); }}>
				{/* Bouton Enregistrer flottant */}
				<div className="flex justify-end mb-3">
					<Button
						onClick={handleSaveAll}
						disabled={isSaving}
						size="sm"
						className="gap-1.5 rounded-lg h-8 px-4 active:scale-[0.97] transition-transform"
					>
						{isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
						{t("common.save")}
					</Button>
				</div>

				{/* Grille 2x2 desktop, empile mobile */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
					{/* ─── Identite ─── */}
					<FlatCard>
						<SectionHeader icon={<User className="h-3.5 w-3.5" />} title={t("profile.tabs.personal")} />
						<div className="p-3 settings-compact-form">
							<IdentityStep control={form.control} errors={form.formState.errors} />
						</div>
					</FlatCard>

					{/* ─── Contact ─── */}
					<FlatCard>
						<SectionHeader icon={<MapPin className="h-3.5 w-3.5" />} title={t("profile.tabs.contacts")} />
						<div className="p-3 settings-compact-form">
							<ContactsStep control={form.control} errors={form.formState.errors} />
						</div>
					</FlatCard>

					{/* ─── Famille ─── */}
					<FlatCard>
						<SectionHeader icon={<Users className="h-3.5 w-3.5" />} title={t("profile.tabs.family")} />
						<div className="p-3 settings-compact-form">
							<FamilyStep control={form.control} errors={form.formState.errors} />
						</div>
					</FlatCard>

					{/* ─── Profession ─── */}
					<FlatCard>
						<SectionHeader icon={<Briefcase className="h-3.5 w-3.5" />} title={t("profile.tabs.profession")} />
						<div className="p-3 settings-compact-form">
							<ProfessionalStep control={form.control} errors={form.formState.errors} />
						</div>
					</FlatCard>
				</div>
			</form>
		</FormProvider>
	);
}

// ─── Section Header ─────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
	return (
		<div className="flex items-center gap-2 px-3 py-2 bg-[#EBE6DC]/50 dark:bg-[#383633]/30 rounded-t-xl">
			<div className="p-1 rounded-md bg-primary/10">
				<span className="text-primary">{icon}</span>
			</div>
			<span className="text-xs font-bold">{title}</span>
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
