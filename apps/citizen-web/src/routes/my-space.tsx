import { api } from "@convex/_generated/api";
import {
	createFileRoute,
	Link,
	Outlet,
	useNavigate,
} from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { AlertTriangle, Loader2, UserPlus } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AIAssistant } from "@/components/ai";
import { MySpaceWrapper } from "@/components/my-space/my-space-wrapper";
import { Button } from "@/components/ui/button";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";

export const Route = createFileRoute("/my-space")({
	component: MySpaceLayoutWrapper,
});

function MySpaceLayoutWrapper() {
	const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
	const navigate = useNavigate();

	// Redirect to sign-in when not authenticated
	useEffect(() => {
		if (!isAuthLoading && !isAuthenticated) {
			navigate({ to: "/sign-in" });
		}
	}, [isAuthLoading, isAuthenticated, navigate]);

	if (isAuthLoading || !isAuthenticated) {
		return (
			<div className="flex h-screen w-full items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	return <MySpaceLayout />;
}

function MySpaceLayout() {
	const { t } = useTranslation();
	const { data, isPending } = useAuthenticatedConvexQuery(
		api.functions.profiles.getMyProfileSafe,
		{},
	);

	const hasNoProfile =
		!isPending && data?.status === "ready" && data.profile === null;

	if (isPending) {
		return (
			<MySpaceWrapper className="min-h-full flex items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</MySpaceWrapper>
		);
	}

	if (data?.status === "unauthenticated") {
		return (
			<MySpaceWrapper className="flex flex-col items-center justify-center gap-4">
				<h1 className="text-2xl font-bold">
					{t("errors.auth.noAuthentication")}
				</h1>
				<p className="text-muted-foreground">
					{t(
						"errors.auth.pleaseSignIn",
						"Veuillez vous connecter pour accéder à votre espace.",
					)}
				</p>
			</MySpaceWrapper>
		);
	}

	if (data?.status === "user_not_synced") {
		return (
			<MySpaceWrapper className="flex flex-col items-center justify-center gap-4">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
				<p className="text-muted-foreground">
					{t("mySpace.syncing")}
				</p>
			</MySpaceWrapper>
		);
	}

	// User with no profile — show message with link to register
	if (hasNoProfile) {
		return (
			<MySpaceWrapper className="min-h-full flex items-center justify-center">
				<div className="max-w-md w-full text-center space-y-6 p-8 rounded-2xl border border-border bg-card shadow-lg animate-in fade-in zoom-in-95">
					<div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
						<AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
					</div>
					<div className="space-y-2">
						<h2 className="text-xl font-bold">
							{t("mySpace.noProfile.title")}
						</h2>
						<p className="text-muted-foreground text-sm leading-relaxed">
							{t(
								"mySpace.noProfile.message",
								"Vous n'avez pas encore de profil. Rendez-vous sur l'espace d'inscription consulaire pour compléter votre profil.",
							)}
						</p>
					</div>
					<Button asChild>
						<Link to="/register">
							<UserPlus className="mr-2 h-4 w-4" />
							{t("mySpace.noProfile.createProfile", "Créer mon profil citoyen")}
						</Link>
					</Button>
				</div>
			</MySpaceWrapper>
		);
	}

	return (
		<MySpaceWrapper>
			<Outlet />
			<AIAssistant />
		</MySpaceWrapper>
	);
}
