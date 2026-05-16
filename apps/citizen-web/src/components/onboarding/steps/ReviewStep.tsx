"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { getCountryName } from "@/lib/country-utils";
import { cn } from "@/lib/utils";
import { PublicUserType } from "@convex/lib/constants";
import {
	AlertTriangle,
	ArrowRight,
	CheckCircle2,
	FileText,
	Loader2,
	Pencil,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	birthSchema,
	contactSchema,
	contactsSchemaFor,
	documentsSchemaFor,
	familySchema,
	nameSchema,
	passportSchema,
	professionSchema,
} from "../lib/schemas";
import { formatAddressDisplay, type OnboardingData } from "../types";
import {
	getDocsForUserType,
	type RegistrationFiles,
} from "./DocumentsStep";

type StepKey = "identity" | "family" | "contacts" | "profession" | "documents";

function computeIncompleteSteps(
	data: OnboardingData,
	files: RegistrationFiles,
	userType: PublicUserType,
): StepKey[] {
	const incomplete: StepKey[] = [];

	const identityChecks = [
		nameSchema.safeParse({
			firstName: data.firstName,
			lastName: data.lastName,
		}),
		contactSchema.safeParse({ email: data.email, phone: data.phone }),
		birthSchema.safeParse({
			birthDate: data.birthDate,
			birthPlace: data.birthPlace,
			birthCountry: data.birthCountry,
			gender: data.gender,
			nationality: data.nationality,
			nationalityAcquisition: data.nationalityAcquisition,
			nip: data.nip,
		}),
		passportSchema.safeParse({
			passportNumber: data.passportNumber,
			passportIssuingAuthority: data.passportIssuingAuthority,
			passportIssueDate: data.passportIssueDate,
			passportExpiryDate: data.passportExpiryDate,
		}),
	];
	if (identityChecks.some((r) => !r.success)) incomplete.push("identity");

	const steps =
		userType === PublicUserType.LongStay
			? (["family", "contacts", "profession", "documents"] as const)
			: (["contacts", "documents"] as const);

	for (const step of steps) {
		if (step === "family") {
			if (
				!familySchema.safeParse({
					maritalStatus: data.maritalStatus,
					spouseFirstName: data.spouseFirstName,
					spouseLastName: data.spouseLastName,
					fatherFirstName: data.fatherFirstName,
					fatherLastName: data.fatherLastName,
					motherFirstName: data.motherFirstName,
					motherLastName: data.motherLastName,
				}).success
			) {
				incomplete.push("family");
			}
		} else if (step === "contacts") {
			const schema = contactsSchemaFor(userType);
			const res = schema.safeParse({
				address: data.address ?? {},
				homeland: data.homeland,
				emergencyContacts: data.emergencyContacts,
			});
			if (!res.success) incomplete.push("contacts");
		} else if (step === "profession") {
			if (
				!professionSchema.safeParse({
					workStatus: data.workStatus,
					workTitle: data.workTitle,
					workEmployer: data.workEmployer,
				}).success
			) {
				incomplete.push("profession");
			}
		} else if (step === "documents") {
			const schema = documentsSchemaFor(userType);
			const docs = getDocsForUserType(userType);
			const values: Record<string, File | string | undefined> = {};
			for (const doc of docs) {
				values[doc.key] = files[doc.key] ?? data.documents?.[doc.key];
			}
			if (!schema.safeParse(values).success) incomplete.push("documents");
		}
	}

	return incomplete;
}

function ReviewSection({
	title,
	editLabel,
	onEdit,
	children,
}: {
	title: string;
	editLabel: string;
	onEdit?: () => void;
	children: React.ReactNode;
}) {
	return (
		<Card>
			<CardContent className="flex flex-col gap-3 p-4">
				<div className="flex items-center justify-between">
					<strong
						className="text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground"
						suppressHydrationWarning
					>
						{title}
					</strong>
					{onEdit && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-7 gap-1 text-xs"
							onClick={onEdit}
						>
							<Pencil className="size-3" />
							<span suppressHydrationWarning>{editLabel}</span>
						</Button>
					)}
				</div>
				<dl className="grid grid-cols-1 gap-x-4 gap-y-2.5 text-sm md:grid-cols-2">
					{children}
				</dl>
			</CardContent>
		</Card>
	);
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
	return (
		<div>
			<dt className="text-xs text-muted-foreground" suppressHydrationWarning>
				{label}
			</dt>
			<dd className="mt-0.5 font-medium">
				{value || <span className="text-muted-foreground/60">—</span>}
			</dd>
		</div>
	);
}

