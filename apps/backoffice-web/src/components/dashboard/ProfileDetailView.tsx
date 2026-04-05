"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useAction, useMutation } from "convex/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	Building2,
	CreditCard,
	MapPin,
	StickyNote,
	User,
	Wand2,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";

import { ProfileActionsCard } from "./profile/profile-actions-card";
import { ProfileChildrenCard } from "./profile/profile-children-card";
import { ProfileConsularCard } from "./profile/profile-consular-card";
import { ProfileDocumentsCard } from "./profile/profile-documents-card";
import { ProfileDossierCard } from "./profile/profile-dossier-card";
import { ProfileHeroCard } from "./profile/profile-hero-card";
import { ProfileRequestsCard } from "./profile/profile-requests-card";

// ─── Props ───────────────────────────────────────────────────
interface ProfileDetailViewProps {
	profileId: string | Id<"profiles"> | Id<"childProfiles">;
	context?: "admin" | "agent";
	canProcess?: boolean;
	canValidate?: boolean;
	canManageUser?: boolean;
}

// ─── Helpers de formatage ────────────────────────────────────
function formatDate(timestamp?: number) {
	if (!timestamp) return "\u2014";
	return format(new Date(timestamp), "dd MMMM yyyy", { locale: fr });
}

function getCountryLabel(code?: string, t?: (key: string, fallback?: string) => string) {
	if (!code || !t) return undefined;
	return t(`countryList.${code}`, code) as string;
}

// ─── Couleurs de badge statut inscription ────────────────────
function getRegStatusBadgeColor(status: string) {
	switch (status) {
		case "active":
			return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300";
		case "expired":
			return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400";
		default:
			return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300";
	}
}

