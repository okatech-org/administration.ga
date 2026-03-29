import { api } from "@convex/_generated/api";
import { Link } from "@tanstack/react-router";
import { Building2, Plane, Plus } from "lucide-react";
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
				<div className="hidden md:block p-3 pr-0">
					<div className="h-full rounded-2xl border border-border bg-card overflow-hidden">
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
						"px-3 pt-3 pb-20 md:px-5 md:pt-3 md:pb-3 md:pl-3",
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
	const { userData, profile } = useCitizenData();
	const { t } = useTranslation();

	// Get consular registration data for "Dossier consulaire" display
	const { data: registrations } = useAuthenticatedConvexQuery(
		api.functions.consularRegistrations.listByProfile,
		{},
	);
	const latestRegistration = registrations?.[0];

	// Get the request linked to the registration for reference & org
	const { data: registrationRequest } = useAuthenticatedConvexQuery(
		api.functions.requests.getById,
		latestRegistration?.requestId
			? { requestId: latestRegistration.requestId }
			: "skip",
	);

	const requestReference = registrationRequest?.reference;
	const orgName = (registrationRequest?.org as any)?.name;

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
			<header className="w-full flex flex-col md:flex-row md:items-end md:justify-between gap-3">
				<div className="flex w-full items-start justify-between md:w-auto">
					{/* Left: Greeting + Dossier */}
					<div className="flex flex-col gap-3">
						<h1 className="text-lg md:text-2xl font-bold ">
							{t("common.greeting", {
								firstName: userData?.firstName ?? userData?.name ?? "",
							})}
						</h1>

						{needsRegistration && (
							<Button
								variant="outline"
								size="xs"
								className="w-max rounded-full border-teal-500/30 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 gap-1.5"
								onClick={() => setShowRegistrationDialog(true)}
							>
								<Building2 className="h-3.5 w-3.5" />
								{t(
									"mySpace.registration.cta",
									"Faire mon inscription consulaire",
								)}
							</Button>
						)}
					</div>

					{/* Notification Bell - Mobile only (Top Right) */}
					<NotificationDropdown className="md:hidden h-10 w-10  bg-card rounded-full shrink-0" />
				</div>

				{/* Right: Action buttons - Desktop only */}
				<div className="hidden md:flex items-center gap-3">
					{/* Organisation consulaire */}
					{orgName && (
						<span className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 text-xs font-semibold mr-2">
							<Building2 className="h-3.5 w-3.5" />
							{t("mySpace.header.managedBy", "Géré par")} : {orgName}
						</span>
					)}

					{/* Signaler mon déplacement */}
					{canNotify && (
						<Button
							variant="outline"
							size="sm"
							className="h-8 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 hover:text-amber-800 dark:hover:text-amber-300 border border-amber-500/20 font-semibold"
							onClick={() => setShowNotificationDialog(true)}
						>
							<Plane className="mr-1.5 h-3.5 w-3.5" />
							Signaler ma présence
						</Button>
					)}
					{/* Nouvelle demande */}
					<Button 
						variant="outline"
						size="sm" 
						className="h-8 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-500/20 font-semibold" 
						asChild
					>
						<Link to="/services">
							<Plus className="mr-1.5 h-3.5 w-3.5" />
							Nouvelle demande
						</Link>
					</Button>
					{/* Notifications - Desktop */}
					<NotificationDropdown className="h-10 w-10  bg-card rounded-full shrink-0" />
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
