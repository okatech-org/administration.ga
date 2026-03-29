/**
 * Seed des services de Déclaration (Association & Entreprise)
 *
 * Ajoute 2 services au catalogue global pour permettre aux citoyens gabonais
 * de déclarer une association ou une entreprise tenue dans leur pays de résidence.
 *
 * Usage:
 *   npx convex run seeds/declarationServices:seedDeclarationServices
 */
import { mutation } from "../_generated/server";
import type { ServiceCategory, PublicUserType, DetailedDocumentType } from "../lib/constants";

// ═══════════════════════════════════════════════════════════════
// DATA — 2 Services de Déclaration (catalogue global)
// ═══════════════════════════════════════════════════════════════

interface DeclarationServiceSeed {
	slug: string;
	code: string;
	category: ServiceCategory;
	name: { fr: string; en: string };
	description: { fr: string; en: string };
	content: { fr: string; en: string };
	eligibleProfiles: PublicUserType[];
	estimatedDays: number;
	requiresAppointment: boolean;
	joinedDocuments: Array<{
		type: DetailedDocumentType;
		label: { fr: string; en: string };
		required: boolean;
	}>;
}

const DECLARATION_SERVICES: DeclarationServiceSeed[] = [
	{
		slug: "declaration-association",
		code: "DEC-001",
		category: "declaration" as ServiceCategory,
		name: {
			fr: "Déclaration d'Association",
			en: "Association Declaration",
		},
		description: {
			fr: "Déclarez une association tenue par un(e) Gabonais(e) dans le pays dont il/elle est ressortissant(e). Cette démarche permet d'enregistrer oficialmente votre association auprès de la représentation consulaire.",
			en: "Register an association run by a Gabonese national in their country of residence. This procedure officially registers your association with the consular authority.",
		},
		content: {
			fr: `<h3>Pourquoi déclarer votre association ?</h3>
<p>La déclaration de votre association auprès du consulat permet de :</p>
<ul>
  <li>Obtenir une reconnaissance officielle auprès des autorités gabonaises</li>
  <li>Faciliter les démarches administratives avec les institutions gabonaises</li>
  <li>Être référencé dans l'annuaire des associations de la diaspora</li>
  <li>Bénéficier de l'accompagnement du consulat pour vos projets</li>
</ul>
<h3>Types d'associations concernées</h3>
<p>Culturelle, Sportive, Religieuse, Professionnelle, Solidarité, Éducation, Jeunesse, Femmes, Étudiante, ou toute autre forme associative.</p>
<h3>Procédure</h3>
<p>Soumettez votre déclaration en ligne avec les pièces justificatives requises. Un agent consulaire examinera votre dossier et vous notifiera de la validation.</p>`,
			en: `<h3>Why register your association?</h3>
<p>Registering your association with the consulate allows you to:</p>
<ul>
  <li>Obtain official recognition from Gabonese authorities</li>
  <li>Facilitate administrative procedures with Gabonese institutions</li>
  <li>Be listed in the diaspora associations directory</li>
  <li>Benefit from consular support for your projects</li>
</ul>
<h3>Types of associations concerned</h3>
<p>Cultural, Sports, Religious, Professional, Solidarity, Education, Youth, Women, Student, or any other form of association.</p>
<h3>Procedure</h3>
<p>Submit your declaration online with the required supporting documents. A consular agent will review your file and notify you of the validation.</p>`,
		},
		eligibleProfiles: ["long_stay"] as PublicUserType[],
		estimatedDays: 15,
		requiresAppointment: false,
		joinedDocuments: [
			{
				type: "other_official_document" as DetailedDocumentType,
				label: {
					fr: "Statuts de l'association",
					en: "Association statutes",
				},
				required: true,
			},
			{
				type: "other_official_document" as DetailedDocumentType,
				label: {
					fr: "Procès-verbal de l'Assemblée Générale constitutive",
					en: "Minutes of the constituent General Assembly",
				},
				required: true,
			},
			{
				type: "national_id_card" as DetailedDocumentType,
				label: {
					fr: "Pièce d'identité du/de la Président(e)",
					en: "ID document of the President",
				},
				required: true,
			},
			{
				type: "proof_of_address" as DetailedDocumentType,
				label: {
					fr: "Justificatif de domicile du siège",
					en: "Proof of address of the headquarters",
				},
				required: true,
			},
			{
				type: "other_official_document" as DetailedDocumentType,
				label: {
					fr: "Liste des membres du bureau",
					en: "List of board members",
				},
				required: false,
			},
		],
	},
	{
		slug: "declaration-entreprise",
		code: "DEC-002",
		category: "declaration" as ServiceCategory,
		name: {
			fr: "Déclaration d'Entreprise",
			en: "Company Declaration",
		},
		description: {
			fr: "Déclarez une entreprise tenue par un(e) Gabonais(e) dans le pays dont il/elle est ressortissant(e). Cette démarche permet d'enregistrer votre activité économique auprès de la représentation consulaire.",
			en: "Register a company run by a Gabonese national in their country of residence. This procedure officially registers your business activity with the consular authority.",
		},
		content: {
			fr: `<h3>Pourquoi déclarer votre entreprise ?</h3>
<p>La déclaration de votre entreprise auprès du consulat permet de :</p>
<ul>
  <li>Obtenir une reconnaissance officielle auprès des autorités gabonaises</li>
  <li>Faciliter les échanges commerciaux avec le Gabon</li>
  <li>Être référencé dans le répertoire des entreprises de la diaspora</li>
  <li>Bénéficier de l'accompagnement consulaire pour vos projets économiques</li>
</ul>
<h3>Types d'entreprises concernées</h3>
<p>SARL, SA, SAS, SASU, EURL, Entreprise Individuelle, Auto-Entrepreneur, ou toute autre forme juridique.</p>
<h3>Secteurs d'activité</h3>
<p>Technologie, Commerce, Services, Industrie, Agriculture, Santé, Éducation, Culture, Tourisme, Transport, Construction, et autres.</p>
<h3>Procédure</h3>
<p>Soumettez votre déclaration en ligne avec les pièces justificatives requises. Un agent consulaire examinera votre dossier et vous notifiera de la validation.</p>`,
			en: `<h3>Why register your company?</h3>
<p>Registering your company with the consulate allows you to:</p>
<ul>
  <li>Obtain official recognition from Gabonese authorities</li>
  <li>Facilitate trade with Gabon</li>
  <li>Be listed in the diaspora business directory</li>
  <li>Benefit from consular support for your economic projects</li>
</ul>
<h3>Types of companies concerned</h3>
<p>SARL, SA, SAS, SASU, EURL, Sole Proprietorship, Auto-Entrepreneur, or any other legal form.</p>
<h3>Sectors of activity</h3>
<p>Technology, Commerce, Services, Industry, Agriculture, Health, Education, Culture, Tourism, Transport, Construction, and others.</p>
<h3>Procedure</h3>
<p>Submit your declaration online with the required supporting documents. A consular agent will review your file and notify you of the validation.</p>`,
		},
		eligibleProfiles: ["long_stay"] as PublicUserType[],
		estimatedDays: 15,
		requiresAppointment: false,
		joinedDocuments: [
			{
				type: "kbis_extract" as DetailedDocumentType,
				label: {
					fr: "Extrait Kbis ou équivalent local (registre du commerce)",
					en: "Kbis extract or local equivalent (trade register)",
				},
				required: true,
			},
			{
				type: "company_statutes" as DetailedDocumentType,
				label: {
					fr: "Statuts de l'entreprise",
					en: "Company statutes",
				},
				required: true,
			},
			{
				type: "national_id_card" as DetailedDocumentType,
				label: {
					fr: "Pièce d'identité du/de la dirigeant(e)",
					en: "ID document of the company director",
				},
				required: true,
			},
			{
				type: "proof_of_address" as DetailedDocumentType,
				label: {
					fr: "Justificatif de domicile du siège social",
					en: "Proof of address of the registered office",
				},
				required: true,
			},
			{
				type: "other_official_document" as DetailedDocumentType,
				label: {
					fr: "Attestation d'immatriculation fiscale",
					en: "Tax registration certificate",
				},
				required: false,
			},
		],
	},
];

