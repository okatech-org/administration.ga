"use client";

/**
 * iProfil — Profil métier diplomatique
 *
 * 4 onglets : Identité, Poste, Accréditations, Préférences
 * Données depuis users + memberships + positions
 */

import { api } from "@convex/_generated/api";
import { useQuery as useConvexQuery } from "convex/react";
import {
	Award,
	Briefcase,
	Calendar,
	ChevronRight,
	Clock,
	Edit,
	Globe,
	Languages,
	Loader2,
	Mail,
	MapPin,
	Phone,
	Settings,
	Shield,
	Sun,
	UserCircle,
	X,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useOrg } from "../../shell/org-provider";
import { usePageContext } from "../../hooks/use-page-context";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { FlatCard } from "../../components/my-space/flat-card";
import { SectionHeader } from "../../components/my-space/section-header";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@workspace/ui/components/tabs";
import { useConvexMutationQuery } from "@workspace/api/hooks";
import { cn } from "@workspace/ui/lib/utils";

// ─── Status config ─────────────────────────────────────────────
const STATUS_CONFIG: Record<
	string,
	{ label: string; color: string; bg: string }
> = {
	en_poste: {
		label: "En poste",
		color: "text-emerald-600",
		bg: "bg-emerald-500/10",
	},
	en_mission: {
		label: "En mission",
		color: "text-blue-600",
		bg: "bg-blue-500/10",
	},
	en_conge: {
		label: "En congé",
		color: "text-amber-600",
		bg: "bg-amber-500/10",
	},
	en_formation: {
		label: "En formation",
		color: "text-purple-600",
		bg: "bg-purple-500/10",
	},
	rapatrie: { label: "Rapatrié", color: "text-gray-600", bg: "bg-gray-500/10" },
	detache: {
		label: "Détaché",
		color: "text-orange-600",
		bg: "bg-orange-500/10",
	},
};

// ─── Language levels ───────────────────────────────────────────
const LANG_LEVELS: Record<string, string> = {
	native: "Langue maternelle",
	fluent: "Courant",
	advanced: "Avancé (C1)",
	intermediate: "Intermédiaire (B1-B2)",
	basic: "Notions (A1-A2)",
};

const LANG_NAMES: Record<string, string> = {
	fr: "Français",
	en: "Anglais",
	es: "Espagnol",
	pt: "Portugais",
	ar: "Arabe",
	zh: "Chinois",
	de: "Allemand",
	it: "Italien",
	ru: "Russe",
	ja: "Japonais",
	ko: "Coréen",
	sw: "Swahili",
};

