"use client";

import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { CountryCode } from "@convex/lib/constants";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	ArrowRight,
	Clock,
	CreditCard,
	RotateCcw,
	FileText,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/my-space/flat-card";
import {
	ConsularCardCanvas,
	type CardCanvasProfile,
} from "@/components/my-space/consular-card-canvas";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

interface ConsularCardWidgetProps {
	profile: Doc<"profiles"> | null | undefined;
}

export function ConsularCardWidget({ profile }: ConsularCardWidgetProps) {
	const { t } = useTranslation();
	const [isFlipped, setIsFlipped] = useState(false);

	// Query consular registrations for this profile
	const { data: registrations } = useAuthenticatedConvexQuery(
		api.functions.consularRegistrations.listByProfile,
		{},
	);
	const latestRegistration = registrations?.[0];

	// Get the registration request status if we have a pending registration
	const { data: registrationRequest } = useAuthenticatedConvexQuery(
		api.functions.requests.getById,
		latestRegistration?.requestId
			? { requestId: latestRegistration.requestId }
			: "skip",
	);

	// Photo d'identite : resolution fiable (lien direct OU recherche par type)
	const { data: identityPhotoUrl } = useAuthenticatedConvexQuery(
		api.functions.documents.getMyIdentityPhotoUrl,
		{},
	);

	// Modele de carte configure pour l'organisme delivreur (memes donnees que
	// celles utilisees par l'imprimante via le card designer desktop).
	const orgId = profile?.consularCard?.orgId;
	const { data: cardDesign } = useAuthenticatedConvexQuery(
		api.functions.cardDesigns.getByOrg,
		orgId ? { orgId } : "skip",
	);
	const { data: org } = useAuthenticatedConvexQuery(
		api.functions.orgs.getById,
		orgId ? { orgId } : "skip",
	);

	const hasValidCard =
		profile?.consularCard?.cardNumber &&
		profile.consularCard.cardExpiresAt > Date.now();

	const hasExpiredCard =
		profile?.consularCard?.cardNumber &&
		profile.consularCard.cardExpiresAt <= Date.now();

	const formatDate = (timestamp: number) => {
		return format(new Date(timestamp), "dd/MM/yyyy", { locale: fr });
	};

	const handleFlip = () => setIsFlipped(!isFlipped);

	// Has valid card - show card preview
	if (hasValidCard && profile.consularCard) {
		const consularCard = profile.consularCard;
		const identity = profile.identity;

		// Donnees resolues pour les champs dynamiques du modele configure.
		// Aligne sur buildProfileDataFromRegistration (agent-desktop) pour que
		// le rendu citoyen matche pixel-pour-pixel l'aperçu d'impression.
		const canvasProfile: CardCanvasProfile = {
			firstName: identity?.firstName,
			lastName: identity?.lastName,
			dateOfBirth: identity?.birthDate
				? formatDate(identity.birthDate)
				: undefined,
			placeOfBirth: identity?.birthPlace,
			nationality: identity?.nationality,
			sex: identity?.gender,
			nip: identity?.nip,
			photoUrl: identityPhotoUrl ?? undefined,
			cardNumber: consularCard.cardNumber,
			cardIssuedAt: formatDate(consularCard.cardIssuedAt),
			cardExpiresAt: formatDate(consularCard.cardExpiresAt),
			consulateName: org?.name,
			consulateCity: org?.address?.city,
			consulateCountry: org?.country,
		};

		return (
			<FlatCard className="p-3 flex flex-col gap-3 shrink-0">
				{/* 1. Header: Titre + Bouton de bascule */}
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold flex items-center gap-1.5">
						<div className="p-1 rounded-md bg-foreground/5">
							<CreditCard className="h-3 w-3 text-muted-foreground" />
						</div>
						{t("mySpace.consularCard.title")}
					</span>
					<Button
						variant="ghost"
						size="sm"
						className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
						onClick={(e) => {
							e.stopPropagation();
							handleFlip();
						}}
					>
						<RotateCcw className="h-3 w-3 mr-1.5" />
						{isFlipped ? "Voir le recto" : "Voir le verso"}
					</Button>
				</div>

				{/* 2. Visualisation de la carte (Flip 3D) */}
				<div className="w-full flex justify-center perspective-[1000px]">
					<button
						type="button"
						className="relative w-full aspect-[1.6/1] max-w-[400px] cursor-pointer bg-transparent border-0 p-0 group"
						onClick={handleFlip}
					>
						<div
							className={cn(
								"relative w-full h-full transition-transform duration-500",
								"transform-3d",
								isFlipped && "transform-[rotateY(180deg)]",
							)}
						>
							{/* Front — modele configure depuis le designer d'impression */}
							<div className="absolute inset-0 w-full h-full backface-hidden rounded-xl overflow-hidden flat-card-border bg-gradient-to-br from-emerald-100 via-emerald-50 to-amber-50">
								{cardDesign ? (
									<ConsularCardCanvas
										design={cardDesign}
										face="front"
										profile={canvasProfile}
									/>
								) : (
									<ConsularCardFallback
										face="front"
										identity={identity}
										consularCard={consularCard}
										identityPhotoUrl={identityPhotoUrl}
										orgName={org?.name}
										formatDate={formatDate}
									/>
								)}

								{/* Flip hint overlay */}
								<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
									<div className="flex flex-col items-center gap-2 text-white">
										<RotateCcw className="h-6 w-6" />
										<span className="text-xs font-medium">Voir le verso</span>
									</div>
								</div>
							</div>

							{/* Back — modele configure depuis le designer d'impression */}
							<div
								className={cn(
									"absolute inset-0 w-full h-full backface-hidden transform-[rotateY(180deg)]",
									"rounded-xl overflow-hidden flat-card-border bg-gradient-to-br from-amber-50 via-emerald-50 to-emerald-100",
								)}
							>
								{cardDesign ? (
									<ConsularCardCanvas
										design={cardDesign}
										face="back"
										profile={canvasProfile}
									/>
								) : (
									<ConsularCardFallback face="back" orgName={org?.name} />
								)}

								{/* Flip hint overlay */}
								<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
									<div className="flex flex-col items-center gap-2 text-white">
										<RotateCcw className="h-6 w-6" />
										<span className="text-xs font-medium">Voir le recto</span>
									</div>
								</div>
							</div>
						</div>
					</button>
				</div>

				{/* 3. Bouton Attestation */}
				<Button asChild variant="ghost" size="sm" className="w-full h-8 px-3 text-xs font-medium text-foreground bg-muted hover:bg-muted/70 active:scale-[0.97] transition-transform rounded-full gap-2">
					<Link href="/services/attestation-carte-consulaire">
						<FileText className="h-3.5 w-3.5" />
						Attestation de Carte Consulaire
					</Link>
				</Button>
			</FlatCard>
		);
	}

	// Has expired card
	if (hasExpiredCard) {
		return (
			<FlatCard className="flex flex-col p-4 gap-3">
				<div className="flex items-center gap-2">
					<div className="p-1 rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.12]">
						<CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
					</div>
					<span className="text-sm font-medium">{t("mySpace.consularCard.title")}</span>
					<Badge variant="destructive" className="ml-auto">{t("mySpace.consularCard.expired")}</Badge>
				</div>
				<div className="flex-1 flex flex-col items-center justify-center text-center py-4 gap-3">
					<CreditCard className="h-8 w-8 text-muted-foreground/30" />
					<p className="text-xs text-muted-foreground">
						{t("mySpace.consularCard.expiredDesc")}
					</p>
					<Button asChild variant="ghost" size="sm" className="h-8 px-3 text-xs font-medium text-foreground bg-muted hover:bg-muted/70 active:scale-[0.97] transition-transform rounded-full gap-1.5">
						<Link href="/services/consular-card-registration">
							{t("mySpace.consularCard.renew")}
							<ArrowRight className="ml-1 h-3.5 w-3.5" />
						</Link>
					</Button>
				</div>
			</FlatCard>
		);
	}

	// Has pending request - check request status
	if (latestRegistration?.requestId && registrationRequest) {
		const status = registrationRequest.status;
		const isPending = ["Pending", "Processing", "Draft"].includes(status);

		if (isPending) {
			return (
				<FlatCard className="flex flex-col p-4 gap-3">
					<div className="flex items-center gap-2">
						<div className="p-1 rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.12]">
							<CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
						</div>
						<span className="text-sm font-medium">{t("mySpace.consularCard.title")}</span>
						<Badge className="ml-auto badge-warning border-transparent">
							<Clock className="h-3 w-3 mr-1" />
							{t("mySpace.consularCard.pending")}
						</Badge>
					</div>
					<div className="flex-1 flex flex-col items-center justify-center text-center py-6">
						<Clock className="h-8 w-8 mb-2 text-warning/50" />
						<p className="text-xs text-muted-foreground">
							{t("mySpace.consularCard.pendingDesc")}
						</p>
					</div>
				</FlatCard>
			);
		}
	}

	// Not a national - not eligible
	if (profile?.identity?.nationality !== CountryCode.GA) {
		return (
			<FlatCard className="flex flex-col p-4 gap-3">
				<div className="flex items-center gap-2">
					<div className="p-1 rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.12]">
						<CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
					</div>
					<span className="text-sm font-medium">{t("mySpace.consularCard.title")}</span>
				</div>
				<div className="flex-1 flex flex-col items-center justify-center text-center py-6">
					<CreditCard className="h-8 w-8 mb-2 text-muted-foreground/30" />
					<p className="text-sm text-muted-foreground">
						{t("mySpace.consularCard.notEligible")}
					</p>
				</div>
			</FlatCard>
		);
	}

	// No card, no pending request - can request
	return (
		<FlatCard className="flex flex-col p-4 gap-3">
			<div className="flex items-center gap-2">
				<div className="p-1 rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.12]">
					<CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
				</div>
				<span className="text-sm font-medium">{t("mySpace.consularCard.title")}</span>
				<Badge variant="secondary" className="ml-auto">{t("mySpace.consularCard.notIssued")}</Badge>
			</div>
			<div className="flex-1 flex flex-col items-center justify-center text-center py-4 gap-3">
				<CreditCard className="h-8 w-8 text-muted-foreground/30" />
				<p className="text-sm text-muted-foreground">
					{t("mySpace.consularCard.noCardYet")}
				</p>
				<Button asChild variant="ghost" size="sm" className="h-8 px-3 text-xs font-medium text-foreground bg-muted hover:bg-muted/70 active:scale-[0.97] transition-transform rounded-full gap-1.5">
					<Link href="/services/consular-card-registration">
						{t("mySpace.consularCard.request")}
						<ArrowRight className="ml-1 h-3.5 w-3.5" />
					</Link>
				</Button>
			</div>
		</FlatCard>
	);
}

