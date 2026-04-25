/**
 * AppShell — layout chrome partagé entre agent-web et agent-desktop.
 *
 * Responsabilités :
 *  - Gère l'état authentifié / non-authentifié via `useConvexAuth`
 *  - Monte le provider org + thème consulaire + auth-client
 *  - Rend le chrome (OrgSidebar desktop, AgentMobileNav mobile, IAstedWindow,
 *    GlobalCallAlert) autour du children (= page active)
 *
 * DI slots (props obligatoires) :
 *  - `authClient` : instance authClient compatible `SharedAuthClient`
 *  - `renderSignedOut` : rendu complet quand l'utilisateur n'est pas connecté
 *    (HomeLandingSignIn côté web, LoginPage côté desktop)
 *  - `renderIAstedTab(tab)` : contenu de l'onglet iAsted (web injecte les tabs
 *    avec `useAdminAIChat` / `useAdminVoiceChat`)
 *  - `renderIAstedCallQueueSlot(tab)` : slot sticky (GlobalActiveCallsBar web)
 *
 * DI slots optionnels :
 *  - `wrapWithAIPresence(children)` : wrapper pour `<AIPresenceProvider>`
 *    (state graph IA proactive — stays agent-web).
 *  - `showIAstedWindow(pathname)` : true par défaut sauf sur /iasted.
 *  - `beforeChildren` / `afterChildren` : extra overlays (desktop TitleBar…)
 */

"use client";

import { useConvexAuth } from "convex/react";
import { Loader2 } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { IAstedTabId } from "@workspace/iasted";
import { usePathname } from "@workspace/routing";
import { cn } from "@workspace/ui/lib/utils";
import {
	ConsularThemeContext,
	useConsularTheme,
	useConsularThemeState,
} from "../hooks/useConsularTheme";
import { useAgentPresence } from "../hooks/use-agent-presence";
import {
	AuthClientProvider,
	type SharedAuthClient,
} from "./auth-client-provider";
import { AgentMobileNav } from "./agent-mobile-nav";
import { GlobalCallAlert } from "./global-call-alert";
import { IAstedWindow } from "./iasted-window";
import { OrgProvider, useOrg } from "./org-provider";
import { OrgSidebar, type NavSection } from "./org-sidebar";

const SIDEBAR_STORAGE_KEY = "admin-sidebar-expanded";

export interface AppShellProps {
	children: ReactNode;
	/** `authClient` from the host app (better-auth instance). */
	authClient: SharedAuthClient;
	/** Rendered when user is NOT authenticated. */
	renderSignedOut: () => ReactNode;
	/** Returns the ReactNode for a given iAsted tab. */
	renderIAstedTab: (tab: IAstedTabId) => ReactNode;
	/** Optional sticky slot in iAsted (e.g. GlobalActiveCallsBar). */
	renderIAstedCallQueueSlot?: (tab: IAstedTabId) => ReactNode;
	/** Wrap `{children}` with extra providers (e.g. AIPresenceProvider). */
	wrapWithAIPresence?: (children: ReactNode) => ReactNode;
	/** Determines whether to mount IAstedWindow. Defaults to `pathname !== /iasted`. */
	showIAstedWindow?: (pathname: string | null | undefined) => boolean;
	/** Client label sent to agent presence heartbeats. */
	clientType?: "agent-web" | "agent-desktop";
	/** Extra content rendered above (before) children. */
	beforeChildren?: ReactNode;
	/** Extra content rendered below (after) children. */
	afterChildren?: ReactNode;
	/**
	 * Nav sections added by the host app to the shared sidebar. Used by
	 * agent-desktop to inject desktop-only entries (e.g. Impression) without
	 * polluting the web sidebar.
	 */
	extraNavSections?: NavSection[];
}

