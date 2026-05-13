"use client";

import { cn } from "@/lib/utils";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	IDENTITY_PHASES,
	type IdentityPhase,
} from "../lib/onboardingFlow";
import type { OnboardingData } from "../types";
import { BirthPhase } from "./phases/BirthPhase";
import { ContactPhase } from "./phases/ContactPhase";
import { NamePhase } from "./phases/NamePhase";
import { OtpPhase } from "./phases/OtpPhase";
import { PasswordPhase } from "./phases/PasswordPhase";
import { PassportPhase } from "./phases/PassportPhase";
import { PinPhase } from "./phases/PinPhase";

/**
 * IdentityStep coordonne les 7 sous-phases du mini-typeform :
 * name → contact → password → otp → pin → birth → passport.
 *
 * - Quand `_authState === "verified"`, on saute les phases auth (password/otp)
 *   au mount (= reprise d'un draft où l'utilisateur a déjà signup+vérifié).
 *   Le PIN n'est PAS sauté car il peut être manqué côté serveur.
 * - `_identityPhase` est persisté dans `data` pour reprendre à la bonne phase.
 *   La persistance se fait inline dans handleNext/handlePrev (pas via useEffect)
 *   pour éviter toute boucle update-render.
 * - Quand la dernière phase (`passport`) est complétée, `onComplete` est appelé
 *   pour passer à l'étape suivante du wizard (Famille / Contacts).
 */
export function IdentityStep({
	data,
	updateData,
	onComplete,
	setFile,
}: {
	data: OnboardingData;
	updateData: (patch: Partial<OnboardingData>) => void;
	onComplete: () => void;
	setFile?: (key: string, file: File) => void;
}) {
	const { t } = useTranslation();
	const verified = data._authState === "verified";

	const phases = useMemo<IdentityPhase[]>(() => IDENTITY_PHASES, []);

	const initialPhase: IdentityPhase = useMemo(() => {
		const stored = data._identityPhase;
		if (
			verified &&
			(stored === "name" ||
				stored === "contact" ||
				stored === "password" ||
				stored === "otp")
		) {
			return "pin";
		}
		if (stored && IDENTITY_PHASES.includes(stored)) return stored;
		return "name";
		// On veut l'évaluer une seule fois au mount ; les changements ultérieurs
		// de data._identityPhase passent par setPhase explicit.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const [phase, setPhase] = useState<IdentityPhase>(initialPhase);

	const phaseIndex = phases.indexOf(phase);

	const handleNext = useCallback(() => {
		const i = phases.indexOf(phase);
		if (i < phases.length - 1) {
			let nextIdx = i + 1;
			while (
				verified &&
				(phases[nextIdx] === "password" || phases[nextIdx] === "otp") &&
				nextIdx < phases.length - 1
			) {
				nextIdx++;
			}
			const next = phases[nextIdx];
			setPhase(next);
			updateData({ _identityPhase: next });
		} else {
			onComplete();
		}
	}, [phase, phases, verified, onComplete, updateData]);

	const handlePrev = useCallback(() => {
		const i = phases.indexOf(phase);
		if (i > 0) {
			let prevIdx = i - 1;
			while (
				verified &&
				(phases[prevIdx] === "password" || phases[prevIdx] === "otp") &&
				prevIdx > 0
			) {
				prevIdx--;
			}
			const prev = phases[prevIdx];
			setPhase(prev);
			updateData({ _identityPhase: prev });
		}
	}, [phase, phases, verified, updateData]);

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center gap-3.5">
				<span className="font-mono text-xs tabular-nums text-muted-foreground">
					{String(phaseIndex + 1).padStart(2, "0")} /{" "}
					{String(phases.length).padStart(2, "0")}
				</span>
				<div className="flex items-center gap-1.5">
					{phases.map((_, i) => {
						const done = i < phaseIndex;
						const cur = i === phaseIndex;
						return (
							<span
								key={i}
								aria-hidden="true"
								className={cn(
									"inline-block h-[5px] rounded-full transition-all duration-200 ease-out",
									cur ? "w-[22px]" : "w-3",
									done || cur ? "bg-gabon-blue" : "bg-border",
									done && "opacity-55",
								)}
							/>
						);
					})}
				</div>
				<span className="text-xs text-muted-foreground" suppressHydrationWarning>
					{t(`onboarding.identityPhaseLabels.${phase}`)}
				</span>
			</div>

			{phase === "name" && (
				<NamePhase
					data={data}
					updateData={updateData}
					onNext={handleNext}
					setFile={setFile}
				/>
			)}
			{phase === "contact" && (
				<ContactPhase
					data={data}
					updateData={updateData}
					onNext={handleNext}
					onPrev={handlePrev}
				/>
			)}
			{phase === "password" && (
				<PasswordPhase
					data={data}
					updateData={updateData}
					onNext={handleNext}
					onPrev={handlePrev}
				/>
			)}
			{phase === "otp" && (
				<OtpPhase
					data={data}
					updateData={updateData}
					onNext={handleNext}
					onPrev={handlePrev}
				/>
			)}
			{phase === "pin" && (
				<PinPhase
					data={data}
					updateData={updateData}
					onNext={handleNext}
					onPrev={handlePrev}
				/>
			)}
			{phase === "birth" && (
				<BirthPhase
					data={data}
					updateData={updateData}
					onNext={handleNext}
					onPrev={handlePrev}
				/>
			)}
			{phase === "passport" && (
				<PassportPhase
					data={data}
					updateData={updateData}
					onNext={handleNext}
					onPrev={handlePrev}
				/>
			)}
		</div>
	);
}
