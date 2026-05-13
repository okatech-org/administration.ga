"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CountrySelect } from "@/components/ui/country-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CountryCode, PublicUserType } from "@convex/lib/constants";
import { Home, MapPin, Phone, Plus, Trash2 } from "lucide-react";
import type { EmergencyContact, OnboardingData } from "../types";

export function ContactsStep({
	data,
	updateData,
	userType,
}: {
	data: OnboardingData;
	updateData: (patch: Partial<OnboardingData>) => void;
	userType: PublicUserType;
}) {
	const isLong = userType === PublicUserType.LongStay;
	const isForeigner =
		userType === PublicUserType.VisaTourism ||
		userType === PublicUserType.VisaBusiness ||
		userType === PublicUserType.VisaLongStay ||
		userType === PublicUserType.AdminServices;
	const wantsEmergency = isLong || isForeigner;
	const wantsHomeland = isLong;

	const emergency: EmergencyContact[] = data.emergencyContacts ?? [{}];

	const setEmergency = (next: EmergencyContact[]) =>
		updateData({ emergencyContacts: next });

	const updateEC = (i: number, key: keyof EmergencyContact, val: string) => {
		const next = [...emergency];
		next[i] = { ...next[i], [key]: val };
		setEmergency(next);
	};

	const updateAddress = (key: "full" | "city" | "postalCode" | "country", v: string) => {
		updateData({ address: { ...(data.address ?? {}), [key]: v } });
	};

	const updateHomeland = (key: "full", v: string) => {
		updateData({ homeland: { ...(data.homeland ?? {}), [key]: v } });
	};

	return (
		<div className="flex flex-col gap-5">
			<header className="flex flex-col gap-2">
				<h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
					Adresses et contacts
				</h1>
				<p className="text-sm text-muted-foreground">
					Vos coordonnées de résidence et personnes à contacter en cas
					d'urgence.
				</p>
			</header>

			<Card className="bg-muted/40">
				<CardContent className="flex flex-col gap-4 p-5">
					<div className="flex items-center gap-2">
						<MapPin className="size-4 text-gabon-blue" />
						<h3 className="text-sm font-semibold">Adresse de résidence</h3>
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor="addressFull">Adresse complète</Label>
						<Input
							id="addressFull"
							value={data.address?.full ?? ""}
							onChange={(e) => updateAddress("full", e.target.value)}
							placeholder="Commencez à taper pour des suggestions…"
						/>
					</div>
					<div className="grid gap-4 md:grid-cols-2">
						<div className="flex flex-col gap-2">
							<Label htmlFor="addressCity">Ville</Label>
							<Input
								id="addressCity"
								value={data.address?.city ?? ""}
								onChange={(e) => updateAddress("city", e.target.value)}
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="addressPostalCode">Code postal</Label>
							<Input
								id="addressPostalCode"
								value={data.address?.postalCode ?? ""}
								onChange={(e) => updateAddress("postalCode", e.target.value)}
							/>
						</div>
					</div>
					<div className="flex flex-col gap-2">
						<Label>Pays</Label>
						<CountrySelect
							type="single"
							selected={(data.address?.country as CountryCode) ?? CountryCode.FR}
							onChange={(v) => updateAddress("country", v)}
						/>
					</div>
				</CardContent>
			</Card>

			{wantsHomeland && (
				<Card className="bg-muted/40">
					<CardContent className="flex flex-col gap-4 p-5">
						<div className="flex items-center gap-2">
							<Home className="size-4 text-gabon-green" />
							<h3 className="text-sm font-semibold">Adresse au Gabon</h3>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="homelandFull">Adresse complète</Label>
							<Input
								id="homelandFull"
								value={data.homeland?.full ?? ""}
								onChange={(e) => updateHomeland("full", e.target.value)}
								placeholder="Quartier, rue, ville"
							/>
							<p className="text-xs text-muted-foreground">
								Adresse de référence dans votre pays d'origine.
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			{wantsEmergency && (
				<Card className="border-gabon-yellow/40 bg-gabon-yellow-tint/30">
					<CardContent className="flex flex-col gap-4 p-5">
						<div className="flex items-center gap-2">
							<Phone className="size-4 text-gabon-yellow" />
							<h3 className="text-sm font-semibold">Contacts d'urgence</h3>
						</div>
						<p className="text-xs text-muted-foreground">
							Au moins une personne à contacter, idéalement dans le pays de
							résidence et au Gabon.
						</p>

						<div className="flex flex-col gap-3">
							{emergency.map((ec, i) => (
								<div
									key={i}
									className="relative flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
								>
									<div className="flex items-center justify-between">
										<strong className="text-xs uppercase tracking-wide text-muted-foreground">
											Contact n°{i + 1}
										</strong>
										{emergency.length > 1 && (
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="h-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
												onClick={() =>
													setEmergency(emergency.filter((_, j) => j !== i))
												}
											>
												<Trash2 className="size-3.5" />
											</Button>
										)}
									</div>
									<div className="grid gap-3 md:grid-cols-2">
										<div className="flex flex-col gap-2">
											<Label>
												Prénom <span className="text-destructive">*</span>
											</Label>
											<Input
												value={ec.firstName ?? ""}
												onChange={(e) =>
													updateEC(i, "firstName", e.target.value)
												}
											/>
										</div>
										<div className="flex flex-col gap-2">
											<Label>
												Nom <span className="text-destructive">*</span>
											</Label>
											<Input
												value={ec.lastName ?? ""}
												onChange={(e) =>
													updateEC(i, "lastName", e.target.value)
												}
											/>
										</div>
										<div className="flex flex-col gap-2">
											<Label>
												Téléphone <span className="text-destructive">*</span>
											</Label>
											<Input
												type="tel"
												value={ec.phone ?? ""}
												onChange={(e) => updateEC(i, "phone", e.target.value)}
											/>
										</div>
										<div className="flex flex-col gap-2">
											<Label>Email</Label>
											<Input
												type="email"
												value={ec.email ?? ""}
												onChange={(e) => updateEC(i, "email", e.target.value)}
											/>
										</div>
										<div className="flex flex-col gap-2 md:col-span-2">
											<Label>Pays du contact</Label>
											<CountrySelect
												type="single"
												selected={
													(ec.country as CountryCode) ?? CountryCode.GA
												}
												onChange={(v) => updateEC(i, "country", v)}
											/>
										</div>
									</div>
								</div>
							))}
							<Button
								type="button"
								variant="outline"
								className="border-dashed"
								onClick={() => setEmergency([...emergency, {}])}
							>
								<Plus className="mr-1 size-4" />
								Ajouter un contact d'urgence
							</Button>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
