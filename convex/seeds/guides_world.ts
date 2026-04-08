/**
 * Seed data : Guides generiques (WORLD) — fallback pour les pays sans guide specifique
 */
import { mutation, MutationCtx } from "../_generated/server";

export async function seedWorldGuides(ctx: MutationCtx) {
  const now = Date.now();

  // Guide d'arrivee generique
  await ctx.db.insert("guides", {
    slug: "arrivee-world",
    type: "arrival",
    countryCode: "WORLD",
    title: {
      fr: "Guide d'arrivee a l'etranger",
      en: "Arrival Guide Abroad",
    },
    subtitle: {
      fr: "Les demarches essentielles pour s'installer dans votre pays de residence.",
      en: "Essential steps to settle in your country of residence.",
    },
    sections: [
      {
        id: "admission",
        iconName: "Plane",
        title: "Admission et visa",
        color: "text-primary",
        iconBg: "stat-icon-blue",
        intro: "Avant de voyager, assurez-vous de disposer de tous les documents requis : passeport valide, visa adapte, justificatif d'hebergement et preuve de moyens financiers.",
        items: [
          {
            title: "Types de visas",
            detail: "Court sejour (touristique, affaires — 90 jours max) ou long sejour (etudes, travail, regroupement familial). Verifiez les conditions specifiques aupres de l'ambassade du pays de destination.",
          },
          {
            title: "Documents frontiere",
            detail: "Passeport valide (au moins 6 mois), visa, billet retour ou de continuation, assurance voyage, justificatif d'hebergement, preuve de moyens de subsistance.",
          },
          {
            title: "Inscription consulaire",
            detail: "Des votre arrivee, inscrivez-vous aupres de l'ambassade ou du consulat du Gabon. L'inscription consulaire est obligatoire et facilite vos demarches administratives.",
          },
        ],
        tips: [
          "Photocopiez tous vos documents importants et gardez des copies numeriques.",
          "Inscrivez-vous au registre consulaire dans les 30 premiers jours.",
          "Souscrivez une assurance sante valide dans le pays d'accueil.",
        ],
      },
      {
        id: "installation",
        iconName: "Home",
        title: "S'installer",
        color: "text-success",
        iconBg: "stat-icon-green",
        intro: "Les premieres semaines sont cruciales pour bien s'integrer. Logement, banque, telephone — organisez vos priorites.",
        items: [
          {
            title: "Trouver un logement",
            detail: "Commencez par un hebergement temporaire (hotel, location courte duree) puis cherchez un logement permanent. Les agences immobilieres et sites specialises sont de bonnes ressources.",
          },
          {
            title: "Ouvrir un compte bancaire",
            detail: "Un compte local facilite les paiements et la reception de salaire. Munissez-vous de votre passeport, justificatif de domicile et titre de sejour.",
          },
          {
            title: "Telephone et internet",
            detail: "Obtenez une carte SIM locale ou un abonnement. Comparez les offres des operateurs locaux pour trouver le meilleur rapport qualite-prix.",
          },
        ],
        tips: [
          "Gardez les coordonnees de l'ambassade/consulat a portee de main.",
          "Apprenez les bases de la langue locale le plus tot possible.",
          "Rejoignez la communaute gabonaise locale pour des conseils pratiques.",
        ],
      },
    ],
    savoirVivre: [
      {
        iconName: "Users",
        title: "Respecter les coutumes locales",
        description: "Informez-vous sur les usages, traditions et codes de politesse du pays d'accueil pour faciliter votre integration.",
      },
      {
        iconName: "Scale",
        title: "Connaitre vos droits",
        description: "En tant que resident etranger, vous avez des droits. Renseignez-vous sur la legislation locale en matiere de travail, logement et protection sociale.",
      },
    ],
    erreurs: [
      {
        erreur: "Ne pas s'inscrire au consulat",
        conseil: "L'inscription consulaire est obligatoire et vous permet d'acceder aux services consulaires, de voter et d'etre localise en cas d'urgence.",
      },
      {
        erreur: "Negliger l'assurance sante",
        conseil: "Les frais medicaux a l'etranger peuvent etre tres eleves. Souscrivez une assurance sante des votre arrivee.",
      },
    ],
    numeros: [
      {
        label: "Ambassade du Gabon",
        number: "Contactez la representation la plus proche",
        color: "bg-primary/10 text-primary",
        category: "gabon" as const,
        type: "phone" as const,
        description: "Consultez la page 'Reseau Consulaire' pour trouver l'ambassade competente.",
      },
    ],
    isActive: true,
    updatedAt: now,
  });

  // Guide pratique generique
  await ctx.db.insert("guides", {
    slug: "vie-pratique-world",
    type: "practical",
    countryCode: "WORLD",
    title: {
      fr: "Guide pratique de la vie a l'etranger",
      en: "Practical Guide to Living Abroad",
    },
    subtitle: {
      fr: "Logement, sante, education, emploi : tout pour votre quotidien.",
      en: "Housing, health, education, employment: everything for your daily life.",
    },
    sections: [
      {
        id: "logement",
        iconName: "Home",
        title: "Logement",
        color: "text-primary",
        iconBg: "stat-icon-blue",
        intro: "Trouver un logement adapte a vos besoins et votre budget est une priorite.",
        items: [
          {
            title: "Location",
            detail: "Recherchez sur les sites specialises et agences locales. Preparez un dossier complet : pieces d'identite, justificatifs de revenus, references.",
          },
          {
            title: "Droits du locataire",
            detail: "Renseignez-vous sur la legislation locale : duree du bail, preavis, depots de garantie, droits en cas de litige.",
          },
        ],
        tips: [
          "Visitez le logement en personne avant de signer.",
          "Faites un etat des lieux detaille a l'entree.",
        ],
      },
      {
        id: "sante",
        iconName: "Heart",
        title: "Sante & Protection sociale",
        color: "text-success",
        iconBg: "stat-icon-green",
        intro: "Accedez au systeme de sante local et protegez-vous ainsi que votre famille.",
        items: [
          {
            title: "Inscription au systeme de sante",
            detail: "Selon le pays, l'inscription peut etre automatique ou necessiter des demarches specifiques. Renseignez-vous des votre arrivee.",
          },
          {
            title: "Medecin traitant",
            detail: "Choisissez un medecin generaliste pres de chez vous. Il sera votre point d'entree dans le parcours de soins.",
          },
        ],
        tips: [
          "Gardez votre carte d'assurance sante sur vous.",
          "Renseignez-vous sur les soins d'urgence et les pharmacies de garde.",
        ],
      },
      {
        id: "emploi",
        iconName: "Briefcase",
        title: "Emploi & Entrepreneuriat",
        color: "text-warning",
        iconBg: "stat-icon-orange",
        intro: "Trouvez un emploi ou creez votre entreprise dans votre pays d'accueil.",
        items: [
          {
            title: "Recherche d'emploi",
            detail: "Utilisez les sites d'emploi locaux, les agences de recrutement et le reseau professionnel. Adaptez votre CV aux normes du pays.",
          },
          {
            title: "Creation d'entreprise",
            detail: "Les conditions varient selon les pays. Renseignez-vous sur les formes juridiques, les aides et les obligations fiscales.",
          },
        ],
        tips: [
          "Faites reconnaitre vos diplomes gabonais si necessaire.",
          "Rejoignez des associations professionnelles locales.",
        ],
      },
    ],
    isActive: true,
    updatedAt: now,
  });

  // Guide de retour generique
  await ctx.db.insert("guides", {
    slug: "retour-world",
    type: "return",
    countryCode: "WORLD",
    title: {
      fr: "Guide de retour au Gabon",
      en: "Return to Gabon Guide",
    },
    subtitle: {
      fr: "Preparez votre retour : demenagement, formalites et reinstallation.",
      en: "Prepare your return: moving, paperwork and resettlement.",
    },
    sections: [
      {
        id: "preparation",
        iconName: "FileText",
        title: "Preparer son retour",
        color: "text-primary",
        iconBg: "stat-icon-blue",
        intro: "Un retour au pays se prepare. Anticipez les demarches administratives et logistiques.",
        items: [
          {
            title: "Demarches consulaires",
            detail: "Informez votre consulat de votre depart. Mettez a jour votre inscription consulaire et recuperez tous les documents necessaires.",
          },
          {
            title: "Cloture des engagements",
            detail: "Resiliez votre bail, abonnements (telephone, electricite, internet), assurances et compte bancaire si necessaire.",
          },
          {
            title: "Transfert medical",
            detail: "Recuperez votre dossier medical, ordonnances en cours et carnet de vaccination. Prevoyez une couverture sante pour la transition.",
          },
        ],
        tips: [
          "Commencez les demarches 3 a 6 mois avant le depart.",
          "Conservez des copies de tous les documents administratifs.",
        ],
      },
      {
        id: "demenagement",
        iconName: "Truck",
        title: "Demenagement",
        color: "text-success",
        iconBg: "stat-icon-green",
        intro: "Organisez le transport de vos effets personnels vers le Gabon.",
        items: [
          {
            title: "Fret maritime ou aerien",
            detail: "Le fret maritime est plus economique pour les gros volumes. Le fret aerien est plus rapide. Comparez les devis de plusieurs transitaires.",
          },
          {
            title: "Franchise douaniere",
            detail: "Les Gabonais de retour beneficient d'exonerations douanieres sur les effets personnels. Renseignez-vous sur les conditions aupres des douanes gabonaises.",
          },
        ],
        tips: [
          "Faites un inventaire detaille de vos effets a expedier.",
          "Souscrivez une assurance transport pour vos biens.",
        ],
      },
      {
        id: "reinstallation",
        iconName: "Home",
        title: "Reinstallation au Gabon",
        color: "text-warning",
        iconBg: "stat-icon-orange",
        intro: "Les premieres semaines au Gabon apres un long sejour a l'etranger.",
        items: [
          {
            title: "Logement",
            detail: "Anticipez la recherche de logement avant votre retour. Les quartiers de Libreville, Port-Gentil et Franceville offrent differentes options.",
          },
          {
            title: "Emploi et reinsertion",
            detail: "Mettez a jour votre reseau professionnel. Les secteurs en demande au Gabon : petrole, mines, agriculture, numerique et services.",
          },
        ],
        tips: [
          "Prenez contact avec l'ONE (Office National de l'Emploi) pour les opportunites.",
          "Rejoignez les reseaux de la diaspora de retour.",
        ],
      },
    ],
    isActive: true,
    updatedAt: now,
  });
}

export const run = mutation({
  handler: async (ctx) => {
    await seedWorldGuides(ctx);
    return "Seeded WORLD guides successfully.";
  },
});
