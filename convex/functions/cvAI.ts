/**
 * CV AI Functions
 *
 * AI-powered features for CV enhancement using Gemini.
 * Includes: improve summary, suggest skills, optimize for job,
 * generate cover letter, ATS score, translate CV.
 */

import { v } from "convex/values";
import { action } from "../_generated/server";
import { extractJSON, generate, multimodalGenerate } from "../lib/ai/gemini";

// ═══════════════════════════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Improve the professional summary / profile text
 */
export const improveSummary = action({
  args: {
    summary: v.string(),
    cvContext: v.string(), // serialized CV context
    language: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<{ improvedSummary: string }> => {
    const lang = args.language || "fr";
    const prompt = `Tu es un expert en rédaction de CV professionnels. 
Reformule et améliore ce résumé professionnel pour le rendre plus percutant, avec des mots-clés forts et une structure engageante.

Contexte du CV:
${args.cvContext}

Résumé actuel:
${args.summary}

Instructions:
- Langue de rédaction: ${
      lang === "fr" ? "Français"
      : lang === "en" ? "Anglais"
      : lang
    }
- Maximum 4 phrases
- Utilise des verbes d'action et des résultats concrets
- Intègre des mots-clés pertinents pour le secteur
- Garde un ton professionnel mais engageant

Réponds UNIQUEMENT avec le résumé amélioré, sans guillemets ni explications.`;

    const result = await generate(prompt);
    return { improvedSummary: result.trim() };
  },
});

/**
 * Suggest skills based on experiences
 */
export const suggestSkills = action({
  args: {
    cvContext: v.string(),
    existingSkills: v.array(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (
    _ctx,
    args,
  ): Promise<{
    suggestions: Array<{ name: string; level: string; reason: string }>;
  }> => {
    const lang = args.language || "fr";
    const prompt = `Tu es un expert en recrutement et compétences professionnelles.
Analyse ce CV et suggère des compétences pertinentes qui manquent.

CV:
${args.cvContext}

Compétences déjà listées: ${args.existingSkills.join(", ") || "Aucune"}

Instructions:
- Suggère 5 à 8 compétences manquantes mais pertinentes
- Pour chaque compétence, indique le niveau estimé: Beginner, Intermediate, Advanced, Expert
- Donne une courte raison de la suggestion
- Langue: ${lang === "fr" ? "Français" : "Anglais"}

Réponds UNIQUEMENT en JSON:
{
  "suggestions": [
    { "name": "Nom compétence", "level": "Advanced", "reason": "Raison courte" }
  ]
}`;

    const result = await generate(prompt);
    const parsed = extractJSON(result) as {
      suggestions: Array<{ name: string; level: string; reason: string }>;
    };
    return { suggestions: parsed.suggestions || [] };
  },
});

/**
 * Optimize CV for a specific job posting
 */
export const optimizeForJob = action({
  args: {
    cvContext: v.string(),
    jobDescription: v.string(),
    language: v.optional(v.string()),
  },
  handler: async (
    _ctx,
    args,
  ): Promise<{
    recommendations: string[];
    keywordsToAdd: string[];
    optimizedSummary: string;
    matchScore: number;
  }> => {
    const lang = args.language || "fr";
    const prompt = `Tu es un expert en recrutement et optimisation de CV.
Analyse ce CV par rapport à cette offre d'emploi et propose des optimisations.

CV:
${args.cvContext}

Offre d'emploi / Description du poste:
${args.jobDescription}

Instructions (langue: ${lang === "fr" ? "Français" : "Anglais"}):
- Évalue la correspondance entre le CV et l'offre
- Liste les recommandations concrètes pour améliorer la correspondance  
- Identifie les mots-clés de l'offre absents du CV
- Propose un résumé reformulé pour ce poste

Réponds UNIQUEMENT en JSON:
{
  "recommendations": ["Recommandation 1", "Recommandation 2"],
  "keywordsToAdd": ["mot-clé 1", "mot-clé 2"],
  "optimizedSummary": "Résumé optimisé pour ce poste",
  "matchScore": 75
}`;

    const result = await generate(prompt);
    return extractJSON(result) as {
      recommendations: string[];
      keywordsToAdd: string[];
      optimizedSummary: string;
      matchScore: number;
    };
  },
});

/**
 * Generate a cover letter
 */
export const generateCoverLetter = action({
  args: {
    cvContext: v.string(),
    jobTitle: v.string(),
    companyName: v.string(),
    additionalInfo: v.optional(v.string()),
    style: v.optional(v.string()), // 'formal' | 'modern' | 'creative'
    language: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<{ coverLetter: string }> => {
    const lang = args.language || "fr";
    const style = args.style || "formal";
    const prompt = `Tu es un expert en rédaction de lettres de motivation.
Génère une lettre de motivation professionnelle.

CV du candidat:
${args.cvContext}

Poste visé: ${args.jobTitle}
Entreprise: ${args.companyName}
${args.additionalInfo ? `Informations supplémentaires: ${args.additionalInfo}` : ""}

Instructions:
- Langue: ${
      lang === "fr" ? "Français"
      : lang === "en" ? "Anglais"
      : lang
    }
- Style: ${
      style === "formal" ? "Formel et classique"
      : style === "modern" ? "Moderne et dynamique"
      : "Créatif et original"
    }
- Structure: Introduction accroche → Motivation → Compétences clés → Conclusion avec appel à l'action
- Longueur: 250-350 mots
- Personnalise avec les expériences et compétences du CV
- Ne mets PAS de crochets ou placeholders, invente les détails manquants

Réponds UNIQUEMENT avec la lettre de motivation, sans guillemets ni explications.`;

    const result = await generate(prompt);
    return { coverLetter: result.trim() };
  },
});

/**
 * Analyze ATS (Applicant Tracking System) compatibility
 */
export const atsScore = action({
  args: {
    cvContext: v.string(),
    targetJob: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (
    _ctx,
    args,
  ): Promise<{
    score: number;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    keywordDensity: string;
  }> => {
    const lang = args.language || "fr";
    const prompt = `Tu es un expert en systèmes ATS (Applicant Tracking System) et en recrutement.
Analyse ce CV pour sa compatibilité avec les systèmes ATS utilisés par les recruteurs.

CV:
${args.cvContext}
${args.targetJob ? `\nPoste cible: ${args.targetJob}` : ""}

Instructions (langue: ${lang === "fr" ? "Français" : "Anglais"}):
Évalue les critères suivants:
1. Structure et format (titres clairs, sections standard)
2. Mots-clés pertinents (compétences, technologies, certifications)
3. Quantification des résultats (chiffres, métriques, achievements)
4. Cohérence des dates et parcours
5. Longueur et densité d'information

Réponds UNIQUEMENT en JSON:
{
  "score": 85,
  "strengths": ["Point fort 1", "Point fort 2"],
  "weaknesses": ["Point faible 1", "Point faible 2"],
  "recommendations": ["Recommandation 1", "Recommandation 2"],
  "keywordDensity": "Bonne / Moyenne / Faible"
}`;

    const result = await generate(prompt);
    return extractJSON(result) as {
      score: number;
      strengths: string[];
      weaknesses: string[];
      recommendations: string[];
      keywordDensity: string;
    };
  },
});

/**
 * Translate the entire CV content to a target language
 */
export const translateCV = action({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    title: v.optional(v.string()),
    objective: v.optional(v.string()),
    summary: v.optional(v.string()),
    experiences: v.array(
      v.object({
        title: v.string(),
        company: v.string(),
        location: v.optional(v.string()),
        startDate: v.string(),
        endDate: v.optional(v.string()),
        current: v.boolean(),
        description: v.optional(v.string()),
      }),
    ),
    education: v.array(
      v.object({
        degree: v.string(),
        school: v.string(),
        location: v.optional(v.string()),
        startDate: v.string(),
        endDate: v.optional(v.string()),
        current: v.boolean(),
        description: v.optional(v.string()),
      }),
    ),
    skills: v.array(
      v.object({
        name: v.string(),
        level: v.string(),
      }),
    ),
    languages: v.array(
      v.object({
        name: v.string(),
        level: v.string(),
      }),
    ),
    hobbies: v.optional(v.array(v.string())),
    targetLanguage: v.string(), // 'fr' | 'en' | 'es' | 'de' | ...
  },
  handler: async (
    _ctx,
    args,
  ): Promise<{
    title?: string;
    objective?: string;
    summary?: string;
    experiences: Array<{
      title: string;
      company: string;
      location?: string;
      description?: string;
    }>;
    skills: Array<{ name: string }>;
    hobbies?: string[];
  }> => {
    const langNames: Record<string, string> = {
      fr: "Français",
      en: "Anglais",
      es: "Espagnol",
      de: "Allemand",
      pt: "Portugais",
      it: "Italien",
      ar: "Arabe",
      zh: "Chinois",
      ja: "Japonais",
    };
    const targetName = langNames[args.targetLanguage] || args.targetLanguage;

    const cvData = {
      title: args.title,
      objective: args.objective,
      summary: args.summary,
      experiences: args.experiences.map((e) => ({
        title: e.title,
        description: e.description,
        location: e.location,
      })),
      skills: args.skills.map((s) => s.name),
      hobbies: args.hobbies,
    };

    const prompt = `Tu es un traducteur professionnel spécialisé dans les CV.
Traduis les éléments suivants du CV en ${targetName}.

Données à traduire (JSON):
${JSON.stringify(cvData, null, 2)}

Instructions:
- Traduis UNIQUEMENT le contenu textuel, pas les noms de personnes ni les noms d'entreprises/écoles
- Adapte les titres de postes aux conventions du pays cible
- Garde les termes techniques reconnus internationalement (ex: "React", "Python")
- Ne traduis PAS les dates ni les niveaux de compétence (Beginner, etc.)
- Les lieux (location) ne doivent être traduits que si le nom du pays est traduit différemment

Réponds UNIQUEMENT en JSON:
{
  "title": "Titre traduit",
  "objective": "Objectif traduit",
  "summary": "Résumé traduit",
  "experiences": [
    { "title": "Titre poste traduit", "description": "Description traduite", "location": "Lieu" }
  ],
  "skills": [{ "name": "Nom compétence traduit" }],
  "hobbies": ["Hobby traduit"]
}`;

    const result = await generate(prompt);
    return extractJSON(result) as {
      title?: string;
      objective?: string;
      summary?: string;
      experiences: Array<{
        title: string;
        company: string;
        location?: string;
        description?: string;
      }>;
      skills: Array<{ name: string }>;
      hobbies?: string[];
    };
  },
});

/**
 * Parse a CV from pasted text or an uploaded file (PDF / image).
 * Uses Gemini multimodal to extract structured CV data.
 */
export const parseCV = action({
  args: {
    text: v.optional(v.string()),
    fileUrl: v.optional(v.string()),
    fileMimeType: v.optional(v.string()),
  },
  handler: async (
    _ctx,
    args,
  ): Promise<{
    firstName: string;
    lastName: string;
    title: string;
    objective: string;
    summary: string;
    email: string;
    phone: string;
    address: string;
    experiences: Array<{
      title: string;
      company: string;
      location: string;
      startDate: string;
      endDate: string;
      current: boolean;
      description: string;
    }>;
    education: Array<{
      degree: string;
      school: string;
      location: string;
      startDate: string;
      endDate: string;
      current: boolean;
      description: string;
    }>;
    skills: Array<{ name: string; level: string }>;
    languages: Array<{ name: string; level: string }>;
    hobbies: string[];
    portfolioUrl: string;
    linkedinUrl: string;
  }> => {
    if (!args.text && !args.fileUrl) {
      throw new Error("Either text or fileUrl must be provided");
    }

    const prompt = `Tu es un expert en recrutement. Analyse le CV fourni et extrais TOUTES les informations dans un JSON structuré.

Retourne UNIQUEMENT un JSON valide (pas de markdown, pas de commentaires) avec cette structure exacte :
{
  "firstName": "string",
  "lastName": "string",
  "title": "string (titre professionnel)",
  "objective": "string (objectif professionnel si mentionné)",
  "summary": "string (résumé / profil professionnel)",
  "email": "string",
  "phone": "string",
  "address": "string",
  "experiences": [
    {
      "title": "string (intitulé du poste)",
      "company": "string",
      "location": "string",
      "startDate": "string (format YYYY-MM si possible)",
      "endDate": "string (format YYYY-MM, vide si poste actuel)",
      "current": false,
      "description": "string (missions, responsabilités)"
    }
  ],
  "education": [
    {
      "degree": "string (diplôme / formation)",
      "school": "string (établissement)",
      "location": "string",
      "startDate": "string (format YYYY-MM si possible)",
      "endDate": "string",
      "current": false,
      "description": "string"
    }
  ],
  "skills": [
    { "name": "string", "level": "beginner|intermediate|advanced|expert" }
  ],
  "languages": [
    { "name": "string", "level": "A1|A2|B1|B2|C1|C2|native" }
  ],
  "hobbies": ["string"],
  "portfolioUrl": "string",
  "linkedinUrl": "string"
}

Règles :
- Extrais le maximum d'informations disponibles
- Pour les niveaux de compétences, estime le niveau en fonction du contexte (expérience, certifications)
- Pour les langues, utilise l'échelle CECRL (A1-C2) ou "native"
- Les dates doivent être au format YYYY-MM quand possible
- Si une info n'est pas disponible, utilise une chaîne vide "" ou un tableau vide []
- Classe les expériences de la plus récente à la plus ancienne
- Retourne UNIQUEMENT le JSON, rien d'autre`;

    const responseText = await multimodalGenerate({
      prompt,
      fileUrl: args.fileUrl,
      fileMimeType: args.fileMimeType,
      text: args.fileUrl
        ? undefined
        : `Voici le contenu du CV :\n\n${args.text}`,
    });

    const parsed = extractJSON(responseText) as Record<string, unknown>;

    // Safely extract and normalize the result
    return {
      firstName: String(parsed.firstName || ""),
      lastName: String(parsed.lastName || ""),
      title: String(parsed.title || ""),
      objective: String(parsed.objective || ""),
      summary: String(parsed.summary || ""),
      email: String(parsed.email || ""),
      phone: String(parsed.phone || ""),
      address: String(parsed.address || ""),
      experiences:
        Array.isArray(parsed.experiences) ?
          parsed.experiences.map((e: Record<string, unknown>) => ({
            title: String(e.title || ""),
            company: String(e.company || ""),
            location: String(e.location || ""),
            startDate: String(e.startDate || ""),
            endDate: String(e.endDate || ""),
            current: Boolean(e.current),
            description: String(e.description || ""),
          }))
        : [],
      education:
        Array.isArray(parsed.education) ?
          parsed.education.map((e: Record<string, unknown>) => ({
            degree: String(e.degree || ""),
            school: String(e.school || ""),
            location: String(e.location || ""),
            startDate: String(e.startDate || ""),
            endDate: String(e.endDate || ""),
            current: Boolean(e.current),
            description: String(e.description || ""),
          }))
        : [],
      skills:
        Array.isArray(parsed.skills) ?
          parsed.skills.map((s: Record<string, unknown>) => ({
            name: String(s.name || ""),
            level: String(s.level || "intermediate"),
          }))
        : [],
      languages:
        Array.isArray(parsed.languages) ?
          parsed.languages.map((l: Record<string, unknown>) => ({
            name: String(l.name || ""),
            level: String(l.level || "B1"),
          }))
        : [],
      hobbies:
        Array.isArray(parsed.hobbies) ?
          parsed.hobbies.map((h: unknown) => String(h))
        : [],
      portfolioUrl: String(parsed.portfolioUrl || ""),
      linkedinUrl: String(parsed.linkedinUrl || ""),
    };
  },
});