// ─── Main Page ─────────────────────────────────────────────────
export default function IProfilPage() {
	const { t } = useTranslation();
	const { activeOrgId } = useOrg();
	const [activeTab, setActiveTab] = useState("identite");
	const [isEditing, setIsEditing] = useState(false);

	// Convex native useQuery — réactif, pas de TanStack Query wrapper
	const data = useConvexQuery(
		api.functions.diplomaticProfile.getMyDiplomaticProfile,
		{},
	);

	const { mutateAsync: updateProfile, isPending: isSaving } =
		useConvexMutationQuery(
			api.functions.diplomaticProfile.updateMyDiplomaticProfile,
		);

	usePageContext({
		module: "iprofil",
		title: "iProfil",
		summary: `Profil diplomatique de l'agent. Onglet ${activeTab}.${isEditing ? " Mode édition." : ""}`,
		visibleEntities: [],
		availableActions: [],
		scopedToolNames: ["getAgentContext"],
	});

	// undefined = en cours de chargement, null/objet = chargé
	if (data === undefined) {
		return (
			<div className="flex items-center justify-center h-full">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!data || !data.memberships || data.memberships.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-full text-center p-6">
				<UserCircle className="h-16 w-16 text-muted-foreground/30 mb-4" />
				<h2 className="text-lg font-semibold">
					{!data ? "Profil non disponible" : "Aucune affectation active"}
				</h2>
				<p className="text-sm text-muted-foreground mt-1 max-w-sm">
					{!data
						? "Impossible de charger votre profil diplomatique. Veuillez vous reconnecter."
						: "Vous n'avez aucune affectation active dans une représentation diplomatique. Contactez votre administrateur pour être rattaché à un poste."}
				</p>
			</div>
		);
	}

	const { user, memberships } = data;
	// Membership active dans l'org courante (ou la première)
	const primaryMembership = activeOrgId
		? (memberships.find((m) => m.orgId === activeOrgId) ?? memberships[0])
		: memberships[0];
	// biome-ignore lint/suspicious/noExplicitAny: profile/position/org shape varies
	const profile = (primaryMembership?.diplomaticProfile ?? {}) as any;
	// biome-ignore lint/suspicious/noExplicitAny: position shape varies
	const position = primaryMembership?.position as any;
	// biome-ignore lint/suspicious/noExplicitAny: org shape varies
	const org = primaryMembership?.org as any;
	const status = profile?.status ?? "en_poste";
	const statusInfo = STATUS_CONFIG[status] ?? STATUS_CONFIG.en_poste;

	return (
		<div className="flex flex-col gap-6 p-4 lg:p-6 max-w-4xl mx-auto h-full overflow-y-auto citizen-scrollbar">
			{/* ─── Header Card ─── */}
			<FlatCard>
				<div className="p-3 lg:p-4">
					<div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
						<Avatar className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl shrink-0">
							<AvatarImage src={user.avatarUrl} />
							<AvatarFallback className="text-2xl rounded-2xl bg-primary/10 text-primary">
								{user.lastName?.[0]}
								{user.firstName?.[0]}
							</AvatarFallback>
						</Avatar>
						<div className="flex-1 min-w-0">
							<h1 className="text-xl sm:text-2xl font-bold tracking-tight">
								{user.lastName?.toUpperCase()} {user.firstName}
							</h1>
							<p className="text-muted-foreground text-sm mt-0.5 font-medium">
								{position?.title?.fr ?? "Poste non assigné"}
							</p>
							{org && (
								<p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 font-medium">
									<MapPin className="h-3 w-3" />
									{org.name}
								</p>
							)}
							<div className="flex items-center gap-2 mt-3 flex-wrap">
								<Badge className={cn("text-xs", statusInfo.bg, statusInfo.color)}>
									{statusInfo.label}
								</Badge>
								{position?.grade && (
									<Badge variant="outline" className="text-xs capitalize">
										{position.grade.replace(/_/g, " ")}
									</Badge>
								)}
							</div>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setIsEditing(!isEditing)}
							className="shrink-0 gap-1.5 active:scale-[0.97] transition-transform"
						>
							{isEditing ? (
								<X className="h-3.5 w-3.5" />
							) : (
								<Edit className="h-3.5 w-3.5" />
							)}
							{isEditing ? "Annuler" : "Modifier"}
						</Button>
					</div>
				</div>
			</FlatCard>

			{/* ─── Tabs ─── */}
			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList className="grid w-full grid-cols-4">
					<TabsTrigger value="identite" className="gap-1.5 text-xs">
						<UserCircle className="h-3.5 w-3.5" /> Identité
					</TabsTrigger>
					<TabsTrigger value="poste" className="gap-1.5 text-xs">
						<Briefcase className="h-3.5 w-3.5" /> Poste
					</TabsTrigger>
					<TabsTrigger value="accreditations" className="gap-1.5 text-xs">
						<Award className="h-3.5 w-3.5" /> Accréditations
					</TabsTrigger>
					<TabsTrigger value="preferences" className="gap-1.5 text-xs">
						<Settings className="h-3.5 w-3.5" /> Préférences
					</TabsTrigger>
				</TabsList>

				{/* ═══ Onglet Identité ═══ */}
				<TabsContent value="identite" className="space-y-4 mt-4">
					{/* Contact professionnel */}
					<FlatCard>
						<div className="p-3 lg:p-4">
							<SectionHeader
								icon={<Phone className="h-4 w-4 text-primary" />}
								title="Contact professionnel"
							/>
							<div className="space-y-3">
								<InfoRow
									icon={Mail}
									label="Email officiel"
									value={profile?.officialEmail ?? user.email}
								/>
								<InfoRow
									icon={Phone}
									label="Ligne directe"
									value={profile?.officePhone ?? "—"}
								/>
								<InfoRow
									icon={Phone}
									label="Extension"
									value={profile?.officeExtension ?? "—"}
								/>
							</div>
						</div>
					</FlatCard>

					{/* Langues */}
					<FlatCard>
						<div className="p-3 lg:p-4">
							<SectionHeader
								icon={<Languages className="h-4 w-4 text-primary" />}
								title="Compétences linguistiques"
							/>
							{profile?.languages?.length > 0 ? (
								<div className="space-y-2">
									{/* biome-ignore lint/suspicious/noExplicitAny: lang shape varies */}
									{profile.languages.map((lang: any, i: number) => (
										<div
											key={i}
											className="flex items-center justify-between rounded-lg border px-3 py-2"
										>
											<span className="text-sm font-medium">
												{LANG_NAMES[lang.code] ?? lang.code}
											</span>
											<Badge variant="outline" className="text-xs">
												{LANG_LEVELS[lang.level] ?? lang.level}
											</Badge>
										</div>
									))}
								</div>
							) : (
								<p className="text-xs text-muted-foreground">
									Aucune langue renseignée
								</p>
							)}
						</div>
					</FlatCard>

					{/* Bio */}
					<FlatCard>
						<div className="p-3 lg:p-4">
							<div className="mb-2">
								<h3 className="text-sm font-bold">Biographie</h3>
							</div>
							<p className="text-sm text-muted-foreground font-medium">
								{profile?.bio || "Aucune biographie renseignée."}
							</p>
						</div>
					</FlatCard>
				</TabsContent>

				{/* ═══ Onglet Poste ═══ */}
				<TabsContent value="poste" className="space-y-4 mt-4">
					{/* Poste actuel */}
					<FlatCard>
						<div className="p-3 lg:p-4">
							<SectionHeader
								icon={<Briefcase className="h-4 w-4 text-primary" />}
								title="Poste actuel"
							/>
							<div className="space-y-3">
								<InfoRow
									icon={Shield}
									label="Poste"
									value={position?.title?.fr ?? "Non assigné"}
								/>
								<InfoRow
									icon={MapPin}
									label="Représentation"
									value={org?.name ?? "—"}
								/>
								<InfoRow
									icon={Globe}
									label="Pays"
									value={org?.country ?? "—"}
								/>
								{profile?.startDate && (
									<InfoRow
										icon={Calendar}
										label="En poste depuis"
										value={new Date(profile.startDate).toLocaleDateString(
											"fr-FR",
											{
												month: "long",
												year: "numeric",
											},
										)}
									/>
								)}
							</div>
						</div>
					</FlatCard>

					{/* Responsabilités (moduleAccess) */}
					{position?.moduleAccess?.length > 0 && (
						<FlatCard>
							<div className="p-3 lg:p-4">
								<SectionHeader
									icon={<Shield className="h-4 w-4 text-primary" />}
									title="Responsabilités"
								/>
								<div className="space-y-1.5">
									{/* biome-ignore lint/suspicious/noExplicitAny: moduleAccess shape varies */}
									{(position.moduleAccess as any[]).map((ma: any) => (
										<div
											key={ma.moduleCode}
											className="flex items-center justify-between rounded-lg border px-3 py-1.5"
										>
											<span className="text-xs font-medium capitalize">
												{ma.moduleCode.replace(/_/g, " ")}
											</span>
											<Badge
												variant="outline"
												className={cn(
													"text-[10px]",
													ma.accessLevel === "admin"
														? "text-emerald-600 border-emerald-300"
														: ma.accessLevel === "editor"
															? "text-amber-600 border-amber-300"
															: "text-blue-600 border-blue-300",
												)}
											>
												{ma.accessLevel === "admin"
													? "Admin"
													: ma.accessLevel === "editor"
														? "Éditeur"
														: "Lecteur"}
											</Badge>
										</div>
									))}
								</div>
							</div>
						</FlatCard>
					)}

					{/* Historique des affectations */}
					<FlatCard>
						<div className="p-3 lg:p-4">
							<SectionHeader
								icon={<Clock className="h-4 w-4 text-primary" />}
								title="Historique des affectations"
							/>
							{profile?.previousPostings?.length > 0 ? (
								<div className="space-y-2">
									{/* biome-ignore lint/suspicious/noExplicitAny: posting shape varies */}
									{profile.previousPostings.map((posting: any, i: number) => (
										<div
											key={i}
											className="flex items-start gap-3 rounded-lg border px-3 py-2.5"
										>
											<div className="h-2 w-2 rounded-full bg-primary/40 mt-1.5 shrink-0" />
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium">
													{posting.position}
												</p>
												<p className="text-xs text-muted-foreground">
													{posting.orgName}
												</p>
												<p className="text-[10px] text-muted-foreground mt-0.5">
													{new Date(posting.startDate).getFullYear()}
													{posting.endDate
														? ` — ${new Date(posting.endDate).getFullYear()}`
														: " — présent"}
													{" · "}
													{posting.country}
												</p>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-xs text-muted-foreground">
									Aucune affectation précédente renseignée.
								</p>
							)}
						</div>
					</FlatCard>
				</TabsContent>

				{/* ═══ Onglet Accréditations ═══ */}
				<TabsContent value="accreditations" className="space-y-4 mt-4">
					<FlatCard>
						<div className="p-3 lg:p-4">
							<SectionHeader
								icon={<Award className="h-4 w-4 text-primary" />}
								title="Documents diplomatiques"
							/>
							<div className="space-y-3">
								{/* Lettres de créance */}
								<CredentialCard
									title="Lettres de créance"
									subtitle={
										profile?.credentials?.lettersOfCredence?.presentedDate
											? `Présentées le ${new Date(profile.credentials.lettersOfCredence.presentedDate).toLocaleDateString("fr-FR")}`
											: "Non renseigné"
									}
									icon=""
									hasData={
										!!profile?.credentials?.lettersOfCredence?.presentedDate
									}
								/>

								{/* Carte diplomatique */}
								<CredentialCard
									title="Carte diplomatique"
									subtitle={
										profile?.credentials?.diplomaticCard?.number
											? `N° ${profile.credentials.diplomaticCard.number}${profile.credentials.diplomaticCard.expiresAt ? ` — Expire: ${new Date(profile.credentials.diplomaticCard.expiresAt).toLocaleDateString("fr-FR")}` : ""}`
											: "Non renseigné"
									}
									icon=""
									hasData={!!profile?.credentials?.diplomaticCard?.number}
								/>

								{/* Passeport diplomatique */}
								<CredentialCard
									title="Passeport diplomatique"
									subtitle={
										profile?.credentials?.diplomaticPassport?.number
											? `N° ${profile.credentials.diplomaticPassport.number}${profile.credentials.diplomaticPassport.expiresAt ? ` — Expire: ${new Date(profile.credentials.diplomaticPassport.expiresAt).toLocaleDateString("fr-FR")}` : ""}`
											: "Non renseigné"
									}
									icon=""
									hasData={
										!!profile?.credentials?.diplomaticPassport?.number
									}
								/>

								{/* Exequatur */}
								<CredentialCard
									title="Exequatur"
									subtitle={
										profile?.credentials?.exequatur?.grantedDate
											? `Accordé le ${new Date(profile.credentials.exequatur.grantedDate).toLocaleDateString("fr-FR")}`
											: "Non renseigné"
									}
									icon=""
									hasData={!!profile?.credentials?.exequatur?.grantedDate}
								/>
							</div>
						</div>
					</FlatCard>

					{/* Signature officielle */}
					<FlatCard>
						<div className="p-3 lg:p-4">
							<div className="mb-2">
								<h3 className="text-sm font-bold">Signature officielle</h3>
							</div>
							{profile?.officialSignature?.title ? (
								<div className="rounded-lg border p-3 text-center">
									<p className="text-xs font-medium">
										{profile.officialSignature.title}
									</p>
									{profile.officialSignature.imageStorageId && (
										<p className="text-[10px] text-muted-foreground mt-1">
											Image de signature configurée
										</p>
									)}
								</div>
							) : (
								<div className="rounded-lg border-2 border-dashed border-border/50 p-6 text-center">
									<p className="text-xs text-muted-foreground">
										Aucune signature configurée
									</p>
									<Button
										variant="outline"
										size="sm"
										className="mt-2 text-xs active:scale-[0.97] transition-transform"
									>
										Configurer ma signature
									</Button>
								</div>
							)}
						</div>
					</FlatCard>
				</TabsContent>

				{/* ═══ Onglet Préférences ═══ */}
				<TabsContent value="preferences" className="space-y-4 mt-4">
					<FlatCard>
						<div className="p-3 lg:p-4">
							<div className="mb-2">
								<h3 className="text-sm font-bold">Notifications</h3>
							</div>
							<div className="space-y-2">
								<PreferenceRow
									label="Nouvelles demandes"
									checked={
										primaryMembership?.settings?.notifyOnNewRequest ?? true
									}
								/>
								<PreferenceRow
									label="Assignations"
									checked={
										primaryMembership?.settings?.notifyOnAssignment ?? true
									}
								/>
								<PreferenceRow
									label="Résumé quotidien"
									checked={primaryMembership?.settings?.dailyDigest ?? false}
								/>
							</div>
						</div>
					</FlatCard>

					<FlatCard>
						<div className="p-3 lg:p-4">
							<div className="mb-2">
								<h3 className="text-sm font-bold">Langue et apparence</h3>
							</div>
							<div className="space-y-2">
								<InfoRow
									icon={Globe}
									label="Langue d'interface"
									value="Français"
								/>
								<InfoRow icon={Sun} label="Thème" value="Système" />
							</div>
						</div>
					</FlatCard>
				</TabsContent>
			</Tabs>
		</div>
	);
}

// ─── Helper components ─────────────────────────────────────────

function InfoRow({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof Phone;
	label: string;
	value: string;
}) {
	return (
		<div className="flex items-center justify-between py-1">
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				<Icon className="h-3.5 w-3.5" />
				{label}
			</div>
			<span className="text-sm font-medium">{value}</span>
		</div>
	);
}

function CredentialCard({
	title,
	subtitle,
	icon,
	hasData,
}: {
	title: string;
	subtitle: string;
	icon: string;
	hasData: boolean;
}) {
	return (
		<div
			className={cn(
				"flex items-center gap-3 rounded-lg border px-3 py-2.5",
				hasData ? "border-border" : "border-border/50 opacity-60",
			)}
		>
			<span className="text-lg">{icon}</span>
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium">{title}</p>
				<p className="text-[11px] text-muted-foreground">{subtitle}</p>
			</div>
			<ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
		</div>
	);
}

function PreferenceRow({ label, checked }: { label: string; checked: boolean }) {
	return (
		<div className="flex items-center justify-between py-1">
			<span className="text-sm">{label}</span>
			<Badge variant={checked ? "default" : "outline"} className="text-[10px]">
				{checked ? "Activé" : "Désactivé"}
			</Badge>
		</div>
	);
}
