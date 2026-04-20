"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	AlertTriangle,
	Briefcase,
	FileText,
	MapPin,
	Phone,
	User,
	Users,
} from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { FlatCard } from "../my-space/flat-card";
import { cn } from "@workspace/ui/lib/utils";

const COUNTRY_LABELS: Record<string, string> = {
	GA: "Gabon",
	FR: "France",
	CM: "Cameroun",
	CG: "Congo",
	CD: "RD Congo",
	SN: "Senegal",
	CI: "Cote d'Ivoire",
	MA: "Maroc",
	BE: "Belgique",
	CH: "Suisse",
	CA: "Canada",
	US: "Etats-Unis",
	GB: "Royaume-Uni",
	DE: "Allemagne",
	ES: "Espagne",
	IT: "Italie",
	PT: "Portugal",
};

const GENDER_LABELS: Record<string, string> = {
	male: "Homme",
	female: "Femme",
	M: "Homme",
	F: "Femme",
};

const MARITAL_LABELS: Record<string, string> = {
	single: "Celibataire",
	married: "Marie(e)",
	divorced: "Divorce(e)",
	widowed: "Veuf/Veuve",
	pacs: "Pacse(e)",
};

const PROFESSION_STATUS_LABELS: Record<string, string> = {
	employed: "Salarie(e)",
	self_employed: "Independant(e)",
	unemployed: "Sans emploi",
	student: "Etudiant(e)",
	retired: "Retraite(e)",
	entrepreneur: "Entrepreneur",
	civil_servant: "Fonctionnaire",
	other: "Autre",
};

const NATIONALITY_ACQ_LABELS: Record<string, string> = {
	birth: "Naissance",
	marriage: "Mariage",
	naturalization: "Naturalisation",
	descent: "Filiation",
};

const RELATIONSHIP_LABELS: Record<string, string> = {
	spouse: "Conjoint(e)",
	parent: "Parent",
	child: "Enfant",
	sibling: "Frere/Soeur",
	friend: "Ami(e)",
	other: "Autre",
};

function lbl(map: Record<string, string>, code?: string | null) {
	return code ? (map[code] ?? code) : undefined;
}

function fmtDate(ts?: number | null) {
	if (!ts) return undefined;
	try {
		return format(new Date(ts), "dd MMM yyyy", { locale: fr });
	} catch {
		return undefined;
	}
}

function SectionHeader({
	icon,
	title,
	trailing,
}: {
	icon: React.ReactNode;
	title: string;
	trailing?: React.ReactNode;
}) {
	return (
		<div className="flex items-center justify-between gap-3 rounded-t-xl bg-muted/40 px-4 py-3 border-b border-border/50">
			<div className="flex items-center gap-2.5">
				<div className="rounded-md bg-primary/10 p-1.5">
					<span className="text-primary">{icon}</span>
				</div>
				<span className="text-base font-bold">{title}</span>
			</div>
			{trailing && <div className="shrink-0">{trailing}</div>}
		</div>
	);
}

function Row({
	label,
	value,
	valueClassName,
}: {
	label: string;
	value?: React.ReactNode;
	valueClassName?: string;
}) {
	const display = value ?? "Non renseigne";
	return (
		<div className="flex items-center justify-between gap-3 rounded-lg bg-background/60 px-3 py-2.5">
			<span className="text-sm text-muted-foreground shrink-0">{label}</span>
			<span
				className={cn(
					"ml-3 max-w-[220px] truncate text-sm font-medium text-right sm:max-w-[320px]",
					!value && "text-muted-foreground/60 italic font-normal",
					valueClassName,
				)}
				title={typeof value === "string" ? value : undefined}
			>
				{display}
			</span>
		</div>
	);
}

function SubSectionTitle({ children }: { children: React.ReactNode }) {
	return (
		<p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
			{children}
		</p>
	);
}

// ─── Sections ─────────────────────────────────────────────────────

