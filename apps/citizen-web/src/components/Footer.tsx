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
			{ label: "Représentations diplomatiques", href: "/reps" },
		],
	},
	{
		heading: "Ressources",
		links: [
			{ label: "Actualités", href: "/news" },
			{ label: "Guides et tutoriels", href: "/ressources" },
			{
				label: "Guide d'arrivée au Gabon",
				href: "/ressources/guides/arrivee",
			},
			{ label: "Guide de retour", href: "/ressources/guides/retour" },
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
		<footer className="w-full border-t border-border bg-background">
			<div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:py-14">
				<div className="flex flex-col gap-3">
					<div className="flex items-center gap-2">
						<Shield className="size-4 text-gabon-blue" />
						<strong className="text-sm font-bold">
							{t("footer.brand.name")}
						</strong>
					</div>
					<p
						className="max-w-[320px] text-sm text-muted-foreground"
						suppressHydrationWarning
					>
						{t("footer.brand.description")}
					</p>
					<div
						aria-hidden="true"
						className="mt-2 flex h-1 w-16 overflow-hidden rounded-full"
					>
						<span className="flex-1 bg-gabon-green" />
						<span className="flex-1 bg-gabon-yellow" />
						<span className="flex-1 bg-gabon-blue" />
					</div>
				</div>

				{SECTIONS.map((section) => (
					<nav key={section.heading} aria-label={section.heading}>
						<h4 className="mb-3 text-sm font-semibold">{section.heading}</h4>
						<ul className="flex flex-col gap-2 text-sm text-muted-foreground">
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
				<div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-4 text-xs text-muted-foreground sm:flex-row sm:px-8">
					<p suppressHydrationWarning>
						{t("footer.copyright", { year: new Date().getFullYear() })}
					</p>
					<ModeToggle />
				</div>
			</div>
		</footer>
	);
}