// ═══════════════════════════════════════════════════════════════
// MUTATION — seedDeclarationServices
// ═══════════════════════════════════════════════════════════════

export const seedDeclarationServices = mutation({
	args: {},
	handler: async (ctx) => {
		const results = {
			services: { created: 0, skipped: 0 },
			errors: [] as string[],
		};

		for (const svc of DECLARATION_SERVICES) {
			try {
				const existing = await ctx.db
					.query("services")
					.withIndex("by_slug", (q) => q.eq("slug", svc.slug))
					.first();

				if (existing) {
					// Update existing service with latest data
					await ctx.db.patch(existing._id, {
						name: svc.name,
						description: svc.description,
						content: svc.content,
						category: svc.category,
						eligibleProfiles: svc.eligibleProfiles,
						estimatedDays: svc.estimatedDays,
						requiresAppointment: svc.requiresAppointment,
						joinedDocuments: svc.joinedDocuments,
						isActive: true,
						updatedAt: Date.now(),
					});
					results.services.skipped++;
					continue;
				}

				await ctx.db.insert("services", {
					slug: svc.slug,
					code: svc.code,
					category: svc.category,
					name: svc.name,
					description: svc.description,
					content: svc.content,
					eligibleProfiles: svc.eligibleProfiles,
					estimatedDays: svc.estimatedDays,
					requiresAppointment: svc.requiresAppointment,
					requiresPickupAppointment: false,
					joinedDocuments: svc.joinedDocuments,
					isActive: true,
					updatedAt: Date.now(),
				});
				results.services.created++;
			} catch (error) {
				results.errors.push(
					`service-${svc.slug}: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}

		return results;
	},
});