function IdentitySection({ profile }: { profile: any }) {
	const id = profile?.identity;
	return (
		<FlatCard>
			<SectionHeader
				icon={<User className="h-3.5 w-3.5" />}
				title="Identite"
			/>
			<div className="grid grid-cols-1 gap-1.5 p-4 sm:grid-cols-2">
				<Row label="Nom" value={id?.lastName} />
				<Row label="Prenom" value={id?.firstName} />
				<Row label="Genre" value={lbl(GENDER_LABELS, id?.gender)} />
				<Row label="Date de naissance" value={fmtDate(id?.birthDate)} />
				<Row label="Lieu de naissance" value={id?.birthPlace} />
				<Row label="Pays de naissance" value={lbl(COUNTRY_LABELS, id?.birthCountry)} />
				<Row label="Nationalite" value={lbl(COUNTRY_LABELS, id?.nationality)} />
				<Row
					label="Acquisition nationalite"
					value={lbl(NATIONALITY_ACQ_LABELS, id?.nationalityAcquisition)}
				/>
				{id?.nip && <Row label="NIP" value={id.nip} />}
			</div>
		</FlatCard>
	);
}

function ContactSection({ profile }: { profile: any }) {
	const contacts = profile?.contacts;
	const addr = profile?.addresses;

	return (
		<FlatCard>
			<SectionHeader
				icon={<MapPin className="h-3.5 w-3.5" />}
				title="Contact & adresses"
			/>
			<div className="space-y-4 p-4">
				<div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
					<Row label="Email" value={contacts?.email} />
					<Row label="Telephone" value={contacts?.phone} />
				</div>

				{addr?.residence && (
					<div>
						<SubSectionTitle>Adresse de residence</SubSectionTitle>
						<div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
							<Row label="Rue" value={addr.residence.street} />
							<Row label="Ville" value={addr.residence.city} />
							<Row label="Code postal" value={addr.residence.postalCode} />
							<Row label="Pays" value={lbl(COUNTRY_LABELS, addr.residence.country)} />
						</div>
					</div>
				)}

				{addr?.homeland && (
					<div>
						<SubSectionTitle>Adresse au pays d'origine</SubSectionTitle>
						<div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
							<Row label="Rue" value={addr.homeland.street} />
							<Row label="Ville" value={addr.homeland.city} />
							<Row label="Code postal" value={addr.homeland.postalCode} />
							<Row label="Pays" value={lbl(COUNTRY_LABELS, addr.homeland.country)} />
						</div>
					</div>
				)}
			</div>
		</FlatCard>
	);
}

function EmergencyContactsSection({ profile }: { profile: any }) {
	const contacts = profile?.contacts;
	const list: any[] = contacts?.emergencyContacts ?? [];
	const legacy = [
		contacts?.emergencyResidence && {
			...contacts.emergencyResidence,
			_scope: "residence" as const,
		},
		contacts?.emergencyHomeland && {
			...contacts.emergencyHomeland,
			_scope: "homeland" as const,
		},
	].filter(Boolean);
	const entries = list.length > 0 ? list : legacy;

	return (
		<FlatCard>
			<SectionHeader
				icon={<Phone className="h-3.5 w-3.5" />}
				title="Contacts d'urgence"
				trailing={
					entries.length > 0 ? (
						<Badge variant="outline" className="text-xs">
							{entries.length}
						</Badge>
					) : undefined
				}
			/>
			<div className="p-4">
				{entries.length > 0 ? (
					<div className="space-y-1.5">
						{entries.map((ec: any, i: number) => (
							<div
								key={i}
								className="rounded-lg bg-background/60 p-3"
							>
								<div className="flex items-center justify-between gap-2">
									<p className="text-sm font-semibold truncate">
										{[ec.firstName, ec.lastName].filter(Boolean).join(" ") ||
											"Sans nom"}
									</p>
									{ec._scope === "residence" && (
										<Badge
											variant="outline"
											className="text-xs bg-primary/10 text-primary border-primary/20 shrink-0"
										>
											Pays de residence
										</Badge>
									)}
									{ec._scope === "homeland" && (
										<Badge
											variant="outline"
											className="text-xs shrink-0"
										>
											Pays d'origine
										</Badge>
									)}
								</div>
								<div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
									{ec.phone && (
										<span className="flex items-center gap-1">
											<Phone className="h-3 w-3" /> {ec.phone}
										</span>
									)}
									{ec.email && <span className="truncate">{ec.email}</span>}
									{ec.relationship && (
										<span>
											{lbl(RELATIONSHIP_LABELS, ec.relationship)}
										</span>
									)}
								</div>
							</div>
						))}
					</div>
				) : (
					<p className="text-sm text-muted-foreground italic">
						Aucun contact d'urgence renseigne.
					</p>
				)}
			</div>
		</FlatCard>
	);
}

