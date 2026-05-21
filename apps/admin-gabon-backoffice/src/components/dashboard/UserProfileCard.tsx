"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	Briefcase,
	ChevronDown,
	ChevronUp,
	FileText,
	Globe,
	Mail,
	MapPin,
	Phone,
	User,
	Users,
} from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FlatCard } from "@/components/design-system/flat-card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";

// Inline label mappings (avoiding external constant dependencies)
const GENDER_LABELS: Record<string, string> = {
	male: "Masculin",
	female: "Féminin",
	other: "Autre",
};

const COUNTRY_LABELS: Record<string, string> = {
	GA: "Gabon",
	FR: "France",
	CM: "Cameroun",
	CG: "Congo",
	CD: "RD Congo",
	SN: "Sénégal",
	CI: "Côte d'Ivoire",
	MA: "Maroc",
	TN: "Tunisie",
	DZ: "Algérie",
	BE: "Belgique",
	CH: "Suisse",
	CA: "Canada",
	US: "États-Unis",
};

const MARITAL_STATUS_LABELS: Record<string, string> = {
	single: "Célibataire",
	married: "Marié(e)",
	divorced: "Divorcé(e)",
	widowed: "Veuf/Veuve",
	pacs: "Pacsé(e)",
};

interface UserProfileCardProps {
	userId?: Id<"users">;
	profileId?: Id<"profiles">;
	compact?: boolean;
}

/**
 * Reusable component to display user profile information
 * Used by agents to view citizen profiles in request processing
 */
export function UserProfileCard({
	userId,
	profileId,
	compact = false,
}: UserProfileCardProps) {
	const [isExpanded, setIsExpanded] = useState(!compact);

	const { data: profileByUserId } = useAuthenticatedConvexQuery(
		api.functions.profiles.getByUserId,
		userId && !profileId ? { userId } : "skip",
	);

	const { data: profileDetail } = useAuthenticatedConvexQuery(
		api.functions.profiles.getProfileDetail,
		profileId ? { profileId } : "skip",
	);

	const profile = profileId ? profileDetail?.profile : profileByUserId;

	const isLoading =
		(profileId && profileDetail === undefined) ||
		(userId && !profileId && profileByUserId === undefined);

	if (isLoading) {
		return <ProfileSkeleton />;
	}

	if (!profile) {
		return (
			<FlatCard className="border border-amber-200 dark:border-amber-800/50">
				<div className="py-4 text-center text-amber-700 dark:text-amber-400 p-3 lg:p-4">
					<User className="h-8 w-8 mx-auto mb-2 opacity-50" />
					<p className="text-sm">Profil non renseigne</p>
				</div>
			</FlatCard>
		);
	}

	const { identity, contacts, addresses, family, passportInfo, profession } =
		profile;

	const completionScore = (profile as any).completionScore ?? 0;

	// Helper to get label from mappings
	const getGenderLabel = (code?: string) =>
		code ? GENDER_LABELS[code] || code : undefined;
	const getCountryLabel = (code?: string) =>
		code ? COUNTRY_LABELS[code] || code : undefined;
	const getMaritalStatusLabel = (code?: string) =>
		code ? MARITAL_STATUS_LABELS[code] || code : undefined;

	// Format date
	const formatDate = (timestamp?: number) => {
		if (!timestamp) return "—";
		return format(new Date(timestamp), "dd MMMM yyyy", { locale: fr });
	};

	// Get initials
	const getInitials = () => {
		const first = identity?.firstName?.[0] || "";
		const last = identity?.lastName?.[0] || "";
		return (first + last).toUpperCase() || "?";
	};

	const fullName =
		[identity?.firstName, identity?.lastName].filter(Boolean).join(" ") ||
		"Nom non renseigné";

	if (compact) {
		return (
			<Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
				<FlatCard>
					<CollapsibleTrigger asChild>
						<div className="p-3 lg:p-4 cursor-pointer hover:bg-secondary/80 transition-colors">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<Avatar className="h-10 w-10">
										<AvatarFallback className="bg-primary/10 text-primary">
											{getInitials()}
										</AvatarFallback>
									</Avatar>
									<div>
										<h3 className="text-base font-semibold">{fullName}</h3>
										<p className="text-xs text-muted-foreground">
											{contacts?.email || "Email non renseigne"}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<Badge
										variant={completionScore >= 80 ? "default" : "secondary"}
									>
										{completionScore}%
									</Badge>
									{isExpanded ? (
										<ChevronUp className="h-4 w-4" />
									) : (
										<ChevronDown className="h-4 w-4" />
									)}
								</div>
							</div>
						</div>
					</CollapsibleTrigger>
					<CollapsibleContent>
						<div className="px-3 pb-3 lg:px-4 lg:pb-4">
							<ProfileDetails
								identity={identity}
								contacts={contacts}
								addresses={addresses}
								family={family}
								passportInfo={passportInfo}
								profession={profession}
								formatDate={formatDate}
								getGenderLabel={getGenderLabel}
								getCountryLabel={getCountryLabel}
								getMaritalStatusLabel={getMaritalStatusLabel}
							/>
						</div>
					</CollapsibleContent>
				</FlatCard>
			</Collapsible>
		);
	}

	return (
		<FlatCard>
			<div className="p-3 lg:p-4">
				<div className="flex items-center gap-4 mb-4">
					<Avatar className="h-14 w-14">
						<AvatarFallback className="bg-primary/10 text-primary text-lg">
							{getInitials()}
						</AvatarFallback>
					</Avatar>
					<div className="flex-1">
						<h3 className="font-semibold flex items-center gap-2">
							{fullName}
							<Badge variant={completionScore >= 80 ? "default" : "secondary"}>
								Profil {completionScore}%
							</Badge>
						</h3>
						<p className="text-sm text-muted-foreground">
							{contacts?.email || "Email non renseigne"}
						</p>
					</div>
				</div>
				<ProfileDetails
					identity={identity}
					contacts={contacts}
					addresses={addresses}
					family={family}
					passportInfo={passportInfo}
					profession={profession}
					formatDate={formatDate}
					getGenderLabel={getGenderLabel}
					getCountryLabel={getCountryLabel}
					getMaritalStatusLabel={getMaritalStatusLabel}
				/>
			</div>
		</FlatCard>
	);
}

