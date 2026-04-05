import { api } from "@convex/_generated/api";
import { RequestStatus } from "@convex/lib/constants";
import { createFileRoute, Link } from "@tanstack/react-router";
import { differenceInYears, format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	ArrowRight, Baby, Briefcase, Calendar, CreditCard, Building2, Eye,
	FileText, GraduationCap, Languages, Loader2, Mail, MapPin, Megaphone,
	Pencil, Phone, Plus, Star, User, Users, Wrench, Info, X, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useCallback, useRef, useState } from "react";
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
const COUNTRY_LABELS: Record<string, string> = { GA: "Gabon", FR: "France", CM: "Cameroun", CG: "Congo", CD: "RD Congo", SN: "Sénégal", CI: "Côte d'Ivoire", MA: "Maroc", BE: "Belgique", CH: "Suisse", CA: "Canada", US: "États-Unis" };

function getAge(bd?: string | number | null): number | null { if (!bd) return null; try { return differenceInYears(new Date(), new Date(bd)); } catch { return null; } }
function lbl(map: Record<string, string>, code?: string) { return code ? map[code] || code : undefined; }
function formatPhone(phone?: string) {
	if (!phone) return "";
	const c = phone.replace(/\s+/g, "");
	if (c.startsWith("+33") && c.length === 12) return `+33 (0) ${c[3]} ${c.slice(4,6)} ${c.slice(6,8)} ${c.slice(8,10)} ${c.slice(10,12)}`;
	if (c.startsWith("+241") && c.length >= 11) return `+241 ${c.slice(4,6)} ${c.slice(6,8)} ${c.slice(8,10)} ${c.slice(10,12)}`;
	return phone;
}



// FlatCard is now imported from @/components/my-space/flat-card

