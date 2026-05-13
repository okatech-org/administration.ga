"use client";

import HeaderUser from "@/components/auth/HeaderUser";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FlagIcon } from "@/components/ui/flag-icon";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { CountryCode, ServiceCategory } from "@convex/lib/constants";
import { changeLanguage } from "i18next";
import {
	BookOpen,
	Check,
	ChevronDown,
	FileText,
	Globe,
	Home,
	Menu,
	Newspaper,
	X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const LANGUAGES = [
	{ label: "Français", value: "fr", country: CountryCode.FR },
	{ label: "English", value: "en", country: CountryCode.GB },
] as const;

export default function Header() {
	const { t, i18n } = useTranslation();
	const pathname = usePathname();
	const [isOpen, setIsOpen] = useState(false);
	const [servicesExpanded, setServicesExpanded] = useState(false);

	const navLinks = [
		{ label: t("header.nav.home", "Accueil"), href: "/", icon: Home, exact: true },
		{ label: t("header.nav.worldNetwork"), href: "/reps", icon: Globe },
		{ label: t("header.nav.news"), href: "/news", icon: Newspaper },
		{ label: t("header.nav.resources"), href: "/ressources", icon: BookOpen },
		// Services placé en dernier ; le dropdown est rendu manuellement
		// après la map pour conserver le menu déroulant par catégories.
	];

	const isActive = (href: string, exact?: boolean) =>
		exact ? pathname === href : pathname.startsWith(href);

	return (
		<>
			<header className="relative z-50 border-b border-border bg-background">
				<div className="flex items-center justify-between px-4 pt-[max(0.875rem,env(safe-area-inset-top))] pb-3.5 sm:px-8">
					<Logo href="/" />

					{/* Desktop navigation */}
					<nav className="hidden items-center gap-1 text-sm font-medium lg:flex">
						{navLinks.map((link) => (
							<Button
								key={link.label}
								asChild
								variant="ghost"
								size="sm"
								className="font-medium"
							>
								<Link
									href={link.href}
									className={cn(
										"text-muted-foreground hover:text-foreground",
										isActive(link.href, link.exact) &&
											"bg-gabon-blue-tint text-gabon-blue hover:bg-gabon-blue-tint hover:text-gabon-blue",
									)}
								>
									<span suppressHydrationWarning>{link.label}</span>
								</Link>
							</Button>
						))}

						<div className="group relative">
							<Button variant="ghost" size="sm" className="font-medium" asChild>
								<Link
									href="/services"
									className="flex items-center gap-1.5 px-3 py-2 text-muted-foreground hover:text-foreground"
								>
									<span suppressHydrationWarning>
										{t("header.nav.services")}
									</span>
									<ChevronDown className="size-3.5" />
								</Link>
							</Button>
							<div className="invisible absolute right-0 top-full pt-2 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
								<div className="min-w-[220px] rounded-xl border border-border bg-card p-2 wizard-shadow-sm">
									{Object.entries(ServiceCategory).map(([key, value]) => (
										<Link
											key={key}
											href={`/services?category=${value}`}
											className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-secondary"
										>
											<span
												suppressHydrationWarning
												className="text-sm font-medium"
											>
												{t(`services.categoriesMap.${value}`)}
											</span>
										</Link>
									))}
								</div>
							</div>
						</div>
					</nav>

					{/* Right side */}
					<div className="flex items-center gap-2">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="sm"
									className="h-8 gap-1.5 px-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
								>
									<FlagIcon
										countryCode={
											LANGUAGES.find((l) =>
												(i18n.language ?? "fr").startsWith(l.value),
											)?.country || CountryCode.FR
										}
										size={16}
										className="h-auto w-4 rounded-sm"
									/>
									<span
										suppressHydrationWarning
										className="text-xs font-medium uppercase"
									>
										{i18n.language}
									</span>
									<ChevronDown className="size-3" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="min-w-[140px]">
								{LANGUAGES.map((lang) => (
									<DropdownMenuItem
										key={lang.value}
										onClick={() => changeLanguage(lang.value)}
										className="flex cursor-pointer items-center justify-between"
									>
										<span className="flex items-center gap-2">
											<FlagIcon
												countryCode={lang.country}
												size={16}
												className="h-auto w-4 rounded-sm"
											/>
											<span>{lang.label}</span>
										</span>
										{(i18n.language ?? "fr").startsWith(lang.value) && (
											<Check className="size-4 text-gabon-blue" />
										)}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>

						<div className="hidden sm:block">
							<HeaderUser />
						</div>

						<Button
							variant="ghost"
							size="icon"
							onClick={() => setIsOpen(true)}
							className="lg:hidden"
							aria-label={t("header.openMenu")}
						>
							<Menu className="size-6" />
						</Button>
					</div>
				</div>
			</header>

			{/* Mobile drawer */}
			{isOpen && (
				<button
					type="button"
					className="fixed inset-0 z-50 bg-black/40 lg:hidden"
					onClick={() => setIsOpen(false)}
					aria-label={t("header.closeMenu")}
				/>
			)}

			<aside
				className={cn(
					"fixed left-0 top-0 z-50 flex h-full w-80 flex-col bg-card transition-transform duration-300 ease-out lg:hidden wizard-shadow-lg",
					isOpen ? "translate-x-0" : "-translate-x-full",
				)}
			>
				<div className="flex items-center justify-between border-b border-border p-4">
					<Logo href={null} />
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setIsOpen(false)}
						aria-label={t("header.closeMenu")}
					>
						<X className="size-5" />
					</Button>
				</div>

				<div className="flex items-center justify-between border-b border-border bg-secondary/40 p-4">
					<HeaderUser />
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm" className="h-9 gap-2 px-3">
								<FlagIcon
									countryCode={
										LANGUAGES.find((l) =>
											(i18n.language ?? "fr").startsWith(l.value),
										)?.country || CountryCode.FR
									}
									size={16}
									className="h-auto w-5 rounded-sm"
								/>
								<span
									suppressHydrationWarning
									className="text-xs font-medium uppercase"
								>
									{i18n.language}
								</span>
								<ChevronDown className="size-4 text-muted-foreground" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="min-w-[150px]">
							{LANGUAGES.map((lang) => (
								<DropdownMenuItem
									key={lang.value}
									onClick={() => changeLanguage(lang.value)}
									className="flex cursor-pointer items-center justify-between py-2.5"
								>
									<span className="flex items-center gap-3">
										<FlagIcon
											countryCode={lang.country}
											size={18}
											className="h-auto w-5 rounded-sm"
										/>
										<span className="font-medium">{lang.label}</span>
									</span>
									{(i18n.language ?? "fr").startsWith(lang.value) && (
										<Check className="size-4 text-gabon-blue" />
									)}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				<nav className="flex-1 overflow-y-auto p-4">
					{navLinks.map((link) => (
						<Link
							key={link.label}
							href={link.href}
							onClick={() => setIsOpen(false)}
							className={cn(
								"mb-1 flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-secondary",
								isActive(link.href) &&
									"bg-gabon-blue-tint text-gabon-blue",
							)}
						>
							<link.icon className="size-5" />
							<span className="font-medium" suppressHydrationWarning>
								{link.label}
							</span>
						</Link>
					))}

					<Separator className="my-4" />

					<button
						type="button"
						onClick={() => setServicesExpanded(!servicesExpanded)}
						className="flex w-full items-center justify-between rounded-xl p-3 transition-colors hover:bg-secondary"
					>
						<span className="flex items-center gap-3">
							<FileText className="size-5" />
							<span className="font-medium" suppressHydrationWarning>
								{t("header.nav.services")}
							</span>
						</span>
						<ChevronDown
							className={cn(
								"size-5 transition-transform",
								servicesExpanded && "rotate-180",
							)}
						/>
					</button>

					{servicesExpanded && (
						<div className="ml-4 mt-1 space-y-1">
							{Object.entries(ServiceCategory).map(([key, value]) => (
								<Link
									key={key}
									href={`/services?category=${value}`}
									onClick={() => setIsOpen(false)}
									className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-secondary"
								>
									<FileText className="size-4" />
									<span suppressHydrationWarning>
										{t(`services.categoriesMap.${value}`)}
									</span>
								</Link>
							))}
						</div>
					)}
				</nav>

				<div className="border-t border-border p-4">
					<p
						className="text-center text-xs text-muted-foreground"
						suppressHydrationWarning
					>
						consulat.ga · {t("header.country")}
					</p>
				</div>
			</aside>
		</>
	);
}
