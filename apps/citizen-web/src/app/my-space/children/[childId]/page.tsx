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
import { useTranslation } from "react-i18next";
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
function getAge(bd?: number | null): number | null { if (!bd) return null; try { return differenceInYears(new Date(), new Date(bd)); } catch { return null; } }
function fmtDate(ts?: number) { if (!ts) return "\u2014"; return format(new Date(ts), "dd MMM yyyy", { locale: fr }); }

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
	const { t } = useTranslation();

	// Translation-based label helper
	const lbl = (ns: string, code?: string) => code ? t(`${ns}.${code}`, code) : undefined;

	const { data: child, isPending } = useAuthenticatedConvexQuery(
		api.functions.childProfiles.getById,
		{ id: childId as Id<"childProfiles"> },
	);

	if (isPending) return <ContentDetailSkeleton />;

	if (!child) {
		return (
			<div className="flex flex-col items-center justify-center h-full gap-4">
				<Baby className="h-12 w-12 text-muted-foreground/30" />
				<p className="text-sm text-muted-foreground">{t("children.detail.notFound")}</p>
				<Button asChild variant="outline" size="sm"><Link href="/my-space"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" />{t("common.back")}</Link></Button>
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
		let filled = 0; let total = 0;
		const chk = (v: unknown) => { total++; if (v) filled++; };
		chk(identity?.firstName); chk(identity?.lastName); chk(identity?.birthDate);
		chk(identity?.birthPlace); chk(identity?.gender); chk(identity?.nationality);
		chk(pp?.number); chk(cc?.cardNumber); chk(parents.length > 0);
		return total > 0 ? Math.round((filled / total) * 100) : 0;
	})();

	const DOC_ENTRIES = [
		{ key: "passport", label: t("children.detail.docTypes.passport"), icon: FileText },
		{ key: "birthCertificate", label: t("children.detail.docTypes.birthCertificate"), icon: FileText },
		{ key: "residencePermit", label: t("children.detail.docTypes.residencePermit"), icon: Shield },
		{ key: "addressProof", label: t("children.detail.docTypes.addressProof"), icon: MapPin },
		{ key: "photo", label: t("children.detail.docTypes.photo"), icon: User },
	];

	const handleDownload = async (storageId: string) => {
		try {
			const url = await convex.query(api.functions.documents.getUrl, { storageId: storageId as Id<"_storage"> });
			if (url) window.open(url, "_blank");
		} catch { toast.error(t("common.error")); }
	};

	return (
		<div className="flex flex-col gap-4">
			<PageHeader
				title={`${firstName} ${lastName}`}
				subtitle={t("children.detail.subtitle")}
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
									<Badge className="text-xs px-2 py-0.5 h-5 bg-pink-500/15 text-pink-600 border-pink-500/20">{t("children.detail.child")}</Badge>
									{identity?.gender && <Badge variant="secondary" className="text-xs px-2 py-0.5 h-5">{lbl("enums.gender", identity.gender)}</Badge>}
									{age !== null && <Badge variant="secondary" className="text-xs px-2 py-0.5 h-5">{t("children.detail.yearsOld", { count: age })}</Badge>}
								</div>

								{/* Quick info */}
								<div className="w-full mt-4 space-y-2 text-left bg-background/50 rounded-lg p-3 border border-pink-500/10">
									{identity?.birthPlace && <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground shrink-0" /><span className="truncate">{t("children.detail.bornIn")} {identity.birthPlace}</span></div>}
									{identity?.nationality && <div className="flex items-center gap-2 text-sm"><Shield className="h-4 w-4 text-muted-foreground shrink-0" /><span className="truncate">{lbl("countryList", identity.nationality)}</span></div>}
									{c.countryOfResidence && <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground shrink-0" /><span className="truncate">{t("children.detail.residesIn")} {lbl("countryList", c.countryOfResidence)}</span></div>}
								</div>
							</div>
						</FlatCard>

						{/* Carte consulaire enfant */}
						<FlatCard className={cn(cc?.cardNumber ? (ccExpired ? "bg-red-500/5" : "bg-emerald-500/5") : "")}>
							<div className="p-4">
								<div className="flex items-center gap-2 mb-3">
									<Shield className="h-4 w-4 text-muted-foreground" />
									<span className="text-sm font-bold">{t("children.detail.consularCard")}</span>
									{cc?.cardNumber && (
										<Badge variant="outline" className={cn("text-xs ml-auto", ccExpired ? "border-red-400 text-red-500" : "border-emerald-400 text-emerald-600")}>
											{ccExpired ? t("children.detail.expired") : t("children.detail.active")}
										</Badge>
									)}
								</div>
								{cc?.cardNumber ? (
									<div className="space-y-1.5">
										<p className="text-sm font-mono font-bold">{cc.cardNumber}</p>
										{cc.expiresAt && <p className="text-xs text-muted-foreground">{t("children.detail.validUntil")} {fmtDate(cc.expiresAt)}</p>}
									</div>
								) : (
									<p className="text-sm text-muted-foreground text-center py-3">{t("children.detail.notRegistered")}</p>
								)}
							</div>
						</FlatCard>

						{/* Parents */}
						<FlatCard>
							<div className="p-4">
								<div className="flex items-center gap-2 mb-3">
									<Users className="h-4 w-4 text-muted-foreground" />
									<span className="text-sm font-bold">{t("children.detail.parents")}</span>
								</div>
								{parents.length > 0 ? (
									<div className="space-y-2">
										{parents.map((parent: any, idx: number) => (
											<div key={idx} className="bg-muted/40 p-3 rounded-lg space-y-1.5">
												<div className="flex items-center gap-2">
													<span className="text-sm font-semibold truncate">{parent.firstName} {parent.lastName}</span>
													<Badge variant="outline" className="text-xs h-5 shrink-0">{lbl("children.detail.roles", parent.role)}</Badge>
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
								) : <p className="text-sm text-muted-foreground text-center py-3">{t("profile.fields.notSpecified")}</p>}
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
										<span className="text-sm font-bold">{t("children.detail.dossier")}</span>
									</div>
								</div>

								{/* Content */}
								<div className="p-4 space-y-5">
									{/* Identite */}
									<div>
										<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">{t("children.detail.identity")}</p>
										<div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
											<InfoRow label={t("profile.fields.lastName")} value={identity?.lastName} />
											<InfoRow label={t("profile.fields.firstName")} value={identity?.firstName} />
											<InfoRow label={t("profile.fields.birthDate")} value={fmtDate(identity?.birthDate)} />
											<InfoRow label={t("profile.fields.birthPlace")} value={identity?.birthPlace} />
											<InfoRow label={t("profile.fields.birthCountry")} value={lbl("countryList", identity?.birthCountry)} />
											<InfoRow label={t("profile.fields.gender")} value={lbl("enums.gender", identity?.gender)} />
											<InfoRow label={t("profile.fields.nationality")} value={lbl("countryList", identity?.nationality)} />
											{c.nipCode && <InfoRow label="NIP" value={c.nipCode} />}
											{c.countryOfResidence && <InfoRow label={t("profile.fields.countryOfResidence")} value={lbl("countryList", c.countryOfResidence)} />}
										</div>
									</div>

									{/* Passeport */}
									<div>
										<div className="flex items-center gap-2 mb-3">
											<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">{t("children.detail.passport")}</p>
											{ppExpired && <Badge variant="destructive" className="text-xs h-5">{t("children.detail.passportExpired")}</Badge>}
											{ppSoon && <Badge variant="secondary" className="text-xs h-5 bg-amber-100 text-amber-700">{t("children.detail.passportExpiring")}</Badge>}
										</div>
										{pp?.number ? (
											<div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 p-4 rounded-lg border", ppExpired ? "border-red-400/30 bg-red-500/5" : ppSoon ? "border-amber-400/30 bg-amber-500/5" : "border-border/50")}>
												<InfoRow label={t("profile.passport.number")} value={pp.number} />
												<InfoRow label={t("profile.passport.issuingAuthority")} value={pp.issueAuthority} />
												<InfoRow label={t("profile.passport.issueDate")} value={fmtDate(pp.issueDate)} />
												<InfoRow label={t("profile.passport.expiryDate")} value={fmtDate(pp.expiryDate)} />
											</div>
										) : (
											<p className="text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center">{t("children.detail.noPassport")}</p>
										)}
									</div>

									{/* Carte consulaire detaillee */}
									<div>
										<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">{t("children.detail.consularRegistration")}</p>
										{cc?.cardNumber ? (
											<div className={cn("p-4 rounded-lg border", ccExpired ? "border-red-400/30 bg-red-500/5" : "border-emerald-400/30 bg-emerald-500/5")}>
												<div className="grid grid-cols-3 gap-x-6 gap-y-3">
													<InfoRow label={t("children.detail.labels.cardNumber")} value={cc.cardNumber} />
													<InfoRow label={t("profile.passport.issueDate")} value={fmtDate(cc.issuedAt)} />
													<InfoRow label={t("profile.passport.expiryDate")} value={fmtDate(cc.expiresAt)} />
												</div>
											</div>
										) : (
											<p className="text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center">{t("children.detail.notConsularRegistered")}</p>
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
									<span className="text-sm font-bold">{t("children.detail.documents")}</span>
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
														<Download className="h-3 w-3" />{t("common.view")}
													</button>
												) : (
													<span className="text-xs text-muted-foreground/50">{t("children.detail.missing")}</span>
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
									<span className="text-sm font-bold">{t("children.detail.actions")}</span>
								</div>
								<div className="space-y-2">
									<Button asChild variant="outline" size="sm" className="w-full h-9 text-sm justify-start">
										<Link href="/my-space/services-demarches">
											<FileText className="h-4 w-4 mr-2" />{t("children.detail.requestFor", { name: firstName })}
										</Link>
									</Button>
									<Button asChild variant="outline" size="sm" className="w-full h-9 text-sm justify-start">
										<Link href="/my-space/iagenda">
											<Calendar className="h-4 w-4 mr-2" />{t("children.detail.bookAppointment")}
										</Link>
									</Button>
									<Button asChild variant="ghost" size="sm" className="w-full h-9 text-sm justify-start text-muted-foreground">
										<Link href="/my-space">
											<ArrowLeft className="h-4 w-4 mr-2" />{t("children.detail.backToMySpace")}
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
