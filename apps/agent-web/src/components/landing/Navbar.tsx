import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Moon, Sun, Menu, X, Globe } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface NavbarProps {
	activePanel: number;
	onNavigate: (index: number) => void;
	/** Scroll to the sign-in card on the hero panel */
	onScrollToSignIn?: () => void;
}

export function Navbar({ activePanel, onNavigate, onScrollToSignIn }: NavbarProps) {
	const [mobileOpen, setMobileOpen] = useState(false);
	const { theme, setTheme } = useTheme();
	const { t, i18n } = useTranslation();

	const currentLang = i18n.language?.startsWith("fr") ? "fr" : "en";
	const toggleLang = () => i18n.changeLanguage(currentLang === "fr" ? "en" : "fr");

	// Tous les panels ont un fond sombre unifié
	const isDark = true;

	const NAV_PANELS = [
		{ label: t("agentLanding.navbar.home"), index: 0 },
		{ label: t("agentLanding.navbar.missions"), index: 1 },
		{ label: t("agentLanding.navbar.values"), index: 2 },
		{ label: t("agentLanding.navbar.resources"), index: 3 },
		{ label: t("agentLanding.navbar.tutorials"), index: 4 },
	];

	const handleNavigate = (index: number) => {
		setMobileOpen(false);
		onNavigate(index);
	};

	return (
		<motion.nav
			initial={{ y: -80, opacity: 0 }}
			animate={{ y: 0, opacity: 1 }}
			transition={{ duration: 0.5, ease: "easeOut" }}
			className="fixed top-0 inset-x-0 z-50 transition-all duration-300 bg-transparent"
		>
			<div className="container mx-auto px-6 lg:px-12">
				<div className="flex items-center h-16 lg:h-20 gap-6">

					{/* ── Logo ── */}
					<button
						type="button"
						onClick={() => handleNavigate(0)}
						className="flex items-center gap-3 shrink-0 group focus-ring"
					>
						<div className={cn(
							"w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-300",
							isDark
								? "bg-white/15 text-white backdrop-blur-sm border border-white/20"
								: "bg-primary text-primary-foreground shadow-elegant",
						)}>
							G
						</div>
						<span className={cn(
							"font-display font-black text-lg tracking-tight transition-colors duration-300",
							isDark ? "text-white" : "text-foreground",
						)}>
							DIPLOMATE<span className={isDark ? "text-emerald-400" : "text-primary"}>.GA</span>
						</span>
					</button>

					{/* ── Desktop nav links ── */}
					<nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
						{NAV_PANELS.map((panel) => {
							const active = activePanel === panel.index;
							return (
								<button
									key={panel.index}
									type="button"
									onClick={() => handleNavigate(panel.index)}
									className={cn(
										"relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 focus-ring",
										active
											? isDark ? "text-white" : "text-primary"
											: isDark
												? "text-white/70 hover:text-white hover:bg-white/10"
												: "text-muted-foreground hover:text-foreground hover:bg-muted",
									)}
								>
									{panel.label}
									{active && (
										<motion.span
											layoutId="nav-indicator"
											className={cn(
												"absolute inset-x-4 -bottom-0.5 h-0.5 rounded-full",
												isDark ? "bg-white/60" : "bg-primary",
											)}
											transition={{ type: "spring", stiffness: 350, damping: 30 }}
										/>
									)}
								</button>
							);
						})}
					</nav>

					{/* ── Right controls ── */}
					<div className="flex items-center gap-1.5 ml-auto">
						{/* Language toggle */}
						<button
							type="button"
							onClick={toggleLang}
							className={cn(
								"hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 focus-ring",
								isDark
									? "text-white/80 hover:text-white hover:bg-white/10"
									: "text-muted-foreground hover:text-foreground hover:bg-muted",
							)}
							aria-label="Changer la langue"
						>
							<Globe className="size-3.5" />
							<span className="uppercase text-xs font-semibold">{currentLang}</span>
						</button>

						{/* Dark/light toggle */}
						<button
							type="button"
							onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
							className={cn(
								"p-2.5 rounded-xl transition-all duration-200 focus-ring",
								isDark
									? "text-white/80 hover:text-white hover:bg-white/10"
									: "text-muted-foreground hover:text-foreground hover:bg-muted",
							)}
							aria-label="Changer le thème"
						>
							{theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
						</button>

						{/* CTA Espace Agent — scroll vers le formulaire de connexion */}
						<button
							type="button"
							onClick={() => {
								handleNavigate(0);
								// Petit délai pour laisser le scroll au panel 0 s'effectuer
								setTimeout(() => onScrollToSignIn?.(), 300);
							}}
							className={cn(
								"hidden md:flex px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 focus-ring",
								isDark
									? "bg-white/15 text-white border border-white/25 hover:bg-white/25 backdrop-blur-sm"
									: "bg-primary text-primary-foreground shadow-elegant hover:shadow-elegant-hover hover:-translate-y-0.5",
							)}
						>
							{t("agentLanding.navbar.agentSpace")}
						</button>

						{/* Mobile burger */}
						<button
							type="button"
							onClick={() => setMobileOpen(!mobileOpen)}
							className={cn(
								"md:hidden p-2.5 rounded-xl transition-colors focus-ring",
								isDark ? "text-white hover:bg-white/10" : "text-foreground hover:bg-muted",
							)}
							aria-label="Menu"
						>
							{mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
						</button>
					</div>
				</div>
			</div>

			{/* ── Mobile menu ── */}
			<AnimatePresence>
				{mobileOpen && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: "auto" }}
						exit={{ opacity: 0, height: 0 }}
						transition={{ duration: 0.25 }}
						className="md:hidden overflow-hidden bg-white/5 backdrop-blur-xl border-t border-white/10"
					>
						<div className="container mx-auto px-6 py-4 space-y-1">
							{NAV_PANELS.map((panel) => {
								const active = activePanel === panel.index;
								return (
									<button
										key={panel.index}
										type="button"
										onClick={() => handleNavigate(panel.index)}
										className={cn(
											"flex items-center w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left",
											active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
										)}
									>
										{active && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2.5 shrink-0" />}
										{panel.label}
									</button>
								);
							})}
							{/* Mobile controls */}
							<div className="flex items-center gap-2 pt-2 border-t border-white/10">
								<button
									type="button"
									onClick={toggleLang}
									className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
								>
									<Globe className="size-3.5" />
									<span className="uppercase text-xs font-semibold">{currentLang}</span>
								</button>
								<button
									type="button"
									onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
									className="p-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
								>
									{theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
								</button>
								<button
									type="button"
									onClick={() => {
										handleNavigate(0);
										setTimeout(() => onScrollToSignIn?.(), 300);
									}}
									className="ml-auto px-4 py-2.5 rounded-xl bg-white/15 text-white border border-white/25 text-sm font-semibold"
								>
									{t("agentLanding.navbar.agentSpace")}
								</button>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.nav>
	);
}
