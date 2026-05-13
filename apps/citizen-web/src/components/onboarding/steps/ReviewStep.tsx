"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useState } from "react";
import { getDocsForUserType } from "./DocumentsStep";
import type { OnboardingData } from "../types";

const MARITAL_LABELS: Record<string, string> = {
	Single: "Célibataire",
	Married: "Marié(e)",
	Divorced: "Divorcé(e)",
	Widowed: "Veuf(ve)",
	CivilUnion: "Union civile",
	Cohabiting: "Concubinage",
};

const WORK_LABELS: Record<string, string> = {
	Employee: "Salarié(e)",
	SelfEmployed: "Indépendant(e)",
	Entrepreneur: "Entrepreneur(e)",
	Student: "Étudiant(e)",
	Retired: "Retraité(e)",
	Unemployed: "Sans emploi",
	Other: "Autre",
};

function ReviewSection({
	title,
	onEdit,
	children,
}: {
	title: string;
	onEdit?: () => void;
	children: React.ReactNode;
}) {
	return (
		<Card>
			<CardContent className="flex flex-col gap-3 p-4">
				<div className="flex items-center justify-between">
					<strong className="text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
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
							Modifier
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
			<dt className="text-xs text-muted-foreground">{label}</dt>
			<dd className="mt-0.5 font-medium">
				{value || <span className="text-muted-foreground/60">—</span>}
			</dd>
		</div>
	);
}

export function ReviewStep({
	data,
	userType,
	onJump,
	onSubmit,
	submitting,
	submitError,
}: {
	data: OnboardingData;
	userType: PublicUserType;
	onJump: (stepKey: "identity" | "family" | "contacts" | "profession" | "documents") => void;
	onSubmit: () => void;
	submitting: boolean;
	submitError: string | null;
}) {
	const [accepted, setAccepted] = useState(false);

	const isLongStay = userType === PublicUserType.LongStay;
	const docs = getDocsForUserType(userType);
	const filledDocs = docs.filter((d) => data.documents?.[d.key]).length;
	const totalDocs = docs.length;

	const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ");
	const genderLabel =
		data.gender === "Male" ? "Homme" : data.gender === "Female" ? "Femme" : null;

	return (
		<div className="flex flex-col gap-4">
			<header className="flex flex-col gap-2">
				<h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
					Vérifiez et soumettez
				</h1>
				<p className="text-sm text-muted-foreground">
					Relisez attentivement les informations avant de soumettre votre
					dossier.
				</p>
			</header>

			<div className="flex items-start gap-3 rounded-xl border border-gabon-blue/20 bg-gabon-blue-tint/40 p-4">
				<CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gabon-blue" />
				<p className="text-sm">
					<strong>Prêt à soumettre.</strong> Votre dossier sera transmis au
					service consulaire pour validation. Vous recevrez une notification
					dès que votre statut changera.
				</p>
			</div>

			<ReviewSection title="Identité" onEdit={() => onJump("identity")}>
				<Row label="Nom complet" value={fullName} />
				<Row label="Né(e) le" value={data.birthDate} />
				<Row label="Lieu de naissance" value={data.birthPlace} />
				<Row label="Pays de naissance" value={data.birthCountry} />
				<Row label="Genre" value={genderLabel} />
				<Row label="Nationalité" value={data.nationality} />
				<Row label="Email" value={data.email} />
				<Row label="Téléphone" value={data.phone} />
			</ReviewSection>

			{data.passportNumber && (
				<ReviewSection title="Passeport" onEdit={() => onJump("identity")}>
					<Row label="N°" value={data.passportNumber} />
					<Row label="Autorité" value={data.passportIssuingAuthority} />
					<Row label="Délivré le" value={data.passportIssueDate} />
					<Row label="Expire le" value={data.passportExpiryDate} />
				</ReviewSection>
			)}

			{isLongStay && (
				<ReviewSection title="Famille" onEdit={() => onJump("family")}>
					<Row
						label="Statut"
						value={
							data.maritalStatus ? MARITAL_LABELS[data.maritalStatus] : undefined
						}
					/>
					<Row
						label="Père"
						value={[data.fatherFirstName, data.fatherLastName]
							.filter(Boolean)
							.join(" ")}
					/>
					<Row
						label="Mère"
						value={[data.motherFirstName, data.motherLastName]
							.filter(Boolean)
							.join(" ")}
					/>
				</ReviewSection>
			)}

			<ReviewSection
				title="Adresses et contacts"
				onEdit={() => onJump("contacts")}
			>
				<Row label="Adresse" value={data.address?.full} />
				<Row label="Pays" value={data.address?.country} />
				{isLongStay && (
					<Row label="Adresse Gabon" value={data.homeland?.full} />
				)}
				<Row
					label="Contacts d'urgence"
					value={
						(data.emergencyContacts ?? []).filter((c) => c.firstName).length +
						" enregistré(s)"
					}
				/>
			</ReviewSection>

			{isLongStay && (
				<ReviewSection title="Profession" onEdit={() => onJump("profession")}>
					<Row
						label="Statut"
						value={data.workStatus ? WORK_LABELS[data.workStatus] : undefined}
					/>
					<Row label="Titre" value={data.workTitle} />
					<Row label="Employeur" value={data.workEmployer} />
				</ReviewSection>
			)}

			<Card>
				<CardContent className="flex flex-col gap-3 p-4">
					<div className="flex items-center justify-between">
						<strong className="text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
							Documents ({filledDocs}/{totalDocs})
						</strong>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-7 gap-1 text-xs"
							onClick={() => onJump("documents")}
						>
							<Pencil className="size-3" />
							Modifier
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
									<span className="min-w-0 flex-1 truncate">{d.label}</span>
									{d.required && !name && (
										<span className="inline-flex items-center rounded-full bg-gabon-yellow-tint px-1.5 py-0.5 text-[10px] font-medium text-gabon-yellow">
											Requis
										</span>
									)}
									<span className="ml-auto truncate text-xs text-muted-foreground">
										{name || "Non fourni"}
									</span>
								</li>
							);
						})}
					</ul>
				</CardContent>
			</Card>

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
				<span>
					Je certifie sur l'honneur l'exactitude des informations fournies et
					j'accepte les conditions générales d'utilisation.
				</span>
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
				disabled={!accepted || submitting}
				onClick={onSubmit}
			>
				{submitting ? (
					<>
						<Loader2 className="mr-1 size-4 animate-spin" />
						Soumission en cours…
					</>
				) : (
					<>
						Soumettre mon dossier
						<ArrowRight className="ml-1 size-4" />
					</>
				)}
			</Button>
		</div>
	);
}
