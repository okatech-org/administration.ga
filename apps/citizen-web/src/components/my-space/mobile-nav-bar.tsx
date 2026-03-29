"use client";

import { Link, useLocation } from "@tanstack/react-router";
import {
	Bot,
	Briefcase,
	Calendar,
	FileText,
	Mail,
	Menu,
	Plus,
	Settings,
	User,
	X,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
	title: string;
	url: string;
	icon: React.ElementType;
	color?: string;
}

interface NavSection {
	label: string;
	items: NavItem[];
}

export function MobileNavBar() {
	const location = useLocation();
	const { t } = useTranslation();
	const [sheetOpen, setSheetOpen] = useState(false);

	// All links organized in sections for the sheet — matches desktop sidebar
	const allSections: NavSection[] = [
		{
			label: t("mySpace.nav.sectionIdentity"),
			items: [
				{
					title: "iProfil",
					url: "/my-space",
					icon: User,
					color: "text-gabon-green",
				},
				{
					title: t("mySpace.nav.iboite"),
					url: "/my-space/iboite",
					icon: Mail,
					color: "text-gabon-blue",
				},
				{
					title: "iAsted",
					url: "/my-space/iasted",
					icon: Bot,
					color: "text-gabon-yellow",
				},
				{
					title: "iDocument",
					url: "/my-space/idocument",
					icon: FileText,
					color: "text-gabon-green",
				},
				{
					title: "iAgenda",
					url: "/my-space/iagenda",
					icon: Calendar,
					color: "text-gabon-blue",
				},
			],
		},
		{
			label: t("mySpace.nav.sectionServices"),
			items: [
				{
					title: "Mes Démarches",
					url: "/my-space/services-demarches",
					icon: Briefcase,
					color: "text-gabon-green",
				},
				{
					title: t("mySpace.nav.settings"),
					url: "/my-space/settings",
					icon: Settings,
				},
			],
		},
	];

	const isActive = (url: string) => {
		if (url === "/my-space") {
			return (
				location.pathname === "/my-space" ||
				location.pathname === "/my-space/"
			);
		}
		return location.pathname.startsWith(url);
	};

	return (
		<>
			{/* Floating Action Button — Neumorphic with Gabon green */}
			<button
				type="button"
				onClick={() => setSheetOpen((prev) => !prev)}
				className={cn(
					"fixed bottom-5 right-4 z-50 md:hidden",
					"flex items-center justify-center",
					"h-13 w-13 rounded-2xl",
					"bg-gabon-green text-white",
					"shadow-[4px_4px_10px_rgba(0,0,0,0.2),-2px_-2px_6px_rgba(0,158,96,0.3)]",
					"active:scale-95 transition-all duration-200",
					sheetOpen && "rotate-90 bg-rose-500 shadow-[4px_4px_10px_rgba(0,0,0,0.2),-2px_-2px_6px_rgba(225,29,72,0.3)]",
				)}
			>
				{sheetOpen ? <X className="size-6" /> : <Menu className="size-6" />}
			</button>

			{/* Navigation sheet — Neumorphic styled */}
			<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
				<SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] px-4 bg-(--neu-surface) border-t-0">
					{/* Gabon stripe at top of sheet */}
					<div className="" />

					<SheetHeader className="pb-3 pt-1">
						<SheetTitle className="text-base heading-official text-gradient-official">
							{t("mySpace.nav.navigation")}
						</SheetTitle>
					</SheetHeader>

					<div className="overflow-y-auto citizen-scrollbar space-y-5 pb-10">
						{allSections.map((section) => (
							<div key={section.label}>
								<p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 mb-2.5">
									{section.label}
								</p>
								<div className="grid grid-cols-3 gap-2.5">
									{section.items.map((item) => (
										<Link
											key={item.url}
											to={item.url}
											onClick={() => setSheetOpen(false)}
											className={cn(
												"neu-nav-item flex flex-col items-center justify-center gap-2.5 p-4 text-center h-auto min-h-[90px]",
												isActive(item.url)
													? "active text-gabon-green font-semibold"
													: "text-muted-foreground",
												"bg-(--neu-surface-card)",
											)}
										>
											<item.icon className={cn(
												"size-6",
												isActive(item.url) ? "text-gabon-green" : item.color,
											)} />
											<span className="text-[11px] font-medium leading-tight">
												{item.title}
											</span>
											{/* Active dot indicator */}
											{isActive(item.url) && (
												<div className="w-1.5 h-1.5 rounded-full bg-gabon-green -mt-1" />
											)}
										</Link>
									))}
								</div>
							</div>
						))}
					</div>

					{/* Fixed Bottom Action in Menu */}
					<div className="pb-4 mt-auto">
						<Button
							className="w-full h-12 rounded-xl text-base font-medium bg-gabon-green hover:bg-gabon-green/90 text-white neu-raised border-0"
							onClick={() => setSheetOpen(false)}
							asChild
						>
							<Link to="/my-space/services">
								<Plus className="mr-2 h-5 w-5" />
								{t("mySpace.actions.newRequest", "Nouvelle demande")}
							</Link>
						</Button>
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
}
