import type { ConvexQueryClient } from "@convex-dev/react-query";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
	useRouteContext,
} from "@tanstack/react-router";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@workspace/ui/components/sonner";
import AppConvexProvider from "@workspace/api/provider";
import I18nProvider from "@workspace/i18n/provider";
import { PostHogProvider } from "@/integrations/posthog/provider";
import { PostHogPageviewTracker } from "@/integrations/posthog/pageview-tracker";
import { DevAccountSwitcher } from "@/components/auth/DevAccountSwitcher";
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
				content: "width=device-width, initial-scale=1",
			},
			{
				title:
					"Admin - Consulat.ga | Back-office d'administration",
			},
			{
				name: "description",
				content:
					"Back-office d'administration de la plateforme consulaire de la République Gabonaise.",
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
		],
	}),

	beforeLoad: async () => {
		return {
			isAuthenticated: false,
			token: null as string | null,
		};
	},

	shellComponent: RootDocument,
	component: RootLayout,
});

function RootLayout() {
	return (
		<>
			<PostHogPageviewTracker />
			<Outlet />
		</>
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
						<PostHogProvider>
							<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
								{children}
								<Toaster richColors />
								<DevAccountSwitcher />
							</ThemeProvider>
						</PostHogProvider>
					</AppConvexProvider>
				</I18nProvider>

				<Scripts />
			</body>
		</html>
	);
}
