"use client";

import { Link, useLocation } from "@tanstack/react-router";
import {
	Briefcase,
	Building2,
	Calendar,
	ClipboardList,
	LifeBuoy,
	Lock,
	Mail,
	Menu,
	ScrollText,
	Settings,
	User,
	Users,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface NavItem {
	title: string;
	url: string;
	icon: React.ElementType;
}

/** Primary tabs shown in the persistent bottom bar */
function usePrimaryTabs(): NavItem[] {
	const { t } = useTranslation();
	return [
		{ title: t("mySpace.nav.profile"), url: "/my-space", icon: User },
		{
			title: t("mySpace.nav.catalog"),
			url: "/my-space/services",
			icon: Briefcase,
		},
		{
			title: t("mySpace.nav.myRequests"),
			url: "/my-space/requests",
			icon: ClipboardList,
		},
		{
			title: t("mySpace.nav.iboite"),
			url: "/my-space/iboite",
			icon: Mail,
		},
	];
}

/** Secondary items shown in the "More" sheet */
function useSecondaryItems(): NavItem[] {
	const { t } = useTranslation();
	return [
		{ title: t("mySpace.nav.icv"), url: "/my-space/cv", icon: ScrollText },
		{ title: t("mySpace.nav.vault"), url: "/my-space/vault", icon: Lock },
		{
			title: t("mySpace.nav.appointments"),
			url: "/my-space/appointments",
			icon: Calendar,
		},
		{
			title: t("mySpace.nav.companies"),
			url: "/my-space/companies",
			icon: Building2,
		},
		{
			title: t("mySpace.nav.associations"),
			url: "/my-space/associations",
			icon: Users,
		},
		{
			title: t("mySpace.nav.support"),
			url: "/my-space/support",
			icon: LifeBuoy,
		},
		{
			title: t("mySpace.nav.settings"),
			url: "/my-space/settings",
			icon: Settings,
		},
	];
}

export function MobileNavBar() {
	const location = useLocation();
	const { t } = useTranslation();
	const [sheetOpen, setSheetOpen] = useState(false);
	const primaryTabs = usePrimaryTabs();
	const secondaryItems = useSecondaryItems();

	const isActive = (url: string) => {
		if (url === "/my-space") {
			return (
				location.pathname === "/my-space" ||
				location.pathname === "/my-space/"
			);
		}
		return location.pathname.startsWith(url);
	};

	// Check if one of the secondary items is active (to highlight the "More" tab)
	const isMoreActive = secondaryItems.some((item) => isActive(item.url));

	return (
		<>
			{/* ── Persistent bottom tab bar ── */}
			<nav
				className={cn(
					"fixed bottom-0 inset-x-0 z-50 md:hidden",
					"flex items-end justify-around",
					"bg-background/95 backdrop-blur-md border-t border-border",
					"pb-[env(safe-area-inset-bottom,0px)]",
				)}
			>
				{primaryTabs.map((tab) => (
					<Link
						key={tab.url}
						to={tab.url}
						className={cn(
							"flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 min-h-[56px] transition-colors overflow-hidden",
							isActive(tab.url)
								? "text-primary"
								: "text-muted-foreground",
						)}
					>
						<tab.icon className="size-5" />
						<span className="text-[11px] font-medium leading-tight truncate max-w-full px-0.5">
							{tab.title}
						</span>
					</Link>
				))}

				{/* "More" tab → opens sheet */}
				<button
					type="button"
					onClick={() => setSheetOpen(true)}
					className={cn(
						"flex flex-1 flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 min-h-[56px] transition-colors",
						isMoreActive || sheetOpen
							? "text-primary"
							: "text-muted-foreground",
					)}
				>
					<Menu className="size-5" />
					<span className="text-[11px] font-medium leading-tight truncate max-w-full px-0.5">
						{t("mySpace.nav.more", "Plus")}
					</span>
				</button>
			</nav>

			{/* ── Secondary items sheet ── */}
			<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
				<SheetContent
					side="bottom"
					className="rounded-t-2xl max-h-[60vh] px-4"
				>
					<SheetHeader className="pb-3 pt-2">
						<SheetTitle className="text-base">
							{t("mySpace.nav.navigation")}
						</SheetTitle>
					</SheetHeader>
					<div className="overflow-y-auto pb-6">
						<div className="grid grid-cols-3 gap-2.5">
							{secondaryItems.map((item) => (
								<Link
									key={item.url}
									to={item.url}
									onClick={() => setSheetOpen(false)}
									className={cn(
										"flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all text-center min-h-[80px]",
										isActive(item.url)
											? "bg-primary/10 text-primary"
											: "bg-muted/50 text-muted-foreground hover:bg-muted",
									)}
								>
									<item.icon className="size-6" />
									<span className="text-xs font-medium leading-tight">
										{item.title}
									</span>
								</Link>
							))}
						</div>
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
}
