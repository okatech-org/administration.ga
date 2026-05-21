import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	CountryCode,
	DetailedDocumentType,
	DocumentTypeCategory,
	Gender,
	MaritalStatus,
	NationalityAcquisition,
	PublicUserType,
	WorkStatus,
} from "@convex/lib/constants";
import type { ConvexReactClient } from "convex/react";
import type { OnboardingData } from "../types";
import type { RegistrationFiles } from "../steps/DocumentsStep";

// ─── Normalisation UI → Convex ──────────────────────────────
// Le wizard utilise les libellés du prototype (PascalCase), mais Convex
// attend les valeurs snake_case/lowercase des enums (`Gender.Male = "male"` etc.).
const GENDER_MAP: Record<string, Gender> = {
	Male: Gender.Male,
	Female: Gender.Female,
};

const MARITAL_MAP: Record<string, MaritalStatus> = {
	Single: MaritalStatus.Single,
	Married: MaritalStatus.Married,
	Divorced: MaritalStatus.Divorced,
	Widowed: MaritalStatus.Widowed,
	CivilUnion: MaritalStatus.CivilUnion,
	Cohabiting: MaritalStatus.Cohabiting,
};

const WORK_MAP: Record<string, WorkStatus> = {
	Employee: WorkStatus.Employee,
	SelfEmployed: WorkStatus.SelfEmployed,
	Entrepreneur: WorkStatus.Entrepreneur,
	Student: WorkStatus.Student,
	Retired: WorkStatus.Retired,
	Unemployed: WorkStatus.Unemployed,
	Other: WorkStatus.Other,
};

const NAT_MAP: Record<string, NationalityAcquisition> = {
	birth: NationalityAcquisition.Birth,
	naturalization: NationalityAcquisition.Naturalization,
	marriage: NationalityAcquisition.Marriage,
};

const DOC_TYPE_MAP: Record<
	string,
	{ docType: DetailedDocumentType; category: DocumentTypeCategory }
> = {
	identityPhoto: {
		docType: DetailedDocumentType.IdentityPhoto,
		category: DocumentTypeCategory.Identity,
	},
	passport: {
		docType: DetailedDocumentType.Passport,
		category: DocumentTypeCategory.Identity,
	},
	birthCertificate: {
		docType: DetailedDocumentType.BirthCertificate,
		category: DocumentTypeCategory.CivilStatus,
	},
	addressProof: {
		docType: DetailedDocumentType.ProofOfAddress,
		category: DocumentTypeCategory.Housing,
	},
	residencePermit: {
		docType: DetailedDocumentType.ResidencePermit,
		category: DocumentTypeCategory.Identity,
	},
};

const PROFILE_DOC_KEY: Record<string, string> = {
	identityPhoto: "identityPhoto",
	passport: "passport",
	birthCertificate: "birthCertificate",
	addressProof: "proofOfAddress",
	residencePermit: "proofOfResidency",
};

export type SubmissionResult = {
	reference?: string;
	requestId?: Id<"requests">;
};

/**
 * Pipeline de soumission du dossier :
 * 1. Upload chaque fichier via `generateUploadUrl` → POST storage → `documents.create`
 * 2. `profiles.createFromRegistration` avec l'ensemble des données + IDs documents
 * 3. `profiles.submitRegistrationRequest` pour créer la demande consulaire
 *
 * Renvoie la référence générée par submitRegistrationRequest si disponible.
 */
