"use client";

import { ModeToggle } from "@/components/mode-toggle";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Shield } from "lucide-react";

type Section = {
	heading: string;
	links: { label: string; href: string }[];
};

const SECTIONS: Section[] = [
	{
		heading: "Services",
		links: [
			{ label: "Catalogue des services", href: "/services" },
			{ label: "Tarifs", href: "/tarifs" },
			{ label: "Formulaires à télécharger", href: "/formulaires" },
		],
	},
	{
		heading: "Ressources",
		links: [
			{ label: "Actualités", href: "/news" },
			{ label: "Guides et tutoriels", href: "/ressources" },
			{ label: "Foire aux questions", href: "/faq" },
		],
	},
	{
		heading: "À propos",
		links: [
			{ label: "Mentions légales", href: "/mentions-legales" },
			{ label: "Politique de confidentialité", href: "/confidentialite" },
			{ label: "Accessibilité", href: "/accessibilite" },
		],
	},
];

export function Footer() {
	const { t } = useTranslation();
	return (
		<footer className="w-full border-t border-border bg-background text-sm text-muted-foreground">
			<div className="grid gap-8 px-6 pb-10 pt-10 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:pb-12 md:pt-14">
				<div className="flex flex-col gap-3">
					<div className="flex items-center gap-2">
						<Shield className="size-4 text-gabon-blue" />
						<strong className="text-sm font-bold text-foreground">
							{t("footer.brand.name", "Consulat.ga")}
						</strong>
					</div>
					<p
						className="max-w-[320px] text-sm leading-relaxed"
						suppressHydrationWarning
					>
						{t(
							"footer.brand.description",
							"Plateforme officielle des services consulaires de la République Gabonaise à travers le monde.",
						)}
					</p>
					<div
						aria-hidden="true"
						className="mt-1 flex h-1 w-16 overflow-hidden rounded-full"
					>
						<span className="flex-1 bg-gabon-green" />
						<span className="flex-1 bg-gabon-yellow" />
						<span className="flex-1 bg-gabon-blue" />
					</div>
				</div>

				{SECTIONS.map((section) => (
					<nav key={section.heading} aria-label={section.heading}>
						<h4 className="mb-3 text-sm font-semibold text-foreground">
							{section.heading}
						</h4>
						<ul className="flex flex-col gap-2">
							{section.links.map((l) => (
								<li key={l.href}>
									<Link
										href={l.href}
										className="transition-colors hover:text-foreground"
									>
										{l.label}
									</Link>
								</li>
							))}
						</ul>
					</nav>
				))}
			</div>

			<div className="border-t border-border">
				<div className="flex flex-col items-center justify-between gap-3 px-6 py-4 text-xs sm:flex-row sm:px-8">
					<p suppressHydrationWarning>
						{t("footer.copyright", {
							year: new Date().getFullYear(),
							defaultValue: `© ${new Date().getFullYear()} Consulat.ga — République Gabonaise. Tous droits réservés.`,
						})}
					</p>
					<ModeToggle />
				</div>
			</div>
		</footer>
	);
}