// Profile details sections
function ProfileDetails({
	identity,
	contacts,
	addresses,
	family,
	passportInfo,
	profession,
	formatDate,
	getGenderLabel,
	getCountryLabel,
	getMaritalStatusLabel,
}: {
	identity?: {
		firstName?: string;
		lastName?: string;
		birthDate?: number;
		birthPlace?: string;
		birthCountry?: string;
		gender?: string;
		nationality?: string;
	};
	contacts?: {
		phone?: string;
		phoneAbroad?: string;
		email?: string;
	};
	addresses?: {
		residence?: {
			street?: string;
			city?: string;
			postalCode?: string;
			country?: string;
		};
		homeland?: {
			street?: string;
			city?: string;
			country?: string;
		};
	};
	family?: {
		maritalStatus?: string;
		father?: { firstName?: string; lastName?: string };
		mother?: { firstName?: string; lastName?: string };
		spouse?: { firstName?: string; lastName?: string };
	};
	passportInfo?: {
		number?: string;
		issueDate?: number;
		expiryDate?: number;
		issuingAuthority?: string;
	};
	profession?: {
		title?: string;
		employer?: string;
		sector?: string;
	};
	formatDate: (timestamp?: number) => string;
	getGenderLabel: (code?: string) => string | undefined;
	getCountryLabel: (code?: string) => string | undefined;
	getMaritalStatusLabel: (code?: string) => string | undefined;
}) {
	return (
		<div className="space-y-4">
			{/* Identity Section */}
			<Section icon={User} title="Identité">
				<div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
					<InfoRow label="Prénom" value={identity?.firstName} />
					<InfoRow label="Nom" value={identity?.lastName} />
					<InfoRow
						label="Date de naissance"
						value={formatDate(identity?.birthDate)}
					/>
					<InfoRow label="Lieu de naissance" value={identity?.birthPlace} />
					<InfoRow label="Genre" value={getGenderLabel(identity?.gender)} />
					<InfoRow
						label="Nationalité"
						value={getCountryLabel(identity?.nationality)}
					/>
				</div>
			</Section>

			<Separator />

			{/* Contact Section */}
			<Section icon={Phone} title="Contact">
				<div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
					<InfoRow
						label="Email"
						value={contacts?.email}
						icon={<Mail className="h-3 w-3" />}
					/>
					<InfoRow
						label="Téléphone"
						value={contacts?.phone}
						icon={<Phone className="h-3 w-3" />}
					/>
					{contacts?.phoneAbroad && (
						<InfoRow
							label="Tél. étranger"
							value={contacts.phoneAbroad}
							icon={<Globe className="h-3 w-3" />}
						/>
					)}
				</div>
			</Section>

			{/* Address Section - if exists */}
			{(addresses?.residence || addresses?.homeland) && (
				<>
					<Separator />
					<Section icon={MapPin} title="Adresses">
						<div className="space-y-3 text-sm">
							{addresses?.residence && (
								<div>
									<p className="text-xs text-muted-foreground mb-1">
										Résidence actuelle
									</p>
									<p>
										{[
											addresses.residence.street,
											addresses.residence.postalCode,
											addresses.residence.city,
											getCountryLabel(addresses.residence.country),
										]
											.filter(Boolean)
											.join(", ") || "—"}
									</p>
								</div>
							)}
							{addresses?.homeland && (
								<div>
									<p className="text-xs text-muted-foreground mb-1">
										Adresse au Gabon
									</p>
									<p>
										{[
											addresses.homeland.street,
											addresses.homeland.city,
											getCountryLabel(addresses.homeland.country),
										]
											.filter(Boolean)
											.join(", ") || "—"}
									</p>
								</div>
							)}
						</div>
					</Section>
				</>
			)}

			{/* Family Section - if exists */}
			{family && (family.maritalStatus || family.father || family.mother) && (
				<>
					<Separator />
					<Section icon={Users} title="Famille">
						<div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
							<InfoRow
								label="Situation familiale"
								value={getMaritalStatusLabel(family.maritalStatus)}
							/>
							{family.spouse && (
								<InfoRow
									label="Conjoint(e)"
									value={[family.spouse.firstName, family.spouse.lastName]
										.filter(Boolean)
										.join(" ")}
								/>
							)}
							{family.father && (
								<InfoRow
									label="Père"
									value={[family.father.firstName, family.father.lastName]
										.filter(Boolean)
										.join(" ")}
								/>
							)}
							{family.mother && (
								<InfoRow
									label="Mère"
									value={[family.mother.firstName, family.mother.lastName]
										.filter(Boolean)
										.join(" ")}
								/>
							)}
						</div>
					</Section>
				</>
			)}

			{/* Passport Section - if exists */}
			{passportInfo?.number && (
				<>
					<Separator />
					<Section icon={FileText} title="Passeport">
						<div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
							<InfoRow label="Numéro" value={passportInfo.number} />
							<InfoRow
								label="Délivré le"
								value={formatDate(passportInfo.issueDate)}
							/>
							<InfoRow
								label="Expire le"
								value={formatDate(passportInfo.expiryDate)}
							/>
							<InfoRow label="Autorité" value={passportInfo.issuingAuthority} />
						</div>
					</Section>
				</>
			)}

			{/* Profession Section - if exists */}
			{profession?.title && (
				<>
					<Separator />
					<Section icon={Briefcase} title="Profession">
						<div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
							<InfoRow label="Intitulé" value={profession.title} />
							<InfoRow label="Employeur" value={profession.employer} />
							<InfoRow label="Secteur" value={profession.sector} />
						</div>
					</Section>
				</>
			)}
		</div>
	);
}

// Section wrapper
function Section({
	icon: Icon,
	title,
	children,
}: {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div>
			<div className="flex items-center gap-2 mb-2">
				<Icon className="h-4 w-4 text-muted-foreground" />
				<h4 className="font-medium text-sm">{title}</h4>
			</div>
			{children}
		</div>
	);
}

// Info row component
function InfoRow({
	label,
	value,
	icon,
}: {
	label: string;
	value?: string | null;
	icon?: React.ReactNode;
}) {
	return (
		<div className="flex flex-col">
			<span className="text-xs text-muted-foreground">{label}</span>
			<span className="flex items-center gap-1">
				{icon}
				{value || "—"}
			</span>
		</div>
	);
}

// Loading skeleton
function ProfileSkeleton() {
	return (
		<FlatCard>
			<div className="p-3 lg:p-4">
				<div className="flex items-center gap-4 mb-4">
					<Skeleton className="h-14 w-14 rounded-full" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-5 w-40" />
						<Skeleton className="h-4 w-32" />
					</div>
				</div>
				<div className="space-y-4">
					<Skeleton className="h-24 w-full" />
					<Skeleton className="h-16 w-full" />
				</div>
			</div>
		</FlatCard>
	);
}
