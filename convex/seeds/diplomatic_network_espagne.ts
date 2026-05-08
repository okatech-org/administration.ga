/**
 * ═══════════════════════════════════════════════════════════════
 * Seed — Configuration complète Ambassade du Gabon en Espagne
 * ═══════════════════════════════════════════════════════════════
 *
 * Ce seed configure l'intégralité de la représentation :
 *  1. Patch de l'org avec données complètes (modules, description, etc.)
 *  2. Création de 4 positions personnalisées
 *  3. Création de 12 services au catalogue global (si absents)
 *  4. Activation des services pour l'org (orgServices) avec tarifs
 *  5. Création du formulaire dynamique de visa
 *  6. Création du modèle de reçu de paiement
 *
 * Usage:
 *   npx convex run seeds/diplomatic_network_espagne:seedEspagne
 */
import { mutation } from "../_generated/server";
import { TaskCode, type TaskCodeValue } from "../lib/taskCodes";
import type { ServiceCategory, PublicUserType } from "../lib/constants";

// ═══════════════════════════════════════════════════════════════
// DATA — Positions
// ═══════════════════════════════════════════════════════════════

const ESPAGNE_POSITIONS = [
	{
		code: "ambassador",
		title: { fr: "Ambassadeur Extraordinaire et Plénipotentiaire", en: "Ambassador Extraordinary and Plenipotentiary" },
		description: { fr: "Chef de la mission diplomatique au Royaume d'Espagne", en: "Head of the diplomatic mission to the Kingdom of Spain" },
		level: 1,
		grade: "chief",
		isRequired: true,
		isUnique: true,
		tasks: [
			// Direction complète
			TaskCode.requests.view, TaskCode.requests.validate, TaskCode.requests.assign,
			TaskCode.documents.view, TaskCode.documents.validate, TaskCode.documents.generate,
			TaskCode.appointments.view,
			TaskCode.profiles.view, TaskCode.profiles.manage,
			TaskCode.finance.view, TaskCode.finance.manage,
			TaskCode.team.view, TaskCode.team.manage, TaskCode.team.assign_roles,
			TaskCode.settings.view, TaskCode.settings.manage,
			TaskCode.analytics.view, TaskCode.analytics.export,
			TaskCode.communication.publish, TaskCode.communication.notify,
			TaskCode.org.view, TaskCode.statistics.view,
			TaskCode.schedules.view, TaskCode.schedules.manage,
			TaskCode.consular_registrations.view, TaskCode.consular_registrations.manage,
			TaskCode.consular_notifications.view, TaskCode.consular_cards.manage,
			TaskCode.intelligence.view, TaskCode.intelligence.manage,
			TaskCode.visas.approve,
			TaskCode.meetings.create, TaskCode.meetings.join, TaskCode.meetings.manage, TaskCode.meetings.view_history,
		] as TaskCodeValue[],
	},
	{
		code: "first_counselor",
		title: { fr: "Premier Conseiller", en: "First Counselor" },
		description: { fr: "Adjoint du Chef de mission, coordination générale", en: "Deputy Head of mission, general coordination" },
		level: 2,
		grade: "counselor",
		isRequired: true,
		isUnique: true,
		tasks: [
			// Management + validation
			TaskCode.requests.view, TaskCode.requests.validate, TaskCode.requests.assign, TaskCode.requests.complete,
			TaskCode.documents.view, TaskCode.documents.validate,
			TaskCode.appointments.view, TaskCode.appointments.manage,
			TaskCode.profiles.view,
			TaskCode.team.view, TaskCode.team.manage,
			TaskCode.analytics.view,
			TaskCode.communication.publish,
			TaskCode.org.view, TaskCode.statistics.view,
			TaskCode.schedules.view, TaskCode.schedules.manage,
			TaskCode.consular_registrations.view, TaskCode.consular_registrations.manage,
			TaskCode.consular_notifications.view, TaskCode.consular_cards.manage,
			TaskCode.visas.process, TaskCode.visas.approve,
			TaskCode.meetings.create, TaskCode.meetings.join, TaskCode.meetings.manage, TaskCode.meetings.view_history,
		] as TaskCodeValue[],
	},
	{
		code: "consular_affairs_counselor",
		title: { fr: "Conseiller aux Affaires Consulaires", en: "Consular Affairs Counselor" },
		description: { fr: "Responsable des services consulaires (visas, état civil, chancellerie)", en: "Head of consular services (visas, civil status, chancellery)" },
		level: 3,
		grade: "counselor",
		isRequired: true,
		isUnique: true,
		tasks: [
			// Traitement des demandes + validation + état civil + visas
			TaskCode.requests.view, TaskCode.requests.create, TaskCode.requests.process, TaskCode.requests.validate, TaskCode.requests.complete,
			TaskCode.documents.view, TaskCode.documents.validate, TaskCode.documents.generate,
			TaskCode.appointments.view, TaskCode.appointments.manage, TaskCode.appointments.configure,
			TaskCode.profiles.view, TaskCode.profiles.manage,
			TaskCode.civil_status.transcribe, TaskCode.civil_status.register, TaskCode.civil_status.certify,
			TaskCode.visas.process, TaskCode.visas.approve, TaskCode.visas.stamp,
			TaskCode.passports.process, TaskCode.passports.biometric, TaskCode.passports.deliver,
			TaskCode.finance.view, TaskCode.finance.collect,
			TaskCode.org.view,
			TaskCode.schedules.view, TaskCode.schedules.manage,
			TaskCode.consular_registrations.view, TaskCode.consular_registrations.manage,
			TaskCode.consular_notifications.view, TaskCode.consular_cards.manage,
			TaskCode.meetings.create, TaskCode.meetings.join, TaskCode.meetings.view_history,
		] as TaskCodeValue[],
	},
	{
		code: "economic_affairs_counselor",
		title: { fr: "Conseiller aux Affaires Économiques", en: "Economic Affairs Counselor" },
		description: { fr: "Chargé des relations économiques et commerciales", en: "In charge of economic and commercial relations" },
		level: 3,
		grade: "counselor",
		isRequired: false,
		isUnique: true,
		tasks: [
			// Consultation + communication
			TaskCode.requests.view,
			TaskCode.documents.view,
			TaskCode.profiles.view,
			TaskCode.communication.publish, TaskCode.communication.notify,
			TaskCode.org.view,
			TaskCode.analytics.view,
			TaskCode.community_events.view, TaskCode.community_events.manage,
			TaskCode.meetings.create, TaskCode.meetings.join, TaskCode.meetings.view_history,
		] as TaskCodeValue[],
	},
];

