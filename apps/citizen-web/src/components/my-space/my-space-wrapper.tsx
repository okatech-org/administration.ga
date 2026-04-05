import { api } from "@convex/_generated/api";
import { Link } from "@tanstack/react-router";
import { Building2, Info, Plane, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { useCitizenData } from "@/hooks/use-citizen-data";
import {
	ConsularThemeContext,
	useConsularThemeState,
} from "@/hooks/useConsularTheme";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConsularNotificationDialog } from "./ConsularNotificationDialog";
import { ConsularRegistrationDialog } from "./ConsularRegistrationDialog";
import { MobileNavBar } from "./mobile-nav-bar";
import { MySpaceSidebar } from "./my-space-sidebar";

const SIDEBAR_STORAGE_KEY = "myspace-sidebar-expanded";

interface MySpaceWrapperProps {
	children: React.ReactNode;
	className?: string;
}

export function MySpaceWrapper({ children, className }: MySpaceWrapperProps) {
	const consularThemeValue = useConsularThemeState();

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

	return (
		<ConsularThemeContext.Provider value={consularThemeValue}>
			<div
				className={cn(
					"citizen-layout relative flex",
					"min-h-dvh flex-col md:flex-row md:h-screen md:overflow-hidden",
					consularThemeValue.consularTheme === "homeomorphism" &&
						"theme-homeomorphism",
				)}
			>
				{/* Gabon Tricolor Stripe — top decorative bar */}
				<div className="" />

				{/* Sidebar */}
				<div className="hidden md:block p-4 pr-0">
					<div className="h-full rounded-2xl bg-card overflow-hidden">
						<MySpaceSidebar
							isExpanded={isExpanded}
							onToggle={() => setIsExpanded((prev) => !prev)}
						/>
					</div>
				</div>

				{/* Main Content */}
				<main
					className={cn(
						"flex-1 overflow-y-auto citizen-scrollbar",
						"px-4 pt-4 pb-20 md:px-4 md:pt-4 md:pb-4",
						className,
					)}
				>
					{children}
				</main>

				{/* Mobile Navigation */}
				<MobileNavBar />
			</div>
		</ConsularThemeContext.Provider>
	);
}

export function MySpaceHeader() {
	const { profile } = useCitizenData();
	const { t } = useTranslation();

	// Get consular registration data
	const { data: registrations } = useAuthenticatedConvexQuery(
		api.functions.consularRegistrations.listByProfile,
		{},
	);
	const latestRegistration = registrations?.[0];

	// Check if user needs consular registration CTA
	const needsRegistration =
		!latestRegistration &&
		profile?.userType &&
		profile.userType === "long_stay";

	// Check if user can do signalement (both long_stay and short_stay)
	const canNotify =
		profile?.userType &&
		(profile.userType === "long_stay" || profile.userType === "short_stay");

	const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
	const [showNotificationDialog, setShowNotificationDialog] = useState(false);

	return (
		<>
			<header className="w-full flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
				{/* ── Desktop : matricule + badge à gauche ── */}
				<div className="hidden md:flex w-full items-center justify-between md:w-auto">
					<div className="flex items-center gap-4 flex-wrap">
						{profile?.matricule && (
							<span className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wide">
								{profile.matricule}
							</span>
						)}
						{profile?.userType && (
							<span className="text-sm px-3 py-1 rounded-full bg-amber-500/35 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 font-medium">
								{profile.userType === "long_stay" ? "Long séjour" : profile.userType === "short_stay" ? "Court séjour" : "De passage"}
							</span>
						)}
						{needsRegistration && (
							<Button
								variant="outline"
								size="xs"
								className="w-max rounded-full text-primary dark:text-primary hover:bg-blue-500/10 gap-1.5"
								onClick={() => setShowRegistrationDialog(true)}
							>
								<Building2 className="h-3.5 w-3.5" />
								{t("mySpace.registration.cta", "Faire mon inscription consulaire")}
							</Button>
						)}
					</div>
				</div>

				{/* ── Mobile : tous les boutons sur une ligne ── */}
				<div className="flex md:hidden items-center gap-2">
					{canNotify && (
						<Button
							variant="ghost"
							size="sm"
							className="h-9 rounded-full bg-amber-500/35 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/45 dark:hover:bg-amber-500/25 font-semibold text-xs min-w-0 flex-1 overflow-hidden"
							onClick={() => setShowNotificationDialog(true)}
						>
							<Plane className="mr-1 h-3.5 w-3.5 shrink-0" />
							<span className="hidden min-[380px]:inline truncate">Signaler ma présence</span>
							<span className="inline min-[380px]:hidden truncate">Signaler</span>
						</Button>
					)}
					{needsRegistration && (
						<Button
							variant="outline"
							size="xs"
							className="rounded-full text-primary dark:text-primary hover:bg-blue-500/10 gap-1.5 min-w-0 flex-1 overflow-hidden"
							onClick={() => setShowRegistrationDialog(true)}
						>
							<Building2 className="h-3.5 w-3.5 shrink-0" />
							<span className="truncate">Inscription</span>
						</Button>
					)}
					<Button
						variant="ghost"
						size="sm"
						className="h-9 rounded-full bg-primary text-white hover:bg-primary/90 font-semibold text-xs min-w-0 flex-1 overflow-hidden"
						asChild
					>
						<Link to="/services">
							<Plus className="mr-1 h-3.5 w-3.5 shrink-0" />
							<span className="hidden min-[420px]:inline truncate">Nouvelle démarche</span>
							<span className="inline min-[420px]:hidden truncate">Démarche</span>
						</Link>
					</Button>
					<NotificationDropdown className="h-10 w-10 min-w-10 bg-card rounded-full shrink-0" />
				</div>

				{/* ── Desktop : boutons d'action à droite (inchangé) ── */}
				<div className="hidden md:flex items-center gap-4">
					{canNotify && (
						<div className="flex items-center gap-2">
							<Button
								variant="ghost"
								size="sm"
								className="h-8 rounded-full bg-amber-500/35 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/45 dark:hover:bg-amber-500/25 font-semibold"
								onClick={() => setShowNotificationDialog(true)}
							>
								<Plane className="mr-1.5 h-3.5 w-3.5" />
								Signaler ma présence
							</Button>
							<TooltipProvider delayDuration={100}>
								<Tooltip>
									<TooltipTrigger asChild>
										<button type="button" title="Info signalement" className="h-6 w-6 rounded-full bg-amber-500/35 dark:bg-amber-500/15 flex items-center justify-center text-amber-700 dark:text-amber-400 hover:bg-amber-500/45 dark:hover:bg-amber-500/25 transition-colors">
											<Info className="h-3.5 w-3.5" />
										</button>
									</TooltipTrigger>
									<TooltipContent side="bottom" className="max-w-xs text-xs">
										Signalez votre déplacement temporaire auprès de la Représentation consulaire ou diplomatique compétente.
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
					)}
					<Button
						variant="ghost"
						size="sm"
						className="h-8 rounded-full bg-primary text-white hover:bg-primary/90 font-semibold"
						asChild
					>
						<Link to="/services">
							<Plus className="mr-1.5 h-3.5 w-3.5" />
							Nouvelle démarche
						</Link>
					</Button>
					<NotificationDropdown className="h-10 w-10 bg-card rounded-full shrink-0" />
				</div>
			</header>

			<ConsularRegistrationDialog
				open={showRegistrationDialog}
				onOpenChange={setShowRegistrationDialog}
			/>
			<ConsularNotificationDialog
				open={showNotificationDialog}
				onOpenChange={setShowNotificationDialog}
			/>
		</>
	);
}
