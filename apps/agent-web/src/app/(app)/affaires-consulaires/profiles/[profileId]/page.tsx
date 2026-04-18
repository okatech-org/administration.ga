"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import {
	ArrowLeft,
	AlertCircle,
	LockKeyhole,
	MessageSquare,
	CreditCard,
	Building2,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useOrg } from "@/components/org/org-provider";
import { useCanDoTask } from "@/hooks/useCanDoTask";
import { ProfileHeroCard } from "@/components/dashboard/profile/profile-hero-card";
import { ProfileConsularCard } from "@/components/dashboard/profile/profile-consular-card";
import { ProfileDocumentsCard } from "@/components/dashboard/profile/profile-documents-card";
import { ProfileRequestsCard } from "@/components/dashboard/profile/profile-requests-card";
import { ProfileChildrenCard } from "@/components/dashboard/profile/profile-children-card";
import { CitizenDossierSections } from "@/components/dashboard/profile/citizen-dossier-sections";
import { ProfileNotesPanel } from "@/components/dashboard/profile/profile-notes-panel";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/my-space/flat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";

export default function AgentProfileDetailPage() {
	const { profileId } = useParams();
	const router = useRouter();
	const { activeOrgId } = useOrg();
	const { canDo } = useCanDoTask(activeOrgId ?? undefined);

	const [previewDoc, setPreviewDoc] = useState<{
		storageId: string;
		filename: string;
		mimeType?: string;
	} | null>(null);

	const { data: detailData, isLoading } = useAuthenticatedConvexQuery(
		api.functions.profiles.getProfileDetail,
		{ profileId: profileId as Id<"profiles"> | Id<"childProfiles"> },
	);

	const identityPhotoId = (detailData as any)?.profile?.documents?.identityPhoto;
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

	if (!canDo("profiles.view")) {
		return (
			<div className="flex flex-col items-center justify-center py-20 gap-4 text-center p-6">
				<div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
					<LockKeyhole className="h-8 w-8 text-destructive/60" />
				</div>
				<div>
					<h2 className="text-lg font-semibold">Acces restreint</h2>
					<p className="text-sm text-muted-foreground mt-1">
						Vous n'avez pas les permissions necessaires pour acceder aux profils citoyens.
					</p>
				</div>
				<Button variant="outline" onClick={() => router.push("/affaires-consulaires")}>
					Retour
				</Button>
			</div>
		);
	}

	if (isLoading) {
		return <AgentProfileSkeleton />;
	}

	if (!detailData?.profile) {
		return (
			<div className="flex flex-col items-center justify-center py-20 gap-4 text-center p-6">
				<div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
					<AlertCircle className="h-8 w-8 text-muted-foreground/40" />
				</div>
				<div>
					<h2 className="text-lg font-semibold">Profil introuvable</h2>
					<p className="text-sm text-muted-foreground mt-1">
						Ce profil n'existe pas ou vous n'y avez pas acces.
					</p>
				</div>
				<Button variant="outline" onClick={() => router.push("/affaires-consulaires/profiles")}>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Retour aux profils
				</Button>
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

	const firstName = profile.identity?.firstName || "";
	const lastName = profile.identity?.lastName || "";
	const fullName = `${firstName} ${lastName}`.trim() || "Nom inconnu";

	return (
		<div className="flex flex-1 flex-col gap-0 w-full">
			<motion.div
				initial={{ opacity: 0, y: -8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2 }}
				className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10"
			>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => router.push("/affaires-consulaires/profiles")}
					className="gap-2 text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="h-4 w-4" />
					Profils Citoyens
				</Button>
				<div className="text-muted-foreground/40">/</div>
				<span className="text-sm font-medium truncate">{fullName}</span>
			</motion.div>

			<div className="flex flex-col gap-6 p-4 md:p-6 w-full">
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
					{/* Colonne gauche : Hero + carte consulaire + enfants */}
					<motion.aside
						initial={{ opacity: 0, x: -8 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.2 }}
						className="lg:col-span-4 xl:col-span-3 space-y-4"
					>
						<ProfileHeroCard
							profile={profile}
							user={user}
							identityPhotoUrl={identityPhotoUrl}
							registrations={registrations}
							completionScore={completionScore}
						/>

						<ProfileConsularCard
							registrations={registrations}
							profile={profile}
							identityPhotoUrl={identityPhotoUrl}
						/>

						{children.length > 0 && (
							<ProfileChildrenCard
								children={children}
								basePath="/affaires-consulaires/profiles"
							/>
						)}
					</motion.aside>

					{/* Colonne centrale : dossier citoyen complet */}
					<motion.section
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.2, delay: 0.05 }}
						className="lg:col-span-8 xl:col-span-6 space-y-4"
					>
						<CitizenDossierSections profile={profile} />

						{representations && representations.length > 0 && (
							<FlatCard>
								<div className="flex items-center gap-2.5 rounded-t-xl bg-muted/40 px-4 py-3 border-b border-border/50">
									<div className="rounded-md bg-primary/10 p-1.5">
										<Building2 className="h-3.5 w-3.5 text-primary" />
									</div>
									<span className="text-base font-bold">
										Representations diplomatiques
									</span>
								</div>
								<div className="p-4 space-y-2">
									{(representations as any[]).map((rep, idx) => (
										<div
											key={rep.slug || idx}
											className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2.5"
										>
											<div className="min-w-0 flex-1">
												<p className="text-sm font-semibold truncate">
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
									))}
								</div>
							</FlatCard>
						)}
					</motion.section>

					{/* Colonne droite : Documents + Demandes + Inscriptions */}
					<motion.aside
						initial={{ opacity: 0, x: 8 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.2, delay: 0.1 }}
						className="lg:col-span-12 xl:col-span-3 space-y-4"
					>
						<ProfileDocumentsCard
							documents={documents}
							canValidate={canDo("requests.process")}
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

						<ProfileRequestsCard
							requests={requests}
							context="agent"
							basePath="/requests"
						/>

						{registrations.length > 0 && (
							<FlatCard>
								<div className="flex items-center gap-2.5 rounded-t-xl bg-muted/40 px-4 py-3 border-b border-border/50">
									<div className="rounded-md bg-primary/10 p-1.5">
										<CreditCard className="h-3.5 w-3.5 text-primary" />
									</div>
									<span className="text-base font-bold">Inscriptions</span>
									<Badge variant="secondary" className="ml-auto text-xs">
										{registrations.length}
									</Badge>
								</div>
								<div className="p-4 space-y-2">
									{registrations.map((reg: any) => (
										<div
											key={reg._id}
											className="rounded-lg bg-background/60 p-3"
										>
											<div className="flex items-center justify-between gap-2">
												<p className="text-sm font-semibold truncate">
													{reg.type ?? "Inscription"}
												</p>
												<Badge
													variant="outline"
													className="text-xs shrink-0"
												>
													{reg.status ?? "—"}
												</Badge>
											</div>
											{reg.cardNumber && (
												<p className="text-xs font-mono text-muted-foreground mt-1">
													N {reg.cardNumber}
												</p>
											)}
										</div>
									))}
								</div>
							</FlatCard>
						)}
					</motion.aside>
				</div>

				{canDo("requests.process") && (
					<motion.div
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.2, delay: 0.15 }}
						className="flex flex-col gap-3"
					>
						<div className="flex items-center gap-2">
							<MessageSquare className="h-4 w-4 text-primary" />
							<h2 className="text-sm font-semibold uppercase tracking-wider">
								Notes internes
							</h2>
						</div>
						<ProfileNotesPanel profileId={profileId as string} />
					</motion.div>
				)}
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

function AgentProfileSkeleton() {
	return (
		<div className="flex flex-col gap-6 p-4 md:p-6 w-full">
			<div className="flex items-center gap-3 pb-3 border-b border-border/50">
				<Skeleton className="h-8 w-32" />
				<Skeleton className="h-4 w-4 rounded-full" />
				<Skeleton className="h-4 w-48" />
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
				<div className="lg:col-span-4 xl:col-span-3 space-y-4">
					<Skeleton className="h-64 w-full rounded-xl" />
					<Skeleton className="h-52 w-full rounded-xl" />
				</div>
				<div className="lg:col-span-8 xl:col-span-6 space-y-4">
					<Skeleton className="h-64 w-full rounded-xl" />
					<Skeleton className="h-52 w-full rounded-xl" />
					<Skeleton className="h-40 w-full rounded-xl" />
				</div>
				<div className="lg:col-span-12 xl:col-span-3 space-y-4">
					<Skeleton className="h-64 w-full rounded-xl" />
					<Skeleton className="h-48 w-full rounded-xl" />
				</div>
			</div>
		</div>
	);
}
