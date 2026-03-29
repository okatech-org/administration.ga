import { api } from "@convex/_generated/api";
import { RequestStatus } from "@convex/lib/constants";
import { createFileRoute, Link } from "@tanstack/react-router";
import { differenceInYears, format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	ArrowRight, Baby, Briefcase, Calendar, Edit, Building2,
	FileText, GraduationCap, Languages, Loader2, Mail, MapPin, Megaphone,
	Pencil, Phone, Star, User, Users, Wrench, FileBadge2, Info
} from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { AssistanceContactsWidget } from "@/components/my-space/assistance-contacts-widget";
import { ConsularCardWidget } from "@/components/my-space/consular-card-widget";
import { FlatCard } from "@/components/my-space/flat-card";
import { MySpaceHeader } from "@/components/my-space/my-space-wrapper";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuthenticatedConvexQuery, useConvexQuery } from "@/integrations/convex/hooks";
import { getLocalizedValue } from "@/lib/i18n-utils";
import { REQUEST_STATUS_CONFIG } from "@/lib/request-status-config";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/my-space/")({ component: UserDashboard });

// ─── Helpers ─────────────────────────────────────────────────
const GENDER_LABELS: Record<string, string> = { male: "Homme", female: "Femme", M: "Homme", F: "Femme" };
const COUNTRY_LABELS: Record<string, string> = { GA: "Gabon", FR: "France", CM: "Cameroun", CG: "Congo", CD: "RD Congo", SN: "Sénégal", CI: "Côte d'Ivoire", MA: "Maroc", BE: "Belgique", CH: "Suisse", CA: "Canada", US: "États-Unis" };
const MARITAL_LABELS: Record<string, string> = { single: "Célibataire", married: "Marié(e)", divorced: "Divorcé(e)", widowed: "Veuf/Veuve", pacs: "Pacsé(e)" };
const PROFESSION_LABELS: Record<string, string> = { employed: "Salarié(e)", self_employed: "Indépendant(e)", unemployed: "Sans emploi", student: "Étudiant(e)", retired: "Retraité(e)" };

function getAge(bd?: string | number | null): number | null { if (!bd) return null; try { return differenceInYears(new Date(), new Date(bd)); } catch { return null; } }
function lbl(map: Record<string, string>, code?: string) { return code ? map[code] || code : undefined; }
function fmtDate(ts?: number) { if (!ts) return "—"; return format(new Date(ts), "dd MMM yyyy", { locale: fr }); }
function formatPhone(phone?: string) {
	if (!phone) return "";
	const c = phone.replace(/\s+/g, "");
	if (c.startsWith("+33") && c.length === 12) return `+33 (0) ${c[3]} ${c.slice(4,6)} ${c.slice(6,8)} ${c.slice(8,10)} ${c.slice(10,12)}`;
	if (c.startsWith("+241") && c.length >= 11) return `+241 ${c.slice(4,6)} ${c.slice(6,8)} ${c.slice(8,10)} ${c.slice(10,12)}`;
	return phone;
}

function InfoRow({ label, value, className }: { label: string; value?: React.ReactNode; className?: string }) {
	return (
		<div className={cn("flex flex-col overflow-hidden", className)}>
			<span className="text-[10px] text-muted-foreground uppercase font-semibold leading-none tracking-wider mb-1">{label}</span>
			{typeof value === "string" ? (
				<span className="text-[13px] font-bold leading-tight truncate text-foreground" title={value || ""}>{value || "—"}</span>
			) : value ? (
				<div className="text-[13px] font-bold leading-tight text-foreground">{value}</div>
			) : (
				<span className="text-[13px] font-bold leading-tight text-foreground">—</span>
			)}
		</div>
	);
}

// FlatCard is now imported from @/components/my-space/flat-card

