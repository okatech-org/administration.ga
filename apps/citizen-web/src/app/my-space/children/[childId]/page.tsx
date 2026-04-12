"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import Link from "next/link";
import { useParams } from "next/navigation";
import { differenceInYears, format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	ArrowLeft, Baby, Calendar, Download, FileText,
	Loader2, Mail, MapPin, Phone, Shield, User, Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useConvex } from "convex/react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/my-space/flat-card";
import { PageHeader } from "@/components/my-space/page-header";
import { ContentDetailSkeleton } from "@/components/skeletons";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

// --- Helpers ---
const GENDER_LABELS: Record<string, string> = { male: "Garcon", female: "Fille", M: "Garcon", F: "Fille" };
const COUNTRY_LABELS: Record<string, string> = { GA: "Gabon", FR: "France", CM: "Cameroun", CG: "Congo", CD: "RD Congo", SN: "Senegal", CI: "Cote d'Ivoire", MA: "Maroc", BE: "Belgique", CH: "Suisse", CA: "Canada", US: "Etats-Unis" };
const ROLE_LABELS: Record<string, string> = { father: "Pere", mother: "Mere", guardian: "Tuteur", other: "Autre" };

function getAge(bd?: number | null): number | null { if (!bd) return null; try { return differenceInYears(new Date(), new Date(bd)); } catch { return null; } }
function fmtDate(ts?: number) { if (!ts) return "\u2014"; return format(new Date(ts), "dd MMM yyyy", { locale: fr }); }
function lbl(map: Record<string, string>, code?: string) { return code ? map[code] || code : undefined; }

function InfoRow({ label, value }: { label: string; value?: string | null }) {
	return (
		<div className="flex flex-col overflow-hidden">
			<span className="text-xs text-muted-foreground uppercase font-medium leading-none tracking-wider mb-1">{label}</span>
			<span className="text-sm font-semibold leading-tight truncate text-foreground" title={value || ""}>{value || "\u2014"}</span>
		</div>
	);
}

