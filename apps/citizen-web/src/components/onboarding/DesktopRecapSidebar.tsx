"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicUserType } from "@convex/lib/constants";
import { Check, Info } from "lucide-react";
import type { OnboardingData } from "./types";
import type { RegistrationFiles } from "./steps/DocumentsStep";

const PROFILE_LABELS: Record<PublicUserType, string> = {
	[PublicUserType.LongStay]: "Résident à l'étranger",
	[PublicUserType.ShortStay]: "De passage",
	[PublicUserType.VisaTourism]: "Visa tourisme",
	[PublicUserType.VisaBusiness]: "Visa affaires",
	[PublicUserType.VisaLongStay]: "Visa long séjour",
	[PublicUserType.AdminServices]: "Services administratifs",
};

function SidebarLine({
	label,
	value,
}: {
	label: string;
	value?: React.ReactNode;
}) {
	return (
		<div className="flex items-baseline justify-between gap-3 text-sm">
			<span className="shrink-0 text-sm text-muted-foreground">{label}</span>
			<span className="truncate text-right font-medium">
				{value || <span className="text-muted-foreground/60">—</span>}
			</span>
		</div>
	);
}

export function DesktopRecapSidebar({
	data,
	userType,
	savedAtLabel,
	files,
}: {
	data: OnboardingData;
	userType: PublicUserType | null;
	savedAtLabel?: string;
	files?: RegistrationFiles;
}) {
	const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ");
	const addressFull =
		data.address?.full ||
		[data.address?.city, data.address?.country].filter(Boolean).join(", ");
	const docCount = files ? Object.keys(files).length : 0;

	return (
		<aside className="sticky top-6 hidden flex-col gap-4 self-start md:flex">
			<Card>
				<CardContent className="flex flex-col gap-3 p-5">
					<div className="mb-1 flex items-center justify-between">
						<p className="text-sm font-semibold">Récapitulatif</p>
						{savedAtLabel && (
							<span className="inline-flex items-center gap-1 rounded-full bg-gabon-green-tint px-2 py-0.5 text-[11px] font-medium text-gabon-green">
								<Check className="size-2.5" strokeWidth={3} />
								{savedAtLabel}
							</span>
						)}
					</div>
					<dl className="flex flex-col gap-2.5">
						<SidebarLine
							label="Profil"
							value={userType ? PROFILE_LABELS[userType] : undefined}
						/>
						<SidebarLine label="Nom complet" value={fullName || undefined} />
						<SidebarLine label="Email" value={data.email} />
						<SidebarLine label="Téléphone" value={data.phone} />
						<SidebarLine label="Date de naissance" value={data.birthDate} />
						<SidebarLine label="Nationalité" value={data.nationality} />
						<SidebarLine label="Adresse" value={addressFull || undefined} />
						<SidebarLine label="N° passeport" value={data.passportNumber} />
						<SidebarLine
							label="Documents"
							value={`${docCount} fourni(s)`}
						/>
					</dl>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="flex flex-col gap-3 p-5">
					<div className="flex items-center gap-2 text-sm font-semibold">
						<Info className="size-4 text-gabon-blue" />
						Besoin d'aide ?
					</div>
					<p className="text-xs text-muted-foreground">
						Notre équipe est disponible du lundi au vendredi, 8h-18h.
					</p>
					<Button variant="outline" size="sm" className="w-full">
						Contacter le support
					</Button>
				</CardContent>
			</Card>
		</aside>
	);
}