// ─── Composant principal ─────────────────────────────────────
export function ProfileDetailView({
	profileId,
	context = "admin",
	canProcess: _canProcess = false,
	canValidate,
	canManageUser = false,
}: ProfileDetailViewProps) {
	const { t } = useTranslation();

	// Valeur par defaut de canValidate selon le contexte
	const resolvedCanValidate = canValidate ?? context === "admin";

	// ─── Etat pour la modale de preview document ──────────────
	const [previewDoc, setPreviewDoc] = useState<{
		storageId: string;
		filename: string;
		mimeType?: string;
	} | null>(null);

	// ─── Requetes Convex ──────────────────────────────────────
	const { data: detailData, isLoading } = useAuthenticatedConvexQuery(
		api.functions.profiles.getProfileDetail,
		{ profileId: profileId as Id<"profiles"> | Id<"childProfiles"> },
	);

	// Resolution de l'URL de la photo d'identite (chaine de requetes)
	const identityPhotoId = detailData?.profile?.documents?.identityPhoto;
	const { data: identityPhotoDoc } = useAuthenticatedConvexQuery(
		api.functions.documents.getById,
		identityPhotoId ? { documentId: identityPhotoId } : "skip",
	);

	const { data: identityPhotoUrl } = useAuthenticatedConvexQuery(
		api.functions.documents.getUrl,
		identityPhotoDoc?.files[0]?.storageId
			? { storageId: identityPhotoDoc.files[0].storageId }
			: "skip",
	);

	// ─── Actions pour le detourage photo ──────────────────────
	const [isRemovingBg, setIsRemovingBg] = useState(false);
	const removeBackgroundAction = useAction(
		api.functions.backgroundRemoval.removeBackgroundFromFile,
	);
	const generateUploadUrl = useMutation(
		api.functions.documents.generateUploadUrl,
	);
	const addFileToDoc = useMutation(api.functions.documents.addFile);
	const removeFileFromDoc = useMutation(api.functions.documents.removeFile);

	const handleRemoveBackground = async () => {
		if (!identityPhotoUrl || !identityPhotoDoc || !identityPhotoDoc.files[0])
			return;

		try {
			setIsRemovingBg(true);

			const response = await fetch(identityPhotoUrl);
			const blob = await response.blob();
			const reader = new FileReader();

			const base64Promise = new Promise<string>((resolve, reject) => {
				reader.onloadend = () =>
					resolve((reader.result as string).split(",")[1]);
				reader.onerror = reject;
			});
			reader.readAsDataURL(blob);
			const base64String = await base64Promise;

			const result = await removeBackgroundAction({
				fileBase64: base64String,
				fileName: identityPhotoDoc.files[0].filename,
			});

			if (!result.success || !result.imageUrl) {
				throw new Error(result.error || "Echec du detourage");
			}

			const uploadResponse = await fetch(result.imageUrl);
			const processedBlob = await uploadResponse.blob();
			const processedFile = new File(
				[processedBlob],
				`nobg_${identityPhotoDoc.files[0].filename.replace(/\.[^/.]+$/, "")}.png`,
				{ type: "image/png" },
			);

			const postUrl = await generateUploadUrl();
			const storageResponse = await fetch(postUrl, {
				method: "POST",
				headers: { "Content-Type": processedFile.type },
				body: processedFile,
			});

			if (!storageResponse.ok) {
				throw new Error("Echec de l'upload de la nouvelle image");
			}

			const { storageId } = await storageResponse.json();
			const oldStorageId = identityPhotoDoc.files[0].storageId;

			await addFileToDoc({
				documentId: identityPhotoDoc._id,
				storageId: storageId,
				filename: processedFile.name,
				mimeType: processedFile.type,
				sizeBytes: processedFile.size,
			});

			await removeFileFromDoc({
				documentId: identityPhotoDoc._id,
				storageId: oldStorageId,
			});

			toast.success("L'arriere-plan a ete supprime avec succes.");
		} catch (error) {
			console.error("Error removing background:", error);
			toast.error(
				"Impossible de supprimer l'arriere-plan. Verifiez la cle API Remove.bg.",
			);
		} finally {
			setIsRemovingBg(false);
		}
	};

	// ─── Etat de chargement ───────────────────────────────────
	if (isLoading) {
		return <ProfileDashboardSkeleton />;
	}

	// ─── Profil introuvable ───────────────────────────────────
	if (!detailData || !detailData.profile) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
				<User className="h-16 w-16 mb-4 opacity-20" />
				<h2 className="text-xl font-semibold mb-2">
					{t("profile.notFound.title")}
				</h2>
				<p>{t("profile.notFound.description")}</p>
			</div>
		);
	}

	// ─── Extraction des donnees ──────────────────────────────
	const {
		profile,
		user,
		children = [],
		documents = [],
		requests = [],
		registrations = [],
		representations = [],
	} = detailData as any;

	const completionScore = (profile as any).completionScore ?? 0;

	// ─── Chemin de base selon le contexte ─────────────────────
	const basePath = context === "agent" ? "/agent/profiles" : "/admin/profiles";
	const requestsBasePath =
		context === "agent" ? "/agent/requests" : "/admin/requests";

	// ─── Rendu principal : grille 3 colonnes ──────────────────
	return (
		<div className="w-full pb-12">
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
				{/* ── Colonne 1 : Hero, Actions, Enfants ────────────── */}
				<div className="lg:col-span-3 space-y-4">
					<ProfileHeroCard
						profile={profile}
						user={user}
						identityPhotoUrl={identityPhotoUrl}
						registrations={registrations}
						completionScore={completionScore}
					/>

					{/* Bouton detourage photo (si photo disponible) */}
					{identityPhotoUrl && (
						<Card className="border-border/50">
							<CardContent className="p-3">
								<Button
									onClick={handleRemoveBackground}
									disabled={isRemovingBg}
									variant="secondary"
									size="sm"
									className="w-full"
								>
									{isRemovingBg ? (
										<span className="animate-pulse">Detourage en cours...</span>
									) : (
										<>
											<Wand2 className="h-4 w-4 mr-2" />
											Detourer la photo (IA)
										</>
									)}
								</Button>
							</CardContent>
						</Card>
					)}

					<ProfileActionsCard
						context={context}
						user={user}
						profileId={profileId as string}
						canManageUser={canManageUser}
					/>

					{children.length > 0 && (
						<ProfileChildrenCard
							children={children}
							basePath={basePath}
						/>
					)}
				</div>

				{/* ── Colonne 2 : Dossier, Representations, Demandes, Adresses ── */}
				<div className="lg:col-span-5 space-y-4">
					<ProfileDossierCard profile={profile} />

					{/* Representations diplomatiques */}
					{representations && representations.length > 0 && (
						<Card className="border-border/50">
							<CardHeader className="pb-2 pt-3 px-4">
								<CardTitle className="text-sm font-semibold flex items-center gap-2">
									<Building2 className="h-4 w-4 text-primary" />
									Representations diplomatiques
								</CardTitle>
							</CardHeader>
							<CardContent className="px-4 pb-4 pt-0">
								<div className="space-y-2">
									{(representations as any[]).map(
										(rep: { name: string; type: string; country: string; slug: string }, idx: number) => (
											<div
												key={rep.slug || idx}
												className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2"
											>
												<div className="min-w-0 flex-1">
													<p className="text-sm font-medium truncate">
														{rep.name}
													</p>
													<p className="text-xs text-muted-foreground">
														{rep.type
															?.replace(/_/g, " ")
															.replace(/\b\w/g, (c: string) => c.toUpperCase())}
													</p>
												</div>
												<Badge variant="outline" className="ml-2 text-xs shrink-0">
													{rep.country}
												</Badge>
											</div>
										),
									)}
								</div>
							</CardContent>
						</Card>
					)}

					<ProfileRequestsCard
						requests={requests}
						context={context}
						basePath={requestsBasePath}
					/>

					{/* Adresses */}
					{(profile.addresses?.residence || profile.addresses?.homeland) && (
						<Card className="border-border/50">
							<CardHeader className="pb-2 pt-3 px-4">
								<CardTitle className="text-sm font-semibold flex items-center gap-2">
									<MapPin className="h-4 w-4 text-primary" />
									Adresses
								</CardTitle>
							</CardHeader>
							<CardContent className="px-4 pb-4 pt-0 space-y-3">
								{profile.addresses?.residence && (
									<div className="rounded-lg border border-dashed bg-muted/30 p-3">
										<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
											{t("profile.sections.addressAbroad")}
										</p>
										<p className="text-sm">
											{[
												profile.addresses.residence.street,
												profile.addresses.residence.postalCode,
												profile.addresses.residence.city,
												getCountryLabel(
													profile.addresses.residence.country,
													t as any,
												),
											]
												.filter(Boolean)
												.join(", ")}
										</p>
									</div>
								)}
								{profile.addresses?.homeland && (
									<div className="rounded-lg border border-dashed bg-muted/30 p-3">
										<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
											{t("profile.sections.addressHome")}
										</p>
										<p className="text-sm">
											{[
												profile.addresses.homeland.street,
												profile.addresses.homeland.city,
												getCountryLabel(
													profile.addresses.homeland.country,
													t as any,
												),
											]
												.filter(Boolean)
												.join(", ")}
										</p>
									</div>
								)}
							</CardContent>
						</Card>
					)}
				</div>

				{/* ── Colonne 3 : Consulaire, Documents, Inscriptions, Notes ── */}
				<div className="lg:col-span-4 space-y-4">
					<ProfileConsularCard
						registrations={registrations}
						profile={profile}
						identityPhotoUrl={identityPhotoUrl}
					/>

					<ProfileDocumentsCard
						documents={documents}
						canValidate={resolvedCanValidate}
						onPreview={(doc: any) => {
							const firstFile = doc.files?.[0];
							if (firstFile?.storageId) {
								setPreviewDoc({
									storageId: firstFile.storageId,
									filename:
										firstFile.filename || doc.label || "Document",
									mimeType: firstFile.mimeType,
								});
							}
						}}
					/>

					{/* Inscriptions consulaires */}
					{registrations.length > 0 && (
						<Card className="border-border/50">
							<CardHeader className="pb-2 pt-3 px-4">
								<CardTitle className="text-sm font-semibold flex items-center gap-2">
									<CreditCard className="h-4 w-4 text-primary" />
									Inscriptions
									<Badge variant="secondary" className="ml-auto text-xs">
										{registrations.length}
									</Badge>
								</CardTitle>
							</CardHeader>
							<CardContent className="px-4 pb-4 pt-0 space-y-2">
								{registrations.map((reg: any) => (
									<div
										key={reg._id}
										className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2"
									>
										<div className="min-w-0 flex-1">
											<p className="text-sm font-medium">
												{
													t(
														`enums.registrationType.${reg.type}`,
														reg.type,
													) as string
												}
											</p>
											<p className="text-xs text-muted-foreground">
												{reg.cardNumber
													? `N ${reg.cardNumber}`
													: t("profile.registrations.pendingIssuance")}
												{" \u00B7 "}
												{t("profile.registrations.expiresAt")}:{" "}
												{formatDate(reg.expiresAt)}
											</p>
										</div>
										<Badge
											variant="outline"
											className={getRegStatusBadgeColor(reg.status)}
										>
											{String(
												t(
													`enums.registrationStatus.${reg.status}`,
													reg.status,
												),
											)}
										</Badge>
									</div>
								))}
							</CardContent>
						</Card>
					)}

					{/* Notes (contexte agent uniquement) */}
					{context === "agent" && (
						<Card className="border-border/50">
							<CardHeader className="pb-2 pt-3 px-4">
								<CardTitle className="text-sm font-semibold flex items-center gap-2">
									<StickyNote className="h-4 w-4 text-primary" />
									Notes internes
								</CardTitle>
							</CardHeader>
							<CardContent className="px-4 pb-4 pt-0">
								<p className="text-sm text-muted-foreground italic">
									Aucune note pour ce profil.
								</p>
							</CardContent>
						</Card>
					)}
				</div>
			</div>

			{/* Modale de preview document */}
			{previewDoc && (
				<DocumentPreviewModal
					open={!!previewDoc}
					onOpenChange={(open) => {
						if (!open) setPreviewDoc(null);
					}}
					storageId={previewDoc.storageId}
					filename={previewDoc.filename}
					mimeType={previewDoc.mimeType}
				/>
			)}
		</div>
	);
}

// ─── Skeleton de chargement : grille 3 colonnes ──────────────
function ProfileDashboardSkeleton() {
	return (
		<div className="w-full">
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
				{/* Colonne 1 */}
				<div className="lg:col-span-3 space-y-4">
					<Skeleton className="h-64 w-full rounded-xl" />
					<Skeleton className="h-48 w-full rounded-xl" />
					<Skeleton className="h-32 w-full rounded-xl" />
				</div>
				{/* Colonne 2 */}
				<div className="lg:col-span-5 space-y-4">
					<Skeleton className="h-80 w-full rounded-xl" />
					<Skeleton className="h-56 w-full rounded-xl" />
					<Skeleton className="h-40 w-full rounded-xl" />
				</div>
				{/* Colonne 3 */}
				<div className="lg:col-span-4 space-y-4">
					<Skeleton className="h-52 w-full rounded-xl" />
					<Skeleton className="h-64 w-full rounded-xl" />
					<Skeleton className="h-36 w-full rounded-xl" />
				</div>
			</div>
		</div>
	);
}
