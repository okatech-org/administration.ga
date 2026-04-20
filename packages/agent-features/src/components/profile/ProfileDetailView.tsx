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
	User,
	Wand2,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DocumentPreviewModal } from "../documents/document-preview-modal";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { FlatCard } from "../my-space/flat-card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";

import { ProfileChildrenCard } from "./profile-children-card";
import { ProfileConsularCard } from "./profile-consular-card";
import { ProfileDocumentsCard } from "./profile-documents-card";
import { ProfileDossierCard } from "./profile-dossier-card";
import { ProfileHeroCard } from "./profile-hero-card";
import { ProfileRequestsCard } from "./profile-requests-card";

interface ProfileDetailViewProps {
	profileId: string | Id<"profiles"> | Id<"childProfiles">;
	context?: "admin" | "agent";
	canProcess?: boolean;
	canValidate?: boolean;
	canManageUser?: boolean;
}

function formatDate(timestamp?: number) {
	if (!timestamp) return "\u2014";
	return format(new Date(timestamp), "dd MMMM yyyy", { locale: fr });
}

function getCountryLabel(
	code?: string,
	t?: (key: string, fallback?: string) => string,
) {
	if (!code || !t) return undefined;
	return t(`countryList.${code}`, code) as string;
}

function getRegStatusBadgeClass(status: string) {
	switch (status) {
		case "active":
			return "bg-success-light text-success border-success/20";
		case "expired":
			return "bg-muted text-muted-foreground border-border";
		default:
			return "bg-warning-light text-warning border-warning/20";
	}
}

export function ProfileDetailView({
	profileId,
	context = "agent",
	canValidate,
}: ProfileDetailViewProps) {
	const { t } = useTranslation();

	const resolvedCanValidate = canValidate ?? context === "admin";

	const [previewDoc, setPreviewDoc] = useState<{
		storageId: string;
		filename: string;
		mimeType?: string;
	} | null>(null);

	const { data: detailData, isLoading } = useAuthenticatedConvexQuery(
		api.functions.profiles.getProfileDetail,
		{ profileId: profileId as Id<"profiles"> | Id<"childProfiles"> },
	);

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

	if (isLoading) {
		return <ProfileDashboardSkeleton />;
	}

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

	const basePath =
		context === "agent"
			? "/affaires-consulaires/profiles"
			: "/admin/profiles";
	const requestsBasePath =
		context === "agent" ? "/requests" : "/admin/requests";

	return (
		<div className="w-full pb-12">
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
				{/* Colonne 1 : Hero, Detourage, Enfants */}
				<div className="lg:col-span-3 space-y-4">
					<ProfileHeroCard
						profile={profile}
						user={user}
						identityPhotoUrl={identityPhotoUrl}
						registrations={registrations}
						completionScore={completionScore}
					/>

					{identityPhotoUrl && (
						<FlatCard>
							<div className="p-3 lg:p-4">
								<Button
									onClick={handleRemoveBackground}
									disabled={isRemovingBg}
									variant="secondary"
									size="sm"
									className="w-full active:scale-[0.97] transition-transform"
								>
									{isRemovingBg ? (
										<span className="animate-pulse">
											Detourage en cours...
										</span>
									) : (
										<>
											<Wand2 className="h-4 w-4 mr-2" />
											Detourer la photo (IA)
										</>
									)}
								</Button>
							</div>
						</FlatCard>
					)}

					{children.length > 0 && (
						<ProfileChildrenCard children={children} basePath={basePath} />
					)}
				</div>

				{/* Colonne 2 : Dossier, Representations, Demandes */}
				<div className="lg:col-span-5 space-y-4">
					<ProfileDossierCard profile={profile} />

					{representations && representations.length > 0 && (
						<FlatCard>
							<div className="pb-2 pt-3 px-4">
								<div className="text-sm font-semibold flex items-center gap-2">
									<Building2 className="h-4 w-4 text-primary" />
									Representations diplomatiques
								</div>
							</div>
							<div className="px-4 pb-4 pt-0">
								<div className="space-y-2">
									{(representations as any[]).map(
										(
											rep: {
												name: string;
												type: string;
												country: string;
												slug: string;
											},
											idx: number,
										) => (
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
															.replace(/\b\w/g, (c: string) =>
																c.toUpperCase(),
															)}
													</p>
												</div>
												<Badge
													variant="outline"
													className="ml-2 text-xs shrink-0"
												>
													{rep.country}
												</Badge>
											</div>
										),
									)}
								</div>
							</div>
						</FlatCard>
					)}

					<ProfileRequestsCard
						requests={requests}
						context={context}
						basePath={requestsBasePath}
					/>
				</div>

				{/* Colonne 3 : Carte Consulaire, Documents, Inscriptions */}
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

					{registrations.length > 0 && (
						<FlatCard>
							<div className="pb-2 pt-3 px-4">
								<div className="text-sm font-semibold flex items-center gap-2">
									<CreditCard className="h-4 w-4 text-primary" />
									Inscriptions
									<Badge variant="secondary" className="ml-auto text-xs">
										{registrations.length}
									</Badge>
								</div>
							</div>
							<div className="px-4 pb-4 pt-0 space-y-2">
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
											className={getRegStatusBadgeClass(reg.status)}
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
							</div>
						</FlatCard>
					)}

					{/* Adresses complémentaires (affiche la résidence uniquement si différente de la carte hero, et l'adresse pays d'origine) */}
					{profile.addresses?.homeland && (
						<FlatCard>
							<div className="pb-2 pt-3 px-4">
								<div className="text-sm font-semibold flex items-center gap-2">
									<MapPin className="h-4 w-4 text-primary" />
									Adresse au Gabon
								</div>
							</div>
							<div className="px-4 pb-4 pt-0">
								<div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
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
							</div>
						</FlatCard>
					)}
				</div>
			</div>

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

function ProfileDashboardSkeleton() {
	return (
		<div className="w-full">
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
				<div className="lg:col-span-3 space-y-4">
					<Skeleton className="h-64 w-full rounded-xl" />
					<Skeleton className="h-48 w-full rounded-xl" />
				</div>
				<div className="lg:col-span-5 space-y-4">
					<Skeleton className="h-80 w-full rounded-xl" />
					<Skeleton className="h-56 w-full rounded-xl" />
				</div>
				<div className="lg:col-span-4 space-y-4">
					<Skeleton className="h-52 w-full rounded-xl" />
					<Skeleton className="h-64 w-full rounded-xl" />
				</div>
			</div>
		</div>
	);
}
