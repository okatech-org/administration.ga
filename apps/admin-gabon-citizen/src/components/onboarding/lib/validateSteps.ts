import { PublicUserType } from "@convex/lib/constants";
import type { OnboardingStepDef, OnboardingStepKey } from "./onboardingFlow";
import {
	birthSchema,
	contactSchema,
	contactsSchemaFor,
	documentsSchemaFor,
	familySchema,
	nameSchema,
	passportSchema,
	professionSchema,
} from "./schemas";
import { getDocsForUserType } from "../steps/DocumentsStep";
import type { RegistrationFiles } from "../steps/DocumentsStep";
import type { OnboardingData } from "../types";

export type ValidatableStepKey = Exclude<OnboardingStepKey, "review">;

/**
 * Liste les étapes du wizard dont la donnée actuelle ne satisfait pas le
 * schéma Zod correspondant. Sert :
 *   - À `ReviewStep` pour afficher la liste « étapes incomplètes » et
 *     désactiver le bouton Soumettre.
 *   - À `OnboardingShell` pour clamper la restauration `?step=` : on ne
 *     laisse pas l'utilisateur atterrir sur une étape dont les prérequis
 *     ne sont pas remplis (URL partagée, draft purgé d'un côté, etc.).
 *
 * IMPORTANT : la validation `documents` lit `files` ET `data.documents`.
 * Depuis la persistance IndexedDB, `data.documents` est rebuild au mount
 * depuis les blobs réels — un filename sans blob n'existe plus.
 */
export function computeIncompleteSteps(
	data: OnboardingData,
	files: RegistrationFiles,
	userType: PublicUserType,
): ValidatableStepKey[] {
	const incomplete: ValidatableStepKey[] = [];

	const identityChecks = [
		nameSchema.safeParse({
			firstName: data.firstName,
			lastName: data.lastName,
		}),
		contactSchema.safeParse({ email: data.email, phone: data.phone }),
		birthSchema.safeParse({
			birthDate: data.birthDate,
			birthPlace: data.birthPlace,
			birthCountry: data.birthCountry,
			gender: data.gender,
			nationality: data.nationality,
			nationalityAcquisition: data.nationalityAcquisition,
			nip: data.nip,
		}),
		passportSchema.safeParse({
			passportNumber: data.passportNumber,
			passportIssuingAuthority: data.passportIssuingAuthority,
			passportIssueDate: data.passportIssueDate,
			passportExpiryDate: data.passportExpiryDate,
		}),
	];
	if (identityChecks.some((r) => !r.success)) incomplete.push("identity");

	const trailingSteps: ReadonlyArray<ValidatableStepKey> =
		userType === PublicUserType.LongStay
			? ["family", "contacts", "profession", "documents"]
			: ["contacts", "documents"];

	for (const step of trailingSteps) {
		if (step === "family") {
			if (
				!familySchema.safeParse({
					maritalStatus: data.maritalStatus,
					spouseFirstName: data.spouseFirstName,
					spouseLastName: data.spouseLastName,
					fatherFirstName: data.fatherFirstName,
					fatherLastName: data.fatherLastName,
					motherFirstName: data.motherFirstName,
					motherLastName: data.motherLastName,
				}).success
			) {
				incomplete.push("family");
			}
		} else if (step === "contacts") {
			const schema = contactsSchemaFor(userType);
			const res = schema.safeParse({
				address: data.address ?? {},
				homeland: data.homeland,
				emergencyContacts: data.emergencyContacts,
			});
			if (!res.success) incomplete.push("contacts");
		} else if (step === "profession") {
			if (
				!professionSchema.safeParse({
					workStatus: data.workStatus,
					workTitle: data.workTitle,
					workEmployer: data.workEmployer,
				}).success
			) {
				incomplete.push("profession");
			}
		} else if (step === "documents") {
			const schema = documentsSchemaFor(userType);
			const docs = getDocsForUserType(userType);
			const values: Record<string, File | string | undefined> = {};
			for (const doc of docs) {
				values[doc.key] = files[doc.key] ?? data.documents?.[doc.key];
			}
			if (!schema.safeParse(values).success) incomplete.push("documents");
		}
	}

	return incomplete;
}

/**
 * Pour la restauration `?step=` : étant donné un index cible, renvoie soit
 * cet index si toutes les étapes ANTÉRIEURES sont valides, soit l'index de
 * la première étape incomplète. L'étape cible elle-même n'a pas besoin
 * d'être pré-remplie (c'est celle que l'utilisateur s'apprête à éditer).
 *
 * Pour `review` (la dernière étape), on exige que toutes les étapes
 * précédentes — y compris `documents` — soient complètes, sinon on snap
 * vers la première incomplète.
 */
export function clampStepToCompletion(
	steps: ReadonlyArray<OnboardingStepDef>,
	targetIndex: number,
	data: OnboardingData,
	files: RegistrationFiles,
	userType: PublicUserType,
): number {
	if (targetIndex <= 0) return 0;
	const incomplete = new Set<string>(
		computeIncompleteSteps(data, files, userType),
	);
	const clamp = Math.min(targetIndex, steps.length - 1);
	for (let i = 0; i < clamp; i++) {
		if (incomplete.has(steps[i].key)) return i;
	}
	return clamp;
}
