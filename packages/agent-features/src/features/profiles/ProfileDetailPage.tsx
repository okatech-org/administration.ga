"use client";

import type { ComponentType } from "react";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "@workspace/routing";
import { useTranslation } from "react-i18next";
import { Button } from "@workspace/ui/components/button";
import {
	usePageContext,
	useRegisterPageAction,
} from "../../hooks/use-page-context";
import type {
	PageAction,
	PageEntity,
} from "../../stores/page-context-store";

/**
 * Props for the ProfileDetailView rendered inside this page.
 * The concrete implementation lives in the host app (agent-web) because it
 * depends on a handful of large sub-components (hero card, documents card,
 * etc.) that are not yet extracted to the shared package. The page injects
 * the component through the `ProfileDetailView` prop so the package stays
 * free of cross-app coupling.
 */
export interface ProfileDetailViewProps {
	profileId: string;
	context?: "admin" | "agent";
	canProcess?: boolean;
	canValidate?: boolean;
	canManageUser?: boolean;
}

export interface ProfileDetailPageProps {
	ProfileDetailView: ComponentType<ProfileDetailViewProps>;
}

/**
 * Admin/agent profile detail page. Hosts the back button + title and
 * delegates the actual rendering of the profile to a host-supplied
 * `ProfileDetailView` component.
 */
export default function ProfileDetailPage({
	ProfileDetailView,
}: ProfileDetailPageProps) {
	const { profileId } = useParams<{ profileId: string }>();
	const router = useRouter();
	const { t } = useTranslation();

	// ─── iAsted page context (contexte minimal — la vue détaillée est
	// injectée par l'app hôte et peut publier son propre contexte) ──
	const pageEntities: PageEntity[] = profileId
		? [
			{
				id: profileId,
				type: "citizen-profile",
				label: "Profil citoyen",
				data: { profileId },
			},
		]
		: [];
	const pageActions: PageAction[] = [
		{
			id: "profile-detail.back",
			label: "Retour à la page précédente",
			description: "Navigation arrière (router.back).",
		},
	];
	usePageContext({
		module: "profile-detail",
		title: t("profileDetail.title"),
		summary: profileId
			? `Détail du profil citoyen (id: ${profileId}).`
			: "Profil citoyen (id manquant).",
		visibleEntities: pageEntities,
		availableActions: pageActions,
		scopedToolNames: [],
	});
	useRegisterPageAction("profile-detail.back", async () => {
		router.back();
		return { success: true };
	});

	return (
		<div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full">
			<div className="flex items-center gap-4">
				<Button
					variant="outline"
					size="icon"
					onClick={() => router.back()}
					className="shrink-0"
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<div>
					<h1 className="text-2xl font-bold tracking-tight">
						{t("profileDetail.title")}
					</h1>
					<p className="text-muted-foreground text-sm">
						{t("profileDetail.description")}
					</p>
				</div>
			</div>

			<div className="flex-1 rounded-xl overflow-hidden">
				<ProfileDetailView profileId={profileId ?? ""} />
			</div>
		</div>
	);
}
