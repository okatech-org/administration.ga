/**
 * DossierTab — Fiche signalétique consulaire en lecture seule.
 * Affichage intelligent et composé des informations de profil.
 * Desktop : 2 colonnes. Mobile : scroll vertical.
 */

import { api } from "@convex/_generated/api";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	Briefcase,
	Loader2,
	MapPin,
	User,
	Users,
} from "lucide-react";
import { FlatCard } from "@/components/my-space/flat-card";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";

// ─── Helpers de traduction ───────────────────────────────────

const getCountryName = (code?: string): string => {
	if (!code) return "—";
	try {
		return new Intl.DisplayNames(["fr"], { type: "region" }).of(code.toUpperCase()) || code;
	} catch (e) {
		return code;
	}
};

const mapGender = (g?: string) => {
	const val = g?.toLowerCase();
	return val === "male" ? "Homme" : val === "female" ? "Femme" : "—";
};

const mapAcquisition = (a?: string) => {
	const val = a?.toLowerCase();
	return val === "birth" ? "De naissance" : val === "naturalization" ? "Par naturalisation" : val || "—";
};

const mapMarital = (m?: string) => {
	const val = m?.toLowerCase();
	if (val === "single") return "Célibataire";
	if (val === "married") return "Marié(e)";
	if (val === "divorced") return "Divorcé(e)";
	if (val === "widowed") return "Veuf/Veuve";
	if (val === "cohabiting") return "Concubinage";
	if (val === "civilunion") return "PACS / Union civile";
	return val || "—";
};

const mapProStatus = (s?: string) => {
	const val = s?.toLowerCase();
	if (val === "employed") return "Employé(e)";
	if (val === "entrepreneur") return "Entrepreneur";
	if (val === "student") return "Étudiant(e)";
	if (val === "retired") return "Retraité(e)";
	if (val === "unemployed") return "Sans emploi";
	return val || "—";
};