// ─── Fallback rendu lorsque l'organisme n'a pas (encore) de modele ─────────
// Garde l'ancien layout pour eviter une carte vide si la config manque.
function ConsularCardFallback({
	face,
	identity,
	consularCard,
	identityPhotoUrl,
	orgName,
	formatDate,
}: {
	face: "front" | "back";
	identity?: Doc<"profiles">["identity"];
	consularCard?: NonNullable<Doc<"profiles">["consularCard"]>;
	identityPhotoUrl?: string | null;
	orgName?: string;
	formatDate?: (timestamp: number) => string;
}) {
	if (face === "back") {
		return (
			<div className="absolute inset-0 p-4 flex flex-col justify-center items-center">
				<div className="bg-white/95 rounded-lg p-3 text-center max-w-[80%]">
					<p className="text-[10px] text-gray-700 font-medium mb-2 leading-tight">
						Cette carte est la propriété de l'autorité consulaire émettrice
					</p>
					<p className="text-[9px] text-gray-500 leading-snug">
						En cas de perte, merci de la retourner à l'adresse de l'organisme
					</p>
					{orgName ? (
						<div className="mt-2.5 pt-2.5 border-t border-gray-200">
							<p className="text-[9px] font-bold text-gray-700 uppercase">
								{orgName}
							</p>
						</div>
					) : null}
				</div>
			</div>
		);
	}
	return (
		<div className="absolute inset-0 p-3.5 flex flex-col justify-between">
			<div className="text-center">
				<p className="text-[10px] text-gray-800/80 font-medium uppercase tracking-wider">
					République Gabonaise
				</p>
				{orgName ? (
					<p className="text-[8px] text-gray-800/60 leading-tight">{orgName}</p>
				) : null}
			</div>
			<div className="flex items-center gap-3">
				<div className="w-16 h-20 bg-white/20 rounded-md flex items-center justify-center border-2 border-white/30 shrink-0 overflow-hidden">
					{identityPhotoUrl ? (
						<img
							src={identityPhotoUrl}
							alt="Photo d'identité"
							className="w-full h-full object-cover"
						/>
					) : (
						<span className="text-gray-800/50 text-[9px] font-semibold">
							Photo
						</span>
					)}
				</div>
				<div className="flex-1 text-gray-800 space-y-0.5 text-left min-w-0">
					<p className="font-bold text-sm uppercase truncate">
						{identity?.lastName || "NOM"}
					</p>
					<p className="text-xs truncate">{identity?.firstName || "Prénom"}</p>
					{consularCard ? (
						<p className="text-[10px] font-mono text-gray-800/70 pt-0.5">
							N° {consularCard.cardNumber}
						</p>
					) : null}
				</div>
			</div>
			{consularCard && formatDate ? (
				<div className="flex justify-between text-[10px] text-gray-800/80">
					<div className="text-left">
						<p className="text-[8px] text-gray-800/50 uppercase font-semibold">
							Délivrée le
						</p>
						<p className="font-mono">{formatDate(consularCard.cardIssuedAt)}</p>
					</div>
					<div className="text-right">
						<p className="text-[8px] text-gray-800/50 uppercase font-semibold">
							Expire le
						</p>
						<p className="font-mono">
							{formatDate(consularCard.cardExpiresAt)}
						</p>
					</div>
				</div>
			) : null}
		</div>
	);
}