export function AppShell(props: AppShellProps) {
	const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
	const consularThemeValue = useConsularThemeState();

	const [hasResolved, setHasResolved] = useState(false);
	useEffect(() => {
		if (!isAuthLoading && !hasResolved) {
			setHasResolved(true);
		}
	}, [isAuthLoading, hasResolved]);

	if (isAuthLoading && !hasResolved) {
		return (
			<div className="flex h-screen w-full items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	if (!isAuthenticated) {
		return <>{props.renderSignedOut()}</>;
	}

	return (
		<AuthClientProvider value={props.authClient}>
			<ConsularThemeContext.Provider value={consularThemeValue}>
				<OrgProvider>
					<DashboardLayout {...props} />
				</OrgProvider>
			</ConsularThemeContext.Provider>
		</AuthClientProvider>
	);
}

function DashboardLayout({
	children,
	renderIAstedTab,
	renderIAstedCallQueueSlot,
	wrapWithAIPresence,
	showIAstedWindow,
	clientType = "agent-web",
	beforeChildren,
	afterChildren,
	extraNavSections,
}: AppShellProps) {
	const { isLoading, activeOrg, activeOrgId } = useOrg();
	const { t } = useTranslation();
	const { consularTheme } = useConsularTheme();
	const pathname = usePathname();
	// La page `/iasted` monte son propre iChat via FullscreenShell ; monter
	// `IAstedWindow` en parallèle créerait deux instances concurrentes de
	// `useAdminAIChat` + `useAdminVoiceChat` (conflit de souscriptions Convex
	// et de session WebRTC). On masque la popup sur cette route.
	const defaultShow = !(!!pathname && pathname.startsWith("/iasted"));
	const showIAsted = showIAstedWindow
		? showIAstedWindow(pathname)
		: defaultShow;

	const presenceOrgIds = useMemo(
		() => (activeOrgId ? [activeOrgId] : undefined),
		[activeOrgId],
	);
	useAgentPresence(presenceOrgIds, clientType);

	const [isExpanded, setIsExpanded] = useState(() => {
		try {
			const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
			return stored === null ? true : stored === "true";
		} catch {
			return true;
		}
	});

	useEffect(() => {
		try {
			localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isExpanded));
		} catch {
			// Ignore localStorage errors
		}
	}, [isExpanded]);

	if (isLoading) {
		return (
			<div className="flex h-screen w-full items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	if (!activeOrg) {
		return (
			<div className="flex h-screen w-full flex-col items-center justify-center gap-4">
				<h1 className="text-2xl font-bold">{t("dashboard.noAccess.title")}</h1>
				<p className="text-muted-foreground">
					{t("dashboard.noAccess.description")}
				</p>
				<p className="text-sm">{t("dashboard.noAccess.contact")}</p>
			</div>
		);
	}

	const shellBody = (
		<div
			className={cn(
				"citizen-layout relative flex h-dvh flex-col overflow-hidden md:flex-row md:h-screen",
				"print:block print:h-auto print:overflow-visible",
				consularTheme === "homeomorphism" && "theme-homeomorphism",
			)}
		>
			{beforeChildren}
			<div className="hidden md:block p-4 pr-0 print:hidden">
				<div className="h-full rounded-2xl bg-secondary overflow-hidden">
					<OrgSidebar
						isExpanded={isExpanded}
						onToggle={() => setIsExpanded((prev) => !prev)}
						extraSections={extraNavSections}
					/>
				</div>
			</div>
			<main className="flex-1 overflow-hidden md:overflow-y-auto citizen-scrollbar px-3 min-[400px]:px-4 pt-3 pb-18 md:px-4 md:pt-4 md:pb-4 print:overflow-visible print:p-0">
				{children}
			</main>
			<AgentMobileNav />
			{showIAsted && (
				<IAstedWindow
					renderTab={renderIAstedTab}
					renderCallQueueSlot={renderIAstedCallQueueSlot}
				/>
			)}
			<GlobalCallAlert />
			{afterChildren}
		</div>
	);

	return wrapWithAIPresence ? wrapWithAIPresence(shellBody) : shellBody;
}