// ═════════════════════════════════════════════════════════════
function UserDashboard() {
	const { t, i18n } = useTranslation();

	const { data: profile, isPending } = useAuthenticatedConvexQuery(api.functions.profiles.getMine, {});
	const { data: latestRequest } = useAuthenticatedConvexQuery(api.functions.requests.getLatestActive, {});
	const { data: appointments } = useAuthenticatedConvexQuery(api.functions.appointments.listByUser, {});
	const { data: posts } = useConvexQuery(api.functions.posts.getLatest, { limit: 3 });

	const { data: registrations } = useAuthenticatedConvexQuery(
		api.functions.consularRegistrations.listByProfile,
		{},
	);
	const latestRegistration = (registrations as any[])?.[0];
	const { data: registrationRequest } = useAuthenticatedConvexQuery(
		api.functions.requests.getById,
		latestRegistration?.requestId ? { requestId: latestRegistration.requestId } : "skip",
	);
	const requestReference = registrationRequest?.reference;
	const orgName = (registrationRequest?.org as any)?.name;

	const { data: cvData } = useAuthenticatedConvexQuery(api.functions.cv.getMine, {});
	const { data: childProfiles } = useAuthenticatedConvexQuery(api.functions.childProfiles.getMine, {});

	// Load identity photo from profile documents
	const identityPhotoId = (profile as any)?.documents?.identityPhoto;
	const { data: identityPhotoDocs } = useAuthenticatedConvexQuery(
		api.functions.documents.getDocumentsByIds,
		identityPhotoId ? { ids: [identityPhotoId] } : "skip",
	);
	const identityPhotoUrl = (identityPhotoDocs as any)?.[0]?.files?.[0]?.url ?? null;

	const children = (childProfiles ?? []) as any[];
	const p = profile as any;
	const identity = p?.identity;
	const contacts = p?.contacts;
	const addresses = p?.addresses;
	const firstName = identity?.firstName ?? "";
	const lastName = identity?.lastName ?? "";
	const age = getAge(identity?.birthDate);
	const avatarUrl = identityPhotoUrl ?? p?.avatarUrl;

	const cvScore = (() => {
		if (!cvData) return 0;
		let f = [cvData.firstName, cvData.lastName, cvData.title, cvData.summary, cvData.email, cvData.phone].filter(Boolean).length;
		f += [cvData.experiences, cvData.education, cvData.skills, cvData.languages].filter((a: any) => a?.length > 0).length;
		return Math.round((f / 10) * 100);
	})();

	const completionScore = (() => {
		if (!profile) return 0;
		let f = 0; let t = 0;
		const c = (v: unknown) => { t++; if (v) f++; };
		c(identity?.firstName); c(identity?.lastName); c(identity?.birthDate); c(identity?.birthPlace);
		c(identity?.gender); c(identity?.nationality); c(contacts?.phone); c(contacts?.email);
		c(addresses?.residence); c(p?.passportInfo?.number); c(p?.family?.maritalStatus); c(p?.profession);
		return t > 0 ? Math.round((f / t) * 100) : 0;
	})();

	if (isPending) return (
		<div className="flex items-center justify-center h-full">
			<div className="flex flex-col items-center gap-3">
				<div className="rounded-xl border border-border bg-card p-6">
					<Loader2 className="h-8 w-8 animate-spin text-teal-600 dark:text-teal-400" />
				</div>
				<span className="text-sm text-muted-foreground">Chargement...</span>
			</div>
		</div>
	);

	return (
		<div className="flex flex-col h-full overflow-hidden">
			<div className="px-2 shrink-0">
				<MySpaceHeader />
			</div>

			<motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex-1 min-h-0 overflow-hidden px-2 pb-0 mt-3">
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-2 h-full overflow-hidden pr-1">

					{/* ─── COL 1: Hero & Carte (3/12) ─── */}
					<div className="lg:col-span-3 flex flex-col gap-2 min-h-0 overflow-y-auto citizen-scrollbar stagger-children">

						{/* HERO COMPACT — Neumorphic */}
						<FlatCard className="shrink-0 relative">
							<div className="absolute top-3 right-2">
								<Button asChild size="icon" variant="ghost" className="h-6 w-6 rounded-full hover:bg-teal-500/10">
									<Link to="/my-space/profile/edit"><Pencil className="h-3 w-3 text-muted-foreground" /></Link>
								</Button>
							</div>

							<div className="p-3 flex flex-col">
								<div className="flex items-center justify-between gap-2 mb-4">
									<div className="relative shrink-0">
										<Avatar className="h-[150px] w-[150px] border-2 border-white dark:border-gray-700 shadow-md">
											<AvatarImage src={avatarUrl} />
											<AvatarFallback className="text-4xl font-bold bg-teal-500 text-white">{firstName?.[0]}{lastName?.[0]}</AvatarFallback>
										</Avatar>
										{/* Completion ring */}
										<div className="absolute -bottom-1 -right-1 bg-card rounded-full p-0.5 border border-border">
											<div className="relative h-8 w-8 flex items-center justify-center bg-muted rounded-full">
												<svg className="absolute inset-0 h-8 w-8 -rotate-90" viewBox="0 0 36 36">
													<circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" className="stroke-muted/30" />
													<circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" strokeDasharray={`${completionScore} ${100 - completionScore}`} strokeLinecap="round" stroke="#14b8a6" />
												</svg>
												<span className="text-[8px] font-bold z-10">{completionScore}%</span>
											</div>
										</div>
									</div>

									<div className="flex flex-col gap-2 justify-center shrink-0">
										{identity?.gender && (
											<span className="text-[12px] w-max px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold border border-teal-500/20">
												{GENDER_LABELS[identity.gender] ?? identity.gender}
											</span>
										)}
										{age !== null && (
											<span className="text-[11px] w-max px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20">
												{age} ans
											</span>
										)}
										{p?.userType && (
											<span className="text-[11px] w-max px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold border border-amber-500/20">
												{p.userType === "long_stay" ? "Long séjour" : p.userType === "short_stay" ? "Court séjour" : "De passage"}
											</span>
										)}
									</div>
								</div>

								<div className="flex flex-col text-left mb-1">
									<h2 className="text-lg font-black uppercase text-foreground leading-none">{lastName}</h2>
									<p className="text-sm font-medium text-muted-foreground mt-1 capitalize">{firstName}</p>
								</div>

								{/* Contact info — neumorphic inset */}
								<div className="w-full mt-3 space-y-1.5 text-left bg-muted/50 rounded-lg p-2.5 border border-border/50">
									{contacts?.phone && (
										<div className="flex items-center gap-2 text-[11px] font-medium">
											<Phone className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
											<span className="truncate font-bold text-[12px]">{formatPhone(contacts.phone)}</span>
										</div>
									)}
									{contacts?.email && (
										<div className="flex items-center gap-2 text-[11px] font-medium">
											<Mail className="h-3.5 w-3.5 text-blue-500 shrink-0" />
											<span className="truncate">{contacts.email}</span>
										</div>
									)}
									{addresses?.residence?.city && (
										<div className="flex items-center gap-2 text-[11px] font-medium">
											<MapPin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
											<span className="truncate">{[addresses.residence.city, lbl(COUNTRY_LABELS, addresses.residence.country)].filter(Boolean).join(", ")}</span>
										</div>
									)}
								</div>
							</div>
						</FlatCard>

						{/* Demande en cours */}
						<FlatCard className="shrink-0">
							<div className="p-3">
								<div className="flex items-center justify-between mb-2">
									<span className="text-[13px] font-bold flex items-center gap-2">
										<div className="p-1 rounded-md bg-teal-500/10">
											<FileText className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
										</div>
										{t("mySpace.currentRequest.title")}
									</span>
									{latestRequest && (() => { const cfg = REQUEST_STATUS_CONFIG[latestRequest.status as RequestStatus]; return <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4.5 font-medium", cfg?.className)}>{cfg?.fallback ?? latestRequest.status}</Badge>; })()}
								</div>
								{latestRequest ? (
									<div className="flex items-center gap-2.5 bg-muted/50 p-2 rounded-lg">
										<div className="w-6 h-6 rounded-md bg-teal-500/10 flex items-center justify-center shrink-0">
											<FileText className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-[12px] font-bold truncate leading-tight">{getLocalizedValue(latestRequest.service?.name as any, i18n.language) || "Service"}</p>
											<p className="text-[11px] text-muted-foreground font-medium leading-tight mt-0.5 truncate flex items-center gap-1"><Building2 className="w-3 h-3"/> {(latestRequest.org as any)?.name}</p>
										</div>
										<Button asChild size="sm" className="h-7 text-[10px] font-bold bg-teal-500 hover:bg-teal-600 text-white shrink-0 px-2.5">
											<Link to="/my-space/requests/$reference" params={{ reference: latestRequest.reference || latestRequest._id }}>Suivre</Link>
										</Button>
									</div>
								) : (
									<p className="text-[12px] font-medium text-muted-foreground text-center py-2">Aucune démarche en cours</p>
								)}
							</div>
						</FlatCard>

						{/* Rendez-vous */}
						<FlatCard className="shrink-0">
							<div className="p-3">
								<div className="flex items-center justify-between mb-2.5">
									<span className="text-[13px] font-bold flex items-center gap-2">
										<div className="p-1 rounded-md bg-teal-500/10">
											<Calendar className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
										</div>
										RDV
									</span>
									<Button asChild variant="ghost" size="sm" className="h-6 px-2 text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:bg-teal-500/10">
										<Link to="/my-space/iagenda">Tout <ArrowRight className="ml-1 h-3 w-3" /></Link>
									</Button>
								</div>
								{appointments && appointments.length > 0 ? (
									<div className="flex overflow-x-auto gap-2.5 pb-2 citizen-scrollbar snap-x">{appointments.filter((a: any) => a.date).map((a: any) => (
										<div key={a._id} className="flex items-center gap-2.5 bg-muted/50 p-2 rounded-lg flex-1 min-w-[85%] md:min-w-[220px] shrink-0 snap-start">
											<div className="w-6 h-6 rounded-md bg-teal-500/10 flex items-center justify-center shrink-0">
												<Calendar className="h-3 w-3 text-teal-600 dark:text-teal-400" />
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-[12px] font-bold truncate leading-tight">{a.service?.name || "RDV Consulaire"}</p>
												<p className="text-[11px] font-medium text-muted-foreground leading-tight mt-0.5">{format(new Date(a.date), "dd MMM HH:mm", { locale: fr })}</p>
											</div>
										</div>
									))}</div>
								) : <p className="text-[12px] font-medium text-muted-foreground text-center py-2">Aucun rendez-vous</p>}
							</div>
						</FlatCard>

						{/* Bouton Mes Démarches */}
						<Button asChild variant="outline" className="w-full shrink-0 h-9 text-[12px] font-semibold rounded-xl border-border hover:bg-teal-500/10 hover:text-teal-600 dark:hover:text-teal-400 gap-2">
							<Link to="/my-space/services-demarches">
								<Briefcase className="h-4 w-4" />
								Mes Démarches
							</Link>
						</Button>

						{/* Enfants — affiché uniquement si des enfants existent */}
						{children.length > 0 && (
							<FlatCard className="flex-1 shrink-0 flex flex-col overflow-hidden">
								<div className="p-3 flex flex-col h-full">
									<div className="flex items-center justify-between mb-2.5">
										<span className="text-[13px] font-bold flex items-center gap-2">
											<div className="p-1 rounded-md bg-pink-500/8">
												<Users className="h-3.5 w-3.5 text-pink-500" />
											</div>
											Enfants
											<TooltipProvider delayDuration={100}>
												<Tooltip>
													<TooltipTrigger asChild>
														<Info className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground cursor-help transition-colors" />
													</TooltipTrigger>
													<TooltipContent side="top" className="max-w-xs text-xs">
														Compte strictement dédié aux enfants mineurs de moins de 18 ans ou majeurs sous tutelle, ne pouvant pas utiliser un appareil de navigation.
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										</span>
										<span className="text-[10px] bg-pink-500/10 text-pink-500 font-bold px-2 py-0.5 rounded-full">{children.length}</span>
									</div>
									<div className="flex overflow-x-auto gap-2.5 pb-2 citizen-scrollbar snap-x">
										{children.map((child: any) => {
											const ca = getAge(child.identity?.birthDate);
											return (
												<Link key={child._id} to="/my-space/children/$childId" params={{ childId: child._id }} className="flex items-center gap-2.5 bg-muted/50 p-2 rounded-lg hover:bg-muted transition-colors min-w-[85%] md:min-w-[220px] flex-1 shrink-0 snap-start pr-3">
													<div className="h-6 w-6 rounded-md bg-pink-500/8 flex items-center justify-center shrink-0"><Baby className="h-3 w-3 text-pink-500" /></div>
													<div className="flex-1 min-w-0"><p className="text-[12px] font-bold truncate leading-tight">{child.identity?.firstName} {child.identity?.lastName}</p><p className="text-[11px] font-medium text-muted-foreground leading-tight mt-0.5">{ca !== null ? `${ca} ans` : "—"}</p></div>
													<ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
												</Link>
											);
										})}
									</div>
								</div>
							</FlatCard>
						)}
					</div>

					{/* ─── COL 2: Données Profil (5/12) ─── */}
					<div className="lg:col-span-5 flex flex-col gap-2 min-h-0 overflow-y-auto citizen-scrollbar stagger-children">

						{/* Contact d'urgence et Représentations */}
						<AssistanceContactsWidget />

						{/* Dossier Citoyen */}
						<FlatCard className="flex-1 flex flex-col overflow-hidden">
							<div className="flex items-center justify-between p-2.5 border-b border-foreground/5 shrink-0">
								<div className="flex justify-between items-center w-full">
									<div className="flex items-center gap-2">
										<div className="p-1.5 rounded-lg bg-teal-500/10">
											<User className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
										</div>
										<span className="text-xs font-bold ">Dossier Citoyen</span>
									</div>
									<div className="flex items-center gap-2">
										{requestReference && (
											<div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
												<span className="font-medium text-foreground">{t("mySpace.header.dossier", "Dossier N°")} :</span>
												<span className="font-mono font-semibold text-teal-600 dark:text-teal-400">{requestReference}</span>
											</div>
										)}
									</div>
								</div>
							</div>

							{/* Grille dense des données */}
							<div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5 overflow-y-auto flex-1 citizen-scrollbar">

								{/* BLOCK 1: Identité */}
								<div className="space-y-2.5">
									<p className="text-[9px] font-bold text-muted-foreground uppercase border-b border-foreground/5 pb-1 flex items-center gap-1.5">
										<FileBadge2 className="w-3 h-3 text-teal-600 dark:text-teal-400"/> Identité
									</p>
									<div className="grid grid-cols-2 gap-2">
										<InfoRow label="Lieu naiss." value={identity?.birthPlace} />
										<InfoRow label="Date naiss." value={fmtDate(identity?.birthDate)} />
										<InfoRow label="Pays naiss." value={lbl(COUNTRY_LABELS, identity?.birthCountry)} />
										<InfoRow label="Nationalité" value={lbl(COUNTRY_LABELS, identity?.nationality)} />
										<InfoRow label="NIP" value={identity?.nip} className="col-span-2" />
									</div>
								</div>

								{/* BLOCK 2: Contacts & Origine */}
								<div className="space-y-2.5">
									<p className="text-[9px] font-bold text-muted-foreground uppercase border-b border-foreground/5 pb-1 flex items-center gap-1.5">
										<MapPin className="w-3 h-3 text-blue-500"/> Contact
									</p>
									<div className="grid grid-cols-1 gap-2">
										<InfoRow 
											label="Résidence Actuelle" 
											value={
												<div className="flex flex-col gap-0.5">
													{addresses?.residence?.street && <span className="truncate">{addresses.residence.street}</span>}
													<span className="truncate">{[addresses?.residence?.postalCode, addresses?.residence?.city].filter(Boolean).join(" ")}</span>
													<span className="truncate">{lbl(COUNTRY_LABELS, addresses?.residence?.country)}</span>
												</div>
											} 
										/>
										<InfoRow label="Pays d'origine" value={[addresses?.homeland?.street, addresses?.homeland?.postalCode, addresses?.homeland?.city, lbl(COUNTRY_LABELS, addresses?.homeland?.country)].filter(Boolean).join(", ")} />
									</div>
								</div>

								{/* BLOCK 3: Passeport & Famille */}
								<div className="space-y-2.5">
									<p className="text-[9px] font-bold text-muted-foreground uppercase border-b border-foreground/5 pb-1 flex items-center gap-1.5">
										<FileText className="w-3 h-3 text-amber-500"/> Famille
									</p>
									<div className="grid grid-cols-2 gap-2">
										<InfoRow label="N° Passeport" value={p?.passportInfo?.number} />
										<InfoRow label="Expiration" value={fmtDate(p?.passportInfo?.expiryDate)} />
										<InfoRow label="Situation" value={lbl(MARITAL_LABELS, p?.family?.maritalStatus)} />
										<InfoRow label="Conjoint(e)" value={[p?.family?.spouse?.firstName, p?.family?.spouse?.lastName].filter(Boolean).join(" ")} />
										<InfoRow label="Père" value={[p?.family?.father?.firstName, p?.family?.father?.lastName].filter(Boolean).join(" ")} />
										<InfoRow label="Mère" value={[p?.family?.mother?.firstName, p?.family?.mother?.lastName].filter(Boolean).join(" ")} />
									</div>
								</div>

								{/* BLOCK 4: Profession & Urgence */}
								<div className="space-y-2.5">
									<p className="text-[9px] font-bold text-muted-foreground uppercase border-b border-foreground/5 pb-1 flex items-center gap-1.5">
										<Briefcase className="w-3 h-3 text-teal-600 dark:text-teal-400"/> Profession
									</p>
									<div className="grid grid-cols-2 gap-2">
										<InfoRow label="Statut Pro." value={lbl(PROFESSION_LABELS, p?.profession?.status)} />
										<InfoRow label="Profession" value={p?.profession?.title} />
										{(contacts?.emergencyResidence || contacts?.emergencyHomeland) && (
											<div className="col-span-2 mt-1 p-2 rounded-lg bg-rose-500/5">
												<p className="text-[8px] font-bold text-rose-600 uppercase mb-1">Contact Urgence</p>
												<div className="flex justify-between items-center">
													<span className="text-[11px] font-medium truncate">{contacts.emergencyResidence?.firstName ?? contacts.emergencyHomeland?.firstName} {contacts.emergencyResidence?.lastName ?? contacts.emergencyHomeland?.lastName}</span>
													<span className="text-[10px] text-muted-foreground">{contacts.emergencyResidence?.phone ?? contacts.emergencyHomeland?.phone}</span>
												</div>
											</div>
										)}
									</div>
								</div>

							</div>
						</FlatCard>
					</div>

					{/* ─── COL 3: Activity Widgets (4/12) ─── */}
					<div className="lg:col-span-4 flex flex-col gap-1.5 min-h-0 overflow-y-auto citizen-scrollbar stagger-children">

						{/* Carte Consulaire */}
						<ConsularCardWidget profile={profile} />

						{/* iCV */}
						<FlatCard className="shrink-0">
							<div className="p-3">
								<div className="flex items-center justify-between mb-2">
									<span className="text-xs font-bold flex items-center gap-1.5">
										<div className="p-1 rounded-md bg-blue-500/10">
											<Briefcase className="h-3 w-3 text-blue-500" />
										</div>
										Mon iCV
									</span>
									<Button asChild variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-blue-500/10">
										<Link to="/my-space/cv"><Edit className="h-3 w-3 text-blue-500" /></Link>
									</Button>
								</div>
								{cvData ? (
									<>
										<div className="flex items-center gap-2 mb-2">
											<div className="h-1.5 flex-1 rounded-full overflow-hidden bg-muted">
												<div className="h-full bg-teal-500 rounded-full transition-all" ref={(el) => { if (el) el.style.width = `${cvScore}%`; }} />
											</div>
											<span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">{cvScore}%</span>
										</div>
										<div className="grid grid-cols-2 gap-1.5">
											{[
												{ icon: Star, l: "Exp.", c: (cvData as any).experiences?.length ?? 0, color: "text-amber-500" },
												{ icon: GraduationCap, l: "Form.", c: (cvData as any).education?.length ?? 0, color: "text-blue-500" },
												{ icon: Wrench, l: "Comp.", c: (cvData as any).skills?.length ?? 0, color: "text-teal-600 dark:text-teal-400" },
												{ icon: Languages, l: "Langues", c: (cvData as any).languages?.length ?? 0, color: "text-blue-500" },
											].map((i) => (
												<div key={i.l} className="flex items-center gap-1.5 text-[11px] bg-muted/50 p-1.5 rounded-lg">
													<i.icon className={cn("h-3 w-3", i.color)} />
													<span className="text-muted-foreground flex-1">{i.l}</span>
													<span className="font-bold">{i.c}</span>
												</div>
											))}
										</div>
									</>
								) : (
									<Button asChild size="sm" variant="outline" className="w-full h-7 text-[11px] border-border">
										<Link to="/my-space/cv">Créer mon CV</Link>
									</Button>
								)}
							</div>
						</FlatCard>

						{/* Actualités */}
						<FlatCard className="flex-1 overflow-hidden flex flex-col">
							<div className="p-3 flex-1 flex flex-col">
								<div className="flex items-center justify-between mb-2">
									<span className="text-xs font-bold flex items-center gap-1.5">
										<div className="p-1 rounded-md bg-amber-500/10">
											<Megaphone className="h-3 w-3 text-amber-600 dark:text-amber-400" />
										</div>
										Actualités
									</span>
									<Button asChild variant="ghost" size="sm" className="h-5 px-1 text-[11px] text-teal-600 dark:text-teal-400 hover:bg-teal-500/10">
										<Link to="/news">Tout <ArrowRight className="ml-0.5 h-2.5 w-2.5" /></Link>
									</Button>
								</div>
								{posts && posts.length > 0 ? (
									<div className="space-y-2 flex-1 overflow-y-auto citizen-scrollbar pr-1">{posts.slice(0, 2).map((post: any) => (
										<Link key={post._id} to="/news/$slug" params={{ slug: post.slug }} className="block group bg-muted/50 p-2.5 rounded-lg hover:bg-muted transition-colors">
											<p className="text-[11px] font-semibold leading-snug line-clamp-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 mb-1">{post.title}</p>
											<p className="text-[9px] font-medium text-muted-foreground uppercase">{format(new Date(post.publishedAt ?? post._creationTime), "dd MMM yyyy", { locale: fr })}</p>
										</Link>
									))}</div>
								) : <p className="text-[11px] text-muted-foreground text-center py-2">Aucune annonce</p>}
							</div>
						</FlatCard>

					</div>
				</div>
			</motion.div>
		</div>
	);
}

