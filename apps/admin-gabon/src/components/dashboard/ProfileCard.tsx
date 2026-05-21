import Link from "next/link";
import { MapPin, ChevronRight, Baby, Building2, Phone } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/my-space/flat-card";
import {
	USER_TYPE_DISPLAY,
	GENDER_DISPLAY,
	MARITAL_STATUS_DISPLAY,
	computeAge,
	getInitials,
	formatFirstName,
	formatLastName,
} from "@/components/admin/profiles-columns";
import { getCountryFlag, getCountryName, getOrgTypeEmoji, getOrgTypeLabel } from "@/lib/country-utils";

interface ProfileCardProps {
	profile: any; // The enriched profile returned by searchProfiles
}

export function ProfileCard({ profile }: ProfileCardProps) {
	const firstName = formatFirstName(profile.identity?.firstName);
	const lastName = formatLastName(profile.identity?.lastName);
	const phone = profile.contacts?.mobile || profile.contacts?.phone;
	const email = profile.user?.email || profile.contacts?.email;

	const countryCode = profile.countryOfResidence || profile.addresses?.residence?.country;
	
	const imgSrc = profile.photoUrl || profile.avatarUrl;
	
	const userType = profile.userType;
	const typeDisplay = userType ? USER_TYPE_DISPLAY[userType] : null;

	const gender = profile.identity?.gender ? GENDER_DISPLAY[profile.identity?.gender] : null;
	const age = computeAge(profile.identity?.birthDate);
	const marital = profile.family?.maritalStatus ? MARITAL_STATUS_DISPLAY[profile.family.maritalStatus] : null;
	
	const org = profile.managedByOrg || profile.signaledToOrg;
	const isSignaled = !profile.managedByOrg && !!profile.signaledToOrg;

	return (
		<FlatCard className="hover:border-primary/50 transition-colors group flex flex-col h-full overflow-hidden">
			<div className="p-3 lg:p-4 pb-3 flex-1 relative">
				<div className="flex justify-between items-start gap-3 mt-1">
					<div className="flex gap-3 min-w-0 w-full">
						<Avatar className="h-14 w-14 border shrink-0">
							<AvatarImage src={imgSrc} alt={firstName ?? "profil"} className="object-cover" />
							<AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
								{getInitials(firstName, lastName, email)}
							</AvatarFallback>
						</Avatar>
						<div className="min-w-0 flex-1 pr-2">
							{typeDisplay && (
								<div className="mb-1.5">
									<Badge variant="outline" className={`text-[10px] truncate ${typeDisplay.className}`}>
										{typeDisplay.emoji} <span className="hidden sm:inline-block ml-1 truncate">{typeDisplay.label}</span>
									</Badge>
								</div>
							)}
							<div className="leading-tight">
								<div className="text-base font-bold uppercase truncate tracking-wide" title={lastName}>{lastName}</div>
								{firstName && (
									<div className="text-sm font-medium text-muted-foreground truncate mt-0.5" title={firstName}>{firstName}</div>
								)}
							</div>
							
							<div className="mt-1.5">
								{phone ? (
									<a href={`tel:${phone.replace(/\s+/g, '')}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors py-1 px-2 -ml-2 rounded-md hover:bg-primary/10">
										<Phone className="h-3.5 w-3.5 shrink-0" />
										<span className="truncate">{phone}</span>
									</a>
								) : (
									<div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
										<Phone className="h-3.5 w-3.5 shrink-0 opacity-70" />
										<span className="truncate">Numéro non renseigné</span>
									</div>
								)}
							</div>
							
							{/* Demographics Strip */}
							<div className="flex items-center gap-1.5 flex-wrap mt-2">
								{gender && (
									<span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-muted/60" title={gender.label === "H" ? "Homme" : "Femme"}>
										<span>{gender.emoji}</span>
									</span>
								)}
								{age !== null && (
									<span className="text-xs px-1.5 py-0.5 rounded bg-muted/60 font-medium" title="Âge">
										{age} ans
									</span>
								)}
								{marital && (
									<span className="text-xs px-1.5 py-0.5 rounded bg-muted/60 hidden sm:inline-block truncate max-w-[100px]" title="Situation familiale">
										{marital}
									</span>
								)}
								{profile.childCount > 0 && (
									<span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-500/10 font-medium" title={`${profile.childCount} enfant(s)`}>
										<Baby className="h-3 w-3" />
										{profile.childCount}
									</span>
								)}
								{profile.completionScore !== undefined && (
									<span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ml-auto ${profile.completionScore >= 80 ? 'text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-500/10 dark:border-green-500/20' : 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20'}`}>
										{profile.completionScore}%
									</span>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="px-3 lg:px-4 pb-4 space-y-3 mt-auto">
				<div className="flex flex-col gap-2 text-sm bg-muted/30 p-2.5 rounded-lg border border-border/50">
					{/* Country Row */}
					<div className="flex items-center gap-2 text-muted-foreground">
						<MapPin className="h-3.5 w-3.5 shrink-0" />
						{countryCode ? (
							<span className="flex items-center gap-1.5 truncate">
								<span>{getCountryFlag(countryCode)}</span>
								<span className="truncate font-medium text-foreground">{getCountryName(countryCode)}</span>
							</span>
						) : (
							<span className="truncate text-xs">Pays non renseigné</span>
						)}
					</div>
					
					{/* Org Row */}
					{org && (
						<div className="flex items-start gap-2 text-muted-foreground mt-0.5">
							<Building2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
							<div className="min-w-0 leading-tight">
								<div className="font-medium text-foreground text-xs truncate" title={org.name}>
									{org.shortName || org.name}
								</div>
								<div className="text-[10px] truncate opacity-80 mt-0.5 lg:whitespace-normal">
									{getOrgTypeEmoji(org.type)} {getOrgTypeLabel(org.type)}
									{isSignaled && <span className="text-orange-600 dark:text-orange-400 font-medium ml-1">· En signalement</span>}
								</div>
							</div>
						</div>
					)}
				</div>

				<div className="pt-1">
					<Button
						variant="outline"
						size="sm"
						className="w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all active:scale-[0.97] transition-transform"
						asChild
					>
						<Link
							href={`/profiles/${profile._id}`}
						>
							Dossier complet
							<ChevronRight className="h-3.5 w-3.5 ml-1.5 opacity-70 group-hover:opacity-100" />
						</Link>
					</Button>
				</div>
			</div>
		</FlatCard>
	);
}
