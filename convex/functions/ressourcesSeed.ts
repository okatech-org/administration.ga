import { internalMutation } from "../_generated/server";
import {
  PostStatus,
  TutorialBadge,
  TutorialCategory,
  TutorialType,
} from "../lib/constants";
import type { Id } from "../_generated/dataModel";

/**
 * Seed des ressources de la page publique /ressources :
 *
 * 1. Enrichit les tutoriels existants avec les nouveaux champs
 *    (readingMinutes, stepCount, badges, featured, updatedAt, countryCode)
 *    + remappe certaines catégories vers les nouvelles (ConsularProcedures,
 *    CivilStatus, EducationGrants, ReturnGabon).
 *
 * 2. Ajoute les fiches manquantes attendues par la maquette :
 *    - 4 nouveaux guides featured (acte naissance/mariage, bourses, carte
 *      consulaire, sécurité & assistance)
 *    - 6 fiches "Toutes les démarches" couvrant état civil, fiscalité,
 *      santé, retour, vote, et logement
 *    - 2 nouveaux tutoriels vidéo (inscription en ligne, apostille)
 *
 * Sources : décret 00064/PR/MAEFICDFE 2020, portail e-Visa Gabon, pratique
 * consulaire, FAQ officielles MAE Gabon.
 *
 * Run via CLI :
 *   bunx convex run functions/ressourcesSeed:seedRessources
 */
