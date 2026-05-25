const NAV_LINKS = [
	{ label: "Accueil", href: "#hero" },
	{ label: "Demandeurs d'emploi", href: "#demandeur" },
	{ label: "Employeurs", href: "#employeur" },
	{ label: "Auto-emploi", href: "#auto-emploi" },
	{ label: "Antennes", href: "#antennes" },
];

function scrollTo(href: string) {
	document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
}

export function Footer() {
	return (
		<footer className="bg-slate-950 dark:bg-black text-white">
			{/* Main content */}
			<div className="container mx-auto px-6 lg:px-12 py-16">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-12">
					{/* Col 1: Brand */}
					<div className="space-y-4">
						<div className="flex items-center gap-3">
							<div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center font-bold text-primary-foreground text-sm">
								G
							</div>
							<span className="font-display font-bold text-lg tracking-tight">
								PNPE<span className="text-emerald-400">.ga</span>
							</span>
						</div>
						<p className="text-slate-400 text-sm leading-relaxed max-w-xs">
							Pôle National de Promotion de l'Emploi du Gabon, héritier
							de l'ONE. Opérateur public au service de l'emploi salarié,
							de l'auto-emploi et de la formation professionnelle.
						</p>
						<span className="inline-block text-xs px-3 py-1 rounded-full font-medium badge-pill-landing">
							République Gabonaise
						</span>
					</div>

					{/* Col 2: Navigation */}
					<div>
						<h4 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-5">
							Navigation
						</h4>
						<ul className="space-y-3">
							{NAV_LINKS.map((link) => (
								<li key={link.href}>
									<a
										href={link.href}
										onClick={(e) => { e.preventDefault(); scrollTo(link.href); }}
										className="text-slate-400 hover:text-white text-sm transition-colors duration-200 focus-ring inline-block"
									>
										{link.label}
									</a>
								</li>
							))}
						</ul>
					</div>

					{/* Col 3: Contact */}
					<div>
						<h4 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-5">
							Contact & Informations
						</h4>
						<ul className="space-y-3 text-sm text-slate-400">
							<li>
								<span className="block text-slate-300 font-medium">
									Ministère du Travail, du Plein Emploi,
								</span>
								du Dialogue Social et de la Formation Professionnelle
							</li>
							<li>
								<span className="block text-slate-300 font-medium">Siège</span>
								Libreville, Estuaire — Gabon
							</li>
							<li>
								<a
									href="mailto:contact@pnpe.ga"
									className="hover:text-emerald-400 transition-colors duration-200 focus-ring inline-block"
								>
									contact@pnpe.ga
								</a>
							</li>
						</ul>
					</div>
				</div>
			</div>

			{/* Bottom bar */}
			<div className="border-t border-white/5">
				<div className="container mx-auto px-6 lg:px-12 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
					<p className="text-slate-500 text-xs">
						&copy; {new Date().getFullYear()} Pôle National de Promotion
						de l'Emploi — République Gabonaise. Tous droits réservés.
					</p>
					<p className="text-slate-600 text-xs">
						Partenariat technique avec l'ANINF — Protocole du 17 février 2025
					</p>
				</div>
			</div>
		</footer>
	);
}