export function ReviewStep({
	data,
	userType,
	files,
	onJump,
	onSubmit,
	submitting,
	submitError,
}: {
	data: OnboardingData;
	userType: PublicUserType;
	files: RegistrationFiles;
	onJump: (stepKey: StepKey) => void;
	onSubmit: () => void;
	submitting: boolean;
	submitError: string | null;
}) {
	const { t } = useTranslation();
	const [accepted, setAccepted] = useState(false);
	const incompleteSteps = useMemo(
		() => computeIncompleteSteps(data, files, userType),
		[data, files, userType],
	);
	const canSubmit = accepted && !submitting && incompleteSteps.length === 0;

	const isLongStay = userType === PublicUserType.LongStay;
	const docs = getDocsForUserType(userType);
	const filledDocs = docs.filter((d) => data.documents?.[d.key]).length;
	const totalDocs = docs.length;

	const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ");
	const genderLabel =
		data.gender === "Male"
			? t("onboarding.review.gender.male")
			: data.gender === "Female"
				? t("onboarding.review.gender.female")
				: null;

	const editLabel = t("onboarding.review.editAction");

	return (
		<div className="flex flex-col gap-4">
			<header className="flex flex-col gap-2">
				<h1
					className="text-2xl font-semibold tracking-tight md:text-3xl"
					suppressHydrationWarning
				>
					{t("onboarding.review.title")}
				</h1>
				<p className="text-sm text-muted-foreground" suppressHydrationWarning>
					{t("onboarding.review.subtitle")}
				</p>
			</header>

			<div className="flex items-start gap-3 rounded-xl border border-gabon-blue/20 bg-gabon-blue-tint/40 p-4">
				<CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gabon-blue" />
				<p className="text-sm" suppressHydrationWarning>
					<strong>{t("onboarding.review.banner.strong")}</strong>{" "}
					{t("onboarding.review.banner.text")}
				</p>
			</div>

			<ReviewSection
				title={t("onboarding.review.sections.identity")}
				editLabel={editLabel}
				onEdit={() => onJump("identity")}
			>
				<Row label={t("onboarding.review.fields.fullName")} value={fullName} />
				<Row label={t("onboarding.review.fields.birthDate")} value={data.birthDate} />
				<Row label={t("onboarding.review.fields.birthPlace")} value={data.birthPlace} />
				<Row
					label={t("onboarding.review.fields.birthCountry")}
					value={data.birthCountry ? getCountryName(data.birthCountry) : undefined}
				/>
				<Row label={t("onboarding.review.fields.gender")} value={genderLabel} />
				<Row
					label={t("onboarding.review.fields.nationality")}
					value={data.nationality ? getCountryName(data.nationality) : undefined}
				/>
				<Row label={t("onboarding.review.fields.email")} value={data.email} />
				<Row label={t("onboarding.review.fields.phone")} value={data.phone} />
			</ReviewSection>

			{data.passportNumber && (
				<ReviewSection
					title={t("onboarding.review.sections.passport")}
					editLabel={editLabel}
					onEdit={() => onJump("identity")}
				>
					<Row label={t("onboarding.review.fields.passportNumber")} value={data.passportNumber} />
					<Row label={t("onboarding.review.fields.passportIssuingAuthority")} value={data.passportIssuingAuthority} />
					<Row label={t("onboarding.review.fields.passportIssueDate")} value={data.passportIssueDate} />
					<Row label={t("onboarding.review.fields.passportExpiryDate")} value={data.passportExpiryDate} />
				</ReviewSection>
			)}

			{isLongStay && (
				<ReviewSection
					title={t("onboarding.review.sections.family")}
					editLabel={editLabel}
					onEdit={() => onJump("family")}
				>
					<Row
						label={t("onboarding.review.fields.maritalStatus")}
						value={
							data.maritalStatus
								? t(`onboarding.review.maritalLabels.${data.maritalStatus}`)
								: undefined
						}
					/>
					<Row
						label={t("onboarding.review.fields.father")}
						value={[data.fatherFirstName, data.fatherLastName]
							.filter(Boolean)
							.join(" ")}
					/>
					<Row
						label={t("onboarding.review.fields.mother")}
						value={[data.motherFirstName, data.motherLastName]
							.filter(Boolean)
							.join(" ")}
					/>
				</ReviewSection>
			)}

			<ReviewSection
				title={t("onboarding.review.sections.contacts")}
				editLabel={editLabel}
				onEdit={() => onJump("contacts")}
			>
				<Row
					label={t("onboarding.review.fields.address")}
					value={formatAddressDisplay(data.address)}
				/>
				<Row
					label={t("onboarding.review.fields.country")}
					value={
						data.address?.country
							? getCountryName(data.address.country)
							: undefined
					}
				/>
				{isLongStay && (
					<Row
						label={t("onboarding.review.fields.homeland")}
						value={formatAddressDisplay(data.homeland)}
					/>
				)}
				<Row
					label={t("onboarding.review.fields.emergencyContacts")}
					value={t("onboarding.review.emergencyCount", {
						count:
							(data.emergencyContacts ?? []).filter((c) => c.firstName).length,
					})}
				/>
			</ReviewSection>

			{isLongStay && (
				<ReviewSection
					title={t("onboarding.review.sections.profession")}
					editLabel={editLabel}
					onEdit={() => onJump("profession")}
				>
					<Row
						label={t("onboarding.review.fields.workStatus")}
						value={
							data.workStatus
								? t(`onboarding.review.workLabels.${data.workStatus}`)
								: undefined
						}
					/>
					<Row label={t("onboarding.review.fields.workTitle")} value={data.workTitle} />
					<Row label={t("onboarding.review.fields.workEmployer")} value={data.workEmployer} />
				</ReviewSection>
			)}

			<Card>
				<CardContent className="flex flex-col gap-3 p-4">
					<div className="flex items-center justify-between">
						<strong
							className="text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground"
							suppressHydrationWarning
						>
							{t("onboarding.review.sections.documents", {
								filled: filledDocs,
								total: totalDocs,
							})}
						</strong>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-7 gap-1 text-xs"
							onClick={() => onJump("documents")}
						>
							<Pencil className="size-3" />
							<span suppressHydrationWarning>{editLabel}</span>
						</Button>
					</div>
					<ul className="flex flex-col gap-2 text-sm">
						{docs.map((d) => {
							const name = data.documents?.[d.key];
							return (
								<li key={d.key} className="flex items-center gap-2">
									{name ? (
										<CheckCircle2 className="size-4 shrink-0 text-gabon-green" />
									) : d.required ? (
										<AlertTriangle className="size-4 shrink-0 text-gabon-yellow" />
									) : (
										<FileText className="size-4 shrink-0 text-muted-foreground" />
									)}
									<span
										className="min-w-0 flex-1 truncate"
										suppressHydrationWarning
									>
										{t(`onboarding.documents.docs.${d.key}.label`)}
									</span>
									{d.required && !name && (
										<span
											className="inline-flex items-center rounded-full bg-gabon-yellow-tint px-1.5 py-0.5 text-[10px] font-medium text-gabon-yellow"
											suppressHydrationWarning
										>
											{t("onboarding.review.docRequired")}
										</span>
									)}
									<span
										className="ml-auto truncate text-xs text-muted-foreground"
										suppressHydrationWarning
									>
										{name || t("onboarding.review.docNotProvided")}
									</span>
								</li>
							);
						})}
					</ul>
				</CardContent>
			</Card>

			{incompleteSteps.length > 0 && (
				<Card className="border-destructive/40 bg-destructive/5">
					<CardContent className="flex flex-col gap-3 p-4">
						<div className="flex items-center gap-2 text-sm font-semibold text-destructive">
							<AlertTriangle className="size-4" />
							<span suppressHydrationWarning>
								{t("onboarding.review.incompleteTitle")}
							</span>
						</div>
						<ul className="flex flex-col gap-1.5 text-sm">
							{incompleteSteps.map((step) => (
								<li
									key={step}
									className="flex items-center justify-between gap-2"
								>
									<span suppressHydrationWarning>
										{t(`onboarding.shell.stepLabels.${step}`)}
									</span>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-7 gap-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
										onClick={() => onJump(step)}
									>
										<Pencil className="size-3" />
										<span suppressHydrationWarning>
											{t("onboarding.review.editAction")}
										</span>
									</Button>
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			)}

			<label
				className={cn(
					"flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-3 text-sm",
					accepted && "border-gabon-blue/40 bg-gabon-blue-tint/30",
				)}
			>
				<Checkbox
					checked={accepted}
					onCheckedChange={(c) => setAccepted(c === true)}
					className="mt-0.5"
				/>
				<span suppressHydrationWarning>{t("onboarding.review.consent")}</span>
			</label>

			{submitError && (
				<div
					role="alert"
					className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
				>
					<AlertTriangle className="mt-0.5 size-4 shrink-0" />
					<span>{submitError}</span>
				</div>
			)}

			<Button
				type="button"
				className="h-12 w-full text-base"
				disabled={!canSubmit}
				onClick={onSubmit}
			>
				{submitting ? (
					<>
						<Loader2 className="mr-1 size-4 animate-spin" />
						<span suppressHydrationWarning>
							{t("onboarding.review.submitting")}
						</span>
					</>
				) : (
					<>
						<span suppressHydrationWarning>{t("onboarding.review.submit")}</span>
						<ArrowRight className="ml-1 size-4" />
					</>
				)}
			</Button>
		</div>
	);
}