// ═══════════════════════════════════════════════════════════════
// DATA — 12 Services (catalogue global)
// ═══════════════════════════════════════════════════════════════

interface ServiceSeedEntry {
	slug: string;
	code: string;
	category: ServiceCategory;
	name: { fr: string; en: string; es?: string };
	description: { fr: string; en: string; es?: string };
	eligibleProfiles: PublicUserType[];
	estimatedDays: number;
	requiresAppointment: boolean;
	requiresPickupAppointment?: boolean;
}

const ESPAGNE_SERVICES: ServiceSeedEntry[] = [
	// ─── VISA (6) ────────────────────────────────────────
	{
		slug: "visa-consulaire",
		code: "VS-001",
		category: "visa" as ServiceCategory,
		name: { fr: "Visa consulaire", en: "Consular visa", es: "Visa consular" },
		description: { fr: "Visa consulaire standard pour entrée au Gabon", en: "Standard consular visa for entry to Gabon", es: "Visa consular estándar para entrada a Gabón" },
		eligibleProfiles: ["visa_tourism", "visa_business", "visa_long_stay"] as PublicUserType[],
		estimatedDays: 5,
		requiresAppointment: true,
	},
	{
		slug: "visa-touristique",
		code: "VS-002",
		category: "visa" as ServiceCategory,
		name: { fr: "Visa touristique", en: "Tourist visa", es: "Visa turístico" },
		description: { fr: "Visa court séjour pour tourisme au Gabon (max 90 jours)", en: "Short-stay visa for tourism in Gabon (max 90 days)", es: "Visa de corta estancia para turismo en Gabón (máx. 90 días)" },
		eligibleProfiles: ["visa_tourism"] as PublicUserType[],
		estimatedDays: 5,
		requiresAppointment: true,
	},
	{
		slug: "visa-affaires",
		code: "VS-003",
		category: "visa" as ServiceCategory,
		name: { fr: "Visa d'affaires", en: "Business visa", es: "Visa de negocios" },
		description: { fr: "Visa pour voyage d'affaires au Gabon", en: "Visa for business travel to Gabon", es: "Visa para viaje de negocios a Gabón" },
		eligibleProfiles: ["visa_business"] as PublicUserType[],
		estimatedDays: 5,
		requiresAppointment: true,
	},
	{
		slug: "visa-visite-familiale",
		code: "VS-004",
		category: "visa" as ServiceCategory,
		name: { fr: "Visa visite familiale", en: "Family visit visa", es: "Visa de visita familiar" },
		description: { fr: "Visa pour visite de famille au Gabon", en: "Visa for family visit in Gabon", es: "Visa para visita familiar en Gabón" },
		eligibleProfiles: ["visa_tourism", "visa_long_stay"] as PublicUserType[],
		estimatedDays: 5,
		requiresAppointment: true,
	},
	{
		slug: "visa-diplomatique",
		code: "VS-005",
		category: "visa" as ServiceCategory,
		name: { fr: "Visa diplomatique", en: "Diplomatic visa", es: "Visa diplomático" },
		description: { fr: "Visa pour les titulaires de passeport diplomatique", en: "Visa for diplomatic passport holders", es: "Visa para titulares de pasaporte diplomático" },
		eligibleProfiles: ["visa_business"] as PublicUserType[],
		estimatedDays: 3,
		requiresAppointment: true,
	},
	{
		slug: "visa-express",
		code: "VS-006",
		category: "visa" as ServiceCategory,
		name: { fr: "Visa express", en: "Express visa", es: "Visa exprés" },
		description: { fr: "Traitement accéléré de visa (48h)", en: "Expedited visa processing (48h)", es: "Tramitación acelerada de visa (48h)" },
		eligibleProfiles: ["visa_tourism", "visa_business", "visa_long_stay"] as PublicUserType[],
		estimatedDays: 2,
		requiresAppointment: true,
	},

	// ─── ÉTAT CIVIL (4) ─────────────────────────────────
	{
		slug: "transcription-naissance",
		code: "EC-001",
		category: "civil_status" as ServiceCategory,
		name: { fr: "Transcription d'acte de naissance", en: "Birth certificate transcription", es: "Transcripción de partida de nacimiento" },
		description: { fr: "Transcription d'un acte de naissance étranger dans les registres consulaires", en: "Transcription of a foreign birth certificate into consular records", es: "Transcripción de partida de nacimiento extranjera en los registros consulares" },
		eligibleProfiles: ["long_stay", "short_stay"] as PublicUserType[],
		estimatedDays: 30,
		requiresAppointment: true,
	},
	{
		slug: "transcription-deces",
		code: "EC-002",
		category: "civil_status" as ServiceCategory,
		name: { fr: "Transcription d'acte de décès", en: "Death certificate transcription", es: "Transcripción de certificado de defunción" },
		description: { fr: "Transcription d'un acte de décès étranger dans les registres consulaires", en: "Transcription of a foreign death certificate into consular records", es: "Transcripción de certificado de defunción extranjero en los registros consulares" },
		eligibleProfiles: ["long_stay", "short_stay"] as PublicUserType[],
		estimatedDays: 30,
		requiresAppointment: true,
	},
	{
		slug: "celebration-mariage",
		code: "EC-003",
		category: "civil_status" as ServiceCategory,
		name: { fr: "Célébration de mariage", en: "Marriage ceremony", es: "Celebración de matrimonio" },
		description: { fr: "Célébration de mariage à l'ambassade ou au consulat", en: "Marriage ceremony at the embassy or consulate", es: "Celebración de matrimonio en la embajada o el consulado" },
		eligibleProfiles: ["long_stay"] as PublicUserType[],
		estimatedDays: 60,
		requiresAppointment: true,
	},
	{
		slug: "legalisation-documents",
		code: "EC-004",
		category: "certification" as ServiceCategory,
		name: { fr: "Légalisation de documents", en: "Document legalization", es: "Legalización de documentos" },
		description: { fr: "Légalisation et authentification de documents officiels", en: "Legalization and authentication of official documents", es: "Legalización y autenticación de documentos oficiales" },
		eligibleProfiles: ["long_stay", "short_stay", "admin_services"] as PublicUserType[],
		estimatedDays: 3,
		requiresAppointment: false,
	},

	// ─── SERVICES CONSULAIRES (2) ───────────────────────
	{
		slug: "inscription-consulaire",
		code: "SC-001",
		category: "registration" as ServiceCategory,
		name: { fr: "Inscription consulaire", en: "Consular registration", es: "Inscripción consular" },
		description: { fr: "Inscription au registre des Gabonais de l'étranger (obligatoire pour les séjours > 6 mois)", en: "Registration on the register of Gabonese nationals abroad (mandatory for stays > 6 months)", es: "Inscripción en el registro de gaboneses en el extranjero (obligatorio para estancias > 6 meses)" },
		eligibleProfiles: ["long_stay"] as PublicUserType[],
		estimatedDays: 15,
		requiresAppointment: true,
	},
	{
		slug: "document-voyage-urgence",
		code: "SC-002",
		category: "travel_document" as ServiceCategory,
		name: { fr: "Document de voyage d'urgence (Laissez-Passer)", en: "Emergency travel document (Laissez-Passer)", es: "Documento de viaje de emergencia (Laissez-Passer)" },
		description: { fr: "Document tenant lieu de passeport en cas de perte ou vol", en: "Document serving as a passport in case of loss or theft", es: "Documento que sustituye al pasaporte en caso de pérdida o robo" },
		eligibleProfiles: ["long_stay", "short_stay"] as PublicUserType[],
		estimatedDays: 1,
		requiresAppointment: true,
	},
];