export const seedRessources = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const allUsers = await ctx.db.query("users").take(5);
    if (allUsers.length === 0) {
      return { error: "no users in DB — cannot set authorId" };
    }
    const authorId = allUsers[0]._id as Id<"users">;

    // ── Phase 1 : enrichir les tutoriels existants ────────────────────────
    type Enrichment = {
      readingMinutes?: number;
      stepCount?: number;
      badges?: TutorialBadge[];
      featured?: boolean;
      category?: TutorialCategory;
      duration?: string;
    };
    const enrichments: Record<string, Enrichment> = {
      "renouveler-passeport": {
        stepCount: 12,
        readingMinutes: 8,
        featured: true,
        badges: [TutorialBadge.Updated],
        category: TutorialCategory.ConsularProcedures,
        duration: "7:42",
      },
      "inscription-registre-consulaire": {
        stepCount: 4,
        readingMinutes: 5,
        featured: true,
        badges: [TutorialBadge.Express],
        category: TutorialCategory.ConsularProcedures,
      },
      "legalisation-documents": {
        readingMinutes: 4,
        featured: false,
        category: TutorialCategory.ConsularProcedures,
        duration: "5:21",
      },
      "demander-evisa-guide": {
        stepCount: 5,
        readingMinutes: 4,
        featured: false,
        category: TutorialCategory.ConsularProcedures,
        duration: "3:18",
      },
      "preparer-retour-gabon": {
        stepCount: 11,
        readingMinutes: 12,
        featured: false,
        category: TutorialCategory.ReturnGabon,
      },
      "creer-entreprise-gabon-etranger": {
        readingMinutes: 9,
        featured: false,
        category: TutorialCategory.Entrepreneurship,
      },
    };

    let updated = 0;
    for (const [slug, patch] of Object.entries(enrichments)) {
      const t = await ctx.db
        .query("tutorials")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (!t) continue;
      await ctx.db.patch(t._id, {
        ...patch,
        updatedAt: now,
        countryCode: t.countryCode ?? "WORLD",
      });
      updated++;
    }

    // ── Phase 2 : nouvelles fiches "featured" attendues par la maquette ──
    type Seed = {
      slug: string;
      title: string;
      excerpt: string;
      content: string;
      category: TutorialCategory;
      type: TutorialType;
      stepCount?: number;
      readingMinutes?: number;
      duration?: string;
      badges?: TutorialBadge[];
      featured?: boolean;
    };

    const seeds: Seed[] = [
      // === FEATURED (Section "Vos guides personnalisés") ===
      {
        slug: "acte-naissance-mariage",
        title: "Acte de naissance ou de mariage",
        excerpt:
          "Obtention, légalisation, apostille — circuit complet pour les actes d'état civil gabonais établis ou à transcrire à l'étranger.",
        content: `<h2>Quand demander un acte d'état civil ?</h2>
<p>Un acte de naissance ou de mariage gabonais est nécessaire pour :</p>
<ul>
  <li>Renouveler une CNI ou un passeport biométrique</li>
  <li>Constituer un dossier de mariage à l'étranger</li>
  <li>Faire valoir vos droits en matière de succession</li>
  <li>Demander la nationalité gabonaise pour un enfant né à l'étranger</li>
</ul>
<h2>Procédure</h2>
<ol>
  <li>Identifier la mairie ou le consulat qui détient le registre original</li>
  <li>Adresser la demande (en ligne, sur place ou par courrier)</li>
  <li>Joindre une pièce d'identité du demandeur</li>
  <li>Régler les frais (gratuit pour Gabonais à l'état civil, 20 € pour une transcription étrangère)</li>
  <li>Attendre la délivrance (7 à 21 jours selon le pays)</li>
  <li>Faire légaliser l'acte si nécessaire</li>
  <li>Demander l'apostille pour usage à l'étranger (pays signataires de la Convention de La Haye)</li>
  <li>Conserver une copie certifiée pour vos archives</li>
  <li>Mettre à jour votre dossier consulaire</li>
</ol>`,
        category: TutorialCategory.CivilStatus,
        type: TutorialType.Article,
        stepCount: 9,
        readingMinutes: 6,
        featured: true,
      },
      {
        slug: "bourses-scolaires-universitaires",
        title: "Bourses scolaires & universitaires",
        excerpt:
          "Dispositifs gabonais et bilatéraux pour les élèves et étudiants gabonais à l'étranger — critères d'éligibilité et dates de campagne.",
        content: `<h2>Dispositifs de bourses</h2>
<h3>Bourse de l'Agence Nationale des Bourses du Gabon (ANBG)</h3>
<p>Destinée aux étudiants gabonais admis dans une filière prioritaire (sciences, ingénierie, santé, agronomie, numérique). Couvre frais d'inscription + allocation mensuelle.</p>

<h3>Bourses bilatérales</h3>
<ul>
  <li><strong>France</strong> : Campus France — convention Gabon-France</li>
  <li><strong>Maroc</strong> : Agence Marocaine de Coopération Internationale</li>
  <li><strong>Belgique</strong> : ARES — programme de coopération</li>
  <li><strong>Canada</strong> : programme Bourses d'excellence du gouvernement</li>
</ul>

<h2>Critères communs</h2>
<ol>
  <li>Nationalité gabonaise et inscription au registre consulaire</li>
  <li>Avoir moins de 30 ans (35 pour le doctorat)</li>
  <li>Moyenne minimale au baccalauréat (12/20)</li>
  <li>Admission acquise dans un établissement reconnu</li>
  <li>Dossier complet avec lettre de motivation</li>
  <li>Engagement de retour au Gabon</li>
  <li>Dépôt avant la date limite (variable selon le programme)</li>
</ol>`,
        category: TutorialCategory.EducationGrants,
        type: TutorialType.Article,
        stepCount: 7,
        readingMinutes: 10,
        featured: true,
      },
      {
        slug: "carte-consulaire",
        title: "Carte consulaire",
        excerpt:
          "Document d'identification des Gabonais résidant à l'étranger — délivrance, renouvellement et utilité pratique.",
        content: `<h2>À quoi sert la carte consulaire ?</h2>
<p>La carte consulaire (ou carte d'immatriculation) est un document délivré par l'ambassade ou le consulat aux Gabonais inscrits au registre consulaire. Elle sert notamment à :</p>
<ul>
  <li>Justifier de votre nationalité gabonaise et de votre résidence à l'étranger</li>
  <li>Bénéficier des tarifs préférentiels pour le rapatriement de marchandises</li>
  <li>Voter aux élections gabonaises depuis l'étranger</li>
  <li>Accéder à l'assistance consulaire en cas d'urgence</li>
</ul>

<h2>Conditions de délivrance</h2>
<ul>
  <li>Être inscrit au registre consulaire de la circonscription</li>
  <li>Présenter une pièce d'identité gabonaise valide</li>
  <li>Fournir un justificatif de domicile dans le pays</li>
  <li>2 photos d'identité aux normes ICAO</li>
</ul>

<p><strong>Validité :</strong> 5 ans renouvelables. <strong>Coût :</strong> gratuit.</p>`,
        category: TutorialCategory.ConsularProcedures,
        type: TutorialType.Article,
        readingMinutes: 4,
        featured: true,
      },
      {
        slug: "securite-assistance-urgence",
        title: "Sécurité & assistance d'urgence",
        excerpt:
          "Numéros de permanence 24/7, démarches en cas de perte de documents, conduite à tenir face à une situation critique.",
        content: `<h2>Permanence consulaire 24/7</h2>
<p>Chaque ambassade et consulat général gabonais maintient une ligne d'urgence joignable en dehors des heures d'ouverture pour :</p>
<ul>
  <li>Accident ou décès d'un ressortissant</li>
  <li>Arrestation ou détention</li>
  <li>Hospitalisation grave</li>
  <li>Perte ou vol de passeport empêchant un retour</li>
  <li>Catastrophe naturelle ou crise politique</li>
</ul>

<h2>Conduite à tenir</h2>
<ol>
  <li>Contacter les services d'urgence locaux (police, pompiers, hôpital)</li>
  <li>Appeler la permanence consulaire dès que possible</li>
  <li>Conserver tous les justificatifs (PV de police, factures médicales)</li>
  <li>Demander un laissez-passer si votre passeport est perdu ou volé</li>
  <li>Informer un proche au Gabon via les services consulaires</li>
</ol>

<h2>Numéros utiles</h2>
<ul>
  <li><strong>France</strong> : +33 1 42 25 56 24 (Ambassade Paris)</li>
  <li><strong>Belgique</strong> : +32 2 340 62 00 (Ambassade Bruxelles)</li>
  <li><strong>USA</strong> : +1 202 797 1000 (Ambassade Washington)</li>
  <li><strong>Gabon (depuis l'étranger)</strong> : +241 11 76 25 25 (DGDI)</li>
</ul>`,
        category: TutorialCategory.PracticalLife,
        type: TutorialType.Article,
        readingMinutes: 3,
        badges: [TutorialBadge.Essential],
        featured: true,
      },

      // === FICHES "Toutes les démarches" ===
      {
        slug: "mariage-etranger-transcription",
        title: "Mariage à l'étranger : transcription",
        excerpt:
          "Transcription sur les registres consulaires d'un mariage célébré à l'étranger — pièces requises, délais et coûts.",
        content: `<h2>Pourquoi transcrire ?</h2>
<p>Tout mariage célébré à l'étranger entre Gabonais (ou avec un conjoint étranger) doit être transcrit sur les registres consulaires pour produire ses effets civils au Gabon.</p>
<h2>Pièces à fournir</h2>
<ol>
  <li>Acte de mariage étranger original + traduction si non-français</li>
  <li>Apostille ou légalisation selon le pays</li>
  <li>Copies des pièces d'identité des époux</li>
  <li>Acte de naissance gabonais du conjoint gabonais</li>
  <li>Justificatif de domicile</li>
  <li>Pour le conjoint étranger : copie de passeport et acte de naissance traduit</li>
  <li>Frais de transcription (20 €)</li>
</ol>`,
        category: TutorialCategory.CivilStatus,
        type: TutorialType.Article,
        stepCount: 7,
        readingMinutes: 5,
      },
      {
        slug: "fiscalite-expatrie-gabonais",
        title: "Fiscalité du Gabonais expatrié",
        excerpt:
          "Conventions bilatérales contre la double imposition, déclaration des revenus, obligations fiscales au Gabon et dans le pays de résidence.",
        content: `<h2>Le principe</h2>
<p>Le Gabon a signé des conventions fiscales bilatérales avec plus de 15 pays (France, Belgique, Maroc, Canada, États-Unis…) pour éviter la double imposition de ses ressortissants expatriés.</p>
<h2>Vos obligations</h2>
<ul>
  <li>Déclarer vos revenus dans votre pays de résidence fiscale principale</li>
  <li>Déclarer les revenus de source gabonaise au Gabon (loyers, dividendes)</li>
  <li>Conserver les attestations fiscales pour faire valoir vos droits</li>
  <li>Demander un certificat de résidence fiscale auprès de votre consulat</li>
</ul>`,
        category: TutorialCategory.Taxation,
        type: TutorialType.Article,
        readingMinutes: 9,
      },
      {
        slug: "sante-couverture-sociale",
        title: "Santé & couverture sociale",
        excerpt:
          "CNAMGS, CNSS, conventions de sécurité sociale — vos droits en tant que Gabonais résidant à l'étranger.",
        content: `<h2>CNAMGS — Caisse Nationale d'Assurance Maladie et de Garantie Sociale</h2>
<p>Les Gabonais résidant à l'étranger peuvent maintenir leurs droits à la CNAMGS sous conditions (cotisation volontaire ou continuation après expatriation temporaire).</p>
<h2>CNSS — Caisse Nationale de Sécurité Sociale</h2>
<p>La retraite acquise au Gabon est exportable. Des conventions existent avec la France, le Maroc, et plusieurs pays de la CEMAC pour totaliser les périodes d'assurance.</p>`,
        category: TutorialCategory.PracticalLife,
        type: TutorialType.Article,
        readingMinutes: 7,
      },
      {
        slug: "vote-gabonais-etranger",
        title: "Vote des Gabonais de l'étranger",
        excerpt:
          "Inscription électorale, modalités de vote dans les ambassades et consulats, procuration et vote par correspondance.",
        content: `<h2>Conditions pour voter</h2>
<ul>
  <li>Être inscrit au registre consulaire</li>
  <li>Figurer sur la liste électorale de votre représentation</li>
  <li>Être majeur (18 ans) au jour du scrutin</li>
  <li>Jouir de ses droits civils et politiques</li>
</ul>
<h2>Modalités</h2>
<ol>
  <li>Vote à l'urne dans l'ambassade ou le consulat général</li>
  <li>Vote par correspondance dans certains consulats honoraires</li>
  <li>Procuration possible en cas d'empêchement</li>
  <li>Bureau de vote ouvert le même jour qu'au Gabon</li>
</ol>`,
        category: TutorialCategory.ConsularProcedures,
        type: TutorialType.Article,
        stepCount: 4,
        readingMinutes: 4,
      },
      {
        slug: "retour-demenagement-douane",
        title: "Retour au Gabon — déménagement & douane",
        excerpt:
          "Franchise diplomatique, déclaration en douane, formalités pour le rapatriement de vos biens personnels lors d'un retour définitif.",
        content: `<h2>Franchise pour Gabonais de retour</h2>
<p>Les Gabonais résidant à l'étranger depuis plus de 12 mois bénéficient d'une franchise de droits et taxes sur :</p>
<ul>
  <li>Effets et objets personnels en cours d'usage</li>
  <li>Un véhicule de moins de 4 ans, sous conditions</li>
  <li>Outillage professionnel pour reprise d'activité au Gabon</li>
</ul>
<h2>Démarches</h2>
<ol>
  <li>Obtenir un certificat de changement de résidence au consulat</li>
  <li>Établir un inventaire détaillé des biens</li>
  <li>Faire enregistrer le déménagement auprès des douanes gabonaises</li>
  <li>Présenter les pièces à l'arrivée à Libreville</li>
</ol>`,
        category: TutorialCategory.ReturnGabon,
        type: TutorialType.Article,
        stepCount: 11,
        readingMinutes: 11,
      },
      {
        slug: "logement-installation-etranger",
        title: "S'installer à l'étranger : logement, compte bancaire",
        excerpt:
          "Premières démarches après votre arrivée : ouvrir un compte bancaire, signer un bail, obtenir une assurance habitation.",
        content: `<h2>Logement</h2>
<ul>
  <li>Pièces nécessaires : passeport, justificatif de revenus, garant</li>
  <li>Délai moyen pour trouver : 3 à 8 semaines selon la ville</li>
  <li>Plateformes recommandées : SeLoger, ImmoWeb, Idealista, Zillow</li>
</ul>
<h2>Compte bancaire</h2>
<ul>
  <li>Banques de premier plan ou néobanques (Revolut, N26, Wise)</li>
  <li>Documents : passeport + justificatif de domicile + visa long séjour si applicable</li>
  <li>Délai d'ouverture : 1 à 14 jours</li>
</ul>`,
        category: TutorialCategory.PracticalLife,
        type: TutorialType.Guide,
        readingMinutes: 12,
      },

      // === TUTORIELS VIDÉO ===
      {
        slug: "video-inscription-registre",
        title:
          "Remplir le formulaire d'inscription consulaire en ligne",
        excerpt:
          "Pas-à-pas pour compléter votre dossier d'inscription au registre des Gabonais à l'étranger via le portail consulat.ga.",
        content:
          "<p>Cette vidéo vous guide à travers les 4 étapes du formulaire d'inscription consulaire en ligne.</p>",
        category: TutorialCategory.ConsularProcedures,
        type: TutorialType.Video,
        duration: "7:42",
        readingMinutes: 8,
      },
      {
        slug: "video-apostille",
        title:
          "Légaliser un acte d'état civil étranger — la procédure d'apostille",
        excerpt:
          "Comment obtenir l'apostille de La Haye sur un acte étranger pour qu'il soit reconnu au Gabon — distinction avec la légalisation classique.",
        content:
          "<p>Cette vidéo explique la procédure d'apostille pour les pays signataires de la Convention de La Haye.</p>",
        category: TutorialCategory.CivilStatus,
        type: TutorialType.Video,
        duration: "12:08",
        readingMinutes: 12,
      },
      {
        slug: "video-prendre-rdv-consulat",
        title:
          "Prendre rendez-vous au consulat — astuces et créneaux à éviter",
        excerpt:
          "Conseils pratiques pour réserver un créneau de RDV consulaire rapide et éviter les heures de forte affluence.",
        content:
          "<p>Tour d'horizon des bonnes pratiques pour la prise de RDV en ligne.</p>",
        category: TutorialCategory.PracticalLife,
        type: TutorialType.Video,
        duration: "5:21",
        readingMinutes: 6,
      },
    ];

    let inserted = 0;
    let skippedExisting = 0;
    for (const s of seeds) {
      const existing = await ctx.db
        .query("tutorials")
        .withIndex("by_slug", (q) => q.eq("slug", s.slug))
        .first();
      if (existing) {
        skippedExisting++;
        continue;
      }
      await ctx.db.insert("tutorials", {
        title: s.title,
        slug: s.slug,
        excerpt: s.excerpt,
        content: s.content,
        category: s.category,
        type: s.type,
        duration: s.duration,
        readingMinutes: s.readingMinutes,
        stepCount: s.stepCount,
        badges: s.badges,
        featured: s.featured ?? false,
        countryCode: "WORLD",
        status: PostStatus.Published,
        publishedAt: now,
        createdAt: now,
        updatedAt: now,
        authorId,
      });
      inserted++;
    }

    return {
      enriched: updated,
      inserted,
      skippedExisting,
      totalSeeds: seeds.length,
    };
  },
});