// ============================
export default function ChildDashboardPage() {
	const params = useParams();
	const childId = params.childId as string;
	const convex = useConvex();

	const { data: child, isPending } = useAuthenticatedConvexQuery(
		api.functions.childProfiles.getById,
		{ id: childId as Id<"childProfiles"> },
	);

	if (isPending) return <ContentDetailSkeleton />;

	if (!child) {
		return (
			<div className="flex flex-col items-center justify-center h-full gap-4">
				<Baby className="h-12 w-12 text-muted-foreground/30" />
				<p className="text-sm text-muted-foreground">Profil enfant introuvable</p>
				<Button asChild variant="outline" size="sm"><Link href="/my-space"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" />Retour</Link></Button>
			</div>
		);
	}

	const c = child as any;
	const identity = c.identity;
	const pp = c.passportInfo;
	const cc = c.consularCard;
	const parents = c.parents ?? [];
	const docs = c.documentsData ?? {};
	const age = getAge(identity?.birthDate);
	const firstName = identity?.firstName ?? "";
	const lastName = identity?.lastName ?? "";

	const ppExpired = pp?.expiryDate && pp.expiryDate < Date.now();
	const ppSoon = pp?.expiryDate && pp.expiryDate < Date.now() + 90 * 86400000 && !ppExpired;
	const ccExpired = cc?.expiresAt && cc.expiresAt < Date.now();

	// Completion score for child profile
	const completionScore = (() => {
		let f = 0; let t = 0;
		const chk = (v: unknown) => { t++; if (v) f++; };
		chk(identity?.firstName); chk(identity?.lastName); chk(identity?.birthDate);
		chk(identity?.birthPlace); chk(identity?.gender); chk(identity?.nationality);
		chk(pp?.number); chk(cc?.cardNumber); chk(parents.length > 0);
		return t > 0 ? Math.round((f / t) * 100) : 0;
	})();

	const DOC_ENTRIES = [
		{ key: "passport", label: "Passeport", icon: FileText },
		{ key: "birthCertificate", label: "Acte de naissance", icon: FileText },
		{ key: "residencePermit", label: "Titre de sejour", icon: Shield },
		{ key: "addressProof", label: "Justificatif domicile", icon: MapPin },
		{ key: "photo", label: "Photo d'identite", icon: User },
	];

	const handleDownload = async (storageId: string) => {
		try {
			const url = await convex.query(api.functions.documents.getUrl, { storageId: storageId as Id<"_storage"> });
			if (url) window.open(url, "_blank");
		} catch { toast.error("Erreur"); }
	};

	return (
		<div className="flex flex-col gap-4">
			<PageHeader
				title={`${firstName} ${lastName}`}
				subtitle="Espace enfant"
				icon={<Baby className="h-5 w-5 text-pink-500" />}
				iconBgClass="bg-pink-500/10"
				showBackButton
			/>

			<motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

					{/* --- COL 1: Hero + Carte consulaire (3/12) --- */}
					<div className="lg:col-span-3 flex flex-col gap-3">
						{/* Hero enfant */}
						<FlatCard className="bg-pink-500/5 relative">
							<div className="p-4 flex flex-col items-center text-center">
								<div className="relative mb-3">
									<Avatar className="h-20 w-20 border-2 border-background">
										<AvatarFallback className="text-2xl font-bold bg-pink-500 text-white">{firstName?.[0]}{lastName?.[0]}</AvatarFallback>
									</Avatar>
									<div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
										<div className="relative h-8 w-8 flex items-center justify-center bg-muted rounded-full">
											<svg className="absolute inset-0 h-8 w-8 -rotate-90" viewBox="0 0 36 36">
												<circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" className="stroke-muted/50" />
												<circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" strokeDasharray={`${completionScore} ${100 - completionScore}`} strokeLinecap="round" className="stroke-pink-500" />
											</svg>
											<span className="text-[9px] font-bold z-10">{completionScore}%</span>
										</div>
									</div>
								</div>

								<h2 className="text-lg font-bold leading-tight">{firstName} {lastName}</h2>
								<div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
									<Badge className="text-xs px-2 py-0.5 h-5 bg-pink-500/15 text-pink-600 border-pink-500/20">Enfant</Badge>
									{identity?.gender && <Badge variant="secondary" className="text-xs px-2 py-0.5 h-5">{GENDER_LABELS[identity.gender] ?? identity.gender}</Badge>}
									{age !== null && <Badge variant="secondary" className="text-xs px-2 py-0.5 h-5">{age} ans</Badge>}
								</div>

								{/* Quick info */}
								<div className="w-full mt-4 space-y-2 text-left bg-background/50 rounded-lg p-3 border border-pink-500/10">
									{identity?.birthPlace && <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground shrink-0" /><span className="truncate">Ne(e) a {identity.birthPlace}</span></div>}
									{identity?.nationality && <div className="flex items-center gap-2 text-sm"><Shield className="h-4 w-4 text-muted-foreground shrink-0" /><span className="truncate">{lbl(COUNTRY_LABELS, identity.nationality)}</span></div>}
									{c.countryOfResidence && <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground shrink-0" /><span className="truncate">Reside en {lbl(COUNTRY_LABELS, c.countryOfResidence)}</span></div>}
								</div>
							</div>
						</FlatCard>

						{/* Carte consulaire enfant */}
						<FlatCard className={cn(cc?.cardNumber ? (ccExpired ? "bg-red-500/5" : "bg-emerald-500/5") : "")}>
							<div className="p-4">
								<div className="flex items-center gap-2 mb-3">
									<Shield className="h-4 w-4 text-muted-foreground" />
									<span className="text-sm font-bold">Carte Consulaire</span>
									{cc?.cardNumber && (
										<Badge variant="outline" className={cn("text-xs ml-auto", ccExpired ? "border-red-400 text-red-500" : "border-emerald-400 text-emerald-600")}>
											{ccExpired ? "Expiree" : "Active"}
										</Badge>
									)}
								</div>
								{cc?.cardNumber ? (
									<div className="space-y-1.5">
										<p className="text-sm font-mono font-bold">{cc.cardNumber}</p>
										{cc.expiresAt && <p className="text-xs text-muted-foreground">Valide jusqu&apos;au {fmtDate(cc.expiresAt)}</p>}
									</div>
								) : (
									<p className="text-sm text-muted-foreground text-center py-3">Pas encore inscrit</p>
								)}
							</div>
						</FlatCard>

						{/* Parents */}
						<FlatCard>
							<div className="p-4">
								<div className="flex items-center gap-2 mb-3">
									<Users className="h-4 w-4 text-muted-foreground" />
									<span className="text-sm font-bold">Parents / Tuteurs</span>
								</div>
								{parents.length > 0 ? (
									<div className="space-y-2">
										{parents.map((parent: any, idx: number) => (
											<div key={idx} className="bg-muted/40 p-3 rounded-lg space-y-1.5">
												<div className="flex items-center gap-2">
													<span className="text-sm font-semibold truncate">{parent.firstName} {parent.lastName}</span>
													<Badge variant="outline" className="text-xs h-5 shrink-0">{ROLE_LABELS[parent.role] ?? parent.role}</Badge>
												</div>
												{parent.phone && (
													<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
														<Phone className="h-3 w-3 shrink-0" /><span className="truncate">{parent.phone}</span>
													</div>
												)}
												{parent.email && (
													<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
														<Mail className="h-3 w-3 shrink-0" /><span className="truncate">{parent.email}</span>
													</div>
												)}
											</div>
										))}
									</div>
								) : <p className="text-sm text-muted-foreground text-center py-3">Non renseigne</p>}
							</div>
						</FlatCard>
					</div>

					{/* --- COL 2: Dossier Enfant (6/12) --- */}
					<div className="lg:col-span-6 flex flex-col gap-3">
						<FlatCard className="flex-1 flex flex-col">
							<div className="flex flex-col">
								{/* Header */}
								<div className="flex items-center justify-between p-3 border-b bg-muted/20">
									<div className="flex items-center gap-2">
										<div className="p-2 bg-pink-500/10 rounded-md"><Baby className="w-4 h-4 text-pink-500" /></div>
										<span className="text-sm font-bold">Dossier Enfant</span>
									</div>
								</div>

								{/* Content */}
								<div className="p-4 space-y-5">
									{/* Identite */}
									<div>
										<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">Identite</p>
										<div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
											<InfoRow label="Nom" value={identity?.lastName} />
											<InfoRow label="Prenom(s)" value={identity?.firstName} />
											<InfoRow label="Date de naissance" value={fmtDate(identity?.birthDate)} />
											<InfoRow label="Lieu de naissance" value={identity?.birthPlace} />
											<InfoRow label="Pays de naissance" value={lbl(COUNTRY_LABELS, identity?.birthCountry)} />
											<InfoRow label="Genre" value={lbl(GENDER_LABELS, identity?.gender)} />
											<InfoRow label="Nationalite" value={lbl(COUNTRY_LABELS, identity?.nationality)} />
											{c.nipCode && <InfoRow label="NIP" value={c.nipCode} />}
											{c.countryOfResidence && <InfoRow label="Residence" value={lbl(COUNTRY_LABELS, c.countryOfResidence)} />}
										</div>
									</div>

									{/* Passeport */}
									<div>
										<div className="flex items-center gap-2 mb-3">
											<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Passeport</p>
											{ppExpired && <Badge variant="destructive" className="text-xs h-5">Expire</Badge>}
											{ppSoon && <Badge variant="secondary" className="text-xs h-5 bg-amber-100 text-amber-700">Expire bientot</Badge>}
										</div>
										{pp?.number ? (
											<div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 p-4 rounded-lg border", ppExpired ? "border-red-400/30 bg-red-500/5" : ppSoon ? "border-amber-400/30 bg-amber-500/5" : "border-border/50")}>
												<InfoRow label="Numero" value={pp.number} />
												<InfoRow label="Autorite" value={pp.issueAuthority} />
												<InfoRow label="Delivre le" value={fmtDate(pp.issueDate)} />
												<InfoRow label="Expire le" value={fmtDate(pp.expiryDate)} />
											</div>
										) : (
											<p className="text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center">Aucune information de passeport</p>
										)}
									</div>

									{/* Carte consulaire detaillee */}
									<div>
										<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">Inscription consulaire</p>
										{cc?.cardNumber ? (
											<div className={cn("p-4 rounded-lg border", ccExpired ? "border-red-400/30 bg-red-500/5" : "border-emerald-400/30 bg-emerald-500/5")}>
												<div className="grid grid-cols-3 gap-x-6 gap-y-3">
													<InfoRow label="N carte" value={cc.cardNumber} />
													<InfoRow label="Delivre le" value={fmtDate(cc.issuedAt)} />
													<InfoRow label="Expire le" value={fmtDate(cc.expiresAt)} />
												</div>
											</div>
										) : (
											<p className="text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center">Enfant non inscrit au registre consulaire</p>
										)}
									</div>
								</div>
							</div>
						</FlatCard>
					</div>

					{/* --- COL 3: Documents + Actions (3/12) --- */}
					<div className="lg:col-span-3 flex flex-col gap-3">

						{/* Documents */}
						<FlatCard>
							<div className="p-4">
								<div className="flex items-center gap-2 mb-3">
									<FileText className="h-4 w-4 text-muted-foreground" />
									<span className="text-sm font-bold">Documents</span>
								</div>
								<div className="space-y-2">
									{DOC_ENTRIES.map((entry) => {
										const doc = docs[entry.key];
										const Icon = entry.icon;
										return (
											<div key={entry.key} className={cn("flex items-center gap-3 p-2.5 rounded-lg", doc ? "bg-emerald-500/5" : "bg-muted/30")}>
												<div className={cn("h-7 w-7 rounded-md flex items-center justify-center shrink-0", doc ? "bg-emerald-500/15" : "bg-muted")}>
													<Icon className={cn("h-3.5 w-3.5", doc ? "text-emerald-500" : "text-muted-foreground/40")} />
												</div>
												<span className="text-sm font-medium flex-1 truncate">{entry.label}</span>
												{doc ? (
													<button onClick={() => doc.files?.[0]?.storageId && handleDownload(doc.files[0].storageId)} className="text-xs text-primary hover:underline flex items-center gap-1">
														<Download className="h-3 w-3" />Voir
													</button>
												) : (
													<span className="text-xs text-muted-foreground/50">Manquant</span>
												)}
											</div>
										);
									})}
								</div>
							</div>
						</FlatCard>

						{/* Actions rapides */}
						<FlatCard className="bg-pink-500/5">
							<div className="p-4">
								<div className="flex items-center gap-2 mb-3">
									<Baby className="h-4 w-4 text-pink-500" />
									<span className="text-sm font-bold">Actions</span>
								</div>
								<div className="space-y-2">
									<Button asChild variant="outline" size="sm" className="w-full h-9 text-sm justify-start">
										<Link href="/my-space/services-demarches">
											<FileText className="h-4 w-4 mr-2" />Demarche pour {firstName}
										</Link>
									</Button>
									<Button asChild variant="outline" size="sm" className="w-full h-9 text-sm justify-start">
										<Link href="/my-space/iagenda">
											<Calendar className="h-4 w-4 mr-2" />Prendre un rendez-vous
										</Link>
									</Button>
									<Button asChild variant="ghost" size="sm" className="w-full h-9 text-sm justify-start text-muted-foreground">
										<Link href="/my-space">
											<ArrowLeft className="h-4 w-4 mr-2" />Retour a mon espace
										</Link>
									</Button>
								</div>
							</div>
						</FlatCard>
					</div>

				</div>
			</motion.div>
		</div>
	);
}
