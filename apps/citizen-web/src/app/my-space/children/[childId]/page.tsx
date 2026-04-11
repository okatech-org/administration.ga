"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import Link from "next/link";
import { useParams } from "next/navigation";
import { differenceInYears, format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	ArrowLeft, ArrowRight, Baby, Calendar, Download, FileText,
	Loader2, Mail, MapPin, Phone, Shield, User, Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useConvex } from "convex/react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/my-space/flat-card";
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
			<span className="text-[9px] text-muted-foreground uppercase font-medium leading-none tracking-wider mb-1">{label}</span>
			<span className="text-[12px] font-semibold leading-tight truncate text-foreground" title={value || ""}>{value || "\u2014"}</span>
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
		<div className="flex flex-col h-full overflow-hidden bg-background">
			{/* Top bar: back to parent */}
			<div className="px-2 pt-2 shrink-0 flex items-center gap-2">
				<Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
					<Link href="/my-space"><ArrowLeft className="h-3.5 w-3.5 mr-1" />Mon espace</Link>
				</Button>
				<span className="text-[10px] text-muted-foreground">/ Espace enfant</span>
			</div>

			<motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex-1 min-h-0 overflow-hidden px-2 pb-2 mt-1">
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-2 h-full overflow-hidden pr-1">

					{/* --- COL 1: Hero + Carte consulaire (3/12) --- */}
					<div className="lg:col-span-3 flex flex-col gap-2 min-h-0 overflow-y-auto">
						{/* Hero enfant */}
						<FlatCard className="shrink-0 bg-pink-500/5 relative">
							<div className="p-2.5 flex flex-col items-center text-center">
								<div className="relative mb-2">
									<Avatar className="h-14 w-14 border-2 border-background">
										<AvatarFallback className="text-xl font-bold bg-pink-500 text-white">{firstName?.[0]}{lastName?.[0]}</AvatarFallback>
									</Avatar>
									<div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
										<div className="relative h-6 w-6 flex items-center justify-center bg-muted rounded-full">
											<svg className="absolute inset-0 h-6 w-6 -rotate-90" viewBox="0 0 36 36">
												<circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" className="stroke-muted/50" />
												<circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" strokeDasharray={`${completionScore} ${100 - completionScore}`} strokeLinecap="round" className="stroke-pink-500" />
											</svg>
											<span className="text-[7px] font-bold z-10">{completionScore}%</span>
										</div>
									</div>
								</div>

								<h2 className="text-sm font-bold leading-tight">{firstName} {lastName}</h2>
								<div className="flex items-center justify-center gap-1.5 mt-1.5 flex-wrap">
									<Badge className="text-[9px] px-1 py-0 h-4 bg-pink-500/15 text-pink-600 border-pink-500/20">Enfant</Badge>
									{identity?.gender && <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">{GENDER_LABELS[identity.gender] ?? identity.gender}</Badge>}
									{age !== null && <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">{age} ans</Badge>}
								</div>

								{/* Quick info */}
								<div className="w-full mt-3 space-y-1 text-left bg-background/50 rounded p-2 border border-pink-500/10">
									{identity?.birthPlace && <div className="flex items-center gap-1.5 text-[10px]"><MapPin className="h-3 w-3 text-muted-foreground shrink-0" /><span className="truncate">Ne(e) a {identity.birthPlace}</span></div>}
									{identity?.nationality && <div className="flex items-center gap-1.5 text-[10px]"><Shield className="h-3 w-3 text-muted-foreground shrink-0" /><span className="truncate">{lbl(COUNTRY_LABELS, identity.nationality)}</span></div>}
									{c.countryOfResidence && <div className="flex items-center gap-1.5 text-[10px]"><MapPin className="h-3 w-3 text-muted-foreground shrink-0" /><span className="truncate">Reside en {lbl(COUNTRY_LABELS, c.countryOfResidence)}</span></div>}
								</div>
							</div>
						</FlatCard>

						{/* Carte consulaire enfant */}
						<FlatCard className={cn("shrink-0", cc?.cardNumber ? (ccExpired ? "bg-red-500/5" : "bg-emerald-500/5") : "")}>
							<div className="p-2.5">
								<div className="flex items-center gap-1.5 mb-2">
									<Shield className="h-3.5 w-3.5 text-muted-foreground" />
									<span className="text-xs font-bold">Carte Consulaire</span>
									{cc?.cardNumber && (
										<Badge variant="outline" className={cn("text-[8px] ml-auto", ccExpired ? "border-red-400 text-red-500" : "border-emerald-400 text-emerald-600")}>
											{ccExpired ? "Expiree" : "Active"}
										</Badge>
									)}
								</div>
								{cc?.cardNumber ? (
									<div className="space-y-1">
										<p className="text-xs font-mono font-bold">{cc.cardNumber}</p>
										{cc.expiresAt && <p className="text-[9px] text-muted-foreground">Valide jusqu&apos;au {fmtDate(cc.expiresAt)}</p>}
									</div>
								) : (
									<p className="text-[10px] text-muted-foreground text-center py-2">Pas encore inscrit</p>
								)}
							</div>
						</FlatCard>

						{/* Parents */}
						<FlatCard className="shrink-0">
							<div className="p-2.5">
								<div className="flex items-center gap-1.5 mb-2">
									<Users className="h-3.5 w-3.5 text-muted-foreground" />
									<span className="text-xs font-bold">Parents / Tuteurs</span>
								</div>
								{parents.length > 0 ? (
									<div className="space-y-1.5">
										{parents.map((parent: any, idx: number) => (
											<div key={idx} className="bg-muted/40 p-2 rounded">
												<div className="flex items-center justify-between">
													<span className="text-[11px] font-semibold">{parent.firstName} {parent.lastName}</span>
													<Badge variant="outline" className="text-[8px] h-4">{ROLE_LABELS[parent.role] ?? parent.role}</Badge>
												</div>
												{(parent.phone || parent.email) && (
													<div className="flex items-center gap-3 mt-1 text-[9px] text-muted-foreground">
														{parent.phone && <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" />{parent.phone}</span>}
														{parent.email && <span className="flex items-center gap-0.5"><Mail className="h-2.5 w-2.5" />{parent.email}</span>}
													</div>
												)}
											</div>
										))}
									</div>
								) : <p className="text-[10px] text-muted-foreground text-center py-2">Non renseigne</p>}
							</div>
						</FlatCard>
					</div>

					{/* --- COL 2: Dossier Enfant (6/12) --- */}
					<div className="lg:col-span-6 flex flex-col gap-2 min-h-0 overflow-y-auto">
						<FlatCard className="flex-1 flex flex-col">
							<div className="flex flex-col h-full">
								{/* Header */}
								<div className="flex items-center justify-between p-2 border-b bg-muted/20 shrink-0">
									<div className="flex items-center gap-2">
										<div className="p-1.5 bg-pink-500/10 rounded-md"><Baby className="w-3.5 h-3.5 text-pink-500" /></div>
										<span className="text-xs font-bold">Dossier Enfant</span>
									</div>
								</div>

								{/* Content grid */}
								<div className="flex-1 overflow-y-auto p-3 space-y-4">
									{/* Identite */}
									<div>
										<p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Identite</p>
										<div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-2">
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
										<div className="flex items-center gap-2 mb-2">
											<p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">Passeport</p>
											{ppExpired && <Badge variant="destructive" className="text-[8px] h-4">Expire</Badge>}
											{ppSoon && <Badge variant="secondary" className="text-[8px] h-4 bg-amber-100 text-amber-700">Expire bientot</Badge>}
										</div>
										{pp?.number ? (
											<div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-2 p-3 rounded-lg border", ppExpired ? "border-red-400/30 bg-red-500/5" : ppSoon ? "border-amber-400/30 bg-amber-500/5" : "border-border/50")}>
												<InfoRow label="Numero" value={pp.number} />
												<InfoRow label="Autorite" value={pp.issueAuthority} />
												<InfoRow label="Delivre le" value={fmtDate(pp.issueDate)} />
												<InfoRow label="Expire le" value={fmtDate(pp.expiryDate)} />
											</div>
										) : (
											<p className="text-[10px] text-muted-foreground p-3 border border-dashed rounded-lg text-center">Aucune information de passeport</p>
										)}
									</div>

									{/* Carte consulaire detaillee */}
									<div>
										<p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Inscription consulaire</p>
										{cc?.cardNumber ? (
											<div className={cn("p-3 rounded-lg border", ccExpired ? "border-red-400/30 bg-red-500/5" : "border-emerald-400/30 bg-emerald-500/5")}>
												<div className="grid grid-cols-3 gap-x-5 gap-y-2">
													<InfoRow label="N carte" value={cc.cardNumber} />
													<InfoRow label="Delivre le" value={fmtDate(cc.issuedAt)} />
													<InfoRow label="Expire le" value={fmtDate(cc.expiresAt)} />
												</div>
											</div>
										) : (
											<p className="text-[10px] text-muted-foreground p-3 border border-dashed rounded-lg text-center">Enfant non inscrit au registre consulaire</p>
										)}
									</div>
								</div>
							</div>
						</FlatCard>
					</div>

					{/* --- COL 3: Documents + Actions (3/12) --- */}
					<div className="lg:col-span-3 flex flex-col gap-2 min-h-0 overflow-y-auto">

						{/* Documents */}
						<FlatCard className="shrink-0">
							<div className="p-2.5">
								<div className="flex items-center gap-1.5 mb-2">
									<FileText className="h-3.5 w-3.5 text-muted-foreground" />
									<span className="text-xs font-bold">Documents</span>
								</div>
								<div className="space-y-1.5">
									{DOC_ENTRIES.map((entry) => {
										const doc = docs[entry.key];
										const Icon = entry.icon;
										return (
											<div key={entry.key} className={cn("flex items-center gap-2 p-1.5 rounded", doc ? "bg-emerald-500/5" : "bg-muted/30")}>
												<div className={cn("h-5 w-5 rounded flex items-center justify-center shrink-0", doc ? "bg-emerald-500/15" : "bg-muted")}>
													<Icon className={cn("h-2.5 w-2.5", doc ? "text-emerald-500" : "text-muted-foreground/40")} />
												</div>
												<span className="text-[10px] font-medium flex-1 truncate">{entry.label}</span>
												{doc ? (
													<button onClick={() => doc.files?.[0]?.storageId && handleDownload(doc.files[0].storageId)} className="text-[9px] text-primary hover:underline flex items-center gap-0.5">
														<Download className="h-2.5 w-2.5" />Voir
													</button>
												) : (
													<span className="text-[9px] text-muted-foreground/50">Manquant</span>
												)}
											</div>
										);
									})}
								</div>
							</div>
						</FlatCard>

						{/* Actions rapides */}
						<FlatCard className="shrink-0 bg-pink-500/5">
							<div className="p-2.5">
								<div className="flex items-center gap-1.5 mb-2">
									<Baby className="h-3.5 w-3.5 text-pink-500" />
									<span className="text-xs font-bold">Actions</span>
								</div>
								<div className="space-y-1.5">
									<Button asChild variant="outline" size="sm" className="w-full h-7 text-[10px] justify-start">
										<Link href="/my-space/services-demarches">
											<FileText className="h-3 w-3 mr-1.5" />Demarche pour {firstName}
										</Link>
									</Button>
									<Button asChild variant="outline" size="sm" className="w-full h-7 text-[10px] justify-start">
										<Link href="/my-space/iagenda">
											<Calendar className="h-3 w-3 mr-1.5" />Prendre un rendez-vous
										</Link>
									</Button>
									<Button asChild variant="ghost" size="sm" className="w-full h-7 text-[10px] justify-start text-muted-foreground">
										<Link href="/my-space">
											<ArrowLeft className="h-3 w-3 mr-1.5" />Retour a mon espace
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
