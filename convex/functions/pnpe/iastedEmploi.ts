/**
 * iAsted Mode Emploi — 4 business tools dédiés PNPE.
 *
 * Exposés à l'agent vocal iAsted pour qu'il puisse :
 *  - matcher candidats sur une offre
 *  - rédiger un brouillon d'offre
 *  - suggérer des formations à un D.E
 *  - expliquer un point du Code du travail gabonais
 *
 * MVP Phase F : algos déterministes (scoring simple, template offre,
 * mapping compétences→formations, FAQ Code du travail).
 *
 * Itération future : enrichir avec LLM (Anthropic / Gemini déjà en deps)
 * pour rédaction d'offre contextuelle et RAG sur Code du travail.
 */
import { v } from "convex/values";
import { query } from "../../_generated/server";
import {
  codeNAFGabonValidator,
  niveauEtudesValidator,
  typeContratValidator,
} from "../../lib/validators/pnpe";

// ─── Tool 1 : match_candidates ────────────────────────────────

/**
 * Retourne les D.E ACTIFS dont le profil correspond à une offre.
 * Scoring simple : province match (+50), niveau études (+20), type
 * contrat préférence (+15), secteur partagé (+15).
 *
 * Limite : 10 candidats max par défaut.
 */
export const matchCandidates = query({
  args: {
    offreId: v.id("offresEmploi"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const offre = await ctx.db.get(args.offreId);
    if (!offre) return [];

    // Récupère tous les D.E actifs (MVP — pas d'index spécialisé matching)
    const candidats = await ctx.db
      .query("demandeursEmploi")
      .withIndex("by_statut", (q) => q.eq("statutCompte", "ACTIF"))
      .collect();

    const scored = candidats.map((c) => {
      let score = 0;
      const reasons: string[] = [];

      // Province
      if (c.provinceResidence === offre.lieuTravail.province) {
        score += 50;
        reasons.push("Même province");
      } else if (
        c.mobiliteGeographique?.includes(offre.lieuTravail.province)
      ) {
        score += 30;
        reasons.push("Mobile sur cette province");
      }

      // Niveau d'études
      if (
        offre.niveauEtudesRequis &&
        c.niveauEtudes === offre.niveauEtudesRequis
      ) {
        score += 20;
        reasons.push(`Niveau ${c.niveauEtudes} match`);
      }

      // Type contrat souhaité
      if (c.typeContratSouhaite?.includes(offre.typeContrat)) {
        score += 15;
        reasons.push(`Recherche ${offre.typeContrat}`);
      }

      // Compétences partagées
      const reqCompetences = offre.competencesRequises ?? [];
      const cCompetences = c.competences ?? [];
      const shared = reqCompetences.filter((s) =>
        cCompetences.some((cs) => cs.toLowerCase().includes(s.toLowerCase())),
      );
      if (shared.length > 0) {
        score += Math.min(15, shared.length * 5);
        reasons.push(`${shared.length} compétence(s) en commun`);
      }

      return {
        demandeurId: c._id,
        nom: c.nom,
        prenoms: c.prenoms,
        province: c.provinceResidence,
        score,
        reasons,
      };
    });

    return scored
      .filter((s) => s.score >= 30)
      .sort((a, b) => b.score - a.score)
      .slice(0, args.limit ?? 10);
  },
});

// ─── Tool 2 : draft_job_offer ─────────────────────────────────

/**
 * Génère un brouillon d'offre d'emploi à partir de paramètres simples.
 * MVP : template texte structuré. LLM iAsted enrichira en future iter.
 */
export const draftJobOffer = query({
  args: {
    titre: v.string(),
    secteur: codeNAFGabonValidator,
    typeContrat: typeContratValidator,
    niveauEtudes: v.optional(niveauEtudesValidator),
    salaireMin: v.optional(v.number()),
    salaireMax: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const salaireText =
      args.salaireMin && args.salaireMax
        ? `${args.salaireMin.toLocaleString("fr-FR")} – ${args.salaireMax.toLocaleString(
            "fr-FR",
          )} XAF / mois`
        : "À discuter";

    const niveauText = args.niveauEtudes
      ? `Niveau d'études requis : ${args.niveauEtudes.replace(/_/g, " ")}.`
      : "";

    const description = `${args.titre}

Notre entreprise recherche un(e) ${args.titre} en ${args.typeContrat} dans le secteur ${args.secteur.replace(/_/g, " ").toLowerCase()}.

MISSIONS PRINCIPALES
- (À compléter selon le poste)
- (Lister 3 à 5 missions clés)

PROFIL RECHERCHÉ
- ${niveauText}
- Expérience similaire appréciée
- Maîtrise du français (oral et écrit)

CONDITIONS
- Type de contrat : ${args.typeContrat}
- Rémunération : ${salaireText}
- Lieu de travail : (à préciser)
`;

    return {
      titre: args.titre,
      description,
      missions: [
        "(À compléter selon le poste)",
        "(Lister 3 à 5 missions clés)",
      ],
      profilRecherche: niveauText + " Expérience similaire appréciée.",
      typeContrat: args.typeContrat,
      secteurActivite: args.secteur,
    };
  },
});

// ─── Tool 3 : suggest_trainings ───────────────────────────────

/**
 * Recommande des formations à un D.E selon ses compétences actuelles
 * et celles manquantes (le cas échéant). Catalogue MVP hardcodé ; à
 * brancher sur Ediandza en future iteration.
 */
const FORMATIONS_CATALOGUE = [
  { slug: "bureautique-base", titre: "Bureautique de base (Word, Excel)", organisme: "Ediandza", duree: "40h" },
  { slug: "comptabilite-generale", titre: "Comptabilité générale", organisme: "Ediandza", duree: "60h" },
  { slug: "anglais-pro", titre: "Anglais professionnel", organisme: "Ediandza", duree: "80h" },
  { slug: "btp-conducteur-engins", titre: "Conduite d'engins BTP (CACES)", organisme: "Partenaire BTP", duree: "120h" },
  { slug: "vente-relation-client", titre: "Techniques de vente et relation client", organisme: "Ediandza", duree: "50h" },
  { slug: "dev-web-fullstack", titre: "Développement web Full-Stack", organisme: "École 241", duree: "6 mois" },
  { slug: "management-equipe", titre: "Management d'équipe", organisme: "Ediandza", duree: "30h" },
  { slug: "logistique-transport", titre: "Logistique et transport", organisme: "Ediandza", duree: "70h" },
] as const;

export const suggestTrainings = query({
  args: {
    demandeurId: v.id("demandeursEmploi"),
    gapSkills: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const demandeur = await ctx.db.get(args.demandeurId);
    if (!demandeur) return [];

    // Match les compétences manquantes avec les titres de formations
    const skills = args.gapSkills ?? [];
    const skillsLc = skills.map((s) => s.toLowerCase());

    const matched = FORMATIONS_CATALOGUE.filter((f) => {
      const titreLc = f.titre.toLowerCase();
      return skillsLc.some((s) => titreLc.includes(s));
    });

    // Si aucun match précis, retourne les 3 formations les plus génériques
    const final = matched.length > 0 ? matched : FORMATIONS_CATALOGUE.slice(0, 3);

    return final.map((f) => ({
      ...f,
      eligibility: demandeur.niveauEtudes
        ? `Accessible avec votre niveau ${demandeur.niveauEtudes}`
        : "Accessible à tous niveaux",
    }));
  },
});

// ─── Tool 4 : explain_labor_code ──────────────────────────────

/**
 * FAQ Code du travail gabonais. MVP : 10 entrées les plus fréquentes
 * (embauche, période d'essai, rupture, congés, salaires).
 * Future iter : RAG sur PDF du Code du travail via OpenAI / Anthropic.
 */
const LABOR_FAQ = [
  {
    q: ["période d'essai", "essai", "essai cdi", "essai cdd"],
    reponse:
      "La période d'essai au Gabon est limitée à 3 mois renouvelable une fois pour les CDI (Code du travail art. L. 31). Pour les CDD < 6 mois : période d'essai max 1 mois.",
    articles: ["L. 31", "L. 32"],
  },
  {
    q: ["congés payés", "congés", "vacances", "rtt"],
    reponse:
      "Tout salarié gabonais a droit à 2 jours ouvrables de congés payés par mois de travail effectif (24 jours/an pour un temps plein). Articles L. 154 et suivants du Code du travail.",
    articles: ["L. 154", "L. 155"],
  },
  {
    q: ["préavis", "rupture", "licenciement", "démission"],
    reponse:
      "Durée du préavis selon ancienneté : 1 mois (employés < 1 an), 2 mois (1-5 ans), 3 mois (5+ ans). Délai applicable à la démission et au licenciement (sauf faute grave).",
    articles: ["L. 67", "L. 68"],
  },
  {
    q: ["smig", "salaire minimum", "salaires"],
    reponse:
      "Le SMIG gabonais est fixé par décret. À mai 2026, il est de 150 000 XAF/mois (valeur indicative — vérifier le décret en vigueur).",
    articles: ["L. 142"],
  },
  {
    q: ["maternité", "congé maternité", "grossesse"],
    reponse:
      "La salariée en état de grossesse a droit à 14 semaines de congé maternité (6 avant + 8 après accouchement), indemnisé par la CNSS sous conditions d'affiliation.",
    articles: ["L. 169", "L. 170"],
  },
  {
    q: ["apprentissage", "contrat apprentissage"],
    reponse:
      "Le contrat d'apprentissage est encadré par le Code du travail. Durée 1 à 3 ans, rémunération progressive (% du SMIG selon année). Le PNPE assure le suivi (3 visites min).",
    articles: ["L. 23", "L. 24", "L. 25"],
  },
] as const;

export const explainLaborCode = query({
  args: {
    question: v.string(),
    contexte: v.optional(
      v.union(
        v.literal("embauche"),
        v.literal("rupture"),
        v.literal("conges"),
        v.literal("salaires"),
        v.literal("maternite"),
        v.literal("apprentissage"),
      ),
    ),
  },
  handler: async (_ctx, args) => {
    const q = args.question.toLowerCase();
    const matched = LABOR_FAQ.find((entry) =>
      entry.q.some((kw) => q.includes(kw)),
    );

    if (matched) {
      return {
        reponse: matched.reponse,
        articlesCites: [...matched.articles],
        source: "FAQ_CODE_TRAVAIL_GABONAIS",
        avertissement:
          "Cette réponse est indicative. Pour un cas concret, consultez le Code du travail officiel ou un conseiller juridique.",
      };
    }

    return {
      reponse:
        "Je n'ai pas de réponse précise dans ma base FAQ pour cette question. Pour une réponse fiable, consultez le Code du travail gabonais ou un conseiller juridique du PNPE.",
      articlesCites: [],
      source: "NO_MATCH",
      avertissement:
        "Aucune correspondance dans la FAQ MVP. Future itération : RAG sur PDF du Code du travail.",
    };
  },
});
