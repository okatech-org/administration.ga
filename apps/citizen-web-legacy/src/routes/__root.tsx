import type { ConvexQueryClient } from "@convex-dev/react-query";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
	useMatches,
	useRouteContext,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { DevAccountSwitcher } from "@/components/auth/DevAccountSwitcher";
import { Footer } from "@/components/Footer";
import { GlobalCallAlert } from "@/components/meetings/global-call-alert";
import { ThemeProvider } from "@/components/theme-provider";
import { NavigationProgress } from "@workspace/ui/components/navigation-progress";
import { Toaster } from "@workspace/ui/components/sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { authClient } from "@/lib/auth-client";
import { FormFillProvider } from "../components/ai/FormFillContext";
import { CitizenIAstedWindow } from "../components/ai/iasted/CitizenIAstedWindow";
import Header from "../components/Header";
import AppConvexProvider from "@workspace/api/provider";
import I18nProvider from "@workspace/i18n/provider";
import { PostHogPageviewTracker } from "../integrations/posthog/pageview-tracker";
import { PostHogProvider } from "../integrations/posthog/provider";
import { api } from "@convex/_generated/api";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
	convexQueryClient: ConvexQueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1, viewport-fit=cover",
			},
			{
				title:
					"Consulat.ga - Services Consulaires Digitalisés | République Gabonaise",
			},
			{
				name: "description",
				content:
					"Plateforme officielle des services consulaires de la République Gabonaise. Demandes de passeport, visa, état civil, inscription consulaire et légalisation de documents en ligne.",
			},
			{
				property: "og:title",
				content: "Consulat.ga - Services Consulaires Digitalisés",
			},
			{
				property: "og:description",
				content:
					"Plateforme officielle des services consulaires de la République Gabonaise pour les citoyens à l'étranger.",
			},
			{
				property: "og:type",
				content: "website",
			},
			{
				name: "theme-color",
				content: "#3b82f6",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "apple-touch-icon",
				sizes: "180x180",
				href: "/icons/apple-icon-180x180.png",
			},
			{
				rel: "icon",
				type: "image/png",
				sizes: "32x32",
				href: "/icons/favicon-32x32.png",
			},
			{
				rel: "icon",
				type: "image/png",
				sizes: "16x16",
				href: "/icons/favicon-16x16.png",
			},
			{
				rel: "manifest",
				href: "/icons/manifest.json",
			},
		],
	}),

	beforeLoad: async () => {
		return {
			isAuthenticated: false,
			token: null as string | null,
		};
	},

	pendingComponent: NavigationProgress,
	shellComponent: RootDocument,
	component: RootLayout,
});

const routesWithOwnLayout = [
	"/my-space",
	"/sign-in",
	"/sign-up",
];

function RootLayout() {
	const matches = useMatches();
	const { data: session } = authClient.useSession();
	// iAsted gère son propre état open/close via le FAB intégré

	const hasOwnLayout = matches.some((match) =>
		routesWithOwnLayout.some((route) => match.fullPath.startsWith(route)),
	);

	const mainRef = useRef<HTMLElement>(null);
	const isMobile = useIsMobile();

	useEffect(() => {
		if (hasOwnLayout || isMobile) return;

		const handleWheel = (e: WheelEvent) => {
			if (!mainRef.current) return;

			let target = e.target as HTMLElement | null;

			while (target) {
				if (target === mainRef.current) {
					return;
				}

				const style = window.getComputedStyle(target);
				const overflowY = style.overflowY;
				const isScrollable =
					(overflowY === "auto" || overflowY === "scroll") &&
					target.scrollHeight > target.clientHeight;

				if (isScrollable) {
					return;
				}

				target = target.parentElement;
			}

			mainRef.current.scrollTop += e.deltaY;
		};

		window.addEventListener("wheel", handleWheel);
		return () => window.removeEventListener("wheel", handleWheel);
	}, [hasOwnLayout, isMobile]);

	// Lock html overflow on desktop to prevent document-level scrollbar
	// On mobile, allow native scroll so the browser bar collapses
	useEffect(() => {
		const html = document.documentElement;
		if (!hasOwnLayout && !isMobile) {
			html.style.overflow = "hidden";
		} else {
			html.style.overflow = "";
		}
		return () => {
			html.style.overflow = "";
		};
	}, [hasOwnLayout, isMobile]);

	if (hasOwnLayout) {
		return <Outlet />;
	}

	// Mobile: native body scroll (min-h-dvh, no overflow lock) → browser bar collapses
	// Desktop: fixed layout with internal scroll (h-screen, overflow-hidden on wrapper, overflow-y-auto on main)
	if (isMobile) {
		return (
			<div className="flex flex-col min-h-dvh">
				<PostHogPageviewTracker />
				<Header />
				<main className="flex-1">
					<Outlet />
					<Footer />
				</main>

				{session && <CitizenIAstedWindow />}
			</div>
		);
	}

	return (
		<div className="h-screen overflow-hidden flex flex-col">
			<PostHogPageviewTracker />
			<Header />
			<main
				id="main-scrollable-area"
				ref={mainRef}
				className="overflow-y-auto flex-1"
			>
				<Outlet />
				<Footer />
			</main>

			{session && <CitizenIAstedWindow />}
		</div>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	const context = useRouteContext({ from: Route.id });

	return (
		<html lang="fr" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
				<I18nProvider>
					<AppConvexProvider
						initialToken={context?.token}
						ensureUserMutation={api.functions.users.ensureUser}
					>
						<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
							<FormFillProvider>
								<PostHogProvider>
									{children}
									<Toaster richColors />
									<DevAccountSwitcher />
									<GlobalCallAlert />
								</PostHogProvider>
							</FormFillProvider>
						</ThemeProvider>
					</AppConvexProvider>
				</I18nProvider>

				<Scripts />
			</body>
		</html>
	);
}