export async function submitRegistration(opts: {
	convex: ConvexReactClient;
	userType: PublicUserType;
	data: OnboardingData;
	files: RegistrationFiles;
}): Promise<SubmissionResult> {
	const { convex, userType, data, files } = opts;

	// ─── 1. Upload des fichiers ─────────────────────────────────
	const docIds: Record<string, Id<"documents">> = {};
	for (const [key, file] of Object.entries(files)) {
		if (!file) continue;
		const meta = DOC_TYPE_MAP[key];
		if (!meta) continue;

		const uploadUrl = await convex.mutation(
			api.functions.documents.generateUploadUrl,
			{},
		);
		const resp = await fetch(uploadUrl, {
			method: "POST",
			headers: { "Content-Type": file.type || "application/octet-stream" },
			body: file,
		});
		if (!resp.ok) {
			throw new Error(`Échec téléversement « ${meta.docType} » : HTTP ${resp.status}`);
		}
		const { storageId } = (await resp.json()) as { storageId: Id<"_storage"> };

		const documentId = await convex.mutation(api.functions.documents.create, {
			storageId,
			filename: file.name,
			mimeType: file.type || "application/octet-stream",
			sizeBytes: file.size,
			documentType: meta.docType,
			category: meta.category,
		});

		const profileKey = PROFILE_DOC_KEY[key];
		if (profileKey) docIds[profileKey] = documentId;
	}

	// ─── 2. Création / mise à jour du profil ───────────────────
	await convex.mutation(api.functions.profiles.createFromRegistration, {
		userType,
		identity: {
			firstName: data.firstName,
			lastName: data.lastName,
			nip: data.nip || undefined,
			gender: data.gender ? GENDER_MAP[data.gender] : undefined,
			birthDate: data.birthDate,
			birthPlace: data.birthPlace,
			birthCountry: data.birthCountry as CountryCode | undefined,
			nationality: data.nationality as CountryCode | undefined,
			nationalityAcquisition: data.nationalityAcquisition
				? NAT_MAP[data.nationalityAcquisition]
				: undefined,
		},
		passportInfo: data.passportNumber
			? {
					number: data.passportNumber,
					issueDate: data.passportIssueDate,
					expiryDate: data.passportExpiryDate,
					issuingAuthority: data.passportIssuingAuthority,
				}
			: undefined,
		addresses: {
			residence:
				data.address?.street ||
				data.address?.full ||
				data.address?.city ||
				data.address?.postalCode ||
				data.address?.country
					? {
							street: data.address.street ?? data.address.full ?? "",
							city: data.address.city ?? "",
							postalCode: data.address.postalCode ?? "",
							country: (data.address.country as CountryCode) ?? CountryCode.FR,
						}
					: undefined,
			homeland:
				data.homeland?.street ||
				data.homeland?.full ||
				data.homeland?.city ||
				data.homeland?.country
					? {
							street: data.homeland.street ?? data.homeland.full ?? "",
							city: data.homeland.city ?? "",
							postalCode: data.homeland.postalCode ?? "",
							country: (data.homeland.country as CountryCode) ?? CountryCode.GA,
						}
					: undefined,
		},
		family:
			data.maritalStatus ||
			data.fatherFirstName ||
			data.fatherLastName ||
			data.motherFirstName ||
			data.motherLastName ||
			data.spouseFirstName ||
			data.spouseLastName
				? {
						maritalStatus: data.maritalStatus
							? MARITAL_MAP[data.maritalStatus]
							: undefined,
						father:
							data.fatherFirstName || data.fatherLastName
								? {
										firstName: data.fatherFirstName,
										lastName: data.fatherLastName,
									}
								: undefined,
						mother:
							data.motherFirstName || data.motherLastName
								? {
										firstName: data.motherFirstName,
										lastName: data.motherLastName,
									}
								: undefined,
						spouse:
							data.spouseFirstName || data.spouseLastName
								? {
										firstName: data.spouseFirstName,
										lastName: data.spouseLastName,
									}
								: undefined,
					}
				: undefined,
		profession: data.workStatus
			? {
					status: WORK_MAP[data.workStatus],
					title: data.workTitle,
					employer: data.workEmployer,
				}
			: undefined,
		email: data.email,
		phone: data.phone,
		emergencyContacts: (data.emergencyContacts ?? []).filter(
			(c) => c.firstName || c.lastName || c.phone,
		),
		documents: Object.keys(docIds).length > 0 ? docIds : undefined,
	});

	// ─── 3. Soumission de la demande ───────────────────────────
	const result = await convex.mutation(
		api.functions.profiles.submitRegistrationRequest,
		{},
	);

	const status =
		result && "status" in result ? String(result.status) : "unknown";

	// Cas succès (création OU déjà en cours pour le même utilisateur)
	if (status === "success" || status === "already_in_progress") {
		const reference =
			result && "reference" in result ? result.reference : undefined;
		const requestId =
			result && "requestId" in result ? result.requestId : undefined;
		// `submitRegistrationRequest` retourne souvent "(generating...)" — la
		// vraie référence est générée async côté agent. On expose `undefined`
		// dans ce cas pour que le SubmittedScreen affiche un placeholder
		// neutre plutôt qu'une valeur transitoire.
		return {
			reference:
				reference && reference !== "(generating...)" ? reference : undefined,
			requestId: requestId as Id<"requests"> | undefined,
		};
	}

	// Cas erreur explicite (no_profile, no_country, no_service, no_org_found, etc.)
	const ERROR_MESSAGES: Record<string, string> = {
		no_profile: "Profil introuvable. Recommencez le wizard.",
		not_applicable:
			"Ce type de profil ne nécessite pas d'inscription consulaire.",
		no_country:
			"Pays de résidence manquant — complétez votre adresse à l'étape Contacts.",
		no_service:
			"Aucun service d'inscription disponible pour votre pays de résidence.",
		no_org_found:
			"Aucun consulat compétent trouvé pour votre pays. Contactez le support.",
	};
	throw new Error(
		ERROR_MESSAGES[status] ?? `Soumission impossible : ${status}`,
	);
}