function FamilySection({ profile }: { profile: any }) {
	const fam = profile?.family;
	const fatherName = [fam?.father?.firstName, fam?.father?.lastName]
		.filter(Boolean)
		.join(" ");
	const motherName = [fam?.mother?.firstName, fam?.mother?.lastName]
		.filter(Boolean)
		.join(" ");
	const spouseName = [fam?.spouse?.firstName, fam?.spouse?.lastName]
		.filter(Boolean)
		.join(" ");

	return (
		<FlatCard>
			<SectionHeader
				icon={<Users className="h-3.5 w-3.5" />}
				title="Famille"
			/>
			<div className="grid grid-cols-1 gap-1.5 p-4 sm:grid-cols-2">
				<Row
					label="Situation matrimoniale"
					value={lbl(MARITAL_LABELS, fam?.maritalStatus)}
				/>
				<Row label="Pere" value={fatherName || undefined} />
				<Row label="Mere" value={motherName || undefined} />
				{spouseName && <Row label="Conjoint(e)" value={spouseName} />}
			</div>
		</FlatCard>
	);
}

function ProfessionSection({ profile }: { profile: any }) {
	const prof = profile?.profession;
	return (
		<FlatCard>
			<SectionHeader
				icon={<Briefcase className="h-3.5 w-3.5" />}
				title="Profession"
			/>
			<div className="grid grid-cols-1 gap-1.5 p-4 sm:grid-cols-2">
				<Row
					label="Statut professionnel"
					value={lbl(PROFESSION_STATUS_LABELS, prof?.status)}
				/>
				<Row label="Profession" value={prof?.title} />
				<Row label="Employeur" value={prof?.employer} />
			</div>
		</FlatCard>
	);
}

function PassportSection({ profile }: { profile: any }) {
	const passport = profile?.passportInfo;
	if (!passport?.number && !passport?.expiryDate) return null;

	const expiryDate = passport?.expiryDate ? new Date(passport.expiryDate) : null;
	const isExpired = expiryDate ? expiryDate < new Date() : false;
	const daysLeft = expiryDate
		? Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
		: null;
	const isWarning = !isExpired && daysLeft !== null && daysLeft < 90;

	return (
		<FlatCard>
			<SectionHeader
				icon={<FileText className="h-3.5 w-3.5" />}
				title="Passeport"
				trailing={
					isExpired ? (
						<Badge
							variant="outline"
							className="text-xs bg-destructive-light text-destructive border-destructive/20 gap-1"
						>
							<AlertTriangle className="h-3 w-3" />
							Expire
						</Badge>
					) : isWarning ? (
						<Badge
							variant="outline"
							className="text-xs bg-warning-light text-warning border-warning/20 gap-1"
						>
							<AlertTriangle className="h-3 w-3" />
							Expire dans {daysLeft}j
						</Badge>
					) : undefined
				}
			/>
			<div className="grid grid-cols-1 gap-1.5 p-4 sm:grid-cols-2">
				<Row label="Numero" value={passport?.number} />
				<Row
					label="Date d'expiration"
					value={fmtDate(passport?.expiryDate)}
					valueClassName={cn(
						isExpired && "text-destructive",
						isWarning && "text-warning",
					)}
				/>
				<Row label="Date d'emission" value={fmtDate(passport?.issueDate)} />
				<Row
					label="Lieu d'emission"
					value={passport?.issuePlace}
				/>
				<Row
					label="Pays d'emission"
					value={lbl(COUNTRY_LABELS, passport?.issueCountry)}
				/>
				<Row label="Type" value={passport?.type} />
			</div>
		</FlatCard>
	);
}

// ─── Composite ───────────────────────────────────────────────────

export interface CitizenDossierSectionsProps {
	profile: any;
}

export function CitizenDossierSections({ profile }: CitizenDossierSectionsProps) {
	return (
		<div className="space-y-4">
			<IdentitySection profile={profile} />
			<ContactSection profile={profile} />
			<EmergencyContactsSection profile={profile} />
			<FamilySection profile={profile} />
			<ProfessionSection profile={profile} />
			<PassportSection profile={profile} />
		</div>
	);
}
