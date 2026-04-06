import {
	DetailedDocumentType,
	FormFieldType,
	ServiceCategory,
} from "@convex/lib/constants";
import type { FormDocument, FormSection } from "@convex/lib/validators";

export interface FormTemplate {
	id: string;
	name: { fr: string; en: string };
	description: { fr: string; en: string };
	category: ServiceCategory;
	icon: string;
	sections: FormSection[];
	joinedDocuments?: FormDocument[];
}

/**
 * Form templates organized by ServiceCategory
 * Excludes: Passport (handled directly by consulate), Registration (handled directly by consulate)
 */
export const formTemplates: FormTemplate[] = [
	// =====================================================
	// IDENTITY - Cartes d'identité, certificats de nationalité
	// =====================================================
	{
		id: "identity-card",
		name: { fr: "Carte d'identité", en: "Identity Card" },
		description: {
			fr: "Demande de carte nationale d'identité",
			en: "National identity card application",
		},
		category: ServiceCategory.Identity,
		icon: "CreditCard",
		sections: [
			{
				id: "personal_information",
				title: { fr: "Informations personnelles", en: "Personal Information" },
				fields: [
					{
						id: "last_name",
						type: FormFieldType.Text,
						label: { fr: "Nom de famille", en: "Last Name" },
						required: true,
					},
					{
						id: "first_name",
						type: FormFieldType.Text,
						label: { fr: "Prénom(s)", en: "First Name(s)" },
						required: true,
					},
					{
						id: "date_of_birth",
						type: FormFieldType.Date,
						label: { fr: "Date de naissance", en: "Date of Birth" },
						required: true,
					},
					{
						id: "place_of_birth",
						type: FormFieldType.Text,
						label: { fr: "Lieu de naissance", en: "Place of Birth" },
						required: true,
					},
					{
						id: "gender",
						type: FormFieldType.Select,
						label: { fr: "Sexe", en: "Gender" },
						required: true,
						options: [
							{ value: "male", label: { fr: "Masculin", en: "Male" } },
							{ value: "female", label: { fr: "Féminin", en: "Female" } },
						],
					},
					{
						id: "father_name",
						type: FormFieldType.Text,
						label: { fr: "Nom du père", en: "Father's Name" },
						required: true,
					},
					{
						id: "mother_name",
						type: FormFieldType.Text,
						label: { fr: "Nom de la mère", en: "Mother's Name" },
						required: true,
					},
				],
			},
			{
				id: "contact_information",
				title: { fr: "Coordonnées", en: "Contact Information" },
				fields: [
					{
						id: "address",
						type: FormFieldType.Text,
						label: { fr: "Adresse", en: "Address" },
						required: true,
					},
					{
						id: "city",
						type: FormFieldType.Text,
						label: { fr: "Ville", en: "City" },
						required: true,
					},
					{
						id: "country_of_residence",
						type: FormFieldType.Text,
						label: { fr: "Pays de résidence", en: "Country of Residence" },
						required: true,
					},
					{
						id: "email",
						type: FormFieldType.Email,
						label: { fr: "Email", en: "Email" },
						required: true,
					},
					{
						id: "phone",
						type: FormFieldType.Phone,
						label: { fr: "Téléphone", en: "Phone" },
						required: true,
					},
				],
			},
		],
		joinedDocuments: [
			{
				type: DetailedDocumentType.BirthCertificate,
				label: { fr: "Acte de naissance", en: "Birth certificate" },
				required: true,
			},
			{
				type: DetailedDocumentType.IdentityPhoto,
				label: { fr: "Photos d'identité", en: "Identity photos" },
				required: true,
			},
			{
				type: DetailedDocumentType.ProofOfAddress,
				label: { fr: "Justificatif de domicile", en: "Proof of address" },
				required: true,
			},
		],
	},
	{
		id: "nationality-certificate",
		name: { fr: "Certificat de nationalité", en: "Nationality Certificate" },
		description: {
			fr: "Demande de certificat de nationalité gabonaise",
			en: "Gabonese nationality certificate request",
		},
		category: ServiceCategory.Identity,
		icon: "Award",
		sections: [
			{
				id: "applicant",
				title: { fr: "Demandeur", en: "Applicant" },
				fields: [
					{
						id: "last_name",
						type: FormFieldType.Text,
						label: { fr: "Nom(s)", en: "Last Name(s)" },
						required: true,
					},
					{
						id: "first_name",
						type: FormFieldType.Text,
						label: { fr: "Prénom(s)", en: "First Name(s)" },
						required: true,
					},
					{
						id: "date_of_birth",
						type: FormFieldType.Date,
						label: { fr: "Date de naissance", en: "Date of Birth" },
						required: true,
					},
					{
						id: "place_of_birth",
						type: FormFieldType.Text,
						label: { fr: "Lieu de naissance", en: "Place of Birth" },
						required: true,
					},
					{
						id: "acquisition_method",
						type: FormFieldType.Select,
						label: { fr: "Mode d'acquisition", en: "Acquisition Method" },
						required: true,
						options: [
							{
								value: "birth",
								label: { fr: "Par la naissance", en: "By Birth" },
							},
							{
								value: "naturalization",
								label: { fr: "Par naturalisation", en: "By Naturalization" },
							},
							{
								value: "marriage",
								label: { fr: "Par mariage", en: "By Marriage" },
							},
							{
								value: "filiation",
								label: { fr: "Par filiation", en: "By Filiation" },
							},
						],
					},
				],
			},
			{
				id: "filiation",
				title: { fr: "Filiation", en: "Filiation" },
				fields: [
					{
						id: "father_name",
						type: FormFieldType.Text,
						label: { fr: "Nom du père", en: "Father's Name" },
						required: true,
					},
					{
						id: "father_nationality",
						type: FormFieldType.Text,
						label: { fr: "Nationalité du père", en: "Father's Nationality" },
						required: true,
					},
					{
						id: "mother_name",
						type: FormFieldType.Text,
						label: { fr: "Nom de la mère", en: "Mother's Name" },
						required: true,
					},
					{
						id: "mother_nationality",
						type: FormFieldType.Text,
						label: { fr: "Nationalité de la mère", en: "Mother's Nationality" },
						required: true,
					},
				],
			},
			{
				id: "contact",
				title: { fr: "Coordonnées", en: "Contact" },
				fields: [
					{
						id: "email",
						type: FormFieldType.Email,
						label: { fr: "Email", en: "Email" },
						required: true,
					},
					{
						id: "phone",
						type: FormFieldType.Phone,
						label: { fr: "Téléphone", en: "Phone" },
						required: true,
					},
				],
			},
		],
		joinedDocuments: [
			{
				type: DetailedDocumentType.Passport,
				label: {
					fr: "Passeport gabonais ou CNI",
					en: "Gabonese passport or national ID",
				},
				required: true,
			},
			{
				type: DetailedDocumentType.BirthCertificate,
				label: {
					fr: "Acte de naissance gabonais",
					en: "Gabonese birth certificate",
				},
				required: true,
			},
			{
				type: DetailedDocumentType.ForeignCivilStatusDocument,
				label: {
					fr: "Actes de naissance/passeports des parents",
					en: "Parents' birth certificates/passports",
				},
				required: true,
			},
		],
	},

	// =====================================================
	// CIVIL STATUS - État civil (naissance, mariage, décès)
	// =====================================================
	{
		id: "birth-certificate",
		name: { fr: "Acte de naissance", en: "Birth Certificate" },
		description: {
			fr: "Demande de copie d'acte de naissance",
			en: "Birth certificate copy request",
		},
		category: ServiceCategory.CivilStatus,
		icon: "Baby",
		sections: [
			{
				id: "person_concerned",
				title: { fr: "Personne concernée", en: "Person Concerned" },
				fields: [
					{
						id: "last_name",
						type: FormFieldType.Text,
						label: { fr: "Nom de famille", en: "Last Name" },
						required: true,
					},
					{
						id: "first_name",
						type: FormFieldType.Text,
						label: { fr: "Prénom(s)", en: "First Name(s)" },
						required: true,
					},
					{
						id: "date_of_birth",
						type: FormFieldType.Date,
						label: { fr: "Date de naissance", en: "Date of Birth" },
						required: true,
					},
					{
						id: "place_of_birth",
						type: FormFieldType.Text,
						label: { fr: "Lieu de naissance", en: "Place of Birth" },
						required: true,
					},
					{
						id: "father_name",
						type: FormFieldType.Text,
						label: { fr: "Nom du père", en: "Father's Name" },
						required: false,
					},
					{
						id: "mother_name",
						type: FormFieldType.Text,
						label: { fr: "Nom de la mère", en: "Mother's Name" },
						required: false,
					},
				],
			},
			{
				id: "requester",
				title: { fr: "Demandeur", en: "Requester" },
				fields: [
					{
						id: "requester_name",
						type: FormFieldType.Text,
						label: { fr: "Nom complet", en: "Full Name" },
						required: true,
					},
					{
						id: "relationship",
						type: FormFieldType.Select,
						label: { fr: "Lien avec la personne", en: "Relationship" },
						required: true,
						options: [
							{ value: "self", label: { fr: "Moi-même", en: "Myself" } },
							{ value: "parent", label: { fr: "Parent", en: "Parent" } },
							{ value: "spouse", label: { fr: "Conjoint", en: "Spouse" } },
							{ value: "child", label: { fr: "Enfant", en: "Child" } },
							{
								value: "legal",
								label: { fr: "Représentant légal", en: "Legal Representative" },
							},
						],
					},
					{
						id: "email",
						type: FormFieldType.Email,
						label: { fr: "Email", en: "Email" },
						required: true,
					},
					{
						id: "phone",
						type: FormFieldType.Phone,
						label: { fr: "Téléphone", en: "Phone" },
						required: true,
					},
					{
						id: "number_of_copies",
						type: FormFieldType.Number,
						label: { fr: "Nombre de copies", en: "Number of Copies" },
						required: true,
						validation: { min: 1, max: 10 },
					},
				],
			},
		],
	},
	{
		id: "marriage-certificate",
		name: { fr: "Acte de mariage", en: "Marriage Certificate" },
		description: {
			fr: "Demande de copie d'acte de mariage",
			en: "Marriage certificate copy request",
		},
		category: ServiceCategory.CivilStatus,
		icon: "Heart",
		sections: [
			{
				id: "marriage_information",
				title: {
					fr: "Informations sur le mariage",
					en: "Marriage Information",
				},
				fields: [
					{
						id: "husband_name",
						type: FormFieldType.Text,
						label: { fr: "Nom époux", en: "Husband's Name" },
						required: true,
					},
					{
						id: "wife_name",
						type: FormFieldType.Text,
						label: { fr: "Nom épouse", en: "Wife's Name" },
						required: true,
					},
					{
						id: "marriage_date",
						type: FormFieldType.Date,
						label: { fr: "Date du mariage", en: "Marriage Date" },
						required: true,
					},
					{
						id: "marriage_location",
						type: FormFieldType.Text,
						label: { fr: "Lieu du mariage", en: "Marriage Location" },
						required: true,
					},
				],
			},
			{
				id: "requester",
				title: { fr: "Demandeur", en: "Requester" },
				fields: [
					{
						id: "requester_name",
						type: FormFieldType.Text,
						label: { fr: "Nom complet", en: "Full Name" },
						required: true,
					},
					{
						id: "capacity",
						type: FormFieldType.Select,
						label: { fr: "Qualité", en: "Capacity" },
						required: true,
						options: [
							{ value: "spouse", label: { fr: "Époux/Épouse", en: "Spouse" } },
							{
								value: "child",
								label: { fr: "Enfant du couple", en: "Child of the Couple" },
							},
							{ value: "heir", label: { fr: "Héritier", en: "Heir" } },
							{
								value: "legal",
								label: { fr: "Représentant légal", en: "Legal Representative" },
							},
						],
					},
					{
						id: "email",
						type: FormFieldType.Email,
						label: { fr: "Email", en: "Email" },
						required: true,
					},
					{
						id: "phone",
						type: FormFieldType.Phone,
						label: { fr: "Téléphone", en: "Phone" },
						required: true,
					},
				],
			},
		],
	},
	{
		id: "death-certificate",
		name: { fr: "Acte de décès", en: "Death Certificate" },
		description: {
			fr: "Demande de copie d'acte de décès",
			en: "Death certificate copy request",
		},
		category: ServiceCategory.CivilStatus,
		icon: "FileX",
		sections: [
			{
				id: "deceased_person",
				title: { fr: "Personne décédée", en: "Deceased Person" },
				fields: [
					{
						id: "full_name",
						type: FormFieldType.Text,
						label: { fr: "Nom complet", en: "Full Name" },
						required: true,
					},
					{
						id: "date_of_birth",
						type: FormFieldType.Date,
						label: { fr: "Date de naissance", en: "Date of Birth" },
						required: false,
					},
					{
						id: "date_of_death",
						type: FormFieldType.Date,
						label: { fr: "Date du décès", en: "Date of Death" },
						required: true,
					},
					{
						id: "place_of_death",
						type: FormFieldType.Text,
						label: { fr: "Lieu du décès", en: "Place of Death" },
						required: true,
					},
				],
			},
			{
				id: "requester",
				title: { fr: "Demandeur", en: "Requester" },
				fields: [
					{
						id: "requester_name",
						type: FormFieldType.Text,
						label: { fr: "Nom complet", en: "Full Name" },
						required: true,
					},
					{
						id: "relationship",
						type: FormFieldType.Select,
						label: { fr: "Lien avec le défunt", en: "Relationship" },
						required: true,
						options: [
							{
								value: "spouse",
								label: { fr: "Conjoint survivant", en: "Surviving Spouse" },
							},
							{ value: "child", label: { fr: "Enfant", en: "Child" } },
							{ value: "parent", label: { fr: "Parent", en: "Parent" } },
							{ value: "heir", label: { fr: "Héritier", en: "Heir" } },
							{
								value: "legal",
								label: { fr: "Notaire/Avocat", en: "Notary/Lawyer" },
							},
						],
					},
					{
						id: "email",
						type: FormFieldType.Email,
						label: { fr: "Email", en: "Email" },
						required: true,
					},
					{
						id: "phone",
						type: FormFieldType.Phone,
						label: { fr: "Téléphone", en: "Phone" },
						required: true,
					},
				],
			},
		],
	},

	// =====================================================
	// VISA - Demandes de visa
	// =====================================================
	{
		id: "visa-tourist",
		name: { fr: "Visa touristique", en: "Tourist Visa" },
		description: {
			fr: "Demande de visa touristique pour le Gabon",
			en: "Tourist visa application for Gabon",
		},
		category: ServiceCategory.Visa,
		icon: "Globe",
		sections: [
			{
				id: "personal_information",
				title: { fr: "Informations personnelles", en: "Personal Information" },
				fields: [
					{
						id: "last_name",
						type: FormFieldType.Text,
						label: { fr: "Nom de famille", en: "Last Name" },
						required: true,
					},
					{
						id: "first_name",
						type: FormFieldType.Text,
						label: { fr: "Prénom(s)", en: "First Name(s)" },
						required: true,
					},
					{
						id: "date_of_birth",
						type: FormFieldType.Date,
						label: { fr: "Date de naissance", en: "Date of Birth" },
						required: true,
					},
					{
						id: "place_of_birth",
						type: FormFieldType.Text,
						label: { fr: "Lieu de naissance", en: "Place of Birth" },
						required: true,
					},
					{
						id: "nationality",
						type: FormFieldType.Text,
						label: { fr: "Nationalité", en: "Nationality" },
						required: true,
					},
					{
						id: "occupation",
						type: FormFieldType.Text,
						label: { fr: "Profession", en: "Occupation" },
						required: true,
					},
				],
			},
			{
				id: "passport",
				title: { fr: "Passeport", en: "Passport" },
				fields: [
					{
						id: "passport_number",
						type: FormFieldType.Text,
						label: { fr: "Numéro de passeport", en: "Passport Number" },
						required: true,
					},
					{
						id: "passport_issue_date",
						type: FormFieldType.Date,
						label: { fr: "Date de délivrance", en: "Issue Date" },
						required: true,
					},
					{
						id: "passport_expiry_date",
						type: FormFieldType.Date,
						label: { fr: "Date d'expiration", en: "Expiry Date" },
						required: true,
					},
					{
						id: "issuing_authority",
						type: FormFieldType.Text,
						label: { fr: "Autorité de délivrance", en: "Issuing Authority" },
						required: true,
					},
					{
						id: "passport_scan",
						type: FormFieldType.File,
						label: {
							fr: "Scan du passeport (pages d'identité)",
							en: "Passport scan (identity pages)",
						},
						required: true,
						description: {
							fr: "Pages avec photo et informations personnelles",
							en: "Pages with photo and personal information",
						},
					},
				],
			},
			{
				id: "travel_details",
				title: { fr: "Détails du voyage", en: "Travel Details" },
				fields: [
					{
						id: "entry_date",
						type: FormFieldType.Date,
						label: { fr: "Date d'entrée prévue", en: "Intended Entry Date" },
						required: true,
					},
					{
						id: "stay_duration",
						type: FormFieldType.Number,
						label: {
							fr: "Durée du séjour (jours)",
							en: "Duration of Stay (days)",
						},
						required: true,
					},
					{
						id: "address_in_gabon",
						type: FormFieldType.Text,
						label: { fr: "Adresse au Gabon", en: "Address in Gabon" },
						required: true,
					},
					{
						id: "purpose_of_travel",
						type: FormFieldType.Textarea,
						label: { fr: "Motif du voyage", en: "Purpose of Travel" },
						required: true,
					},
				],
			},
			{
				id: "contact",
				title: { fr: "Coordonnées", en: "Contact" },
				fields: [
					{
						id: "current_address",
						type: FormFieldType.Text,
						label: { fr: "Adresse actuelle", en: "Current Address" },
						required: true,
					},
					{
						id: "email",
						type: FormFieldType.Email,
						label: { fr: "Email", en: "Email" },
						required: true,
					},
					{
						id: "phone",
						type: FormFieldType.Phone,
						label: { fr: "Téléphone", en: "Phone" },
						required: true,
					},
				],
			},
		],
	},
	{
		id: "visa-business",
		name: { fr: "Visa d'affaires", en: "Business Visa" },
		description: {
			fr: "Demande de visa d'affaires pour le Gabon",
			en: "Business visa application for Gabon",
		},
		category: ServiceCategory.Visa,
		icon: "Briefcase",
		sections: [
			{
				id: "personal_information",
				title: { fr: "Informations personnelles", en: "Personal Information" },
				fields: [
					{
						id: "last_name",
						type: FormFieldType.Text,
						label: { fr: "Nom de famille", en: "Last Name" },
						required: true,
					},
					{
						id: "first_name",
						type: FormFieldType.Text,
						label: { fr: "Prénom(s)", en: "First Name(s)" },
						required: true,
					},
					{
						id: "date_of_birth",
						type: FormFieldType.Date,
						label: { fr: "Date de naissance", en: "Date of Birth" },
						required: true,
					},
					{
						id: "nationality",
						type: FormFieldType.Text,
						label: { fr: "Nationalité", en: "Nationality" },
						required: true,
					},
					{
						id: "occupation",
						type: FormFieldType.Text,
						label: { fr: "Profession", en: "Occupation" },
						required: true,
					},
				],
			},
			{
				id: "company",
				title: { fr: "Entreprise/Organisation", en: "Company/Organization" },
				fields: [
					{
						id: "company_name",
						type: FormFieldType.Text,
						label: { fr: "Nom de l'entreprise", en: "Company Name" },
						required: true,
					},
					{
						id: "company_address",
						type: FormFieldType.Text,
						label: { fr: "Adresse de l'entreprise", en: "Company Address" },
						required: true,
					},
					{
						id: "position",
						type: FormFieldType.Text,
						label: { fr: "Fonction", en: "Position" },
						required: true,
					},
					{
						id: "partner_company",
						type: FormFieldType.Text,
						label: {
							fr: "Entreprise partenaire au Gabon",
							en: "Partner Company in Gabon",
						},
						required: false,
					},
				],
			},
			{
				id: "travel_details",
				title: { fr: "Détails du voyage", en: "Travel Details" },
				fields: [
					{
						id: "entry_date",
						type: FormFieldType.Date,
						label: { fr: "Date d'entrée prévue", en: "Intended Entry Date" },
						required: true,
					},
					{
						id: "stay_duration",
						type: FormFieldType.Number,
						label: {
							fr: "Durée du séjour (jours)",
							en: "Duration of Stay (days)",
						},
						required: true,
					},
					{
						id: "mission_purpose",
						type: FormFieldType.Textarea,
						label: { fr: "Objet de la mission", en: "Purpose of Mission" },
						required: true,
					},
				],
			},
			{
				id: "contact",
				title: { fr: "Coordonnées", en: "Contact" },
				fields: [
					{
						id: "professional_email",
						type: FormFieldType.Email,
						label: { fr: "Email professionnel", en: "Professional Email" },
						required: true,
					},
					{
						id: "phone",
						type: FormFieldType.Phone,
						label: { fr: "Téléphone", en: "Phone" },
						required: true,
					},
				],
			},
		],
	},

	// =====================================================
	// CERTIFICATION - Légalisations, authentifications
	// =====================================================
	{
		id: "document-legalization",
		name: { fr: "Légalisation de documents", en: "Document Legalization" },
		description: {
			fr: "Demande de légalisation de documents officiels",
			en: "Official document legalization request",
		},
		category: ServiceCategory.Certification,
		icon: "FileCheck",
		sections: [
			{
				id: "requester",
				title: { fr: "Demandeur", en: "Requester" },
				fields: [
					{
						id: "full_name",
						type: FormFieldType.Text,
						label: { fr: "Nom complet", en: "Full Name" },
						required: true,
					},
					{
						id: "email",
						type: FormFieldType.Email,
						label: { fr: "Email", en: "Email" },
						required: true,
					},
					{
						id: "phone",
						type: FormFieldType.Phone,
						label: { fr: "Téléphone", en: "Phone" },
						required: true,
					},
				],
			},
			{
				id: "documents_to_legalize",
				title: { fr: "Documents à légaliser", en: "Documents to Legalize" },
				fields: [
					{
						id: "document_type",
						type: FormFieldType.Select,
						label: { fr: "Type de document", en: "Document Type" },
						required: true,
						options: [
							{ value: "diploma", label: { fr: "Diplôme", en: "Diploma" } },
							{
								value: "certificate",
								label: { fr: "Certificat", en: "Certificate" },
							},
							{ value: "contract", label: { fr: "Contrat", en: "Contract" } },
							{
								value: "power_of_attorney",
								label: { fr: "Procuration", en: "Power of Attorney" },
							},
							{
								value: "attestation",
								label: { fr: "Attestation", en: "Attestation" },
							},
							{ value: "other", label: { fr: "Autre", en: "Other" } },
						],
					},
					{
						id: "document_description",
						type: FormFieldType.Textarea,
						label: {
							fr: "Description du document",
							en: "Document Description",
						},
						required: true,
					},
					{
						id: "number_of_documents",
						type: FormFieldType.Number,
						label: { fr: "Nombre de documents", en: "Number of Documents" },
						required: true,
						validation: { min: 1, max: 20 },
					},
					{
						id: "intended_use",
						type: FormFieldType.Select,
						label: { fr: "Usage prévu", en: "Intended Use" },
						required: true,
						options: [
							{
								value: "gabon",
								label: { fr: "Usage au Gabon", en: "Use in Gabon" },
							},
							{
								value: "france",
								label: { fr: "Usage en France", en: "Use in France" },
							},
							{
								value: "other",
								label: { fr: "Autre pays", en: "Other Country" },
							},
						],
					},
					{
						id: "documents_upload",
						type: FormFieldType.File,
						label: {
							fr: "Documents à légaliser (PDF ou images)",
							en: "Documents to legalize (PDF or images)",
						},
						required: true,
						description: {
							fr: "Téléversez les documents à faire légaliser",
							en: "Upload the documents to be legalized",
						},
					},
				],
			},
		],
	},
	{
		id: "signature-certification",
		name: { fr: "Certification de signature", en: "Signature Certification" },
		description: {
			fr: "Certification de conformité de signature",
			en: "Signature conformity certification",
		},
		category: ServiceCategory.Certification,
		icon: "Pen",
		sections: [
			{
				id: "signatory",
				title: { fr: "Signataire", en: "Signatory" },
				fields: [
					{
						id: "full_name",
						type: FormFieldType.Text,
						label: { fr: "Nom complet", en: "Full Name" },
						required: true,
					},
					{
						id: "date_of_birth",
						type: FormFieldType.Date,
						label: { fr: "Date de naissance", en: "Date of Birth" },
						required: true,
					},
					{
						id: "id_number",
						type: FormFieldType.Text,
						label: { fr: "Numéro de pièce d'identité", en: "ID Number" },
						required: true,
					},
				],
			},
			{
				id: "document",
				title: { fr: "Document", en: "Document" },
				fields: [
					{
						id: "document_nature",
						type: FormFieldType.Text,
						label: { fr: "Nature du document", en: "Document Nature" },
						required: true,
					},
					{
						id: "subject",
						type: FormFieldType.Textarea,
						label: { fr: "Objet", en: "Subject" },
						required: true,
					},
					{
						id: "recipient",
						type: FormFieldType.Text,
						label: { fr: "Destinataire", en: "Recipient" },
						required: false,
					},
				],
			},
			{
				id: "contact",
				title: { fr: "Contact", en: "Contact" },
				fields: [
					{
						id: "email",
						type: FormFieldType.Email,
						label: { fr: "Email", en: "Email" },
						required: true,
					},
					{
						id: "phone",
						type: FormFieldType.Phone,
						label: { fr: "Téléphone", en: "Phone" },
						required: true,
					},
				],
			},
		],
	},

	// =====================================================
	// TRANSCRIPT - Relevés de notes, attestations scolaires
	// =====================================================
	{
		id: "transcript-request",
		name: { fr: "Relevé de notes", en: "Academic Transcript" },
		description: {
			fr: "Demande de relevé de notes ou attestation scolaire",
			en: "Academic transcript or school certificate request",
		},
		category: ServiceCategory.Transcript,
		icon: "GraduationCap",
		sections: [
			{
				id: "student",
				title: { fr: "Étudiant/Élève", en: "Student" },
				fields: [
					{
						id: "full_name",
						type: FormFieldType.Text,
						label: { fr: "Nom complet", en: "Full Name" },
						required: true,
					},
					{
						id: "date_of_birth",
						type: FormFieldType.Date,
						label: { fr: "Date de naissance", en: "Date of Birth" },
						required: true,
					},
					{
						id: "institution",
						type: FormFieldType.Text,
						label: { fr: "Établissement", en: "Institution" },
						required: true,
					},
					{
						id: "years_concerned",
						type: FormFieldType.Text,
						label: { fr: "Années concernées", en: "Years Concerned" },
						required: true,
					},
					{
						id: "education_level",
						type: FormFieldType.Select,
						label: { fr: "Niveau d'études", en: "Education Level" },
						required: true,
						options: [
							{ value: "primary", label: { fr: "Primaire", en: "Primary" } },
							{
								value: "secondary",
								label: { fr: "Secondaire", en: "Secondary" },
							},
							{
								value: "university",
								label: { fr: "Universitaire", en: "University" },
							},
							{
								value: "professional",
								label: {
									fr: "Formation professionnelle",
									en: "Professional Training",
								},
							},
						],
					},
				],
			},
			{
				id: "document_type",
				title: { fr: "Type de document", en: "Document Type" },
				fields: [
					{
						id: "requested_document",
						type: FormFieldType.Select,
						label: { fr: "Document demandé", en: "Requested Document" },
						required: true,
						options: [
							{
								value: "transcript",
								label: { fr: "Relevé de notes", en: "Transcript" },
							},
							{
								value: "diploma_copy",
								label: { fr: "Copie de diplôme", en: "Diploma Copy" },
							},
							{
								value: "enrollment",
								label: {
									fr: "Certificat de scolarité",
									en: "Enrollment Certificate",
								},
							},
							{
								value: "graduation",
								label: {
									fr: "Attestation de réussite",
									en: "Graduation Certificate",
								},
							},
						],
					},
					{
						id: "number_of_copies",
						type: FormFieldType.Number,
						label: { fr: "Nombre de copies", en: "Number of Copies" },
						required: true,
						validation: { min: 1, max: 5 },
					},
					{
						id: "reason",
						type: FormFieldType.Textarea,
						label: { fr: "Motif de la demande", en: "Reason for Request" },
						required: false,
					},
				],
			},
			{
				id: "contact",
				title: { fr: "Contact", en: "Contact" },
				fields: [
					{
						id: "email",
						type: FormFieldType.Email,
						label: { fr: "Email", en: "Email" },
						required: true,
					},
					{
						id: "phone",
						type: FormFieldType.Phone,
						label: { fr: "Téléphone", en: "Phone" },
						required: true,
					},
				],
			},
		],
	},

	// =====================================================
	// ASSISTANCE - Urgences, rapatriement, aide sociale
	// =====================================================
	{
		id: "emergency-assistance",
		name: { fr: "Assistance d'urgence", en: "Emergency Assistance" },
		description: {
			fr: "Demande d'assistance consulaire d'urgence",
			en: "Emergency consular assistance request",
		},
		category: ServiceCategory.Assistance,
		icon: "AlertTriangle",
		sections: [
			{
				id: "person_in_need",
				title: { fr: "Personne en difficulté", en: "Person in Need" },
				fields: [
					{
						id: "full_name",
						type: FormFieldType.Text,
						label: { fr: "Nom complet", en: "Full Name" },
						required: true,
					},
					{
						id: "date_of_birth",
						type: FormFieldType.Date,
						label: { fr: "Date de naissance", en: "Date of Birth" },
						required: true,
					},
					{
						id: "passport_number",
						type: FormFieldType.Text,
						label: { fr: "Numéro de passeport", en: "Passport Number" },
						required: false,
					},
					{
						id: "current_location",
						type: FormFieldType.Text,
						label: { fr: "Localisation actuelle", en: "Current Location" },
						required: true,
					},
				],
			},
			{
				id: "emergency_nature",
				title: { fr: "Nature de l'urgence", en: "Nature of Emergency" },
				fields: [
					{
						id: "emergency_type",
						type: FormFieldType.Select,
						label: { fr: "Type d'urgence", en: "Emergency Type" },
						required: true,
						options: [
							{
								value: "medical",
								label: { fr: "Urgence médicale", en: "Medical Emergency" },
							},
							{ value: "accident", label: { fr: "Accident", en: "Accident" } },
							{
								value: "arrest",
								label: { fr: "Arrestation/Détention", en: "Arrest/Detention" },
							},
							{
								value: "victim",
								label: { fr: "Victime d'agression", en: "Victim of Assault" },
							},
							{
								value: "loss",
								label: { fr: "Perte de documents", en: "Loss of Documents" },
							},
							{
								value: "stranded",
								label: { fr: "En situation de détresse", en: "In Distress" },
							},
							{
								value: "death",
								label: { fr: "Décès d'un proche", en: "Death of a Relative" },
							},
							{ value: "other", label: { fr: "Autre", en: "Other" } },
						],
					},
					{
						id: "situation_description",
						type: FormFieldType.Textarea,
						label: {
							fr: "Description de la situation",
							en: "Situation Description",
						},
						required: true,
					},
				],
			},
			{
				id: "contact",
				title: { fr: "Contact", en: "Contact" },
				fields: [
					{
						id: "urgent_phone",
						type: FormFieldType.Phone,
						label: { fr: "Téléphone (urgent)", en: "Phone (urgent)" },
						required: true,
					},
					{
						id: "email",
						type: FormFieldType.Email,
						label: { fr: "Email", en: "Email" },
						required: false,
					},
					{
						id: "contact_in_france",
						type: FormFieldType.Text,
						label: { fr: "Contact en France", en: "Contact in France" },
						required: false,
					},
				],
			},
		],
	},
	{
		id: "repatriation",
		name: { fr: "Aide au rapatriement", en: "Repatriation Assistance" },
		description: {
			fr: "Demande d'aide au rapatriement vers le Gabon",
			en: "Request for repatriation assistance to Gabon",
		},
		category: ServiceCategory.Assistance,
		icon: "Plane",
		sections: [
			{
				id: "applicant",
				title: { fr: "Demandeur", en: "Applicant" },
				fields: [
					{
						id: "full_name",
						type: FormFieldType.Text,
						label: { fr: "Nom complet", en: "Full Name" },
						required: true,
					},
					{
						id: "date_of_birth",
						type: FormFieldType.Date,
						label: { fr: "Date de naissance", en: "Date of Birth" },
						required: true,
					},
					{
						id: "passport_number",
						type: FormFieldType.Text,
						label: { fr: "Numéro de passeport", en: "Passport Number" },
						required: true,
					},
					{
						id: "current_address",
						type: FormFieldType.Text,
						label: { fr: "Adresse actuelle", en: "Current Address" },
						required: true,
					},
				],
			},
			{
				id: "repatriation_reason",
				title: { fr: "Motif du rapatriement", en: "Reason for Repatriation" },
				fields: [
					{
						id: "reason",
						type: FormFieldType.Select,
						label: { fr: "Motif", en: "Reason" },
						required: true,
						options: [
							{
								value: "medical",
								label: { fr: "Raisons médicales", en: "Medical Reasons" },
							},
							{
								value: "economic",
								label: {
									fr: "Difficultés économiques",
									en: "Economic Difficulties",
								},
							},
							{
								value: "family",
								label: { fr: "Raisons familiales", en: "Family Reasons" },
							},
							{
								value: "death",
								label: { fr: "Décès d'un proche", en: "Death of a Relative" },
							},
							{ value: "other", label: { fr: "Autre", en: "Other" } },
						],
					},
					{
						id: "detailed_explanation",
						type: FormFieldType.Textarea,
						label: { fr: "Explication détaillée", en: "Detailed Explanation" },
						required: true,
					},
				],
			},
			{
				id: "contact_in_gabon",
				title: { fr: "Contact au Gabon", en: "Contact in Gabon" },
				fields: [
					{
						id: "contact_name",
						type: FormFieldType.Text,
						label: { fr: "Nom du contact", en: "Contact Name" },
						required: true,
					},
					{
						id: "relationship",
						type: FormFieldType.Text,
						label: { fr: "Lien de parenté", en: "Relationship" },
						required: true,
					},
					{
						id: "phone_in_gabon",
						type: FormFieldType.Phone,
						label: { fr: "Téléphone au Gabon", en: "Phone in Gabon" },
						required: true,
					},
				],
			},
		],
	},

	// =====================================================
	// TRAVEL DOCUMENT - Laissez-passer, documents de voyage
	// =====================================================
	{
		id: "travel-laissez-passer",
		name: { fr: "Laissez-passer", en: "Emergency Travel Document" },
		description: {
			fr: "Demande de laissez-passer pour voyage d'urgence",
			en: "Emergency travel document (laissez-passer) request",
		},
		category: ServiceCategory.TravelDocument,
		icon: "FileText",
		sections: [
			{
				id: "personal_information",
				title: { fr: "Informations personnelles", en: "Personal Information" },
				fields: [
					{
						id: "last_name",
						type: FormFieldType.Text,
						label: { fr: "Nom de famille", en: "Last Name" },
						required: true,
					},
					{
						id: "first_name",
						type: FormFieldType.Text,
						label: { fr: "Prénom(s)", en: "First Name(s)" },
						required: true,
					},
					{
						id: "date_of_birth",
						type: FormFieldType.Date,
						label: { fr: "Date de naissance", en: "Date of Birth" },
						required: true,
					},
					{
						id: "place_of_birth",
						type: FormFieldType.Text,
						label: { fr: "Lieu de naissance", en: "Place of Birth" },
						required: true,
					},
				],
			},
			{
				id: "request_reason",
				title: { fr: "Motif de la demande", en: "Reason for Request" },
				fields: [
					{
						id: "reason",
						type: FormFieldType.Select,
						label: { fr: "Motif", en: "Reason" },
						required: true,
						options: [
							{
								value: "lost_passport",
								label: { fr: "Perte de passeport", en: "Lost Passport" },
							},
							{
								value: "stolen_passport",
								label: { fr: "Passeport volé", en: "Stolen Passport" },
							},
							{
								value: "expired_passport",
								label: { fr: "Passeport expiré", en: "Expired Passport" },
							},
							{
								value: "emergency_travel",
								label: { fr: "Voyage d'urgence", en: "Emergency Travel" },
							},
						],
					},
					{
						id: "destination",
						type: FormFieldType.Text,
						label: { fr: "Destination", en: "Destination" },
						required: true,
					},
					{
						id: "travel_date",
						type: FormFieldType.Date,
						label: { fr: "Date de voyage prévue", en: "Planned Travel Date" },
						required: true,
					},
					{
						id: "additional_details",
						type: FormFieldType.Textarea,
						label: { fr: "Détails supplémentaires", en: "Additional Details" },
						required: false,
					},
				],
			},
			{
				id: "contact",
				title: { fr: "Contact", en: "Contact" },
				fields: [
					{
						id: "email",
						type: FormFieldType.Email,
						label: { fr: "Email", en: "Email" },
						required: true,
					},
					{
						id: "phone",
						type: FormFieldType.Phone,
						label: { fr: "Téléphone", en: "Phone" },
						required: true,
					},
				],
			},
		],
	},

	// =====================================================
	// OTHER - Autres demandes
	// =====================================================
	{
		id: "general-request",
		name: { fr: "Demande générale", en: "General Request" },
		description: {
			fr: "Formulaire pour toute autre demande consulaire",
			en: "Form for any other consular request",
		},
		category: ServiceCategory.Other,
		icon: "HelpCircle",
		sections: [
			{
				id: "applicant",
				title: { fr: "Demandeur", en: "Applicant" },
				fields: [
					{
						id: "full_name",
						type: FormFieldType.Text,
						label: { fr: "Nom complet", en: "Full Name" },
						required: true,
					},
					{
						id: "email",
						type: FormFieldType.Email,
						label: { fr: "Email", en: "Email" },
						required: true,
					},
					{
						id: "phone",
						type: FormFieldType.Phone,
						label: { fr: "Téléphone", en: "Phone" },
						required: true,
					},
				],
			},
			{
				id: "request",
				title: { fr: "Votre demande", en: "Your Request" },
				fields: [
					{
						id: "subject",
						type: FormFieldType.Text,
						label: { fr: "Objet de la demande", en: "Request Subject" },
						required: true,
					},
					{
						id: "description",
						type: FormFieldType.Textarea,
						label: { fr: "Description détaillée", en: "Detailed Description" },
						required: true,
					},
				],
			},
		],
	},

	// =====================================================
	// REGISTRATION - Inscriptions consulaires
	// =====================================================
	{
		id: "consular-card-registration",
		name: {
			fr: "Inscription consulaire / Carte consulaire",
			en: "Consular Registration / Consular Card",
		},
		description: {
			fr: "Demande d'inscription au registre consulaire et de carte consulaire",
			en: "Consular registration and consular card application",
		},
		category: ServiceCategory.Registration,
		icon: "CreditCard",
		sections: [
			// ── Section 1 : Identité ──
			{
				id: "basic_info",
				title: { fr: "Informations d'identité", en: "Identity Information" },
				fields: [
					{
						id: "last_name",
						type: FormFieldType.Text,
						label: { fr: "Nom de famille", en: "Last Name" },
						required: true,
					},
					{
						id: "first_name",
						type: FormFieldType.Text,
						label: { fr: "Prénom(s)", en: "First Name(s)" },
						required: true,
					},
					{
						id: "nip",
						type: FormFieldType.Text,
						label: {
							fr: "Numéro d'Identification Personnel (NIP)",
							en: "Personal Identification Number (NIP)",
						},
						required: false,
					},
					{
						id: "gender",
						type: FormFieldType.Select,
						label: { fr: "Sexe", en: "Gender" },
						required: true,
						options: [
							{ value: "male", label: { fr: "Masculin", en: "Male" } },
							{ value: "female", label: { fr: "Féminin", en: "Female" } },
						],
					},
					{
						id: "birth_date",
						type: FormFieldType.Date,
						label: { fr: "Date de naissance", en: "Date of Birth" },
						required: true,
					},
					{
						id: "birth_place",
						type: FormFieldType.Text,
						label: { fr: "Lieu de naissance", en: "Place of Birth" },
						required: true,
					},
					{
						id: "birth_country",
						type: FormFieldType.Country,
						label: { fr: "Pays de naissance", en: "Country of Birth" },
						required: true,
					},
					{
						id: "nationality",
						type: FormFieldType.Country,
						label: { fr: "Nationalité", en: "Nationality" },
						required: true,
					},
					{
						id: "nationality_acquisition",
						type: FormFieldType.Select,
						label: {
							fr: "Mode d'acquisition de la nationalité",
							en: "Nationality Acquisition Method",
						},
						required: false,
						options: [
							{
								value: "birth",
								label: { fr: "Par la naissance", en: "By Birth" },
							},
							{
								value: "naturalization",
								label: { fr: "Par naturalisation", en: "By Naturalization" },
							},
							{
								value: "marriage",
								label: { fr: "Par mariage", en: "By Marriage" },
							},
							{
								value: "adoption",
								label: { fr: "Par adoption", en: "By Adoption" },
							},
							{ value: "other", label: { fr: "Autre", en: "Other" } },
						],
					},
				],
			},
			// ── Section 2 : Passeport ──
			{
				id: "passport_info",
				title: { fr: "Informations du passeport", en: "Passport Information" },
				fields: [
					{
						id: "passport_number",
						type: FormFieldType.Text,
						label: { fr: "Numéro de passeport", en: "Passport Number" },
						required: true,
					},
					{
						id: "passport_issue_date",
						type: FormFieldType.Date,
						label: { fr: "Date de délivrance", en: "Issue Date" },
						required: false,
					},
					{
						id: "passport_expiry_date",
						type: FormFieldType.Date,
						label: { fr: "Date d'expiration", en: "Expiry Date" },
						required: false,
					},
					{
						id: "passport_issuing_authority",
						type: FormFieldType.Text,
						label: { fr: "Autorité de délivrance", en: "Issuing Authority" },
						required: false,
					},
				],
			},
			// ── Section 3 : Famille ──
			{
				id: "family_info",
				title: { fr: "Situation familiale", en: "Family Information" },
				fields: [
					{
						id: "marital_status",
						type: FormFieldType.Select,
						label: { fr: "Situation matrimoniale", en: "Marital Status" },
						required: false,
						options: [
							{ value: "single", label: { fr: "Célibataire", en: "Single" } },
							{ value: "married", label: { fr: "Marié(e)", en: "Married" } },
							{
								value: "divorced",
								label: { fr: "Divorcé(e)", en: "Divorced" },
							},
							{ value: "widowed", label: { fr: "Veuf/Veuve", en: "Widowed" } },
							{
								value: "civil_union",
								label: { fr: "Pacsé(e)", en: "Civil Union" },
							},
							{
								value: "cohabiting",
								label: { fr: "Concubinage", en: "Cohabiting" },
							},
						],
					},
					{
						id: "father_last_name",
						type: FormFieldType.Text,
						label: { fr: "Nom du père", en: "Father's Last Name" },
						required: false,
					},
					{
						id: "father_first_name",
						type: FormFieldType.Text,
						label: { fr: "Prénom du père", en: "Father's First Name" },
						required: false,
					},
					{
						id: "mother_last_name",
						type: FormFieldType.Text,
						label: { fr: "Nom de la mère", en: "Mother's Last Name" },
						required: false,
					},
					{
						id: "mother_first_name",
						type: FormFieldType.Text,
						label: { fr: "Prénom de la mère", en: "Mother's First Name" },
						required: false,
					},
					{
						id: "spouse_last_name",
						type: FormFieldType.Text,
						label: { fr: "Nom du conjoint", en: "Spouse's Last Name" },
						required: false,
					},
					{
						id: "spouse_first_name",
						type: FormFieldType.Text,
						label: { fr: "Prénom du conjoint", en: "Spouse's First Name" },
						required: false,
					},
				],
			},
			// ── Section 4 : Coordonnées & Adresses ──
			{
				id: "contact_info",
				title: { fr: "Coordonnées", en: "Contact Information" },
				fields: [
					{
						id: "email",
						type: FormFieldType.Email,
						label: { fr: "Email", en: "Email" },
						required: true,
					},
					{
						id: "phone",
						type: FormFieldType.Phone,
						label: { fr: "Téléphone", en: "Phone" },
						required: true,
					},
				],
			},
			// ── Section 5 : Adresse de résidence ──
			{
				id: "residence_address",
				title: { fr: "Adresse de résidence", en: "Residence Address" },
				fields: [
					{
						id: "residence_street",
						type: FormFieldType.Text,
						label: { fr: "Rue", en: "Street" },
						required: true,
					},
					{
						id: "residence_city",
						type: FormFieldType.Text,
						label: { fr: "Ville", en: "City" },
						required: true,
					},
					{
						id: "residence_postal_code",
						type: FormFieldType.Text,
						label: { fr: "Code postal", en: "Postal Code" },
						required: false,
					},
					{
						id: "residence_country",
						type: FormFieldType.Country,
						label: { fr: "Pays de résidence", en: "Country of Residence" },
						required: true,
					},
				],
			},
			// ── Section 6 : Adresse au pays d'origine ──
			{
				id: "homeland_address",
				title: { fr: "Adresse au Gabon", en: "Address in Gabon" },
				fields: [
					{
						id: "homeland_street",
						type: FormFieldType.Text,
						label: { fr: "Rue / Quartier", en: "Street / District" },
						required: false,
					},
					{
						id: "homeland_city",
						type: FormFieldType.Text,
						label: { fr: "Ville", en: "City" },
						required: false,
					},
					{
						id: "homeland_postal_code",
						type: FormFieldType.Text,
						label: { fr: "Code postal", en: "Postal Code" },
						required: false,
					},
					{
						id: "homeland_country",
						type: FormFieldType.Country,
						label: { fr: "Pays", en: "Country" },
						required: false,
					},
				],
			},
			// ── Section 7 : Contact d'urgence (résidence) ──
			{
				id: "emergency_residence",
				title: {
					fr: "Contact d'urgence (résidence)",
					en: "Emergency Contact (Residence)",
				},
				fields: [
					{
						id: "emergency_residence_last_name",
						type: FormFieldType.Text,
						label: { fr: "Nom", en: "Last Name" },
						required: true,
					},
					{
						id: "emergency_residence_first_name",
						type: FormFieldType.Text,
						label: { fr: "Prénom", en: "First Name" },
						required: true,
					},
					{
						id: "emergency_residence_phone",
						type: FormFieldType.Phone,
						label: { fr: "Téléphone", en: "Phone" },
						required: true,
					},
					{
						id: "emergency_residence_email",
						type: FormFieldType.Email,
						label: { fr: "Email", en: "Email" },
						required: false,
					},
				],
			},
			// ── Section 8 : Contact d'urgence (pays d'origine) ──
			{
				id: "emergency_homeland",
				title: {
					fr: "Contact d'urgence (au Gabon)",
					en: "Emergency Contact (in Gabon)",
				},
				fields: [
					{
						id: "emergency_homeland_last_name",
						type: FormFieldType.Text,
						label: { fr: "Nom", en: "Last Name" },
						required: true,
					},
					{
						id: "emergency_homeland_first_name",
						type: FormFieldType.Text,
						label: { fr: "Prénom", en: "First Name" },
						required: true,
					},
					{
						id: "emergency_homeland_phone",
						type: FormFieldType.Phone,
						label: { fr: "Téléphone", en: "Phone" },
						required: true,
					},
					{
						id: "emergency_homeland_email",
						type: FormFieldType.Email,
						label: { fr: "Email", en: "Email" },
						required: false,
					},
				],
			},
			// ── Section 9 : Situation professionnelle ──
			{
				id: "professional_info",
				title: {
					fr: "Situation professionnelle",
					en: "Professional Information",
				},
				fields: [
					{
						id: "work_status",
						type: FormFieldType.Select,
						label: { fr: "Statut professionnel", en: "Work Status" },
						required: false,
						options: [
							{
								value: "employee",
								label: { fr: "Salarié(e)", en: "Employee" },
							},
							{
								value: "self_employed",
								label: { fr: "Indépendant(e)", en: "Self-Employed" },
							},
							{
								value: "entrepreneur",
								label: { fr: "Entrepreneur", en: "Entrepreneur" },
							},
							{ value: "student", label: { fr: "Étudiant(e)", en: "Student" } },
							{ value: "retired", label: { fr: "Retraité(e)", en: "Retired" } },
							{
								value: "unemployed",
								label: { fr: "Sans emploi", en: "Unemployed" },
							},
							{ value: "other", label: { fr: "Autre", en: "Other" } },
						],
					},
					{
						id: "profession",
						type: FormFieldType.Text,
						label: { fr: "Profession / Métier", en: "Profession / Job Title" },
						required: false,
					},
					{
						id: "employer",
						type: FormFieldType.Text,
						label: {
							fr: "Employeur / Établissement",
							en: "Employer / Institution",
						},
						required: false,
					},
				],
			},
		],
		joinedDocuments: [
			{
				type: DetailedDocumentType.IdentityPhoto,
				label: {
					fr: "Photo d'identité format passeport",
					en: "Passport-size Identity Photo",
				},
				required: true,
			},
			{
				type: DetailedDocumentType.Passport,
				label: { fr: "Passeport en cours de validité", en: "Valid Passport" },
				required: true,
			},
			{
				type: DetailedDocumentType.BirthCertificate,
				label: {
					fr: "Acte de naissance",
					en: "Birth Certificate",
				},
				required: true,
			},
			{
				type: DetailedDocumentType.ProofOfAddress,
				label: {
					fr: "Justificatif de domicile (moins de 3 mois)",
					en: "Proof of Address (less than 3 months)",
				},
				required: true,
			},
		],
	},

	// =====================================================
	// REGISTRATION - Signalement consulaire (court séjour)
	// =====================================================
	{
		id: "consular-notification",
		name: {
			fr: "Signalement consulaire",
			en: "Consular Notification",
		},
		description: {
			fr: "Signalement de présence pour les Gabonais de passage (séjour < 6 mois)",
			en: "Presence notification for short-stay Gabonese nationals (< 6 months)",
		},
		category: ServiceCategory.Notification,
		icon: "Bell",
		sections: [
			// ── Section 1 : Identité ──
			{
				id: "basic_info",
				title: { fr: "Informations d'identité", en: "Identity Information" },
				fields: [
					{
						id: "last_name",
						type: FormFieldType.Text,
						label: { fr: "Nom de famille", en: "Last Name" },
						required: true,
					},
					{
						id: "first_name",
						type: FormFieldType.Text,
						label: { fr: "Prénom(s)", en: "First Name(s)" },
						required: true,
					},
					{
						id: "gender",
						type: FormFieldType.Select,
						label: { fr: "Sexe", en: "Gender" },
						required: true,
						options: [
							{ value: "male", label: { fr: "Masculin", en: "Male" } },
							{ value: "female", label: { fr: "Féminin", en: "Female" } },
						],
					},
					{
						id: "birth_date",
						type: FormFieldType.Date,
						label: { fr: "Date de naissance", en: "Date of Birth" },
						required: true,
					},
					{
						id: "birth_place",
						type: FormFieldType.Text,
						label: { fr: "Lieu de naissance", en: "Place of Birth" },
						required: true,
					},
					{
						id: "nationality",
						type: FormFieldType.Country,
						label: { fr: "Nationalité", en: "Nationality" },
						required: true,
					},
				],
			},
			// ── Section 2 : Passeport ──
			{
				id: "passport_info",
				title: { fr: "Informations du passeport", en: "Passport Information" },
				fields: [
					{
						id: "passport_number",
						type: FormFieldType.Text,
						label: { fr: "Numéro de passeport", en: "Passport Number" },
						required: true,
					},
					{
						id: "passport_expiry_date",
						type: FormFieldType.Date,
						label: { fr: "Date d'expiration", en: "Expiry Date" },
						required: false,
					},
				],
			},
			// ── Section 3 : Coordonnées ──
			{
				id: "contact_info",
				title: { fr: "Coordonnées", en: "Contact Information" },
				fields: [
					{
						id: "email",
						type: FormFieldType.Email,
						label: { fr: "Email", en: "Email" },
						required: true,
					},
					{
						id: "phone",
						type: FormFieldType.Phone,
						label: { fr: "Téléphone", en: "Phone" },
						required: true,
					},
				],
			},
			// ── Section 4 : Adresse temporaire ──
			{
				id: "temporary_address",
				title: { fr: "Adresse de séjour", en: "Stay Address" },
				fields: [
					{
						id: "stay_street",
						type: FormFieldType.Text,
						label: { fr: "Adresse / Hôtel", en: "Address / Hotel" },
						required: true,
					},
					{
						id: "stay_city",
						type: FormFieldType.Text,
						label: { fr: "Ville", en: "City" },
						required: true,
					},
					{
						id: "stay_country",
						type: FormFieldType.Country,
						label: { fr: "Pays de séjour", en: "Country of Stay" },
						required: true,
					},
				],
			},
			// ── Section 5 : Dates du séjour ──
			{
				id: "stay_dates",
				title: { fr: "Dates du séjour", en: "Stay Dates" },
				fields: [
					{
						id: "stay_start_date",
						type: FormFieldType.Date,
						label: { fr: "Date d'arrivée", en: "Arrival Date" },
						required: true,
					},
					{
						id: "stay_end_date",
						type: FormFieldType.Date,
						label: {
							fr: "Date de départ prévue",
							en: "Planned Departure Date",
						},
						required: true,
					},
					{
						id: "stay_reason",
						type: FormFieldType.Select,
						label: { fr: "Motif du séjour", en: "Reason for Stay" },
						required: true,
						options: [
							{ value: "tourism", label: { fr: "Tourisme", en: "Tourism" } },
							{ value: "business", label: { fr: "Affaires", en: "Business" } },
							{
								value: "family",
								label: { fr: "Visite familiale", en: "Family Visit" },
							},
							{
								value: "medical",
								label: { fr: "Raisons médicales", en: "Medical Reasons" },
							},
							{
								value: "studies",
								label: { fr: "Études / Formation", en: "Studies / Training" },
							},
							{ value: "other", label: { fr: "Autre", en: "Other" } },
						],
					},
				],
			},
			// ── Section 6 : Contact d'urgence ──
			{
				id: "emergency_contact",
				title: { fr: "Contact d'urgence", en: "Emergency Contact" },
				fields: [
					{
						id: "emergency_last_name",
						type: FormFieldType.Text,
						label: { fr: "Nom", en: "Last Name" },
						required: true,
					},
					{
						id: "emergency_first_name",
						type: FormFieldType.Text,
						label: { fr: "Prénom", en: "First Name" },
						required: true,
					},
					{
						id: "emergency_phone",
						type: FormFieldType.Phone,
						label: { fr: "Téléphone", en: "Phone" },
						required: true,
					},
				],
			},
		],
		joinedDocuments: [
			{
				type: DetailedDocumentType.Passport,
				label: { fr: "Passeport en cours de validité", en: "Valid Passport" },
				required: true,
			},
			{
				type: DetailedDocumentType.IdentityPhoto,
				label: {
					fr: "1 photo d'identité récente",
					en: "1 recent passport photo",
				},
				required: false,
			},
		],
	},

	// =====================================================
	// CERTIFICATION - Légalisations, attestations
	// =====================================================
	{
		id: "document-legalization",
		name: { fr: "Légalisation de Documents", en: "Document Legalization" },
		description: {
			fr: "Authentification des documents administratifs et actes d'état civil délivrés par une Autorité gabonaise compétente",
			en: "Authentication service for administrative documents and civil status certificates issued by competent Gabonese authorities",
		},
		category: ServiceCategory.Certification,
		icon: "Stamp",
		sections: [
			{
				id: "document_info",
				title: {
					fr: "Informations sur le document",
					en: "Document Information",
				},
				fields: [
					{
						id: "document_type",
						type: FormFieldType.Select,
						label: {
							fr: "Type de document à légaliser",
							en: "Document type to legalize",
						},
						required: true,
						options: [
							{
								value: "birth_certificate",
								label: { fr: "Acte de naissance", en: "Birth certificate" },
							},
							{
								value: "marriage_certificate",
								label: { fr: "Acte de mariage", en: "Marriage certificate" },
							},
							{
								value: "death_certificate",
								label: { fr: "Acte de décès", en: "Death certificate" },
							},
							{
								value: "notarial_act",
								label: { fr: "Acte notarié", en: "Notarial act" },
							},
							{
								value: "administrative_doc",
								label: {
									fr: "Document administratif",
									en: "Administrative document",
								},
							},
							{ value: "other", label: { fr: "Autre", en: "Other" } },
						],
					},
					{
						id: "document_description",
						type: FormFieldType.Textarea,
						label: {
							fr: "Description du document",
							en: "Document description",
						},
						description: {
							fr: "Décrivez brièvement le document et son usage prévu",
							en: "Briefly describe the document and its intended use",
						},
						required: false,
					},
					{
						id: "number_of_copies",
						type: FormFieldType.Number,
						label: {
							fr: "Nombre de copies à légaliser",
							en: "Number of copies to legalize",
						},
						required: true,
					},
				],
			},
		],
		joinedDocuments: [
			{
				type: DetailedDocumentType.OtherOfficialDocument,
				label: {
					fr: "Original du document à légaliser",
					en: "Original document to be legalized",
				},
				required: true,
			},
			{
				type: DetailedDocumentType.OtherOfficialDocument,
				label: {
					fr: "Copies du document (2 max)",
					en: "Document copies (2 max)",
				},
				required: false,
			},
		],
	},
	{
		id: "life-certificate",
		name: { fr: "Certificat de Vie", en: "Life Certificate" },
		description: {
			fr: "Document permettant aux retraités gabonais résidant à l'étranger de prouver qu'ils sont en vie",
			en: "Document allowing Gabonese retirees living abroad to prove they are still alive",
		},
		category: ServiceCategory.Certification,
		icon: "HeartPulse",
		sections: [
			{
				id: "pension_info",
				title: { fr: "Informations de pension", en: "Pension Information" },
				fields: [
					{
						id: "pension_organization",
						type: FormFieldType.Text,
						label: { fr: "Organisme de pension", en: "Pension organization" },
						required: true,
					},
					{
						id: "pension_number",
						type: FormFieldType.Text,
						label: { fr: "Numéro de pension", en: "Pension number" },
						required: true,
					},
				],
			},
		],
		joinedDocuments: [
			{
				type: DetailedDocumentType.Passport,
				label: { fr: "Copie du passeport", en: "Passport copy" },
				required: true,
			},
			{
				type: DetailedDocumentType.RetirementPensionCertificate,
				label: {
					fr: "Titre de pension ou attestation de retraite",
					en: "Pension certificate or retirement attestation",
				},
				required: true,
			},
		],
	},
	{
		id: "expatriation-certificate",
		name: { fr: "Certificat d'Expatriation", en: "Expatriation Certificate" },
		description: {
			fr: "Document permettant à un ressortissant gabonais retournant définitivement au Gabon de rapatrier ses effets personnels",
			en: "Document allowing a Gabonese national returning permanently to Gabon to repatriate personal belongings",
		},
		category: ServiceCategory.Certification,
		icon: "PlaneTakeoff",
		sections: [
			{
				id: "return_info",
				title: { fr: "Informations de retour", en: "Return Information" },
				fields: [
					{
						id: "return_date",
						type: FormFieldType.Date,
						label: { fr: "Date prévue de retour", en: "Expected return date" },
						required: true,
					},
					{
						id: "freight_forwarder",
						type: FormFieldType.Text,
						label: { fr: "Nom du transitaire", en: "Freight forwarder name" },
						required: true,
					},
					{
						id: "belongings_list",
						type: FormFieldType.Textarea,
						label: {
							fr: "Liste détaillée des effets personnels",
							en: "Detailed list of personal belongings",
						},
						description: {
							fr: "Listez tous les effets à rapatrier avec leur description",
							en: "List all belongings to repatriate with descriptions",
						},
						required: true,
					},
				],
			},
		],
		joinedDocuments: [
			{
				type: DetailedDocumentType.Passport,
				label: { fr: "Copie du passeport", en: "Passport copy" },
				required: true,
			},
		],
	},
	{
		id: "legal-capacity-attestation",
		name: {
			fr: "Attestation de Capacité Juridique",
			en: "Legal Capacity Attestation",
		},
		description: {
			fr: "Document attestant qu'un ressortissant gabonais n'a pas fait l'objet de condamnation à des peines privatives de liberté",
			en: "Document attesting that a Gabonese national has not been sentenced to imprisonment",
		},
		category: ServiceCategory.Certification,
		icon: "Scale",
		sections: [],
		joinedDocuments: [
			{
				type: DetailedDocumentType.CriminalRecordB3,
				label: {
					fr: "Extrait de casier judiciaire (< 3 mois)",
					en: "Criminal record extract (< 3 months)",
				},
				required: true,
			},
			{
				type: DetailedDocumentType.Passport,
				label: { fr: "Copie du passeport", en: "Passport copy" },
				required: true,
			},
			{
				type: DetailedDocumentType.BirthCertificate,
				label: { fr: "Acte de naissance", en: "Birth certificate" },
				required: true,
			},
		],
	},
	{
		id: "driving-license-attestation",
		name: {
			fr: "Attestation de Validité du Permis de Conduire",
			en: "Driving License Validity Attestation",
		},
		description: {
			fr: "Authentification du permis de conduire gabonais",
			en: "Authentication of Gabonese driving license",
		},
		category: ServiceCategory.Certification,
		icon: "Car",
		sections: [
			{
				id: "license_info",
				title: { fr: "Informations du permis", en: "License Information" },
				fields: [
					{
						id: "license_number",
						type: FormFieldType.Text,
						label: { fr: "Numéro du permis", en: "License number" },
						required: true,
					},
					{
						id: "license_category",
						type: FormFieldType.Text,
						label: {
							fr: "Catégorie(s) du permis",
							en: "License category(ies)",
						},
						required: true,
					},
					{
						id: "issue_date",
						type: FormFieldType.Date,
						label: { fr: "Date de délivrance", en: "Issue date" },
						required: true,
					},
				],
			},
		],
		joinedDocuments: [
			{
				type: DetailedDocumentType.DriverLicense,
				label: {
					fr: "Original du permis de conduire gabonais",
					en: "Original Gabonese driving license",
				},
				required: true,
			},
			{
				type: DetailedDocumentType.Passport,
				label: { fr: "Copie du passeport", en: "Passport copy" },
				required: true,
			},
		],
	},

	// =====================================================
	// TRAVEL DOCUMENTS - Laissez-passer, tenant lieu
	// =====================================================
	{
		id: "laissez-passer",
		name: { fr: "Laissez-Passer", en: "Laissez-Passer" },
		description: {
			fr: "Document de voyage d'urgence valide 30 jours, pour rentrer au Gabon sans passeport valide",
			en: "Emergency travel document valid for 30 days, to return to Gabon without a valid passport",
		},
		category: ServiceCategory.TravelDocument,
		icon: "Ticket",
		sections: [
			{
				id: "travel_info",
				title: { fr: "Informations de voyage", en: "Travel Information" },
				fields: [
					{
						id: "travel_date",
						type: FormFieldType.Date,
						label: { fr: "Date de voyage prévue", en: "Expected travel date" },
						required: true,
					},
					{
						id: "destination",
						type: FormFieldType.Text,
						label: { fr: "Destination au Gabon", en: "Destination in Gabon" },
						required: true,
					},
					{
						id: "reason",
						type: FormFieldType.Textarea,
						label: {
							fr: "Motif du voyage urgent",
							en: "Reason for urgent travel",
						},
						required: true,
					},
				],
			},
		],
		joinedDocuments: [
			{
				type: DetailedDocumentType.NationalIdCard,
				label: {
					fr: "Document gabonais (passeport expiré, CNI, acte de naissance)",
					en: "Gabonese document (expired passport, ID, birth certificate)",
				},
				required: true,
			},
			{
				type: DetailedDocumentType.OtherOfficialDocument,
				label: { fr: "Billet d'avion", en: "Plane ticket" },
				required: true,
			},
			{
				type: DetailedDocumentType.IdentityPhoto,
				label: {
					fr: "2 photos d'identité récentes",
					en: "2 recent passport photos",
				},
				required: true,
			},
		],
	},
	{
		id: "emergency-travel-document",
		name: { fr: "Tenant Lieu de Passeport", en: "Emergency Travel Document" },
		description: {
			fr: "Document de voyage temporaire permettant de voyager vers le Gabon uniquement. Validité: 3 mois",
			en: "Temporary travel document for travel to Gabon only. Validity: 3 months",
		},
		category: ServiceCategory.TravelDocument,
		icon: "FileCheck",
		sections: [
			{
				id: "travel_info",
				title: { fr: "Informations de voyage", en: "Travel Information" },
				fields: [
					{
						id: "travel_date",
						type: FormFieldType.Date,
						label: { fr: "Date de voyage prévue", en: "Expected travel date" },
						required: true,
					},
					{
						id: "destination",
						type: FormFieldType.Text,
						label: { fr: "Destination au Gabon", en: "Destination in Gabon" },
						required: true,
					},
					{
						id: "reason",
						type: FormFieldType.Textarea,
						label: { fr: "Motif de la demande", en: "Reason for request" },
						required: true,
					},
				],
			},
		],
		joinedDocuments: [
			{
				type: DetailedDocumentType.NationalIdCard,
				label: {
					fr: "Document gabonais (passeport expiré, CNI, acte de naissance)",
					en: "Gabonese document (expired passport, ID, birth certificate)",
				},
				required: true,
			},
			{
				type: DetailedDocumentType.OtherOfficialDocument,
				label: { fr: "Billet d'avion", en: "Plane ticket" },
				required: true,
			},
			{
				type: DetailedDocumentType.IdentityPhoto,
				label: {
					fr: "2 photos d'identité récentes",
					en: "2 recent passport photos",
				},
				required: true,
			},
		],
	},

	// =====================================================
	// CIVIL STATUS - État civil, mariage
	// =====================================================
	{
		id: "non-opposition-certificate",
		name: {
			fr: "Certificat de Non-Opposition au Mariage",
			en: "Certificate of No Objection to Marriage",
		},
		description: {
			fr: "Certificat délivré suite à la publication des bans de mariage, attestant qu'aucune opposition n'a été formulée",
			en: "Certificate issued following the publication of marriage banns, attesting that no objection has been raised",
		},
		category: ServiceCategory.CivilStatus,
		icon: "FileCheck",
		sections: [
			{
				id: "applicant_info",
				title: { fr: "Informations du demandeur", en: "Applicant Information" },
				fields: [
					{
						id: "marital_status",
						type: FormFieldType.Select,
						label: {
							fr: "Situation matrimoniale actuelle",
							en: "Current marital status",
						},
						required: true,
						options: [
							{ value: "single", label: { fr: "Célibataire", en: "Single" } },
							{
								value: "divorced",
								label: { fr: "Divorcé(e)", en: "Divorced" },
							},
							{ value: "widowed", label: { fr: "Veuf/Veuve", en: "Widowed" } },
						],
					},
				],
			},
			{
				id: "spouse_info",
				title: {
					fr: "Informations du futur conjoint",
					en: "Future Spouse Information",
				},
				fields: [
					{
						id: "spouse_last_name",
						type: FormFieldType.Text,
						label: {
							fr: "Nom du futur conjoint",
							en: "Future spouse's last name",
						},
						required: true,
					},
					{
						id: "spouse_first_name",
						type: FormFieldType.Text,
						label: {
							fr: "Prénom(s) du futur conjoint",
							en: "Future spouse's first name(s)",
						},
						required: true,
					},
					{
						id: "spouse_nationality",
						type: FormFieldType.Country,
						label: {
							fr: "Nationalité du futur conjoint",
							en: "Future spouse's nationality",
						},
						required: true,
					},
					{
						id: "intended_marriage_date",
						type: FormFieldType.Date,
						label: {
							fr: "Date prévue du mariage",
							en: "Intended marriage date",
						},
						required: false,
					},
				],
			},
		],
		joinedDocuments: [
			{
				type: DetailedDocumentType.MarriageCertificate,
				label: {
					fr: "Dossier complet de mariage",
					en: "Complete marriage file",
				},
				required: true,
			},
		],
	},
	{
		id: "custom-celibacy-certificate",
		name: {
			fr: "Certificats de Coutume et de Célibat",
			en: "Custom and Celibacy Certificates",
		},
		description: {
			fr: "Documents requis pour tout ressortissant gabonais souhaitant se marier ou établir une union formelle à l'étranger",
			en: "Documents required for any Gabonese national wishing to marry or establish a formal union abroad",
		},
		category: ServiceCategory.CivilStatus,
		icon: "Heart",
		sections: [
			{
				id: "personal_status",
				title: { fr: "Situation personnelle", en: "Personal Status" },
				fields: [
					{
						id: "marital_status",
						type: FormFieldType.Select,
						label: { fr: "Situation matrimoniale", en: "Marital status" },
						required: true,
						options: [
							{ value: "single", label: { fr: "Célibataire", en: "Single" } },
							{
								value: "divorced",
								label: { fr: "Divorcé(e)", en: "Divorced" },
							},
							{ value: "widowed", label: { fr: "Veuf/Veuve", en: "Widowed" } },
						],
					},
				],
			},
			{
				id: "spouse_info",
				title: {
					fr: "Informations du futur conjoint",
					en: "Future Spouse Information",
				},
				fields: [
					{
						id: "spouse_last_name",
						type: FormFieldType.Text,
						label: {
							fr: "Nom du futur conjoint",
							en: "Future spouse's last name",
						},
						required: true,
					},
					{
						id: "spouse_first_name",
						type: FormFieldType.Text,
						label: { fr: "Prénom(s)", en: "First name(s)" },
						required: true,
					},
					{
						id: "spouse_nationality",
						type: FormFieldType.Country,
						label: { fr: "Nationalité", en: "Nationality" },
						required: true,
					},
				],
			},
		],
		joinedDocuments: [
			{
				type: DetailedDocumentType.Passport,
				label: {
					fr: "Passeport gabonais ou CNI",
					en: "Gabonese passport or national ID",
				},
				required: true,
			},
			{
				type: DetailedDocumentType.BirthCertificate,
				label: {
					fr: "Acte de naissance gabonais",
					en: "Gabonese birth certificate",
				},
				required: true,
			},
			{
				type: DetailedDocumentType.DivorceJudgment,
				label: {
					fr: "Jugement de divorce (si applicable)",
					en: "Divorce judgment (if applicable)",
				},
				required: false,
			},
		],
	},

	// =====================================================
	// VISA - Visas et entrées
	// =====================================================
	{
		id: "visa-application",
		name: { fr: "Demande de Visa", en: "Visa Application" },
		description: {
			fr: "Demande de visa pour voyager au Gabon pour des raisons professionnelles ou personnelles",
			en: "Visa application to travel to Gabon for professional or personal reasons",
		},
		category: ServiceCategory.Visa,
		icon: "Stamp",
		sections: [
			{
				id: "travel_info",
				title: { fr: "Informations de voyage", en: "Travel Information" },
				fields: [
					{
						id: "visa_type",
						type: FormFieldType.Select,
						label: { fr: "Type de visa", en: "Visa type" },
						required: true,
						options: [
							{ value: "tourism", label: { fr: "Tourisme", en: "Tourism" } },
							{ value: "business", label: { fr: "Affaires", en: "Business" } },
							{
								value: "family_visit",
								label: { fr: "Visite familiale", en: "Family visit" },
							},
							{ value: "transit", label: { fr: "Transit", en: "Transit" } },
						],
					},
					{
						id: "entry_date",
						type: FormFieldType.Date,
						label: { fr: "Date d'entrée prévue", en: "Expected entry date" },
						required: true,
					},
					{
						id: "exit_date",
						type: FormFieldType.Date,
						label: { fr: "Date de sortie prévue", en: "Expected exit date" },
						required: true,
					},
					{
						id: "purpose",
						type: FormFieldType.Textarea,
						label: { fr: "Objet du voyage", en: "Purpose of travel" },
						required: true,
					},
				],
			},
			{
				id: "accommodation",
				title: { fr: "Hébergement", en: "Accommodation" },
				fields: [
					{
						id: "accommodation_address",
						type: FormFieldType.Textarea,
						label: {
							fr: "Adresse d'hébergement au Gabon",
							en: "Accommodation address in Gabon",
						},
						required: true,
					},
					{
						id: "host_name",
						type: FormFieldType.Text,
						label: {
							fr: "Nom de l'hébergeant (si applicable)",
							en: "Host name (if applicable)",
						},
						required: false,
					},
				],
			},
		],
		joinedDocuments: [
			{
				type: DetailedDocumentType.Passport,
				label: { fr: "Passeport en cours de validité", en: "Valid passport" },
				required: true,
			},
			{
				type: DetailedDocumentType.Passport,
				label: {
					fr: "Copie de la page d'identité du passeport",
					en: "Copy of passport identity page",
				},
				required: true,
			},
			{
				type: DetailedDocumentType.OtherOfficialDocument,
				label: {
					fr: "Billet d'avion aller-retour",
					en: "Round-trip flight ticket",
				},
				required: true,
			},
			{
				type: DetailedDocumentType.MedicalCertificate,
				label: {
					fr: "Certificat de vaccination fièvre jaune",
					en: "Yellow fever vaccination certificate",
				},
				required: true,
			},
			{
				type: DetailedDocumentType.IdentityPhoto,
				label: {
					fr: "2 photos d'identité format passeport",
					en: "2 passport-size photos",
				},
				required: true,
			},
		],
	},
];

export function getTemplateById(id: string): FormTemplate | undefined {
	return formTemplates.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: string): FormTemplate[] {
	return formTemplates.filter((t) => t.category === category);
}
