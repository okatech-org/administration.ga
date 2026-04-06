import { api } from "@convex/_generated/api";
import { OrganizationType } from "@convex/lib/constants";
import Link from "next/link";
import {
	ArrowRight,
	Building2,
	Clock,
	ExternalLink,
	MapPin,
	Phone,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useConvexQuery } from "@/integrations/convex/hooks";

const countryNames: Record<string, string> = {
	FR: "France",
	BE: "Belgique",
	US: "États-Unis",
	GB: "Royaume-Uni",
	DE: "Allemagne",
	ES: "Espagne",
	IT: "Italie",
	CH: "Suisse",
	CA: "Canada",
	GA: "Gabon",
	TH: "Thaïlande",
	PH: "Philippines",
	MU: "Maurice",
	GQ: "Guinée Équatoriale",
};

function formatAddress(address: {
	street: string;
	city: string;
	postalCode: string;
}) {
	return `${address.street}, ${address.postalCode} ${address.city}`;
}

function formatOpeningHours(openingHours?: {
	monday?: { open: string; close: string };
}) {
	if (openingHours?.monday) {
		return `Lun-Ven: ${openingHours.monday.open}-${openingHours.monday.close}`;
	}
	return "Lun-Ven: 9h00-16h00";
}

function useUserCountry() {
	const [country, setCountry] = useState<string | null>(null);
	const [isDetecting, setIsDetecting] = useState(true);

	useEffect(() => {
		const detectCountry = async () => {
			try {
				const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
				const timezoneToCountry: Record<string, string> = {
					"Europe/Paris": "FR",
					"Europe/Brussels": "BE",
					"Europe/London": "GB",
					"America/New_York": "US",
					"America/Los_Angeles": "US",
					"America/Chicago": "US",
					"Europe/Berlin": "DE",
					"Europe/Madrid": "ES",
					"Europe/Rome": "IT",
					"Europe/Zurich": "CH",
					"America/Toronto": "CA",
					"Africa/Libreville": "GA",
					"Asia/Bangkok": "TH",
					"Asia/Manila": "PH",
					"Indian/Mauritius": "MU",
					"Africa/Malabo": "GQ",
				};

				const detectedCountry = timezoneToCountry[timezone];
				setCountry(detectedCountry || "FR");
			} catch {
				setCountry("FR");
			} finally {
				setIsDetecting(false);
			}
		};

		detectCountry();
	}, []);

	return { country, isDetecting };
}

function OrgCardSkeleton() {
	return (
		<Card className="relative">
			<CardHeader className="pb-2">
				<div className="flex items-start gap-4">
					<Skeleton className="h-12 w-12 rounded-xl" />
					<div className="space-y-2">
						<Skeleton className="h-5 w-32" />
						<Skeleton className="h-4 w-24" />
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-4 w-40" />
			</CardContent>
		</Card>
	);
}

interface NearbyOrgsProps {
	maxItems?: number;
	showTitle?: boolean;
}

export function NearbyOrgs({
	maxItems = 3,
	showTitle = true,
}: NearbyOrgsProps) {
	const { t } = useTranslation();
	const { country, isDetecting } = useUserCountry();

	const { data: orgs } = useConvexQuery(
		api.functions.orgs.list,
		country ? { country } : "skip",
	);

	const isLoading = isDetecting || orgs === undefined;
	const countryName = country ? countryNames[country] || country : "";

	if (!isLoading && (!orgs || orgs.length === 0)) {
		return null;
	}

	return (
		<div className="space-y-6">
			{showTitle && (
				<div className="flex items-center justify-between">
					<div>
						<h3 className="text-xl font-semibold flex items-center gap-2">
							<Building2 className="w-5 h-5 text-primary" />
							{t("nearbyOrgs.title")}
						</h3>
						{!isLoading && countryName && (
							<p className="text-sm text-muted-foreground mt-1">
								{t("nearbyOrgs.inCountry", "En {{country}}", {
									country: countryName,
								})}
							</p>
						)}
					</div>
					<Button asChild variant="outline" size="sm">
						<Link href="/reps?view=grid">
							{t("nearbyOrgs.viewAll")}
							<ArrowRight className="w-4 h-4 ml-1" />
						</Link>
					</Button>
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
				{isLoading ? (
					<>
						<OrgCardSkeleton />
						<OrgCardSkeleton />
						<OrgCardSkeleton />
					</>
				) : (
					orgs?.slice(0, maxItems).map((org) => {
						const isPrimary =
							org.type === OrganizationType.Embassy ||
							org.type === OrganizationType.GeneralConsulate;
						const orgCountryName =
							countryNames[org.address.country] || org.address.country;

						return (
							<Card
								key={org._id}
								className={`relative ${
									isPrimary
										? "bg-primary/5 border-primary/20 hover:border-primary/40"
										: "hover:border-primary/30"
								}`}
							>
								{isPrimary && (
									<Badge className="absolute top-4 right-4">
										{org.type === OrganizationType.Embassy
											? t("consulates.embassy")
											: t("consulates.headquarters")}
									</Badge>
								)}

								<CardHeader className="pb-2">
									<div className="flex items-start gap-4">
										<div className="p-3 rounded-xl bg-primary/10 text-primary">
											<MapPin className="w-6 h-6" />
										</div>
										<div>
											<CardTitle className="text-xl">
												{org.address.city}
											</CardTitle>
											<CardDescription>{orgCountryName}</CardDescription>
										</div>
									</div>
								</CardHeader>

								<CardContent className="space-y-3 text-sm">
									<div className="flex items-start gap-3">
										<MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
										<span className="text-foreground">
											{formatAddress(org.address)}
										</span>
									</div>
									{org.phone && (
										<div className="flex items-center gap-3">
											<Phone className="w-4 h-4 text-muted-foreground shrink-0" />
											<a
												href={`tel:${org.phone.replace(/\s/g, "")}`}
												className="text-primary hover:underline"
											>
												{org.phone}
											</a>
										</div>
									)}
									<div className="flex items-center gap-3">
										<Clock className="w-4 h-4 text-muted-foreground shrink-0" />
										<span className="text-foreground">
											{formatOpeningHours(org.openingHours)}
										</span>
									</div>
								</CardContent>

								<Separator className="mx-6" />

								<CardFooter className="pt-4">
									<Link
										href={`/reps/${org.slug}`}
										className="inline-flex items-center gap-2 text-primary font-medium hover:underline text-sm"
									>
										{t("consulates.viewDetails")}
										<ExternalLink className="w-4 h-4" />
									</Link>
								</CardFooter>
							</Card>
						);
					})
				)}
			</div>
		</div>
	);
}

export default NearbyOrgs;
