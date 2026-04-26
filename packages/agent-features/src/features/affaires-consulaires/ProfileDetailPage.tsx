"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useParams, useRouter } from "@workspace/routing";
import {
	ArrowLeft,
	AlertCircle,
	LockKeyhole,
	MessageSquare,
	CreditCard,
	Building2,
} from "lucide-react";
import { motion } from "motion/react";
import { type ComponentType, useMemo, useState } from "react";
import { useOrg } from "../../shell/org-provider";
import { useCanDoTask } from "../../hooks/useCanDoTask";
import {
	usePageContext,
	useRegisterPageAction,
} from "../../hooks/use-page-context";
import type { PageAction, PageEntity } from "../../stores/page-context-store";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { FlatCard } from "../../components/my-space/flat-card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";

// ─── Host-provided component surfaces ────────────────────────────────
// The detail page composes a handful of large agent-web components
// (profile hero card, documents, children, notes, preview modal …).
// Those stay in agent-web and are injected via props so the package
// remains host-agnostic.

export interface ProfileHeroCardProps {
	profile: any;
	user: any;
	identityPhotoUrl?: string | null;
	registrations: any[];
	completionScore: number;
}

export interface ProfileConsularCardProps {
	registrations: any[];
	profile: any;
	identityPhotoUrl?: string | null;
}

export interface ProfileDocumentsCardProps {
	documents: any[];
	canValidate: boolean;
	onPreview: (doc: any) => void;
}

export interface ProfileRequestsCardProps {
	requests: any[];
	context: "agent" | "admin";
	basePath: string;
}

export interface ProfileChildrenCardProps {
	children: any[];
	basePath: string;
}

export interface CitizenDossierSectionsProps {
	profile: any;
}

export interface ProfileNotesPanelProps {
	profileId: string;
}

export interface DocumentPreviewModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	storageId: string;
	filename: string;
	mimeType?: string;
}

export interface AffairesProfileDetailPageProps {
	ProfileHeroCard: ComponentType<ProfileHeroCardProps>;
	ProfileConsularCard: ComponentType<ProfileConsularCardProps>;
	ProfileDocumentsCard: ComponentType<ProfileDocumentsCardProps>;
	ProfileRequestsCard: ComponentType<ProfileRequestsCardProps>;
	ProfileChildrenCard: ComponentType<ProfileChildrenCardProps>;
	CitizenDossierSections: ComponentType<CitizenDossierSectionsProps>;
	ProfileNotesPanel: ComponentType<ProfileNotesPanelProps>;
	DocumentPreviewModal: ComponentType<DocumentPreviewModalProps>;
}

export default function AgentProfileDetailPage({
	ProfileHeroCard,
	ProfileConsularCard,
	ProfileDocumentsCard,
	ProfileRequestsCard,
	ProfileChildrenCard,
	CitizenDossierSections,
	ProfileNotesPanel,
	DocumentPreviewModal,
}: AffairesProfileDetailPageProps) {
	const { profileId } = useParams<{ profileId: string }>();
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

	// ─── iAsted page context (avant les early returns) ─────────────
	const profile = (detailData as any)?.profile;
	const fullName = profile
		? `${profile.identity?.firstName ?? ""} ${profile.identity?.lastName ?? ""}`.trim() ||
			"Nom inconnu"
		: "";
	const pageEntities = useMemo<PageEntity[]>(() => {
		if (!detailData) return [];
		const d = detailData as any;
		const entities: PageEntity[] = [];
		for (const reg of (d.registrations ?? []).slice(0, 5)) {
			entities.push({
				id: reg._id,
				type: "consular-registration",
				label: `Inscription ${reg.cardNumber ?? "—"}`,
				data: { status: reg.status, expiresAt: reg.expiresAt },
			});
		}
		for (const c of (d.children ?? []).slice(0, 10)) {
			entities.push({
				id: c._id,
				type: "child",
				label: `${c.identity?.firstName ?? ""} ${c.identity?.lastName ?? ""}`.trim() || "Enfant",
				data: { birthDate: c.identity?.birthDate },
			});
		}
		for (const r of (d.requests ?? []).slice(0, 10)) {
			entities.push({
				id: r._id,
				type: "request",
				label: `Demande ${r.reference ?? "—"}`,
				data: { status: r.status, serviceName: (r.service as any)?.name?.fr },
			});
		}
		for (const doc of (d.documents ?? []).slice(0, 10)) {
			entities.push({
				id: doc._id,
				type: "document",
				label: doc.fileName ?? doc.documentTypeId ?? "Document",
				data: { status: doc.status },
			});
		}
		return entities;
	}, [detailData]);

	const pageActions = useMemo<PageAction[]>(
		() => [
			{
				id: "back-to-profiles",
				label: "Retour aux profils",
				description: "Navigue vers /affaires-consulaires/profiles.",
			},
			{
				id: "open-request",
				label: "Ouvrir une demande de ce citoyen",
				description: "params.reference requis (depuis les entités visibles).",
			},
		],
		[],
	);

	const summary = detailData
		? `Profil ${fullName} · ${(detailData as any).registrations?.length ?? 0} inscription(s), ${(detailData as any).children?.length ?? 0} enfant(s), ${(detailData as any).requests?.length ?? 0} demande(s), ${(detailData as any).documents?.length ?? 0} document(s). Complétion: ${(detailData as any).profile?.completionScore ?? 0}%.`
		: "Chargement du profil…";

	usePageContext({
		module: "profile-detail",
		title: `Profil — ${fullName || "…"}`,
		summary,
		visibleEntities: pageEntities,
		availableActions: pageActions,
		scopedToolNames: ["getCitizenProfile"],
	});
	useRegisterPageAction("back-to-profiles", async () => {
		router.push("/affaires-consulaires/profiles");
	});
	useRegisterPageAction("open-request", async (params) => {
		const ref = params?.reference as string | undefined;
		if (ref) router.push(`/requests/${ref}`);
	});

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
		user,
		children = [],
		documents = [],
		requests = [],
		registrations = [],
		representations = [],
	} = detailData as any;

	const completionScore = (profile as any).completionScore ?? 0;

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