// ═══════════════════════════════════════════════════════════════
// DATA — OrgService activation configs (tarifs + instructions)
// ═══════════════════════════════════════════════════════════════

const ORG_SERVICE_CONFIGS: Record<string, {
	pricing: { amount: number; currency: string };
	estimatedDays?: number;
	depositInstructions?: string;
	pickupInstructions?: string;
	requiresAppointment: boolean;
	requiresAppointmentForPickup: boolean;
	appointmentDurationMinutes?: number;
}> = {
	// Visas
	"visa-consulaire": {
		pricing: { amount: 100, currency: "EUR" },
		requiresAppointment: true,
		requiresAppointmentForPickup: true,
		appointmentDurationMinutes: 20,
		depositInstructions: "Présentez-vous avec l'original et une copie de tous les documents. Paiement en espèces ou par carte bancaire.",
		pickupInstructions: "Retrait du passeport avec visa sous 5 jours ouvrés. Munissez-vous du récépissé de dépôt.",
	},
	"visa-touristique": {
		pricing: { amount: 100, currency: "EUR" },
		requiresAppointment: true,
		requiresAppointmentForPickup: true,
		appointmentDurationMinutes: 20,
		depositInstructions: "Préparez les justificatifs d'hébergement et de moyens financiers. 2 photos d'identité requises.",
		pickupInstructions: "Retrait sous 5 jours ouvrés avec le récépissé.",
	},
	"visa-affaires": {
		pricing: { amount: 100, currency: "EUR" },
		requiresAppointment: true,
		requiresAppointmentForPickup: true,
		appointmentDurationMinutes: 20,
		depositInstructions: "Lettre d'invitation de l'entreprise gabonaise obligatoire. Registre de commerce si applicable.",
		pickupInstructions: "Retrait sous 5 jours ouvrés avec le récépissé.",
	},
	"visa-visite-familiale": {
		pricing: { amount: 100, currency: "EUR" },
		requiresAppointment: true,
		requiresAppointmentForPickup: true,
		appointmentDurationMinutes: 20,
		depositInstructions: "Attestation d'hébergement du membre de famille au Gabon + preuve du lien familial.",
		pickupInstructions: "Retrait sous 5 jours ouvrés avec le récépissé.",
	},
	"visa-diplomatique": {
		pricing: { amount: 0, currency: "EUR" },
		estimatedDays: 3,
		requiresAppointment: true,
		requiresAppointmentForPickup: true,
		appointmentDurationMinutes: 15,
		depositInstructions: "Note verbale du Ministère des Affaires Étrangères obligatoire.",
		pickupInstructions: "Retrait sous 3 jours ouvrés.",
	},
	"visa-express": {
		pricing: { amount: 150, currency: "EUR" },
		estimatedDays: 2,
		requiresAppointment: true,
		requiresAppointmentForPickup: true,
		appointmentDurationMinutes: 20,
		depositInstructions: "Traitement prioritaire en 48h. Supplément de 50€ par rapport au visa standard. Tous les documents doivent être complets.",
		pickupInstructions: "Retrait sous 48h avec le récépissé.",
	},

	// État civil (tarifs à confirmer avec Mme EKIBA → 0€ en attendant)
	"transcription-naissance": {
		pricing: { amount: 0, currency: "EUR" },
		requiresAppointment: true,
		requiresAppointmentForPickup: false,
		appointmentDurationMinutes: 30,
		depositInstructions: "Acte de naissance original + traduction assermentée en français. Pièce d'identité gabonaise requise.",
	},
	"transcription-deces": {
		pricing: { amount: 0, currency: "EUR" },
		requiresAppointment: true,
		requiresAppointmentForPickup: false,
		appointmentDurationMinutes: 30,
		depositInstructions: "Certificat de décès original + traduction assermentée. Carte d'identité du déclarant.",
	},
	"celebration-mariage": {
		pricing: { amount: 0, currency: "EUR" },
		requiresAppointment: true,
		requiresAppointmentForPickup: false,
		appointmentDurationMinutes: 60,
		depositInstructions: "Publication des bans 30 jours avant la cérémonie. Dossier complet à déposer 2 mois à l'avance minimum.",
	},
	"legalisation-documents": {
		pricing: { amount: 0, currency: "EUR" },
		requiresAppointment: false,
		requiresAppointmentForPickup: false,
		appointmentDurationMinutes: 10,
		depositInstructions: "Documents originaux requis. Pas de rendez-vous nécessaire, présentez-vous aux heures d'ouverture.",
	},

	// Services consulaires
	"inscription-consulaire": {
		pricing: { amount: 0, currency: "EUR" },
		requiresAppointment: true,
		requiresAppointmentForPickup: true,
		appointmentDurationMinutes: 30,
		depositInstructions: "Passeport gabonais + justificatif de domicile en Espagne + 2 photos d'identité. Formulaire à remplir sur place.",
		pickupInstructions: "Retrait de la carte consulaire sous 15 jours.",
	},
	"document-voyage-urgence": {
		pricing: { amount: 50, currency: "EUR" },
		estimatedDays: 1,
		requiresAppointment: true,
		requiresAppointmentForPickup: false,
		appointmentDurationMinutes: 20,
		depositInstructions: "Déclaration de perte/vol du passeport (commissariat espagnol). Photo d'identité + copie du passeport si disponible.",
	},
};