const formatLastName = (n?: string) => n ? n.toUpperCase() : "";
const formatFirstName = (n?: string) => {
	if (!n) return "";
	return n.split(/[\s-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
};

// ─── Composants de présentation ──────────────────────────────

function InfoItem({ label, value, fullWidth = false }: { label: string; value?: string | null; fullWidth?: boolean }) {
	return (
		<div className={`flex flex-col gap-0.5 min-w-[120px] shrink-0 ${fullWidth ? "w-full" : "flex-1"}`}>
			<span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
			<span className="text-sm font-medium text-foreground">{value || "—"}</span>
		</div>
	);
}

function SectionSubtitle({ children }: { children: React.ReactNode }) {
	return (
		<div className="w-full mt-1 mb-0.5 border-b border-border/40 pb-1">
			<span className="text-[10px] font-bold text-muted-foreground uppercase">{children}</span>
		</div>
	);
}

function AddressBlock({ title, street, postalCode, city, country }: {
	title: string;
	street?: string;
	postalCode?: string;
	city?: string;
	country?: string;
}) {
	const countryName = getCountryName(country);
	const parts: string[] = [];
	if (postalCode) parts.push(postalCode);
	if (city) parts.push(city);
	const locationLine = parts.length > 0
		? parts.join(" ") + (countryName !== "—" ? ` - ${countryName}` : "")
		: (countryName !== "—" ? countryName : null);
	const hasContent = street || locationLine;

	return (
		<div className="w-full">
			<SectionSubtitle>{title}</SectionSubtitle>
			{hasContent ? (
				<div className="flex flex-col gap-0.5 mt-1.5">
					{street && <span className="text-sm font-medium text-foreground">{street}</span>}
					{locationLine && <span className="text-sm text-muted-foreground">{locationLine}</span>}
				</div>
			) : (
				<span className="text-sm text-muted-foreground mt-1 block">—</span>
			)}
		</div>
	);
}

function PersonBlock({ title, firstName, lastName }: {
	title: string;
	firstName?: string;
	lastName?: string;
}) {
	const fullName = [formatLastName(lastName), formatFirstName(firstName)].filter(Boolean).join(" ");
	return (
		<div className="w-full">
			<SectionSubtitle>{title}</SectionSubtitle>
			<span className="text-sm font-medium text-foreground mt-1 block">{fullName || "—"}</span>
		</div>
	);
}

// ─── DossierTab ──────────────────────────────────────────────

export function DossierTab() {
	const { data: profile, isPending } = useAuthenticatedConvexQuery(
		api.functions.profiles.getMine,
		{},
	);
	const p = profile ?? {} as any;

	const formatDate = (ts?: number) => {
		if (!ts) return "—";
		return format(new Date(ts), "dd MMMM yyyy", { locale: fr });
	};

	if (isPending) {
		return (
			<div className="flex items-center justify-center h-full">
				<Loader2 className="h-6 w-6 animate-spin text-primary" />
			</div>
		);
	}

	if (!profile) {
		return (
			<FlatCard>
				<div className="p-6 text-center text-muted-foreground text-sm">
					Profil introuvable
				</div>
			</FlatCard>
		);
	}

	// Compose birth line: "Libreville, Gabon"
	const birthLocation = [
		p.identity?.birthPlace,
		p.identity?.birthCountry ? getCountryName(p.identity.birthCountry) : null,
	].filter(Boolean).join(", ") || "—";

	return (
		<div className="h-full flex flex-col pt-1">
			{/* Info de mise à jour */}
			<div className="mb-3 shrink-0 rounded-xl bg-primary/5 px-4 py-2.5 border border-primary/10">
				<p className="text-xs text-muted-foreground leading-relaxed">
					Les informations de votre dossier proviennent des documents officiels fournis.
					Pour toute modification, veuillez utiliser <span className="font-semibold text-foreground">iDocument</span>.
				</p>
			</div>

			{/* Grille Principale */}
			<div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-2">
				{/* ─── Colonne 1 : Identité + Famille ─── */}
				<div className="flex flex-col gap-2 min-h-0 overflow-y-auto citizen-scrollbar pr-1 pb-4">
					<DossierCard icon={<User className="h-3.5 w-3.5" />} title="IDENTITÉ">
						<div className="flex flex-col gap-3">
							{/* Nom complet — ligne principale */}
							<div className="flex flex-col gap-0.5">
								<span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Nom complet</span>
								<span className="text-base font-semibold text-foreground">
									{[formatLastName(p.identity?.lastName), formatFirstName(p.identity?.firstName)].filter(Boolean).join(" ") || "—"}
								</span>
							</div>

							{/* Naissance */}
							<div className="flex flex-wrap gap-x-6 gap-y-2">
								<InfoItem label="Né(e) le" value={formatDate(p.identity?.birthDate)} />
								<InfoItem label="À" value={birthLocation} />
								<InfoItem label="Genre" value={mapGender(p.identity?.gender)} />
							</div>

							{/* Nationalité */}
							<div className="flex flex-wrap gap-x-6 gap-y-2">
								<InfoItem label="Nationalité" value={getCountryName(p.identity?.nationality)} />
								<InfoItem label="Acquisition" value={mapAcquisition(p.identity?.nationalityAcquisition)} />
							</div>

							{/* Passeport */}
							{p.passportInfo && (
								<>
									<SectionSubtitle>Passeport</SectionSubtitle>
									<div className="flex flex-wrap gap-x-6 gap-y-2">
										<InfoItem label="Numéro" value={p.passportInfo.number} />
										<InfoItem label="Délivré par" value={p.passportInfo.issuingAuthority} />
									</div>
									<div className="flex flex-wrap gap-x-6 gap-y-2">
										<InfoItem label="Délivré le" value={formatDate(p.passportInfo.issueDate)} />
										<InfoItem label="Expire le" value={formatDate(p.passportInfo.expiryDate)} />
									</div>
								</>
							)}
						</div>
					</DossierCard>

					<DossierCard icon={<Users className="h-3.5 w-3.5" />} title="FAMILLE" className="flex-1">
						<div className="flex flex-col gap-3">
							<InfoItem label="État civil" value={mapMarital(p.family?.maritalStatus)} />
							<PersonBlock title="Père" firstName={p.family?.father?.lastName} lastName={p.family?.father?.firstName} />
							<PersonBlock title="Mère" firstName={p.family?.mother?.lastName} lastName={p.family?.mother?.firstName} />
						</div>
					</DossierCard>
				</div>

				{/* ─── Colonne 2 : Contact + Profession ─── */}
				<div className="flex flex-col gap-2 min-h-0 overflow-y-auto citizen-scrollbar pr-1 pb-4">
					<DossierCard icon={<MapPin className="h-3.5 w-3.5" />} title="CONTACT">
						<div className="flex flex-col gap-3">
							<div className="flex flex-wrap gap-x-6 gap-y-2">
								<InfoItem label="Email" value={p.contacts?.email} />
								<InfoItem label="Téléphone" value={p.contacts?.phone} />
								<InfoItem label="Pays de résidence" value={getCountryName(p.countryOfResidence)} />
							</div>

							<AddressBlock
								title="Adresse de Résidence Actuelle"
								street={p.addresses?.residence?.street}
								postalCode={p.addresses?.residence?.postalCode}
								city={p.addresses?.residence?.city}
								country={p.addresses?.residence?.country}
							/>

							<AddressBlock
								title="Adresse au pays d'origine"
								street={p.addresses?.homeland?.street}
								postalCode={p.addresses?.homeland?.postalCode}
								city={p.addresses?.homeland?.city}
								country={p.addresses?.homeland?.country}
							/>
						</div>
					</DossierCard>

					<DossierCard icon={<Briefcase className="h-3.5 w-3.5" />} title="PROFESSION" className="flex-1">
						<div className="flex flex-col gap-3">
							<div className="flex flex-wrap gap-x-6 gap-y-2">
								<InfoItem label="Statut" value={mapProStatus(p.profession?.status)} />
								<InfoItem label="Profession / Métier" value={p.profession?.title} />
							</div>
							{p.profession?.employer && (
								<InfoItem label="Employeur / Entreprise" value={p.profession.employer} fullWidth />
							)}
						</div>
					</DossierCard>
				</div>
			</div>
		</div>
	);
}

// ─── Carte Dossier ───────────────────────────────────────────

function DossierCard({
	icon,
	title,
	children,
	className,
}: {
	icon: React.ReactNode;
	title: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<FlatCard className={`flex flex-col ${className || ""}`}>
			<div className="flex items-center gap-2 px-3 py-2 shrink-0">
				<div className="text-muted-foreground">
					{icon}
				</div>
				<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</span>
			</div>
			<div className="px-3 pb-3">
				{children}
			</div>
		</FlatCard>
	);
}
