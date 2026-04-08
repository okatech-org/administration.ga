"use client";

import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";

import { ModeToggle } from "./mode-toggle";

export const Footer = () => {
	const currentYear = new Date().getFullYear();

	return (
		<footer className="w-full">
			<div className="border-t border-white/10 bg-[oklch(0.145_0_0)]">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
						{/* Col 1: Brand */}
						<div className="space-y-4">
							<Link to="/" className="flex items-center gap-2">
								<Shield className="h-6 w-6 text-[oklch(0.685_0.169_237.323)]" />
								<span className="font-bold text-lg text-white tracking-tight">Consulat.ga</span>
							</Link>
							<p className="text-sm text-white/60 leading-relaxed pe-4">
								Plateforme consulaire officielle de la République Gabonaise.
								Démarches, accompagnement et informations pour la diaspora.
							</p>
						</div>

						{/* Col 2: Info / Plateforme */}
						<div>
							<h4 className="font-semibold text-white mb-6">Plateforme</h4>
							<ul className="space-y-3 text-sm text-white/60">
								<li>
									<Link to="/services" className="hover:text-white transition-colors">
										Services consulaires
									</Link>
								</li>
								<li>
									<Link to="/reps" search={{ view: "grid" as any }} className="hover:text-white transition-colors">
										Réseau mondial
									</Link>
								</li>
								<li>
									<Link to="/news" className="hover:text-white transition-colors">
										Actualités
									</Link>
								</li>
								<li>
									<Link to="/ressources" className="hover:text-white transition-colors">
										Ressources
									</Link>
								</li>
							</ul>
						</div>

						{/* Col 3: Guides */}
						<div>
							<h4 className="font-semibold text-white mb-6">Guides</h4>
							<ul className="space-y-3 text-sm text-white/60">
								<li>
									<Link to="/ressources/guides/arrivee" className="hover:text-white transition-colors">
										Guide d'arrivée
									</Link>
								</li>
								<li>
									<Link to="/ressources/guides/vie-pratique" className="hover:text-white transition-colors">
										Vie pratique
									</Link>
								</li>
								<li>
									<Link to="/ressources/guides/retour" className="hover:text-white transition-colors">
										Guide de retour
									</Link>
								</li>
								<li>
									<Link to="/faq" className="hover:text-white transition-colors">
										Foire Aux Questions (FAQ)
									</Link>
								</li>
							</ul>
						</div>

						{/* Col 4: Legal */}
						<div>
							<h4 className="font-semibold text-white mb-6">Légal</h4>
							<ul className="space-y-3 text-sm text-white/60">
								<li>
									<Link to="/" className="hover:text-white transition-colors">
										Conditions générales (CGU)
									</Link>
								</li>
								<li>
									<Link to="/" className="hover:text-white transition-colors">
										Confidentialité
									</Link>
								</li>
								<li>
									<Link to="/" className="hover:text-white transition-colors">
										Accessibilité
									</Link>
								</li>
							</ul>
						</div>
					</div>

					<div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
						<p className="text-sm text-white/40">
							© {currentYear} République Gabonaise. Tous droits réservés.
						</p>
						<ModeToggle />
					</div>
				</div>
			</div>
		</footer>
	);
};
