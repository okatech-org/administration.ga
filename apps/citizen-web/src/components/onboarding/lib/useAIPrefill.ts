"use client";

import { api } from "@convex/_generated/api";
import { useAction } from "convex/react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { OnboardingData } from "../types";

const GUEST_SESSION_KEY = "consulat_guest_session_id";

function getOrCreateGuestSessionId(): string {
	if (typeof window === "undefined") return "";
	try {
		const existing = localStorage.getItem(GUEST_SESSION_KEY);
		if (existing) return existing;
		const fresh = (crypto.randomUUID?.() ?? `g_${Date.now()}_${Math.random()}`)
			.replace(/-/g, "")
			.slice(0, 32);
		localStorage.setItem(GUEST_SESSION_KEY, fresh);
		return fresh;
	} catch {
		return `g_${Date.now()}`;
	}
}

type ExtractionResult = {
	success: boolean;
	data: {
		basicInfo: {
			firstName?: string;
			lastName?: string;
			gender?: "male" | "female";
			birthDate?: string;
			birthPlace?: string;
			birthCountry?: string;
			nationality?: string;
			nip?: string;
		};
		passportInfo: {
			number?: string;
			issueDate?: string;
			expiryDate?: string;
			issuingAuthority?: string;
		};
		familyInfo: {
			maritalStatus?: string;
			fatherFirstName?: string;
			fatherLastName?: string;
			motherFirstName?: string;
			motherLastName?: string;
			spouseFirstName?: string;
			spouseLastName?: string;
		};
		contactInfo: {
			street?: string;
			city?: string;
			postalCode?: string;
			country?: string;
		};
	};
	confidence: number;
	extractedFrom: string[];
	warnings: string[];
	error?: string;
};

const GENDER_MAP: Record<string, "Male" | "Female"> = {
	male: "Male",
	female: "Female",
};

const MARITAL_MAP: Record<string, OnboardingData["maritalStatus"]> = {
	single: "Single",
	celibataire: "Single",
	"célibataire": "Single",
	married: "Married",
	marie: "Married",
	"marié": "Married",
	mariee: "Married",
	"mariée": "Married",
	divorced: "Divorced",
	"divorcé": "Divorced",
	"divorcée": "Divorced",
	widowed: "Widowed",
	veuf: "Widowed",
	veuve: "Widowed",
};

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(reader.error);
		reader.onload = () => {
			const result = reader.result as string;
			const base64 = result.split(",")[1] ?? "";
			resolve({ base64, mimeType: file.type });
		};
		reader.readAsDataURL(file);
	});
}

function mapToOnboardingData(
	result: ExtractionResult,
): { patch: Partial<OnboardingData>; count: number } {
	const { basicInfo, passportInfo, familyInfo, contactInfo } = result.data;
	const patch: Partial<OnboardingData> = {};

	if (basicInfo.firstName) patch.firstName = basicInfo.firstName;
	if (basicInfo.lastName) patch.lastName = basicInfo.lastName;
	if (basicInfo.gender && GENDER_MAP[basicInfo.gender]) {
		patch.gender = GENDER_MAP[basicInfo.gender];
	}
	if (basicInfo.birthDate) patch.birthDate = basicInfo.birthDate;
	if (basicInfo.birthPlace) patch.birthPlace = basicInfo.birthPlace;
	if (basicInfo.birthCountry) patch.birthCountry = basicInfo.birthCountry;
	if (basicInfo.nationality) patch.nationality = basicInfo.nationality;
	if (basicInfo.nip) patch.nip = basicInfo.nip;

	if (passportInfo.number) patch.passportNumber = passportInfo.number;
	if (passportInfo.issueDate) patch.passportIssueDate = passportInfo.issueDate;
	if (passportInfo.expiryDate)
		patch.passportExpiryDate = passportInfo.expiryDate;
	if (passportInfo.issuingAuthority)
		patch.passportIssuingAuthority = passportInfo.issuingAuthority;

	if (familyInfo.maritalStatus) {
		const m = MARITAL_MAP[familyInfo.maritalStatus.toLowerCase()];
		if (m) patch.maritalStatus = m;
	}
	if (familyInfo.fatherFirstName)
		patch.fatherFirstName = familyInfo.fatherFirstName;
	if (familyInfo.fatherLastName)
		patch.fatherLastName = familyInfo.fatherLastName;
	if (familyInfo.motherFirstName)
		patch.motherFirstName = familyInfo.motherFirstName;
	if (familyInfo.motherLastName)
		patch.motherLastName = familyInfo.motherLastName;
	if (familyInfo.spouseFirstName)
		patch.spouseFirstName = familyInfo.spouseFirstName;
	if (familyInfo.spouseLastName)
		patch.spouseLastName = familyInfo.spouseLastName;

	const hasAddr =
		contactInfo.street ||
		contactInfo.city ||
		contactInfo.postalCode ||
		contactInfo.country;
	if (hasAddr) {
		patch.address = {
			street: contactInfo.street,
			city: contactInfo.city,
			postalCode: contactInfo.postalCode,
			country: contactInfo.country,
		};
	}

	const count = Object.keys(patch).length;
	return { patch, count };
}

export type AIPrefillState = {
	status: "idle" | "uploading" | "analyzing" | "success" | "error";
	count?: number;
	error?: string;
};

export function useAIPrefill({
	onApply,
}: {
	onApply: (patch: Partial<OnboardingData>) => void;
}) {
	const extract = useAction(
		api.ai.documentExtraction.extractRegistrationDataFromImages,
	);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [state, setState] = useState<AIPrefillState>({ status: "idle" });
	const guestSessionId = useMemo(() => getOrCreateGuestSessionId(), []);

	const reset = useCallback(() => setState({ status: "idle" }), []);

	const runOnFiles = useCallback(
		async (rawFiles: File[]) => {
			if (rawFiles.length === 0) return;
			setState({ status: "uploading" });
			try {
				const images = await Promise.all(
					rawFiles
						.filter(
							(f) =>
								f.type.startsWith("image/") ||
								f.type === "application/pdf",
						)
						.map(fileToBase64),
				);
				if (images.length === 0) {
					setState({
						status: "error",
						error: "Formats supportés : JPG, PNG, PDF.",
					});
					return;
				}
				setState({ status: "analyzing" });
				const result = (await extract({
					images,
					guestSessionId,
				})) as ExtractionResult;
				if (!result.success) {
					setState({
						status: "error",
						error:
							result.error?.replace(/^RATE_LIMITED:/, "") ||
							"L'analyse a échoué. Réessayez.",
					});
					return;
				}
				const { patch, count } = mapToOnboardingData(result);
				if (count === 0) {
					setState({
						status: "error",
						error:
							"Aucun champ n'a pu être extrait. Vérifiez la qualité des documents.",
					});
					return;
				}
				onApply(patch);
				setState({ status: "success", count });
			} catch (err) {
				console.error("AI prefill failed:", err);
				setState({
					status: "error",
					error: err instanceof Error ? err.message : "L'analyse a échoué.",
				});
			}
		},
		[extract, onApply, guestSessionId],
	);

	const openPicker = useCallback(() => {
		inputRef.current?.click();
	}, []);

	const handleFiles = useCallback(
		async (files: FileList | null) => {
			if (!files || files.length === 0) return;
			await runOnFiles(Array.from(files));
			if (inputRef.current) inputRef.current.value = "";
		},
		[runOnFiles],
	);

	return { inputRef, state, openPicker, handleFiles, runOnFiles, reset };
}
