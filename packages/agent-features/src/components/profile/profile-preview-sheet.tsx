"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Link } from "@workspace/routing";
import {
	ArrowUpRight,
	ClipboardList,
	FileBadge2,
	FileText,
	MessageSquare,
	User,
} from "lucide-react";
import { useState } from "react";

import { BottomSheet } from "@workspace/ui/components/bottom-sheet";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";

import { ProfileDocumentsCard } from "./profile-documents-card";
import { ProfileDossierCard } from "./profile-dossier-card";
import { ProfileHeroCard } from "./profile-hero-card";
import { ProfileNotesPanel } from "./profile-notes-panel";
import { ProfileRequestsCard } from "./profile-requests-card";

export interface ProfilePreviewSheetProps {
	profileId: string | Id<"profiles"> | Id<"childProfiles"> | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ProfilePreviewSheet({
	profileId,
	open,
	onOpenChange,
}: ProfilePreviewSheetProps) {
	const [tab, setTab] = useState("dossier");

	const { data: detailData, isLoading } = useAuthenticatedConvexQuery(
		api.functions.profiles.getProfileDetail,
		profileId
			? { profileId: profileId as Id<"profiles"> | Id<"childProfiles"> }
			: "skip",
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

	const profile = detailData?.profile as any;
	const user = (detailData as any)?.user;
	const requests = ((detailData as any)?.requests ?? []) as any[];
	const registrations = ((detailData as any)?.registrations ?? []) as any[];
	const documents = ((detailData as any)?.documents ?? []) as any[];
	const completionScore = profile?.completionScore ?? 0;

	const firstName = profile?.identity?.firstName ?? "";
	const lastName = profile?.identity?.lastName ?? "";
	const fullName = `${firstName} ${lastName}`.trim() || "Profil";

	const title = isLoading ? "Chargement du profil\u2026" : `Profil de ${fullName}`;

	const footer = profileId ? (
		<div className="flex justify-end">
			<Button asChild variant="default" size="sm" className="gap-2">
				<Link href={`/affaires-consulaires/profiles/${profileId}` as any}>
					Ouvrir le dossier complet
					<ArrowUpRight className="h-3.5 w-3.5" />
				</Link>
			</Button>
		</div>
	) : undefined;

	return (
		<BottomSheet
			open={open}
			onOpenChange={onOpenChange}
			title={title}
			icon={<User className="h-4 w-4 text-primary" />}
			footer={footer}
			maxWidthClass="max-w-4xl"
			maxHeight="90vh"
		>
			{isLoading || !profile ? (
				<div className="p-4 md:p-5 space-y-4">
					<Skeleton className="h-40 w-full rounded-xl" />
					<Skeleton className="h-10 w-full rounded-lg" />
					<Skeleton className="h-64 w-full rounded-xl" />
				</div>
			) : (
				<div className="p-4 md:p-5 space-y-4">
					<ProfileHeroCard
						profile={profile}
						user={user}
						identityPhotoUrl={identityPhotoUrl}
						registrations={registrations}
						completionScore={completionScore}
					/>

					<Tabs value={tab} onValueChange={setTab} className="w-full">
						<TabsList className="w-full justify-start h-10 bg-transparent border-b rounded-none p-0 overflow-x-auto overflow-y-hidden mb-3">
							<TabsTrigger
								value="dossier"
								className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-10 px-4 text-xs"
							>
								<FileBadge2 className="h-3.5 w-3.5 mr-1.5" />
								Dossier
							</TabsTrigger>
							<TabsTrigger
								value="requests"
								className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-10 px-4 text-xs"
							>
								<ClipboardList className="h-3.5 w-3.5 mr-1.5" />
								Demandes
								{requests.length > 0 && (
									<span className="ml-1.5 text-xs text-muted-foreground">
										({requests.length})
									</span>
								)}
							</TabsTrigger>
							<TabsTrigger
								value="documents"
								className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-10 px-4 text-xs"
							>
								<FileText className="h-3.5 w-3.5 mr-1.5" />
								Documents
								{documents.length > 0 && (
									<span className="ml-1.5 text-xs text-muted-foreground">
										({documents.length})
									</span>
								)}
							</TabsTrigger>
							<TabsTrigger
								value="notes"
								className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-10 px-4 text-xs"
							>
								<MessageSquare className="h-3.5 w-3.5 mr-1.5" />
								Notes
							</TabsTrigger>
						</TabsList>

						<TabsContent value="dossier" className="mt-0">
							<ProfileDossierCard profile={profile} />
						</TabsContent>

						<TabsContent value="requests" className="mt-0">
							<ProfileRequestsCard
								requests={requests}
								context="agent"
								basePath="/requests"
							/>
						</TabsContent>

						<TabsContent value="documents" className="mt-0">
							<ProfileDocumentsCard
								documents={documents}
								canValidate={false}
							/>
						</TabsContent>

						<TabsContent value="notes" className="mt-0">
							{profileId && (
								<ProfileNotesPanel profileId={profileId as string} />
							)}
						</TabsContent>
					</Tabs>
				</div>
			)}
		</BottomSheet>
	);
}