// ═════════════════════════════════════════════════════════════
function UserDashboard() {
	const { t, i18n } = useTranslation();
	const [showConsularCard, setShowConsularCard] = useState(false);
	const [showDossierDetails, setShowDossierDetails] = useState(false);
	const [mobilePageIndex, setMobilePageIndex] = useState(0);
	const mobileScrollRef = useRef<HTMLDivElement>(null);

	const scrollToActualites = useCallback(() => {
		mobileScrollRef.current?.scrollTo({ left: mobileScrollRef.current.scrollWidth, behavior: "smooth" });
	}, []);
	const scrollToDashboard = useCallback(() => {
		mobileScrollRef.current?.scrollTo({ left: 0, behavior: "smooth" });
	}, []);
	const handleMobileScroll = useCallback(() => {
		const el = mobileScrollRef.current;
		if (!el) return;
		setMobilePageIndex(el.scrollLeft > el.clientWidth * 0.5 ? 1 : 0);
	}, []);

	const { data: profile, isPending } = useAuthenticatedConvexQuery(api.functions.profiles.getMine, {});
	const { data: latestRequest } = useAuthenticatedConvexQuery(api.functions.requests.getLatestActive, {});
	const { data: appointments } = useAuthenticatedConvexQuery(api.functions.appointments.listByUser, {});
	const { data: posts } = useConvexQuery(api.functions.posts.getLatest, { limit: 3 });

	const { data: cvData } = useAuthenticatedConvexQuery(api.functions.cv.getMine, {});
	const { data: childProfiles } = useAuthenticatedConvexQuery(api.functions.childProfiles.getMine, {});

	// Photo d'identite : resolution fiable (lien direct OU recherche par type, plus recent en priorite)
	const { data: identityPhotoUrl } = useAuthenticatedConvexQuery(
		api.functions.documents.getMyIdentityPhotoUrl,
		{},
	);

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

	const dossierItems = [
		{ label: "Identité", done: !!(identity?.firstName && identity?.lastName && identity?.birthDate && identity?.birthPlace), icon: <User className="h-3 w-3" />, alertText: "Identité à compléter" },
		{ label: "Passeport", done: !!p?.passportInfo?.number, icon: <FileText className="h-3 w-3" />, alert: (() => {
			if (!p?.passportInfo?.expiryDate) return null;
			const daysLeft = Math.ceil((new Date(p.passportInfo.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
			if (daysLeft < 0) return { type: "expired" as const, text: "Expiré" };
			if (daysLeft < 90) return { type: "warning" as const, text: `Expire dans ${daysLeft}j` };
			return null;
		})(), alertText: "Passeport manquant" },
		{ label: "Contact & Adresse", done: !!(contacts?.phone && addresses?.residence?.city), icon: <MapPin className="h-3 w-3" />, alertText: "Contact ou adresse à compléter" },
		{ label: "Famille", done: !!p?.family?.maritalStatus, icon: <Users className="h-3 w-3" />, alertText: "Situation familiale à compléter" },
		{ label: "Profession", done: !!p?.profession?.title, icon: <Briefcase className="h-3 w-3" />, alertText: "Profession à compléter" },
		{ label: "Contact d'urgence", done: !!(contacts?.emergencyResidence || contacts?.emergencyHomeland), icon: <Phone className="h-3 w-3" />, alertText: "Contact d'urgence à ajouter" },
	];

	const completionScore = (() => {
		if (!profile) return 0;
		const done = dossierItems.filter(i => i.done).length;
		return Math.round((done / dossierItems.length) * 100);
	})();

	const activeAlerts = [
		...dossierItems.filter(item => !item.done).map(item => ({
			type: "warning" as const,
			text: item.alertText,
			icon: item.icon
		})),
		...dossierItems.filter(item => item.alert && item.alert.type === "expired").map(item => ({
			type: "error" as const,
			text: "Passeport expiré !",
			icon: item.icon
		})),
		...dossierItems.filter(item => item.alert && item.alert.type === "warning" && item.done).map(item => ({
			type: "warning" as const,
			text: item.alert!.text,
			icon: item.icon
		}))
	];

	if (isPending) return (
		<div className="flex items-center justify-center h-full">
			<div className="flex flex-col items-center gap-3">
				<div className="rounded-xl border border-border bg-card p-6">
					<Loader2 className="h-8 w-8 animate-spin text-primary dark:text-primary" />
				</div>
				<span className="text-sm text-muted-foreground">Chargement...</span>
			</div>
		</div>
	);

	return (
		<div className="flex flex-col h-full overflow-hidden relative">
			<div className="shrink-0">
				<MySpaceHeader />
			</div>

			{/* Bandeau alerte mobile — remplace le bouton Démarche quand il y a des alertes */}
			{activeAlerts.length > 0 && (
				<Link to="/my-space/settings" search={{ tab: "dossier" }} className="flex lg:hidden items-center gap-2.5 mt-3 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/15 hover:bg-rose-500/15 transition-colors">
					<div className="p-1 rounded-md bg-rose-500/15 shrink-0">
						<AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
					</div>
					<span className="text-xs font-bold text-rose-600 dark:text-rose-400 truncate flex-1">
						{activeAlerts.length === 1 ? activeAlerts[0].text : `${activeAlerts.length} éléments à vérifier`}
					</span>
					<ArrowRight className="h-3 w-3 text-rose-500/60 shrink-0" />
				</Link>
			)}

			<motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex-1 min-h-0 overflow-hidden mt-3 lg:mt-4 relative">
				{/* Desktop : grille 3 colonnes */}
				<div className="hidden lg:grid lg:grid-cols-12 gap-5 h-full overflow-hidden">

					{/* ─── COL 1: Hero & Carte (3/12) ─── */}
					<div className="lg:col-span-3 flex flex-col gap-4 min-h-0 overflow-y-auto citizen-scrollbar stagger-children">

						{/* ── Mobile : Hero compact avec photo à gauche + boutons Ma Carte/iCV ── */}
						<FlatCard className="shrink-0 relative lg:hidden">
							<div className="p-3 min-[400px]:p-4 flex flex-col gap-3">
								{/* Row : Photo + Infos */}
								<div className="flex items-center gap-4">
									<Avatar className="h-20 w-20 bg-muted shrink-0">
										<AvatarImage src={avatarUrl} />
										<AvatarFallback className="text-2xl font-bold bg-primary text-white">{firstName?.[0]}{lastName?.[0]}</AvatarFallback>
									</Avatar>
									<div className="flex flex-col min-w-0 flex-1">
										{/* Matricule + Badge userType */}
										<div className="flex items-center gap-2 mb-1.5">
											{p?.matricule && (
												<span className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wide">{p.matricule}</span>
											)}
											{p?.userType && (
												<span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/35 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 font-medium">
													{p.userType === "long_stay" ? "Long séjour" : p.userType === "short_stay" ? "Court séjour" : "De passage"}
												</span>
											)}
										</div>
										<div className="flex items-center justify-between">
											<h2 className="text-base font-black uppercase text-foreground leading-none truncate">{lastName}</h2>
											<span className="text-xs font-bold text-muted-foreground shrink-0">{completionScore}%</span>
										</div>
										<p className="text-sm font-medium text-muted-foreground mt-0.5 capitalize truncate">{firstName}</p>
										{contacts?.phone && (
											<div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
												<Phone className="h-3 w-3 shrink-0" />
												<span className="truncate font-medium">{formatPhone(contacts.phone)}</span>
												<Button asChild size="icon" variant="ghost" className="h-5 w-5 rounded-full hover:bg-foreground/[0.06] shrink-0 ml-auto">
													<Link to="/my-space/profile/edit"><Pencil className="h-2.5 w-2.5 text-muted-foreground" /></Link>
												</Button>
											</div>
										)}
									</div>
								</div>
								{/* Row : Boutons Ma Carte + Mon iCV */}
								<div className="grid grid-cols-2 gap-2">
									<Button
										variant="ghost"
										size="sm"
										className="h-8 px-3 text-xs font-medium text-foreground bg-muted hover:bg-muted/70 active:scale-[0.97] transition-transform rounded-full gap-1.5"
										onClick={() => setShowConsularCard(true)}
									>
										<Eye className="h-3 w-3" />
										Ma Carte
										{p?.consularCard?.cardNumber && p.consularCard.cardExpiresAt > Date.now() && (
											<Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 font-medium bg-green-500/25 text-green-700 dark:text-green-400">
												Active
											</Badge>
										)}
										{p?.consularCard?.cardNumber && p.consularCard.cardExpiresAt <= Date.now() && (
											<Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400">
												Expirée
											</Badge>
										)}
									</Button>
									<Button asChild size="sm" variant="ghost" className="h-8 px-3 text-xs font-medium text-foreground bg-muted hover:bg-muted/70 active:scale-[0.97] transition-transform rounded-full gap-1.5">
										<Link to="/my-space/cv">
											<Briefcase className="h-3 w-3" />
											{cvData ? "Mon iCV" : "Créer iCV"}
										</Link>
									</Button>
								</div>
							</div>
						</FlatCard>

						{/* ── Desktop : Hero vertical centré (inchangé) ── */}
						<FlatCard className="shrink-0 relative hidden lg:block">
							<div className="p-4 flex flex-col relative">
								<div className="absolute top-4 right-4">
									<span className="text-xs font-bold text-muted-foreground">{completionScore}%</span>
								</div>
								<div className="flex justify-center mb-4">
									<Avatar className="h-[120px] w-[120px] bg-muted">
										<AvatarImage src={avatarUrl} />
										<AvatarFallback className="text-3xl font-bold bg-primary text-white">{firstName?.[0]}{lastName?.[0]}</AvatarFallback>
									</Avatar>
								</div>
								<div className="flex flex-col items-center text-center mb-1.5">
									<h2 className="text-lg font-black uppercase text-foreground leading-none">{lastName}</h2>
									<p className="text-base font-medium text-muted-foreground mt-1 capitalize">{firstName}</p>
								</div>
								{contacts?.phone && (
									<div className="w-full mt-4 bg-muted rounded-lg p-2.5">
										<div className="flex items-center gap-2.5 text-sm font-medium">
											<Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
											<span className="truncate font-bold text-sm flex-1">{formatPhone(contacts.phone)}</span>
											<Button asChild size="icon" variant="ghost" className="h-6 w-6 rounded-full hover:bg-foreground/[0.06] shrink-0">
												<Link to="/my-space/profile/edit"><Pencil className="h-3 w-3 text-muted-foreground" /></Link>
											</Button>
										</div>
									</div>
								)}
							</div>
						</FlatCard>

						{/* ── Desktop : Carte Consulaire seule (iCV dans col3) ── */}
						<FlatCard className="shrink-0 hidden lg:block">
							<div className="p-4">
								<div className="flex items-center justify-between mb-3">
									<span className="text-sm font-semibold flex items-center gap-2.5 text-muted-foreground">
										<div className="p-1 rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.12]">
											<CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
										</div>
										{t("mySpace.consularCard.title")}
									</span>
									{p?.consularCard?.cardNumber && p.consularCard.cardExpiresAt > Date.now() && (
										<Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 font-medium bg-green-500/25 text-green-700 dark:text-green-400">
											Active
										</Badge>
									)}
									{p?.consularCard?.cardNumber && p.consularCard.cardExpiresAt <= Date.now() && (
										<Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400">
											Expirée
										</Badge>
									)}
								</div>
								{p?.consularCard?.cardNumber ? (
									<Button
										variant="ghost"
										size="sm"
										className="w-full h-7 px-3 text-xs font-medium text-foreground bg-muted hover:bg-muted/70 active:scale-[0.97] transition-transform rounded-full gap-2 mt-3"
										onClick={() => setShowConsularCard(true)}
									>
										<Eye className="h-3 w-3" />
										Voir ma carte
									</Button>
								) : (
									<div className="text-center py-1">
										<p className="text-sm font-medium text-muted-foreground mb-3">Pas encore de carte</p>
										<Button
											variant="ghost"
											size="sm"
											className="w-full h-7 text-xs font-semibold rounded-lg gap-1.5"
											onClick={() => setShowConsularCard(true)}
										>
											<Eye className="h-3 w-3" />
											Voir le statut
										</Button>
									</div>
								)}
							</div>
						</FlatCard>

						{/* À vérifier — déplacé dans col1 quand dossier 100% et pas d'enfant */}
						{completionScore === 100 && children.length === 0 && activeAlerts.length > 0 && (
							<FlatCard className="shrink-0 hidden lg:block">
								<div className="p-4 flex flex-col">
									<div className="flex items-center justify-between mb-3">
										<span className="text-sm font-semibold flex items-center gap-2.5 text-muted-foreground text-rose-600 dark:text-rose-400">
											<div className="p-1 rounded-md bg-rose-500/10">
												<AlertTriangle className="h-3.5 w-3.5" />
											</div>
											À vérifier
										</span>
										<span className="text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold px-2 py-0.5 rounded-full">{activeAlerts.length}</span>
									</div>

									{/* Détails enrichis */}
									<div className="flex flex-col gap-2.5">
										{/* Détail passeport si expiré ou bientôt */}
										{p?.passportInfo?.expiryDate && (() => {
											const expiryDate = new Date(p.passportInfo.expiryDate);
											const daysDiff = Math.ceil((expiryDate.getTime() - Date.now()) / 86400000);
											if (daysDiff >= 90) return null;
											const isExpired = daysDiff < 0;
											const absDays = Math.abs(daysDiff);
											const durationText = absDays > 365
												? `${Math.floor(absDays / 365)} an${Math.floor(absDays / 365) > 1 ? "s" : ""} et ${Math.floor((absDays % 365) / 30)} mois`
												: absDays > 30
													? `${Math.floor(absDays / 30)} mois et ${absDays % 30} jour${(absDays % 30) > 1 ? "s" : ""}`
													: `${absDays} jour${absDays > 1 ? "s" : ""}`;

											return (
												<Link to="/my-space/services-demarches" className="bg-rose-500/[0.06] rounded-xl p-3.5 border border-rose-500/10 flex flex-col hover:bg-rose-500/10 transition-colors">
													<div className="flex items-center gap-2 mb-3">
														<div className="p-1.5 rounded-lg bg-rose-500/10">
															<FileText className="h-4 w-4 text-rose-500 dark:text-rose-400" />
														</div>
														<span className="text-sm font-bold text-foreground">Passeport</span>
													</div>
													<div className="flex items-center justify-between text-xs">
														<span className="text-muted-foreground">{isExpired ? "Expiré depuis" : "Expire dans"}</span>
														<span className={cn("font-bold", isExpired ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400")}>
															{durationText}
														</span>
													</div>
												</Link>
											);
										})()}
									</div>
								</div>
							</FlatCard>
						)}

						{/* Mon iCV — déplacé dans col1 quand dossier 100% */}
						{completionScore === 100 && (
							<FlatCard className="shrink-0 hidden lg:block">
								<div className="p-4">
									<div className="flex items-center justify-between mb-3">
										<span className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
											<div className="p-1 rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.12]">
												<Briefcase className="h-3 w-3 text-muted-foreground" />
											</div>
											Mon iCV
										</span>
										<Button asChild variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-foreground/[0.06]">
											<Link to="/my-space/cv"><Pencil className="h-3 w-3 text-muted-foreground" /></Link>
										</Button>
									</div>
									{cvData ? (
										<>
											<div className="flex items-center gap-2.5 mb-3">
												<div className="h-1.5 flex-1 rounded-full overflow-hidden bg-muted">
													<div className="h-full bg-primary rounded-full transition-all" ref={(el) => { if (el) el.style.width = `${cvScore}%`; }} />
												</div>
												<span className="text-xs font-bold text-primary dark:text-primary">{cvScore}%</span>
											</div>
											<div className="grid grid-cols-2 gap-2">
												{[
													{ icon: Star, l: "Exp.", c: (cvData as any).experiences?.length ?? 0, color: "text-muted-foreground" },
													{ icon: GraduationCap, l: "Form.", c: (cvData as any).education?.length ?? 0, color: "text-muted-foreground" },
													{ icon: Wrench, l: "Comp.", c: (cvData as any).skills?.length ?? 0, color: "text-muted-foreground" },
													{ icon: Languages, l: "Langues", c: (cvData as any).languages?.length ?? 0, color: "text-muted-foreground" },
												].map((i) => (
													<div key={i.l} className="flex items-center gap-2 text-xs bg-muted p-2 rounded-lg">
														<i.icon className={cn("h-3 w-3", i.color)} />
														<span className="text-muted-foreground flex-1">{i.l}</span>
														<span className="font-bold">{i.c}</span>
													</div>
												))}
											</div>
										</>
									) : (
										<Button asChild size="sm" variant="ghost" className="w-full h-7 px-3 text-xs font-medium text-foreground bg-muted hover:bg-muted/70 active:scale-[0.97] transition-transform rounded-full">
											<Link to="/my-space/cv">Créer mon CV</Link>
										</Button>
									)}
								</div>
							</FlatCard>
						)}

						{/* Mon Dossier — Masqué quand complet à 100% */}
						{completionScore < 100 && <FlatCard className="flex-1 flex flex-col overflow-hidden shrink-0">
							<div className="flex items-center justify-between p-3.5 border-b border-foreground/5 shrink-0">
								<div className="flex items-center gap-2.5">
									<div className="p-1.5 rounded-lg bg-foreground/[0.06] dark:bg-foreground/[0.12]">
										<User className="w-3.5 h-3.5 text-muted-foreground" />
									</div>
									<span className="text-sm font-bold text-muted-foreground">Mon Dossier</span>
								</div>
							</div>

							<div className="p-4 flex flex-col gap-4">
								<div className="flex items-center gap-3">
									<div className="h-2 flex-1 rounded-full overflow-hidden bg-muted">
										<div
											className={cn("h-full rounded-full transition-all", completionScore >= 80 ? "bg-green-500/80" : completionScore >= 50 ? "bg-amber-500/70" : "bg-rose-500/70")}
											ref={(el) => { if (el) el.style.width = `${completionScore}%`; }}
										/>
									</div>
									<span className="text-xs font-bold text-muted-foreground">
										{completionScore}% complété
									</span>
								</div>

								<div className="bg-muted rounded-lg p-3 flex items-center justify-between">
									<div className="flex items-center gap-2.5">
										<div className="bg-background rounded p-1.5">
											<FileText className="h-4 w-4 text-muted-foreground" />
										</div>
										<div className="flex flex-col">
											<span className="text-xs font-medium text-muted-foreground">État du dossier</span>
											<span className="text-sm font-semibold text-foreground">{completionScore === 100 ? "Complet" : "Incomplet"}</span>
										</div>
									</div>
									<Button size="sm" variant="ghost" className="h-8 md:h-7 px-3 text-xs font-medium text-foreground bg-muted hover:bg-muted/70 active:scale-[0.97] transition-transform rounded-full" onClick={() => setShowDossierDetails(true)}>
										<Eye className="h-3 w-3 mr-1" /> Voir l'état
									</Button>
								</div>
							</div>
						</FlatCard>}

						{/* Enfants — affiché uniquement si des enfants existent */}
						{children.length > 0 && (
							<FlatCard className="shrink-0 flex flex-col">
								<div className="p-3 lg:p-4 flex flex-col">
									<div className="flex items-center justify-between mb-3">
										<span className="text-sm font-semibold flex items-center gap-2.5 text-muted-foreground">
											<div className="p-1 rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.12]">
												<Users className="h-3.5 w-3.5 text-muted-foreground" />
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
										<span className="text-xs bg-foreground/[0.06] dark:bg-foreground/[0.12] text-muted-foreground font-bold px-2 py-0.5 rounded-full">{children.length}</span>
									</div>
									<div className="flex overflow-x-auto gap-3 pb-2.5 citizen-scrollbar snap-x">
										{children.map((child: any) => {
											const ca = getAge(child.identity?.birthDate);
											return (
												<Link key={child._id} to="/my-space/children/$childId" params={{ childId: child._id }} className="flex items-center gap-3 bg-muted p-2.5 rounded-lg hover:bg-muted transition-colors min-w-[85%] md:min-w-[220px] flex-1 shrink-0 snap-start pr-4">
													<div className="h-6 w-6 rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.12] flex items-center justify-center shrink-0"><Baby className="h-3 w-3 text-muted-foreground" /></div>
													<div className="flex-1 min-w-0"><p className="text-sm font-bold truncate leading-tight text-muted-foreground">{child.identity?.firstName} {child.identity?.lastName}</p><p className="text-xs font-medium text-muted-foreground leading-tight mt-0.5">{ca !== null ? `${ca} ans` : "—"}</p></div>
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
					<div className="lg:col-span-5 flex flex-col gap-4 min-h-0 overflow-y-auto citizen-scrollbar stagger-children">


						{/* Démarches en cours */}
						<FlatCard className={cn("shrink-0 lg:flex-1 flex flex-col", !latestRequest && !(appointments && appointments.length > 0) && "order-2 lg:order-none")}>
							<div className="p-3 lg:p-4 flex flex-col">
								<div className="flex items-center justify-between mb-2 lg:mb-3">
									<span className="text-sm font-semibold flex items-center gap-2.5 text-muted-foreground">
										<div className="p-1 rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.12]">
											<FileText className="h-3.5 w-3.5 text-muted-foreground" />
										</div>
										Démarches en cours
									</span>
									<Button asChild variant="ghost" size="sm" className="h-8 md:h-7 px-3 text-xs font-medium text-foreground bg-muted hover:bg-muted/70 active:scale-[0.97] transition-transform rounded-full">
										<Link to="/my-space/services-demarches">Mes Démarches</Link>
									</Button>
								</div>
								<div className="grid grid-cols-2 gap-2 min-[400px]:gap-2.5 flex-1">
									{latestRequest ? (
										<Link
											to="/my-space/requests/$reference"
											params={{ reference: latestRequest.reference || latestRequest._id }}
											className="flex flex-col gap-2 p-2.5 lg:p-3 rounded-xl lg:rounded-lg bg-amber-500/15 dark:bg-amber-500/10 hover:bg-amber-500/25 dark:hover:bg-amber-500/15 transition-colors"
										>
											<div className="flex items-center gap-2">
												<div className="p-1 lg:p-1.5 rounded-md bg-amber-500/10 shrink-0"><FileText className="h-4 w-4 lg:h-5 lg:w-5 text-amber-600 dark:text-amber-400" /></div>
												<p className="text-xs lg:text-sm font-bold leading-tight text-foreground line-clamp-2 flex-1">{getLocalizedValue(latestRequest.service?.name as any, i18n.language) || "Service"}</p>
												{(() => { const cfg = REQUEST_STATUS_CONFIG[latestRequest.status as RequestStatus]; return <Badge variant="secondary" className={cn("text-[10px] lg:text-xs px-1 lg:px-1.5 py-0 h-4 lg:h-5 font-medium shrink-0", cfg?.className)}>{cfg?.fallback ?? latestRequest.status}</Badge>; })()}
											</div>
											<p className="text-[10px] lg:text-xs text-muted-foreground font-medium truncate text-center">{(latestRequest.org as any)?.name}</p>
										</Link>
									) : (
										<Link
											to="/my-space/services-demarches"
											className="flex flex-col gap-2 p-2.5 lg:p-3 rounded-xl lg:rounded-lg bg-amber-500/15 dark:bg-amber-500/10 hover:bg-amber-500/25 dark:hover:bg-amber-500/15 transition-colors"
										>
											<div className="flex items-center gap-2">
												<div className="p-1 lg:p-1.5 rounded-md bg-amber-500/10 shrink-0"><FileText className="h-4 w-4 lg:h-5 lg:w-5 text-amber-600 dark:text-amber-400" /></div>
												<p className="text-xs lg:text-sm font-bold leading-tight text-foreground">Renouvellement de passeport</p>
											</div>
											<p className="text-[10px] lg:text-xs text-muted-foreground font-medium text-center">Suggestion</p>
										</Link>
									)}
									<Link
										to="/services"
										className="flex flex-col items-center justify-center gap-2 p-2.5 lg:p-3 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
									>
										<div className="h-7 w-7 lg:h-8 lg:w-8 rounded-full bg-foreground/[0.06] dark:bg-foreground/[0.12] flex items-center justify-center">
											<Plus className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
										</div>
										<p className="text-[10px] lg:text-xs font-medium">Nouvelle démarche</p>
									</Link>
								</div>
							</div>
						</FlatCard>

						{/* Rendez-vous */}
						<FlatCard className={cn("shrink-0 lg:flex-1 flex flex-col", !latestRequest && !(appointments && appointments.length > 0) && "order-3 lg:order-none")}>
							<div className="p-3 lg:p-4 flex flex-col">
								<div className="flex items-center justify-between mb-2 lg:mb-3">
									<span className="text-sm font-semibold flex items-center gap-2.5 text-muted-foreground">
										<div className="p-1 rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.12]">
											<Calendar className="h-3.5 w-3.5 text-muted-foreground" />
										</div>
										RDV
									</span>
									<Button asChild variant="ghost" size="sm" className="h-8 md:h-7 px-3 text-xs font-medium text-foreground bg-muted hover:bg-muted/70 active:scale-[0.97] transition-transform rounded-full">
										<Link to="/my-space/iagenda">iAgenda</Link>
									</Button>
								</div>
								<div className="grid grid-cols-2 gap-2 min-[400px]:gap-2.5 flex-1">
									{appointments && appointments.length > 0 ? (
										appointments.filter((a: any) => a.date).slice(0, 3).map((a: any) => (
											<Link
												key={a._id}
												to="/my-space/iagenda"
												className="flex flex-col gap-2 p-2.5 lg:p-3 rounded-xl lg:rounded-lg bg-amber-500/15 dark:bg-amber-500/10 hover:bg-amber-500/25 dark:hover:bg-amber-500/15 transition-colors"
											>
												<div className="flex items-center gap-2">
													<div className="p-1 lg:p-1.5 rounded-md bg-amber-500/10 shrink-0"><Calendar className="h-4 w-4 lg:h-5 lg:w-5 text-amber-600 dark:text-amber-400" /></div>
													<p className="text-xs lg:text-sm font-bold leading-tight text-foreground line-clamp-2">{a.service?.name || "RDV Consulaire"}</p>
												</div>
												<p className="text-[10px] lg:text-xs text-muted-foreground font-medium text-center">{format(new Date(a.date), "dd MMM HH:mm", { locale: fr })}</p>
											</Link>
										))
									) : (
										<div className="flex flex-col gap-2 p-2.5 lg:p-3 rounded-xl lg:rounded-lg bg-amber-500/15 dark:bg-amber-500/10">
											<div className="flex items-center gap-2">
												<div className="p-1 lg:p-1.5 rounded-md bg-amber-500/10 shrink-0"><Calendar className="h-4 w-4 lg:h-5 lg:w-5 text-amber-600 dark:text-amber-400" /></div>
												<p className="text-xs lg:text-sm font-medium text-muted-foreground">Aucun RDV</p>
											</div>
										</div>
									)}
									<Link
										to="/my-space/iagenda"
										className="flex flex-col items-center justify-center gap-2 p-2.5 lg:p-3 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
									>
										<div className="h-7 w-7 lg:h-8 lg:w-8 rounded-full bg-foreground/[0.06] dark:bg-foreground/[0.12] flex items-center justify-center">
											<Plus className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
										</div>
										<p className="text-[10px] lg:text-xs font-medium">Prendre RDV</p>
									</Link>
								</div>
							</div>
						</FlatCard>

						{/* Contact d'urgence et Représentations — monte en premier s'il n'y a pas d'activité */}
						<div className={cn("shrink-0 lg:flex-1", !latestRequest && !(appointments && appointments.length > 0) && "order-1 lg:order-none")}>
							<AssistanceContactsWidget />
						</div>

					</div>

					{/* ─── COL 3: Activity Widgets (4/12) ─── */}
					<div className="lg:col-span-4 flex flex-col gap-4 min-h-0 overflow-y-auto citizen-scrollbar stagger-children">


						{/* Notifications (Horizontal scroll) — masqué quand déplacé vers col1 */}
						{activeAlerts.length > 0 && !(completionScore === 100 && children.length === 0) && (
							<FlatCard className="shrink-0 overflow-hidden">
								<div className="p-4">
									<div className="flex items-center justify-between mb-3">
										<span className="text-sm font-semibold flex items-center gap-2.5 text-muted-foreground text-rose-600 dark:text-rose-400">
											<div className="p-1 rounded-md bg-rose-500/10">
												<AlertTriangle className="h-3.5 w-3.5" />
											</div>
											À vérifier
										</span>
									</div>
									<div className="flex overflow-x-auto gap-2.5 pb-1.5 citizen-scrollbar snap-x disable-scrollbars">
										{activeAlerts.map((alert, idx) => (
											<Link key={idx} to="/my-space/settings" search={{ tab: "dossier" }} className={cn("flex items-center gap-3 p-2.5 rounded-lg shrink-0 snap-start hover:opacity-80 transition-opacity", 
												alert.type === "error" ? "bg-rose-500/10 text-rose-700 dark:text-rose-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
											)}>
												<div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0", 
													alert.type === "error" ? "bg-rose-500/20" : "bg-amber-500/20"
												)}>
													{alert.icon}
												</div>
												<span className="text-xs font-bold whitespace-nowrap pr-2">{alert.text}</span>
											</Link>
										))}
									</div>
								</div>
							</FlatCard>
						)}

						{/* Mon iCV — desktop uniquement (mobile dans col1), masqué quand déplacé vers col1 */}
						{completionScore < 100 && <FlatCard className="shrink-0 hidden lg:block">
							<div className="p-4">
								<div className="flex items-center justify-between mb-3">
									<span className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
										<div className="p-1 rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.12]">
											<Briefcase className="h-3 w-3 text-muted-foreground" />
										</div>
										Mon iCV
									</span>
									<Button asChild variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-foreground/[0.06]">
										<Link to="/my-space/cv"><Pencil className="h-3 w-3 text-muted-foreground" /></Link>
									</Button>
								</div>
								{cvData ? (
									<>
										<div className="flex items-center gap-2.5 mb-3">
											<div className="h-1.5 flex-1 rounded-full overflow-hidden bg-muted">
												<div className="h-full bg-primary rounded-full transition-all" ref={(el) => { if (el) el.style.width = `${cvScore}%`; }} />
											</div>
											<span className="text-xs font-bold text-primary dark:text-primary">{cvScore}%</span>
										</div>
										<div className="grid grid-cols-2 gap-2">
											{[
												{ icon: Star, l: "Exp.", c: (cvData as any).experiences?.length ?? 0, color: "text-muted-foreground" },
												{ icon: GraduationCap, l: "Form.", c: (cvData as any).education?.length ?? 0, color: "text-muted-foreground" },
												{ icon: Wrench, l: "Comp.", c: (cvData as any).skills?.length ?? 0, color: "text-muted-foreground" },
												{ icon: Languages, l: "Langues", c: (cvData as any).languages?.length ?? 0, color: "text-muted-foreground" },
											].map((i) => (
												<div key={i.l} className="flex items-center gap-2 text-xs bg-muted p-2 rounded-lg">
													<i.icon className={cn("h-3 w-3", i.color)} />
													<span className="text-muted-foreground flex-1">{i.l}</span>
													<span className="font-bold">{i.c}</span>
												</div>
											))}
										</div>
									</>
								) : (
									<Button asChild size="sm" variant="ghost" className="w-full h-7 px-3 text-xs font-medium text-foreground bg-muted hover:bg-muted/70 active:scale-[0.97] transition-transform rounded-full">
										<Link to="/my-space/cv">Créer mon CV</Link>
									</Button>
								)}
							</div>
						</FlatCard>}

						{/* Actualités — desktop uniquement, mobile sur page 2 */}
						<FlatCard className="flex-1 overflow-hidden flex-col hidden lg:flex">
							<div className="p-4 flex-1 flex flex-col">
								<div className="flex items-center justify-between mb-3">
									<span className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
										<div className="p-1 rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.12]">
											<Megaphone className="h-3 w-3 text-muted-foreground" />
										</div>
										Actualités
									</span>
									<Button asChild variant="ghost" size="sm" className="h-8 md:h-7 px-3 text-xs font-medium text-foreground bg-muted hover:bg-muted/70 active:scale-[0.97] transition-transform rounded-full">
										<Link to="/news">Tout voir</Link>
									</Button>
								</div>
								{posts && posts.length > 0 ? (
									<div className="space-y-2.5 flex-1 overflow-y-auto citizen-scrollbar pr-1">{posts.slice(0, 2).map((post: any) => (
										<Link key={post._id} to="/news/$slug" params={{ slug: post.slug }} className="block group bg-muted p-3 rounded-lg hover:bg-muted transition-colors">
											<p className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary dark:group-hover:text-blue-400 mb-1">{post.title}</p>
											<p className="text-xs font-medium text-muted-foreground uppercase">{format(new Date(post.publishedAt ?? post._creationTime), "dd MMM yyyy", { locale: fr })}</p>
										</Link>
									))}</div>
								) : <p className="text-sm text-muted-foreground text-center py-2">Aucune annonce</p>}
							</div>
						</FlatCard>

					</div>
				</div>

				{/* ═══ Mobile : pages horizontales snap (pas de scroll vertical) ═══ */}
				<div ref={mobileScrollRef} onScroll={handleMobileScroll} className="flex lg:hidden overflow-x-auto snap-x snap-mandatory disable-scrollbars" style={{ height: "calc(100% - 0.5rem)" }}>

					{/* Page 1 mobile : Profil — non-scrollable, cartes flex */}
					<div className="w-full shrink-0 snap-start h-full overflow-hidden px-0">
						<div className="flex flex-col gap-2 h-full">
							{/* Hero mobile — modèle vertical */}
							<FlatCard className="flex-[2.5] min-h-0 relative">
								<div className="p-3 min-[400px]:p-4 flex flex-col h-full">
									{/* Ligne 1 : Matricule / Badge / Score */}
									<div className="flex items-center justify-between shrink-0">
										{p?.matricule && (
											<span className="text-[9px] min-[400px]:text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wide">{p.matricule}</span>
										)}
										{p?.userType && (
											<span className="text-[9px] min-[400px]:text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/35 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 font-medium">
												{p.userType === "long_stay" ? "Long séjour" : p.userType === "short_stay" ? "Court séjour" : "De passage"}
											</span>
										)}
										<span className="text-[10px] min-[400px]:text-xs font-bold text-muted-foreground">{completionScore}%</span>
									</div>

									{/* Zone centrale flex : Photo + Nom + Tel */}
									<div className="flex-1 flex items-center gap-4 min-h-0 my-2">
										<Avatar className="h-[100px] w-[100px] bg-muted shrink-0">
											<AvatarImage src={avatarUrl} />
											<AvatarFallback className="text-3xl font-bold bg-primary text-white">{firstName?.[0]}{lastName?.[0]}</AvatarFallback>
										</Avatar>
										<div className="flex flex-col min-w-0 flex-1 justify-center">
											<h2 className="text-lg font-black uppercase text-foreground leading-tight truncate">{lastName}</h2>
											<p className="text-sm font-medium text-muted-foreground capitalize truncate">{firstName}</p>
											{contacts?.phone && (
												<div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
													<Phone className="h-3.5 w-3.5 shrink-0" />
													<span className="truncate font-semibold text-foreground flex-1">{formatPhone(contacts.phone)}</span>
													<Button asChild size="icon" variant="ghost" className="h-5 w-5 rounded-full hover:bg-foreground/[0.06] shrink-0">
														<Link to="/my-space/profile/edit"><Pencil className="h-2.5 w-2.5 text-muted-foreground" /></Link>
													</Button>
												</div>
											)}
										</div>
									</div>

									{/* Boutons */}
									<div className="grid grid-cols-2 gap-2 shrink-0">
										<Button variant="ghost" size="sm" className="h-9 px-3 text-xs font-medium text-foreground bg-muted hover:bg-muted/70 active:scale-[0.97] transition-transform rounded-full gap-1.5" onClick={() => setShowConsularCard(true)}>
											<Eye className="h-3 w-3" />
											Ma Carte
											{p?.consularCard?.cardNumber && p.consularCard.cardExpiresAt > Date.now() && (
												<Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 font-medium bg-green-500/25 text-green-700 dark:text-green-400">Active</Badge>
											)}
										</Button>
										<Button asChild size="sm" variant="ghost" className="h-9 px-3 text-xs font-medium text-foreground bg-muted hover:bg-muted/70 active:scale-[0.97] transition-transform rounded-full gap-1.5">
											<Link to="/my-space/cv">
												<Briefcase className="h-3 w-3" />
												{cvData ? "Mon iCV" : "Créer iCV"}
											</Link>
										</Button>
									</div>
								</div>
							</FlatCard>

							{/* Démarches mobile */}
							<FlatCard className="flex-[2] min-h-0">
								<div className="p-3 flex flex-col h-full">
									<div className="flex items-center justify-between mb-2 shrink-0">
										<span className="text-sm font-semibold flex items-center gap-2.5 text-muted-foreground">
											<div className="p-1 rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.12]">
												<FileText className="h-3.5 w-3.5 text-muted-foreground" />
											</div>
											Démarches en cours
										</span>
										<Button asChild variant="ghost" size="sm" className="h-7 px-3 text-xs font-medium text-foreground bg-muted hover:bg-muted/70 rounded-full">
											<Link to="/my-space/services-demarches">Mes Démarches</Link>
										</Button>
									</div>
									<div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
										{latestRequest ? (
											<Link to="/my-space/requests/$reference" params={{ reference: latestRequest.reference || latestRequest._id }} className="flex flex-col gap-2 p-2.5 rounded-xl bg-amber-500/15 dark:bg-amber-500/10 hover:bg-amber-500/25 transition-colors">
												<div className="flex items-center gap-2">
													<div className="p-1 rounded-md bg-amber-500/10 shrink-0"><FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" /></div>
													<p className="text-xs font-bold leading-tight text-foreground line-clamp-2 flex-1">{getLocalizedValue(latestRequest.service?.name as any, i18n.language) || "Service"}</p>
												</div>
												<p className="text-[10px] text-muted-foreground font-medium truncate text-center">{(latestRequest.org as any)?.name}</p>
											</Link>
										) : (
											<Link to="/my-space/services-demarches" className="flex flex-col gap-2 p-2.5 rounded-xl bg-amber-500/15 dark:bg-amber-500/10">
												<div className="flex items-center gap-2">
													<div className="p-1 rounded-md bg-amber-500/10 shrink-0"><FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" /></div>
													<p className="text-xs font-bold leading-tight text-foreground">Renouvellement de passeport</p>
												</div>
												<p className="text-[10px] text-muted-foreground font-medium text-center">Suggestion</p>
											</Link>
										)}
										<Link to="/services" className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl hover:bg-muted transition-colors text-muted-foreground">
											<div className="h-7 w-7 rounded-full bg-foreground/[0.06] dark:bg-foreground/[0.12] flex items-center justify-center">
												<Plus className="h-3.5 w-3.5" />
											</div>
											<p className="text-[10px] font-medium">Nouvelle démarche</p>
										</Link>
									</div>
								</div>
							</FlatCard>

							{/* RDV mobile */}
							<FlatCard className="flex-[2] min-h-0">
								<div className="p-3 flex flex-col h-full">
									<div className="flex items-center justify-between mb-2 shrink-0">
										<span className="text-sm font-semibold flex items-center gap-2.5 text-muted-foreground">
											<div className="p-1 rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.12]">
												<Calendar className="h-3.5 w-3.5 text-muted-foreground" />
											</div>
											RDV
										</span>
										<Button asChild variant="ghost" size="sm" className="h-7 px-3 text-xs font-medium text-foreground bg-muted hover:bg-muted/70 rounded-full">
											<Link to="/my-space/iagenda">iAgenda</Link>
										</Button>
									</div>
									<div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
										{appointments && appointments.length > 0 ? (
											<Link to="/my-space/iagenda" className="flex flex-col gap-2 p-2.5 rounded-xl bg-amber-500/15 dark:bg-amber-500/10 hover:bg-amber-500/25 transition-colors">
												<div className="flex items-center gap-2">
													<div className="p-1 rounded-md bg-amber-500/10 shrink-0"><Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" /></div>
													<p className="text-xs font-bold leading-tight text-foreground line-clamp-2">{(appointments[0] as any).service?.name || "RDV Consulaire"}</p>
												</div>
												<p className="text-[10px] text-muted-foreground font-medium text-center">{format(new Date((appointments[0] as any).date), "dd MMM HH:mm", { locale: fr })}</p>
											</Link>
										) : (
											<div className="flex flex-col gap-2 p-2.5 rounded-xl bg-amber-500/15 dark:bg-amber-500/10">
												<div className="flex items-center gap-2">
													<div className="p-1 rounded-md bg-amber-500/10 shrink-0"><Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" /></div>
													<p className="text-xs font-medium text-muted-foreground">Aucun RDV</p>
												</div>
											</div>
										)}
										<Link to="/my-space/iagenda" className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl hover:bg-muted transition-colors text-muted-foreground">
											<div className="h-7 w-7 rounded-full bg-foreground/[0.06] dark:bg-foreground/[0.12] flex items-center justify-center">
												<Plus className="h-3.5 w-3.5" />
											</div>
											<p className="text-[10px] font-medium">Prendre RDV</p>
										</Link>
									</div>
								</div>
							</FlatCard>

						</div>
					</div>

					{/* Page 2 mobile : Actualités */}
					<div className="w-full shrink-0 snap-start h-full overflow-y-auto citizen-scrollbar p-1">
						<FlatCard className="min-h-full flex flex-col">
							<div className="p-4 flex-1 flex flex-col">
								<div className="flex items-center justify-between mb-4">
									<span className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
										<div className="p-1 rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.12]">
											<Megaphone className="h-3.5 w-3.5 text-muted-foreground" />
										</div>
										Actualités
									</span>
									<Button asChild variant="ghost" size="sm" className="h-8 px-3 text-xs font-medium text-foreground bg-muted hover:bg-muted/70 rounded-full">
										<Link to="/news">Tout voir</Link>
									</Button>
								</div>
								{posts && posts.length > 0 ? (
									<div className="space-y-3 flex-1">
										{posts.map((post: any) => (
											<Link key={post._id} to="/news/$slug" params={{ slug: post.slug }} className="block group bg-muted p-4 rounded-xl hover:bg-muted/80 transition-colors">
												<p className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary dark:group-hover:text-blue-400 mb-1.5">{post.title}</p>
												<p className="text-xs font-medium text-muted-foreground uppercase">{format(new Date(post.publishedAt ?? post._creationTime), "dd MMM yyyy", { locale: fr })}</p>
											</Link>
										))}
									</div>
								) : (
									<p className="text-sm text-muted-foreground text-center py-8">Aucune annonce pour le moment</p>
								)}
							</div>
						</FlatCard>
					</div>
				</div>


			</motion.div>

			{/* Badge flottant Actualités — mobile uniquement */}
			<AnimatePresence>
				{mobilePageIndex === 0 && (
					<motion.button
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: 20 }}
						transition={{ type: "spring", damping: 20, stiffness: 300 }}
						onClick={scrollToActualites}
						className="fixed right-0 top-1/2 -translate-y-1/2 lg:hidden z-50 bg-foreground/[0.47] dark:bg-foreground/[0.25] text-background dark:text-white text-[8px] font-bold uppercase tracking-wider px-1 py-4 shadow-xl rounded-l-lg"
					>
						<span className="block" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>Actualités</span>
					</motion.button>
				)}
			</AnimatePresence>
			{/* Indicateur retour — mobile page 2 */}
			<AnimatePresence>
				{mobilePageIndex === 1 && (
					<motion.button
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: 20 }}
						transition={{ type: "spring", damping: 20, stiffness: 300 }}
						onClick={scrollToDashboard}
						className="fixed right-0 top-1/2 -translate-y-1/2 lg:hidden z-50 bg-foreground/[0.47] dark:bg-foreground/[0.25] text-background dark:text-white text-[8px] font-bold uppercase tracking-wider px-1 py-4 shadow-xl rounded-l-lg"
					>
						<span className="block" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>Tableau de bord</span>
					</motion.button>
				)}
			</AnimatePresence>

			{/* Floating Consular Card Dialog */}
			<AnimatePresence>
				{showConsularCard && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
						onClick={() => setShowConsularCard(false)}
					>
						<motion.div
							initial={{ opacity: 0, scale: 0.92, y: 20 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.92, y: 20 }}
							transition={{ type: "spring", damping: 25, stiffness: 350 }}
							className="relative w-full max-w-md"
							onClick={(e) => e.stopPropagation()}
						>
							{/* Close button */}
							<Button
								variant="ghost"
								size="icon"
								className="absolute -top-2 -right-2 z-10 h-8 w-8 rounded-full bg-card border border-border shadow-lg hover:bg-muted"
								onClick={() => setShowConsularCard(false)}
							>
								<X className="h-4 w-4" />
							</Button>
							<ConsularCardWidget profile={profile} />
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
			{/* Floating Dossier Details Dialog */}
			<AnimatePresence>
				{showDossierDetails && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
						onClick={() => setShowDossierDetails(false)}
					>
						<motion.div
							initial={{ opacity: 0, scale: 0.92, y: 20 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.92, y: 20 }}
							transition={{ type: "spring", damping: 25, stiffness: 350 }}
							className="relative w-full max-w-lg bg-card rounded-2xl border shadow-lg overflow-hidden flex flex-col max-h-[90dvh]"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="p-4 border-b flex items-center justify-between bg-muted">
								<div className="flex items-center gap-2">
									<div className="p-1.5 rounded-lg bg-foreground/[0.06] dark:bg-foreground/[0.12]">
										<User className="w-4 h-4 text-muted-foreground" />
									</div>
									<div>
										<h3 className="font-bold text-sm">État de mon dossier</h3>
										<p className="text-xs text-muted-foreground">Progression : {completionScore}%</p>
									</div>
								</div>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 rounded-full hover:bg-muted"
									onClick={() => setShowDossierDetails(false)}
								>
									<X className="h-4 w-4" />
								</Button>
							</div>

							<div className="p-4 overflow-y-auto citizen-scrollbar">
								<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
									{dossierItems.map((item) => (
										<div key={item.label} className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-muted text-center relative">
											<div className={cn("p-1 rounded-md", item.done ? "text-primary dark:text-primary" : "text-muted-foreground/50")}>
												{item.icon}
											</div>
											<span className={cn("text-xs leading-tight", item.done ? "font-medium text-foreground" : "text-muted-foreground")}>
												{item.label}
											</span>
											{item.done ? (
												<div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-blue-500/[0.12] flex items-center justify-center">
													<svg className="h-3 w-3 text-primary dark:text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
												</div>
											) : (
												<div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full border-2 border-muted-foreground/20" />
											)}
											{item.alert && (
												<span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-full mt-1",
													item.alert.type === "expired" ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600"
												)}>
													{item.alert.text}
												</span>
											)}
										</div>
									))}
								</div>
							</div>

							<div className="p-4 border-t bg-muted flex gap-2 justify-end">
								{completionScore < 100 && (
									<Button asChild size="sm" variant="default" className="text-xs h-8 bg-primary hover:bg-primary/90 text-white">
										<Link to="/my-space/settings" search={{ tab: "dossier" }}>
											<Pencil className="h-3.5 w-3.5 mr-1.5" /> Mettre à jour mon dossier
										</Link>
									</Button>
								)}
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

