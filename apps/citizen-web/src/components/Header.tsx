import { CountryCode, ServiceCategory } from "@convex/lib/constants.ts";
import { Link } from "@tanstack/react-router";
import { changeLanguage } from "i18next";
import {
	BookOpen,
	Check,
	ChevronDown,
	Compass,
	FileText,
	Globe,
	Menu,
	Newspaper,
	Plane,
	X,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import ClerkHeader from "@/components/auth/HeaderUser";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FlagIcon } from "@/components/ui/flag-icon";
import { Separator } from "@/components/ui/separator";

export default function Header() {
	const { t, i18n } = useTranslation();
	const [isOpen, setIsOpen] = useState(false);
	const [servicesExpanded, setServicesExpanded] = useState(false);
	const [ressourcesExpanded, setRessourcesExpanded] = useState(false);

	const languages = [
		{ label: "Français", value: "fr", country: CountryCode.FR },
		{ label: "English", value: "en", country: CountryCode.GB },
	];

	return (
		<>
			<header className="relative z-50">
				{/* Main Header */}
				<div className="bg-background/95 backdrop-blur-md border-b border-border">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
						{/* Logo */}
						<Link to="/" className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-md overflow-hidden shrink-0">
								<img
									src="/icons/apple-icon.png"
									alt="Logo Consulat.ga"
									className="w-10 h-10 object-contain"
								/>
							</div>
							<div className="hidden sm:block">
								<div className="font-bold text-lg text-foreground leading-tight">
									Consulat.ga
								</div>
								<div suppressHydrationWarning className="text-xs text-muted-foreground">
									{t("header.country")}
								</div>
							</div>
						</Link>

						{/* Desktop Navigation */}
						<nav className="hidden lg:flex items-center gap-2">
							{/* Services Dropdown */}
							<div className="relative group">
								<Button variant="ghost" size="sm" className="font-medium" asChild>
									<Link
										to={"/services"}
										className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
									>
										<span suppressHydrationWarning>{t("header.nav.services")}</span>
										<ChevronDown className="w-4 h-4 ml-1 opacity-50" />
									</Link>
								</Button>
								<div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
									<div className="bg-card rounded-[10px] shadow-xl border border-border p-2 min-w-[220px]">
										{Object.entries(ServiceCategory).map(([key, value]) => (
											<Link
												key={key}
												to={`/services?category=${value}` as string}
												className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors"
											>
												<span suppressHydrationWarning className="text-sm font-medium text-foreground">
													{t(`services.categoriesMap.${value}`)}
												</span>
											</Link>
										))}
									</div>
								</div>
							</div>

							<Button asChild variant="ghost" size="sm" className="font-medium">
								<Link
									to="/reps"
									search={{ view: "grid" as any }}
									className="text-muted-foreground hover:text-foreground"
									activeProps={{ className: "bg-secondary text-foreground" }}
								>
									<span suppressHydrationWarning>{t("header.nav.worldNetwork")}</span>
								</Link>
							</Button>

							{/* Actualites */}
							<Button asChild variant="ghost" size="sm" className="font-medium">
								<Link
									to="/news"
									className="text-muted-foreground hover:text-foreground"
									activeProps={{ className: "bg-secondary text-foreground" }}
								>
									<span suppressHydrationWarning>{t("header.nav.news")}</span>
								</Link>
							</Button>

							{/* Ressources Dropdown */}
							<div className="relative group">
								<Button variant="ghost" size="sm" className="font-medium" asChild>
									<Link
										to={"/ressources"}
										className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
									>
										<span suppressHydrationWarning>Ressources</span>
										<ChevronDown className="w-4 h-4 ml-1 opacity-50" />
									</Link>
								</Button>
								<div className="absolute top-full left-[-80px] pt-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
									<div className="bg-card rounded-[10px] shadow-xl border border-border p-3 w-[600px] grid grid-cols-2 gap-4">
										{/* Colonne Guides */}
										<div className="space-y-1">
											<div className="px-3 pb-2">
												<span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
													Guides et Démarches
												</span>
											</div>
											<Link
												to="/ressources/guides/arrivee"
												className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-secondary transition-colors group/item"
											>
												<div className="bg-primary/10 p-2 rounded-md shrink-0">
													<Plane className="w-4 h-4 text-primary group-hover/item:scale-110 transition-transform" />
												</div>
												<div>
													<div className="text-sm font-semibold text-foreground mb-0.5">Guide d'arrivée</div>
													<div className="text-xs text-muted-foreground leading-tight">Installation, visas, et premiers pas à l'étranger.</div>
												</div>
											</Link>
											<Link
												to="/ressources/guides/vie-pratique"
												className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-secondary transition-colors group/item"
											>
												<div className="bg-primary/10 p-2 rounded-md shrink-0">
													<Compass className="w-4 h-4 text-primary group-hover/item:scale-110 transition-transform" />
												</div>
												<div>
													<div className="text-sm font-semibold text-foreground mb-0.5">Guide Pratique</div>
													<div className="text-xs text-muted-foreground leading-tight">Logement, santé, emploi et éducation.</div>
												</div>
											</Link>
											<Link
												to="/ressources/guides/retour"
												className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-secondary transition-colors group/item"
											>
												<div className="bg-primary/10 p-2 rounded-md shrink-0">
													<Globe className="w-4 h-4 text-primary group-hover/item:scale-110 transition-transform" />
												</div>
												<div>
													<div className="text-sm font-semibold text-foreground mb-0.5">Guide de retour</div>
													<div className="text-xs text-muted-foreground leading-tight">Réinstallation et formalités pour le retour au Gabon.</div>
												</div>
											</Link>
										</div>

										{/* Colonne Académie & Communauté */}
										<div className="space-y-1 bg-muted/30 rounded-lg p-2 border border-transparent">
											<div className="px-3 pb-2 pt-1">
												<span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
													S'informer & S'engager
												</span>
											</div>
											<Link
												to="/news"
												className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-background hover:shadow-sm transition-all group/item"
											>
												<div className="bg-white dark:bg-black p-2 rounded-md border border-border shrink-0 shadow-xs">
													<Newspaper className="w-4 h-4 text-muted-foreground group-hover/item:text-foreground transition-colors" />
												</div>
												<div>
													<div className="text-sm font-semibold text-foreground mb-0.5">Actualités consulaires</div>
													<div className="text-xs text-muted-foreground leading-tight">Dernières nouvelles de la représentation diplomatique.</div>
												</div>
											</Link>
											<Link
												to="/faq"
												className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-background hover:shadow-sm transition-all group/item"
											>
												<div className="bg-white dark:bg-black p-2 rounded-md border border-border shrink-0 shadow-xs">
													<BookOpen className="w-4 h-4 text-muted-foreground group-hover/item:text-foreground transition-colors" />
												</div>
												<div>
													<div className="text-sm font-semibold text-foreground mb-0.5">Foire aux questions</div>
													<div className="text-xs text-muted-foreground leading-tight">Consultez rapidement les réponses aux interrogations fréquentes.</div>
												</div>
											</Link>
										</div>
									</div>
								</div>
							</div>
						</nav>

						{/* Right Side */}
						<div className="flex items-center gap-2">
							{/* Language Switcher Dropdown */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="sm" className="h-9 px-2 gap-1.5 border border-transparent hover:border-border">
										<FlagIcon
											countryCode={
												languages.find((l) => i18n.language.startsWith(l.value))
													?.country || CountryCode.FR
											}
											size={16}
											className="w-4 h-auto rounded-sm"
										/>
										<span suppressHydrationWarning className="uppercase text-xs font-bold text-muted-foreground">
											{i18n.language}
										</span>
										<ChevronDown className="w-3 h-3 text-muted-foreground" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="min-w-[140px]">
									{languages.map((lang) => (
										<DropdownMenuItem
											key={lang.value}
											onClick={() => changeLanguage(lang.value)}
											className="flex items-center justify-between cursor-pointer"
										>
											<span className="flex items-center gap-2">
												<FlagIcon
													countryCode={lang.country}
													size={16}
													className="w-4 h-auto rounded-sm"
												/>
												<span className="font-medium">{lang.label}</span>
											</span>
											{i18n.language.startsWith(lang.value) && (
												<Check className="w-4 h-4 text-success" />
											)}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>

							{/* Auth / My Space */}
							<div className="hidden sm:block">
								<ClerkHeader />
							</div>

							{/* Mobile Menu Button */}
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setIsOpen(true)}
								className="lg:hidden"
								aria-label="Menu"
							>
								<Menu className="w-5 h-5" />
							</Button>
						</div>
					</div>
				</div>
			</header>

			{/* Mobile Sidebar Overlay */}
			{isOpen && (
				<button
					type="button"
					className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 lg:hidden"
					onClick={() => setIsOpen(false)}
					aria-label="Fermer le menu"
				/>
			)}

			{/* Mobile Sidebar */}
			<aside
				className={`fixed top-0 left-0 h-full w-[280px] sm:w-[320px] bg-card z-50 transform transition-transform duration-300 ease-out lg:hidden flex flex-col shadow-2xl rounded-none border-r border-border ${
					isOpen ? "translate-x-0" : "-translate-x-full"
				}`}
			>
				{/* Sidebar Header */}
				<div className="flex items-center justify-between p-4 border-b border-border">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm overflow-hidden shrink-0 border border-border/50">
							<img src="/icons/apple-icon.png" alt="Logo" className="w-8 h-8 object-contain" />
						</div>
						<div>
							<div className="font-extrabold tracking-tight text-foreground">Consulat.ga</div>
						</div>
					</div>
					<Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
						<X className="w-5 h-5 text-muted-foreground" />
					</Button>
				</div>

				{/* Sidebar Navigation */}
				<nav className="flex-1 p-4 overflow-y-auto space-y-1">
					<Link
						to="/reps"
						search={{ view: "grid" as any }}
						onClick={() => setIsOpen(false)}
						className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground font-medium"
						activeProps={{ className: "bg-secondary text-foreground font-semibold" }}
					>
						<Globe className="w-5 h-5" />
						<span suppressHydrationWarning>{t("header.nav.worldNetwork")}</span>
					</Link>
					<Link
						to="/news"
						onClick={() => setIsOpen(false)}
						className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground font-medium"
						activeProps={{ className: "bg-secondary text-foreground font-semibold" }}
					>
						<Newspaper className="w-5 h-5" />
						<span suppressHydrationWarning>{t("header.nav.news")}</span>
					</Link>

					<Separator className="my-2" />

					{/* Services Accordion */}
					<div>
						<button
							type="button"
							onClick={() => setServicesExpanded(!servicesExpanded)}
							className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground font-medium"
						>
							<span className="flex items-center gap-3">
								<FileText className="w-5 h-5" />
								<span suppressHydrationWarning>{t("header.nav.services")}</span>
							</span>
							<ChevronDown
								className={`w-4 h-4 transition-transform ${servicesExpanded ? "rotate-180" : ""}`}
							/>
						</button>
						{servicesExpanded && (
							<div className="ml-5 mt-1 border-l-2 border-border/50 pl-3 py-1 space-y-1">
								{Object.entries(ServiceCategory).map(([key, value]) => (
									<Link
										key={key}
										to={`/services?category=${value}` as string}
										onClick={() => setIsOpen(false)}
										className="block py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
										activeProps={{ className: "text-primary font-medium" }}
									>
										<span suppressHydrationWarning>{t(`services.categoriesMap.${value}`)}</span>
									</Link>
								))}
							</div>
						)}
					</div>

					{/* Ressources Accordion */}
					<div>
						<button
							type="button"
							onClick={() => setRessourcesExpanded(!ressourcesExpanded)}
							className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground font-medium"
						>
							<span className="flex items-center gap-3">
								<BookOpen className="w-5 h-5" />
								<span>Ressources</span>
							</span>
							<ChevronDown
								className={`w-4 h-4 transition-transform ${ressourcesExpanded ? "rotate-180" : ""}`}
							/>
						</button>
						{ressourcesExpanded && (
							<div className="ml-5 mt-1 border-l-2 border-border/50 pl-3 py-1 space-y-1">
								<Link
									to="/ressources/guides/arrivee"
									onClick={() => setIsOpen(false)}
									className="block py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
								>
									Guide d'arrivée
								</Link>
								<Link
									to="/ressources/guides/vie-pratique"
									onClick={() => setIsOpen(false)}
									className="block py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
								>
									Guide Pratique
								</Link>
								<Link
									to="/ressources/guides/retour"
									onClick={() => setIsOpen(false)}
									className="block py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
								>
									Guide de retour
								</Link>
							</div>
						)}
					</div>
				</nav>

				{/* Mobile Auth footer */}
				<div className="p-4 border-t border-border bg-muted/10">
					<ClerkHeader />
				</div>
			</aside>
		</>
	);
}