// ═══════════════════════════════════════════════════════════════
// DATA — Formulaire dynamique de demande de visa
// ═══════════════════════════════════════════════════════════════

const VISA_FORM_SCHEMA = {
	sections: [
		{
			id: "identite",
			title: { fr: "Identité du demandeur", en: "Applicant identity", es: "Identidad del solicitante" },
			description: { fr: "Informations personnelles du demandeur de visa", en: "Personal information of the visa applicant" },
			fields: [
				{ id: "lastName", type: "text", label: { fr: "Nom de famille", en: "Last name" }, required: true },
				{ id: "firstName", type: "text", label: { fr: "Prénom(s)", en: "First name(s)" }, required: true },
				{ id: "birthDate", type: "date", label: { fr: "Date de naissance", en: "Date of birth" }, required: true },
				{ id: "birthPlace", type: "text", label: { fr: "Lieu de naissance", en: "Place of birth" }, required: true },
				{ id: "birthCountry", type: "country", label: { fr: "Pays de naissance", en: "Country of birth" }, required: true },
				{ id: "nationality", type: "country", label: { fr: "Nationalité", en: "Nationality" }, required: true },
				{ id: "gender", type: "gender", label: { fr: "Sexe", en: "Gender" }, required: true },
				{ id: "profession", type: "text", label: { fr: "Profession", en: "Profession" }, required: true },
				{ id: "email", type: "email", label: { fr: "Adresse e-mail", en: "Email address" }, required: true },
				{ id: "phone", type: "phone", label: { fr: "Téléphone", en: "Phone number" }, required: true },
				{ id: "address", type: "address", label: { fr: "Adresse de résidence", en: "Residential address" }, required: true },
			],
		},
		{
			id: "type_visa",
			title: { fr: "Type de visa et séjour", en: "Visa type and stay" },
			fields: [
				{
					id: "visaType",
					type: "select",
					label: { fr: "Type de visa demandé", en: "Visa type requested" },
					required: true,
					options: [
						{ value: "tourisme", label: { fr: "Tourisme", en: "Tourism" } },
						{ value: "affaires", label: { fr: "Affaires", en: "Business" } },
						{ value: "familiale", label: { fr: "Visite familiale", en: "Family visit" } },
						{ value: "diplomatique", label: { fr: "Diplomatique", en: "Diplomatic" } },
						{ value: "transit", label: { fr: "Transit", en: "Transit" } },
					],
				},
				{
					id: "entries",
					type: "select",
					label: { fr: "Nombre d'entrées", en: "Number of entries" },
					required: true,
					options: [
						{ value: "simple", label: { fr: "Entrée simple", en: "Single entry" } },
						{ value: "multiple", label: { fr: "Entrées multiples", en: "Multiple entries" } },
					],
				},
				{ id: "stayDuration", type: "number", label: { fr: "Durée du séjour (jours)", en: "Duration of stay (days)" }, required: true, validation: { min: 1, max: 365 } },
				{ id: "arrivalDate", type: "date", label: { fr: "Date d'arrivée prévue", en: "Expected arrival date" }, required: true },
				{ id: "departureDate", type: "date", label: { fr: "Date de départ prévue", en: "Expected departure date" }, required: true },
			],
		},
		{
			id: "passeport",
			title: { fr: "Informations passeport", en: "Passport information" },
			fields: [
				{ id: "passportNumber", type: "text", label: { fr: "Numéro de passeport", en: "Passport number" }, required: true },
				{ id: "passportIssueDate", type: "date", label: { fr: "Date de délivrance", en: "Date of issue" }, required: true },
				{ id: "passportExpiryDate", type: "date", label: { fr: "Date d'expiration", en: "Expiry date" }, required: true },
				{ id: "passportIssuingAuthority", type: "text", label: { fr: "Autorité de délivrance", en: "Issuing authority" }, required: true },
			],
		},
		{
			id: "voyage",
			title: { fr: "Détails du voyage", en: "Travel details" },
			fields: [
				{ id: "purposeOfTravel", type: "textarea", label: { fr: "Motif du voyage", en: "Purpose of travel" }, required: true },
				{ id: "accommodationAddress", type: "text", label: { fr: "Adresse d'hébergement au Gabon", en: "Accommodation address in Gabon" }, required: true },
				{ id: "hostName", type: "text", label: { fr: "Nom de l'hôte ou de l'hôtel", en: "Host or hotel name" }, required: false },
				{ id: "hostPhone", type: "phone", label: { fr: "Téléphone de l'hôte", en: "Host phone number" }, required: false },
				{ id: "previousVisits", type: "select", label: { fr: "Visites précédentes au Gabon", en: "Previous visits to Gabon" }, required: true, options: [
					{ value: "oui", label: { fr: "Oui", en: "Yes" } },
					{ value: "non", label: { fr: "Non", en: "No" } },
				]},
			],
		},
		{
			id: "declaration",
			title: { fr: "Déclaration sur l'honneur", en: "Declaration" },
			fields: [
				{
					id: "acceptTerms",
					type: "checkbox",
					label: { fr: "Je certifie que les informations fournies sont exactes et complètes. Je suis conscient(e) que toute fausse déclaration entraînera le refus ou l'annulation du visa.", en: "I certify that the information provided is accurate and complete. I am aware that any false declaration will result in the refusal or cancellation of the visa." },
					required: true,
				},
			],
		},
	],
	joinedDocuments: [
		{ type: "passport", label: { fr: "Passeport valide (min. 6 mois)", en: "Valid passport (min. 6 months)" }, required: true },
		{ type: "identity_photo", label: { fr: "2 photos d'identité récentes", en: "2 recent passport photos" }, required: true },
		{ type: "proof_of_address", label: { fr: "Justificatif de domicile", en: "Proof of address" }, required: true },
		{ type: "bank_statement", label: { fr: "Relevé bancaire (3 derniers mois)", en: "Bank statement (last 3 months)" }, required: true },
		{ type: "other_official_document", label: { fr: "Réservation d'hôtel ou attestation d'hébergement", en: "Hotel reservation or accommodation certificate" }, required: true },
		{ type: "other_official_document", label: { fr: "Billet d'avion aller-retour", en: "Round-trip flight ticket" }, required: true },
	],
	showRecap: true,
};

