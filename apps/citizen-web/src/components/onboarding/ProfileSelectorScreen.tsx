"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PublicUserType } from "@convex/lib/constants";
import {
	ArrowLeft,
	ArrowRight,
	Briefcase,
	Check,
	FileText,
	Globe,
	Home,
	Plane,
	User,
} from "lucide-react";
import { useState } from "react";
import {
	FOREIGNER_VISA_TYPES,
	RECOMMENDED_PROFILE_TYPE,
} from "./lib/onboardingFlow";
import { GabonStripe } from "./ui/GabonStripe";

type PrimaryChoice = "long_stay" | "short_stay" | "foreigner";

type PrimaryProfile = {
	code: PrimaryChoice;
	title: string;
	subtitle: string;
	icon: typeof User;
	accent: "blue" | "yellow" | "green";
	benefits: string[];
};

const PRIMARY_PROFILES: PrimaryProfile[] = [
	{
		code: "long_stay",
		title: "Résident à l'étranger",
		subtitle: "Gabonais résidant à l'étranger depuis plus de 6 mois",
		icon: User,
		accent: "blue",
		benefits: [
			"Inscription consulaire complète",
			"Renouvellement de passeport",
			"Actes d'état civil",
			"Carte consulaire",
		],
	},
	{
		code: "short_stay",
		title: "De passage",
		subtitle: "Gabonais de passage à l'étranger (moins de 6 mois)",
		icon: Plane,
		accent: "yellow",
		benefits: [
			"Déclaration de passage",
			"Assistance consulaire",
			"Laissez-passer d'urgence",
		],
	},
	{
		code: "foreigner",
		title: "Usager étranger",
		subtitle: "Demandes de visa et services administratifs",
		icon: Globe,
		accent: "green",
		benefits: [
			"Demandes de visa",
			"Légalisation de documents",
			"Certificats spécifiques",
			"Assistance administrative",
		],
	},
];

const VISA_ICONS = {
	plane: Plane,
	briefcase: Briefcase,
	home: Home,
	"file-text": FileText,
} as const;

const ACCENT_CLASSES = {
	blue: {
		ring: "ring-2 ring-gabon-blue/30 border-gabon-blue",
		iconBg: "bg-gabon-blue-tint text-gabon-blue",
		check: "text-gabon-blue",
	},
	yellow: {
		ring: "ring-2 ring-gabon-yellow/30 border-gabon-yellow",
		iconBg: "bg-gabon-yellow-tint text-gabon-yellow",
		check: "text-gabon-yellow",
	},
	green: {
		ring: "ring-2 ring-gabon-green/30 border-gabon-green",
		iconBg: "bg-gabon-green-tint text-gabon-green",
		check: "text-gabon-green",
	},
} as const;

const PRIMARY_RECOMMENDED: PrimaryChoice = "long_stay";

export function ProfileSelectorScreen({
	onSelectPrimary,
	onSelectVisa,
}: {
	onSelectPrimary: (
		type: PublicUserType.LongStay | PublicUserType.ShortStay,
	) => void;
	onSelectVisa: (type: PublicUserType) => void;
}) {
	const [foreignerOpen, setForeignerOpen] = useState(false);

	const handlePrimaryClick = (code: PrimaryChoice) => {
		if (code === "foreigner") {
			setForeignerOpen(true);
			return;
		}
		if (code === "long_stay") onSelectPrimary(PublicUserType.LongStay);
		if (code === "short_stay") onSelectPrimary(PublicUserType.ShortStay);
	};

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 md:px-8 md:py-16">
			<header className="flex flex-col items-center gap-4 text-center">
				<GabonStripe />
				<h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
					Bienvenue sur Consulat.ga
				</h1>
				<p className="max-w-2xl text-base text-muted-foreground">
					Quel parcours correspond à votre situation ? Vous pourrez modifier
					votre choix plus tard si nécessaire.
				</p>
			</header>

			{!foreignerOpen ? (
				<div className="grid gap-5 md:grid-cols-3">
					{PRIMARY_PROFILES.map((p) => {
						const recommended = p.code === PRIMARY_RECOMMENDED;
						const Icon = p.icon;
						const accent = ACCENT_CLASSES[p.accent];
						return (
							<Card
								key={p.code}
								className={cn(
									"relative flex flex-col gap-4 p-6 transition-shadow",
									recommended
										? accent.ring
										: "border-border shadow-sm hover:shadow-md",
								)}
							>
								{recommended && (
									<Badge className="absolute right-4 top-4 bg-gabon-blue text-white hover:bg-gabon-blue">
										Recommandé
									</Badge>
								)}
								<div
									className={cn(
										"flex size-12 items-center justify-center rounded-xl",
										accent.iconBg,
									)}
								>
									<Icon className="size-6" />
								</div>
								<CardContent className="flex flex-1 flex-col gap-3 p-0">
									<div>
										<h3 className="text-lg font-semibold">{p.title}</h3>
										<p className="mt-1 text-sm text-muted-foreground">
											{p.subtitle}
										</p>
									</div>
									<ul className="flex flex-1 flex-col gap-1.5">
										{p.benefits.map((b) => (
											<li
												key={b}
												className="flex items-center gap-2 text-sm text-muted-foreground"
											>
												<Check
													className={cn("size-4 shrink-0", accent.check)}
													strokeWidth={2.5}
												/>
												{b}
											</li>
										))}
									</ul>
									<Button
										variant={recommended ? "default" : "outline"}
										className="mt-2 w-full"
										onClick={() => handlePrimaryClick(p.code)}
									>
										Commencer l'inscription
										<ArrowRight className="ml-1 size-4" />
									</Button>
								</CardContent>
							</Card>
						);
					})}
				</div>
			) : (
				<div className="flex flex-col gap-6">
					<div className="flex items-center justify-between">
						<Button
							variant="ghost"
							onClick={() => setForeignerOpen(false)}
							className="-ml-2"
						>
							<ArrowLeft className="mr-1 size-4" />
							Retour
						</Button>
						<h2 className="text-lg font-medium">
							Quel type de service vous concerne ?
						</h2>
						<span className="w-20" />
					</div>
					<div className="grid gap-4 md:grid-cols-2">
						{FOREIGNER_VISA_TYPES.map((v) => {
							const Icon = VISA_ICONS[v.icon];
							return (
								<Card
									key={v.code}
									className="flex cursor-pointer items-start gap-4 p-5 transition-all hover:border-gabon-green hover:shadow-md"
									onClick={() => onSelectVisa(v.code)}
								>
									<div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-gabon-green-tint text-gabon-green">
										<Icon className="size-5" />
									</div>
									<div className="flex-1">
										<h3 className="font-semibold">{v.title}</h3>
										<p className="mt-1 text-sm text-muted-foreground">
											{v.subtitle}
										</p>
									</div>
									<ArrowRight className="size-5 shrink-0 text-muted-foreground" />
								</Card>
							);
						})}
					</div>
				</div>
			)}

			<div className="flex flex-col items-center gap-2 pt-4 text-center text-sm text-muted-foreground">
				<span>Déjà un compte ?</span>
				<Button asChild variant="link" className="h-auto p-0">
					<a href="/sign-in">Se connecter</a>
				</Button>
			</div>
		</div>
	);
}
