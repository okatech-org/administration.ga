"use client";

import { api } from "@convex/_generated/api";
import { useAction } from "convex/react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { OnboardingData } from "../types";
import { getOrCreateGuestSessionId } from "./guestSession";

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

export type AIScanSuccessProps = {
	documents_scanned: number;
	fields_extracted: number;
	scan_duration_ms: number;
	confidence: number;
};

export type AIScanFailedProps = {
	error_type: "no_documents" | "rate_limited" | "extraction_error";
	documents_attempted: number;
};

export function useAIPrefill({
	onApply,
	onScanSuccess,
	onScanFailed,
}: {
	onApply: (patch: Partial<OnboardingData>) => void;
	onScanSuccess?: (props: AIScanSuccessProps) => void;
	onScanFailed?: (props: AIScanFailedProps) => void;
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
			if (rawFiles.length === 0) {
				onScanFailed?.({
					error_type: "no_documents",
					documents_attempted: 0,
				});
				return;
			}
			const scanStart = Date.now();
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
					onScanFailed?.({
						error_type: "no_documents",
						documents_attempted: rawFiles.length,
					});
					return;
				}
				setState({ status: "analyzing" });
				const result = (await extract({
					images,
					guestSessionId,
				})) as ExtractionResult;
				if (!result.success) {
					const isRateLimit = result.error?.startsWith("RATE_LIMITED:");
					setState({
						status: "error",
						error:
							result.error?.replace(/^RATE_LIMITED:/, "") ||
							"L'analyse a échoué. Réessayez.",
					});
					onScanFailed?.({
						error_type: isRateLimit ? "rate_limited" : "extraction_error",
						documents_attempted: rawFiles.length,
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
					onScanFailed?.({
						error_type: "extraction_error",
						documents_attempted: rawFiles.length,
					});
					return;
				}
				onApply(patch);
				setState({ status: "success", count });
				onScanSuccess?.({
					documents_scanned: rawFiles.length,
					fields_extracted: count,
					scan_duration_ms: Date.now() - scanStart,
					confidence: result.confidence ?? 0,
				});
			} catch (err) {
				console.error("AI prefill failed:", err);
				setState({
					status: "error",
					error: err instanceof Error ? err.message : "L'analyse a échoué.",
				});
				onScanFailed?.({
					error_type: "extraction_error",
					documents_attempted: rawFiles.length,
				});
			}
		},
		[extract, onApply, guestSessionId, onScanSuccess, onScanFailed],
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