// ═══════════════════════════════════════════════════════════════
// MUTATION — seedEspagne
// ═══════════════════════════════════════════════════════════════

export const seedEspagne = mutation({
	args: {},
	handler: async (ctx) => {
		const results = {
			org: "",
			positions: { created: 0, skipped: 0 },
			services: { created: 0, skipped: 0 },
			orgServices: { created: 0, skipped: 0 },
			formTemplate: "",
			errors: [] as string[],
		};

		// ── 1. Find and patch org ────────────────────────────────
		const org = await ctx.db
			.query("orgs")
			.withIndex("by_slug", (q) => q.eq("slug", "es-ambassade-madrid"))
			.first();

		if (!org) {
			return { error: "Organisation es-ambassade-madrid introuvable. Exécutez d'abord seedDiplomaticNetwork." };
		}

		// Patch with complete data
		await ctx.db.patch(org._id, {
			name: "Ambassade de la République Gabonaise près le Royaume d'Espagne",
			description: "Représentation diplomatique de la République Gabonaise auprès du Royaume d'Espagne, accrédité également auprès du Portugal et de l'Andorre. Représentation Permanente du Gabon auprès de l'Organisation des Nations Unies pour le Tourisme (ONU Tourisme).",
			shortName: "Ambassade Gabon — Madrid",
			headOfMission: "S.E. Mme Allegra Pamela BONGO",
			headOfMissionTitle: "Ambassadeur Extraordinaire et Plénipotentiaire",
			staffCount: 4,
			modules: [
				"profile",
				"consular_affairs",
				"diplomatic_affairs",
				"documents",
				"calendar",
				"correspondence",
				"messaging",
				"news",
				"community",
				"team",
				"statistics",
				"settings",
			],
			settings: {
				appointmentBuffer: 15,
				maxActiveRequests: 5,
				workingHours: {
					monday: [{ start: "09:00", end: "16:00" }],
					tuesday: [{ start: "09:00", end: "16:00" }],
					wednesday: [{ start: "09:00", end: "16:00" }],
					thursday: [{ start: "09:00", end: "16:00" }],
					friday: [{ start: "09:00", end: "16:00" }],
				},
				registrationDurationYears: 5,
				requestAssignment: "manual",
				defaultProcessingDays: 5,
				aiAnalysisEnabled: true,
			},
			updatedAt: Date.now(),
		});
		results.org = "patched";

		// ── 2. Create positions ──────────────────────────────────
		for (const pos of ESPAGNE_POSITIONS) {
			try {
				const existing = await ctx.db
					.query("positions")
					.withIndex("by_org_code", (q) => q.eq("orgId", org._id).eq("code", pos.code))
					.first();

				if (existing) {
					// Update existing position with full data
					await ctx.db.patch(existing._id, {
						title: pos.title,
						description: pos.description,
						level: pos.level,
						grade: pos.grade,
						tasks: pos.tasks,
						isRequired: pos.isRequired,
						isUnique: pos.isUnique,
						isActive: true,
						updatedAt: Date.now(),
					});
					results.positions.skipped++;
					continue;
				}

				await ctx.db.insert("positions", {
					orgId: org._id,
					code: pos.code,
					title: pos.title,
					description: pos.description,
					level: pos.level,
					grade: pos.grade,
					tasks: pos.tasks,
					isRequired: pos.isRequired,
					isUnique: pos.isUnique,
					isActive: true,
					updatedAt: Date.now(),
				});
				results.positions.created++;
			} catch (error) {
				results.errors.push(`position-${pos.code}: ${error instanceof Error ? error.message : String(error)}`);
			}
		}

		// ── 3. Create services in global catalog ─────────────────
		for (const svc of ESPAGNE_SERVICES) {
			try {
				const existing = await ctx.db
					.query("services")
					.withIndex("by_slug", (q) => q.eq("slug", svc.slug))
					.first();

				if (existing) {
					results.services.skipped++;
					continue;
				}

				await ctx.db.insert("services", {
					slug: svc.slug,
					code: svc.code,
					category: svc.category,
					name: svc.name,
					description: svc.description,
					eligibleProfiles: svc.eligibleProfiles,
					estimatedDays: svc.estimatedDays,
					requiresAppointment: svc.requiresAppointment,
					requiresPickupAppointment: svc.requiresPickupAppointment ?? false,
					isActive: true,
					updatedAt: Date.now(),
				});
				results.services.created++;
			} catch (error) {
				results.errors.push(`service-${svc.slug}: ${error instanceof Error ? error.message : String(error)}`);
			}
		}

		// ── 4. Activate services for org (orgServices) ───────────
		for (const svc of ESPAGNE_SERVICES) {
			try {
				const serviceDoc = await ctx.db
					.query("services")
					.withIndex("by_slug", (q) => q.eq("slug", svc.slug))
					.first();

				if (!serviceDoc) {
					results.errors.push(`orgService-${svc.slug}: service not found in catalog`);
					continue;
				}

				const existingLink = await ctx.db
					.query("orgServices")
					.withIndex("by_org_service", (q) => q.eq("orgId", org._id).eq("serviceId", serviceDoc._id))
					.first();

				if (existingLink) {
					results.orgServices.skipped++;
					continue;
				}

				const config = ORG_SERVICE_CONFIGS[svc.slug];
				if (!config) {
					results.errors.push(`orgService-${svc.slug}: no config found`);
					continue;
				}

				await ctx.db.insert("orgServices", {
					orgId: org._id,
					serviceId: serviceDoc._id,
					pricing: config.pricing,
					estimatedDays: config.estimatedDays ?? svc.estimatedDays,
					depositInstructions: config.depositInstructions,
					pickupInstructions: config.pickupInstructions,
					requiresAppointment: config.requiresAppointment,
					requiresAppointmentForPickup: config.requiresAppointmentForPickup,
					appointmentDurationMinutes: config.appointmentDurationMinutes,
					isActive: true,
					updatedAt: Date.now(),
				});
				results.orgServices.created++;
			} catch (error) {
				results.errors.push(`orgService-${svc.slug}: ${error instanceof Error ? error.message : String(error)}`);
			}
		}

		// ── 5. Create visa form template ─────────────────────────
		try {
			const existingForm = await ctx.db
				.query("formTemplates")
				.withIndex("by_org", (q) => q.eq("orgId", org._id).eq("isActive", true))
				.first();

			if (existingForm) {
				results.formTemplate = "skipped (already exists)";
			} else {
				await ctx.db.insert("formTemplates", {
					name: { fr: "Formulaire de demande de visa — Espagne", en: "Visa application form — Spain" },
					description: {
						fr: "Formulaire officiel pour les demandes de visa d'entrée au Gabon déposées à l'Ambassade de Madrid",
						en: "Official form for Gabon entry visa applications submitted at the Embassy in Madrid",
					},
					category: "visa",
					schema: VISA_FORM_SCHEMA,
					orgId: org._id,
					isGlobal: false,
					isActive: true,
					usageCount: 0,
					updatedAt: Date.now(),
				});
				results.formTemplate = "created";
			}
		} catch (error) {
			results.errors.push(`formTemplate: ${error instanceof Error ? error.message : String(error)}`);
		}


		return results;
	},
});
