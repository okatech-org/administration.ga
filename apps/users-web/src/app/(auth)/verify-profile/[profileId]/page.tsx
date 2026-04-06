"use client";

import { api } from "@convex/_generated/api";
import { useParams } from "next/navigation";
import {
	BadgeCheck,
	Calendar,
	CheckCircle2,
	Lock,
	Shield,
	User,
	XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConvexQuery } from "@/integrations/convex/hooks";

export default function VerifyProfilePage() {
	const params = useParams<{ profileId: string }>();
	const profileId = params.profileId;

	const { data: record } = useConvexQuery(
		api.functions.profiles.verifyByIdentifier,
		{
			identifier: profileId as string,
		},
	);

	if (record === undefined) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardContent className="pt-6">
						<div className="flex items-center justify-center">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
						</div>
						<p className="text-center text-muted-foreground mt-4">
							Verification en cours...
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!record || !record.found || record.type === "unknown") {
		return (
			<div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
				<Card className="w-full max-w-md border-2 border-red-500">
					<CardHeader className="pb-3 text-center">
						<XCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
						<CardTitle className="text-xl text-red-700 dark:text-red-400">
							Document introuvable
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-center text-muted-foreground">
							Ce document consulaire ou ce profil n'existe pas dans nos
							registres ou n'est plus valide.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	let isValid = false;
	let isExpired = false;
	let documentTypeLabel = "Document Consulaire";
	let displayId = "";

	if (record.type === "registration") {
		documentTypeLabel = "Carte Consulaire";
		isExpired = !!record.isExpired;
		isValid = !isExpired && record.status === "active";
		displayId = record.identifier as string;
	} else if (record.type === "legacy") {
		documentTypeLabel = "Carte Consulaire (Systeme precedent)";
		isExpired = record.consularCard
			? record.consularCard.cardExpiresAt < Date.now()
			: true;
		isValid = !!record.consularCard && !isExpired;
		displayId = record.consularCard?.cardNumber || "";
	} else if (record.type === "notification") {
		documentTypeLabel = "Signalement Consulaire";
		const rec = record as any;
		const stayEnd = rec.stayEndDate as number | undefined;
		const hasStayEnded = stayEnd ? stayEnd < Date.now() : false;
		isExpired = rec.status === "expired" || hasStayEnded;
		isValid = rec.status === "active" && !isExpired;
		displayId = rec.identifier as string;
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
			<div className="w-full max-w-md space-y-4">
				{/* Header */}
				<div className="text-center">
					<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
						<Shield className="h-8 w-8 text-primary" />
					</div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
						Consulat du Gabon
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Verification de Document Consulaire
					</p>
				</div>

				{/* Result Card */}
				<Card
					className={`border-2 ${!isValid ? "border-red-500" : "border-green-500"}`}
				>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								{isValid ? (
									<>
										<CheckCircle2 className="h-6 w-6 text-green-500" />
										<span className="text-green-700 dark:text-green-400 text-lg">
											Valide
										</span>
									</>
								) : (
									<>
										<XCircle className="h-6 w-6 text-red-500" />
										<span className="text-red-700 dark:text-red-400 text-lg">
											{isExpired ? "Expire" : "Invalide / Introuvable"}
										</span>
									</>
								)}
							</div>
							{record.authorized && (
								<Badge
									variant="secondary"
									className="bg-primary/10 text-primary"
								>
									Vue Securisee Admin
								</Badge>
							)}
						</CardTitle>
					</CardHeader>

					<CardContent className="space-y-6">
						{/* Profile Photo & Basic Info */}
						<div className="flex items-center gap-4">
							<div className="w-20 h-24 bg-muted rounded-md overflow-hidden border border-border flex-shrink-0 flex items-center justify-center">
								{record.photoUrl ? (
									<img
										src={record.photoUrl}
										alt=""
										className="w-full h-full object-cover"
									/>
								) : (
									<User className="h-8 w-8 text-muted-foreground" />
								)}
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-xs text-muted-foreground font-semibold uppercase mb-1">
									{documentTypeLabel}
								</p>
								<h3 className="font-bold text-lg uppercase truncate">
									{record.identity?.lastName || "\u2014"}
								</h3>
								<p className="text-md font-medium text-gray-700 dark:text-gray-300 truncate">
									{record.identity?.firstName || "\u2014"}
								</p>
								{displayId && (
									<p className="text-sm text-muted-foreground mt-1 font-mono">
										N\u00b0 {displayId}
									</p>
								)}
							</div>
						</div>

						{/* Dates */}
						{record.type === "registration" && record.cardIssuedAt && (
							<div className="grid grid-cols-2 gap-4 pt-4 border-t">
								<div>
									<p className="text-xs text-muted-foreground flex items-center gap-1">
										<Calendar className="h-3 w-3" /> Delivree le
									</p>
									<p className="font-medium mt-1">
										{new Date(record.cardIssuedAt).toLocaleDateString("fr-FR")}
									</p>
								</div>
								<div className="text-right">
									<p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
										<Calendar className="h-3 w-3" /> Expire le
									</p>
									<p
										className={`font-medium mt-1 ${isExpired ? "text-red-600 dark:text-red-400" : ""}`}
									>
										{record.cardExpiresAt
											? new Date(record.cardExpiresAt).toLocaleDateString(
													"fr-FR",
												)
											: "\u2014"}
									</p>
								</div>
							</div>
						)}

						{record.type === "legacy" && record.consularCard && (
							<div className="grid grid-cols-2 gap-4 pt-4 border-t">
								<div>
									<p className="text-xs text-muted-foreground flex items-center gap-1">
										<Calendar className="h-3 w-3" /> Delivree le
									</p>
									<p className="font-medium mt-1">
										{new Date(
											record.consularCard.cardIssuedAt,
										).toLocaleDateString("fr-FR")}
									</p>
								</div>
								<div className="text-right">
									<p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
										<Calendar className="h-3 w-3" /> Expire le
									</p>
									<p
										className={`font-medium mt-1 ${isExpired ? "text-red-600 dark:text-red-400" : ""}`}
									>
										{new Date(
											record.consularCard.cardExpiresAt,
										).toLocaleDateString("fr-FR")}
									</p>
								</div>
							</div>
						)}

						{record.type === "notification" && (
							<div className="grid grid-cols-2 gap-4 pt-4 border-t">
								<div>
									<p className="text-xs text-muted-foreground flex items-center gap-1">
										<Calendar className="h-3 w-3" /> Arrivee
									</p>
									<p className="font-medium mt-1">
										{(record as any).stayStartDate
											? new Date((record as any).stayStartDate).toLocaleDateString(
													"fr-FR",
												)
											: "\u2014"}
									</p>
								</div>
								<div className="text-right">
									<p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
										<Calendar className="h-3 w-3" /> Depart
									</p>
									<p
										className={`font-medium mt-1 ${isExpired ? "text-red-600 dark:text-red-400" : ""}`}
									>
										{(record as any).stayEndDate
											? new Date((record as any).stayEndDate).toLocaleDateString("fr-FR")
											: "\u2014"}
									</p>
								</div>
							</div>
						)}

						{/* Admin detailed view */}
						{!record.authorized ? (
							<div className="pt-4 border-t flex items-center justify-center gap-2 text-sm text-muted-foreground">
								<Lock className="h-4 w-4" />
								Details masques au public
							</div>
						) : (
							<div className="pt-4 border-t space-y-3">
								<h4 className="text-sm font-semibold flex items-center gap-2">
									<BadgeCheck className="h-4 w-4 text-primary" /> Details
									Consulaires
								</h4>
								<div className="text-sm grid grid-cols-2 gap-2">
									{(record as any).fullIdentity?.gender && (
										<div>
											<p className="text-xs text-muted-foreground">Sexe</p>
											<p>{(record as any).fullIdentity.gender}</p>
										</div>
									)}
									{(record as any).fullIdentity?.birthDate && (
										<div>
											<p className="text-xs text-muted-foreground">
												Date de naissance
											</p>
											<p>
												{new Date(
													(record as any).fullIdentity.birthDate,
												).toLocaleDateString("fr-FR")}
											</p>
										</div>
									)}
									{(record as any).fullIdentity?.birthPlace && (
										<div className="col-span-2">
											<p className="text-xs text-muted-foreground">
												Lieu de naissance
											</p>
											<p>{(record as any).fullIdentity.birthPlace}</p>
										</div>
									)}
									{(record as any).passportInfo?.number && (
										<div className="col-span-2">
											<p className="text-xs text-muted-foreground">
												Passeport / Piece
											</p>
											<p>
												{(record as any).passportInfo.number}
												{(record as any).passportInfo.expiryDate &&
													` (Exp. ${new Date((record as any).passportInfo.expiryDate).toLocaleDateString("fr-FR")})`}
											</p>
										</div>
									)}
									{record.type === "notification" &&
										(record as any).fullIdentity?.nationality && (
											<div className="col-span-2">
												<p className="text-xs text-muted-foreground">
													Nationalite
												</p>
												<p>{(record as any).fullIdentity.nationality}</p>
											</div>
										)}
								</div>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Footer */}
				<div className="text-center text-xs text-muted-foreground">
					<p>
						Ce service de verification est fourni par le Consulat General du
						Gabon.
					</p>
				</div>
			</div>
		</div>
	);
}
