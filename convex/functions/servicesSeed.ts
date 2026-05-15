import { internalMutation } from "../_generated/server";
import { ServiceCategory, PublicUserType } from "../lib/constants";

/**
 * Seed des services consulaires manquants — données réelles pour les Gabonais
 * à l'étranger et les étrangers demandant des services gabonais.
 *
 * Sources :
 * - Décret n°00064/PR/MAEFICDFE du 27 janvier 2020 (frais consulaires Gabon)
 * - Site officiel Ministère des Affaires Étrangères du Gabon
 * - Portail eVisa Gabon (https://evisa.dgdi.ga)
 * - Pratique consulaire (Ambassades du Gabon en France, Belgique, USA)
 *
 * Idempotent : skip les services dont le `code` existe déjà.
 *
 * Run via CLI :
 *   bunx convex run functions/servicesSeed:seedMissing
 */
export const seedMissing = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Récupère les codes déjà présents (toutes versions, actifs ou non)
    const existing = await ctx.db.query("services").take(500);
    const existingCodes = new Set(existing.map((s) => s.code));

    type Step = { label: { fr: string; en: string }; icon?: string };
    type ServiceSeed = {
      slug: string;
      code: string;
      name: { fr: string; en: string };
      description: { fr: string; en: string };
      category: ServiceCategory;
      icon?: string;
      eligibleProfiles?: PublicUserType[];
      estimatedDays: number;
      requiresAppointment: boolean;
      requiresPickupAppointment?: boolean;
      titleValidity?: { fr: string; en: string };
      processSteps?: Step[];
    };

    const seeds: ServiceSeed[] = [
      // === PASSEPORT ===
      {
        slug: "passeport-biometrique-nouveau",
        code: "PASSPORT_NEW",
        name: {
          fr: "Passeport biométrique — première demande",
          en: "Biometric passport — first application",
        },
        description: {
          fr: "Délivrance d'un passeport biométrique gabonais pour une première demande, incluant la prise des empreintes digitales et la photographie biométrique.",
          en: "Issuance of a biometric Gabonese passport for a first application, including fingerprint capture and biometric photo.",
        },
        category: ServiceCategory.Passport,
        icon: "BookCheck",
        eligibleProfiles: [PublicUserType.LongStay, PublicUserType.ShortStay],
        estimatedDays: 21,
        requiresAppointment: true,
        requiresPickupAppointment: true,
        titleValidity: { fr: "5 ans (adultes) · 3 ans (mineurs)", en: "5 years (adults) · 3 years (minors)" },
        processSteps: [
          { label: { fr: "Prise de rendez-vous en ligne", en: "Online appointment" }, icon: "Calendar" },
          { label: { fr: "Constitution du dossier", en: "Document collection" }, icon: "Folder" },
          { label: { fr: "Capture biométrique au consulat", en: "Biometric capture at consulate" }, icon: "Fingerprint" },
          { label: { fr: "Production à Libreville (DGDI)", en: "Production in Libreville (DGDI)" }, icon: "Truck" },
          { label: { fr: "Retrait sur RDV", en: "Pickup on appointment" }, icon: "PackageCheck" },
        ],
      },
      {
        slug: "passeport-biometrique-renouvellement",
        code: "PASSPORT_RENEW",
        name: {
          fr: "Passeport biométrique — renouvellement",
          en: "Biometric passport — renewal",
        },
        description: {
          fr: "Renouvellement d'un passeport biométrique arrivant à expiration ou expiré. Présentez l'ancien passeport et un justificatif de domicile actuel.",
          en: "Renewal of an expired or soon-to-expire biometric passport. Present your old passport and proof of current address.",
        },
        category: ServiceCategory.Passport,
        icon: "RefreshCcw",
        eligibleProfiles: [PublicUserType.LongStay, PublicUserType.ShortStay],
        estimatedDays: 21,
        requiresAppointment: true,
        requiresPickupAppointment: true,
        titleValidity: { fr: "5 ans (adultes) · 3 ans (mineurs)", en: "5 years (adults) · 3 years (minors)" },
      },
      {
        slug: "passeport-perte-vol",
        code: "PASSPORT_LOST_STOLEN",
        name: {
          fr: "Passeport — déclaration de perte ou de vol",
          en: "Passport — loss or theft declaration",
        },
        description: {
          fr: "Déclarez la perte ou le vol de votre passeport pour invalider l'ancien titre et entamer la procédure de remplacement.",
          en: "Declare the loss or theft of your passport to invalidate the old document and start the replacement procedure.",
        },
        category: ServiceCategory.Declaration,
        icon: "ShieldAlert",
        eligibleProfiles: [PublicUserType.LongStay, PublicUserType.ShortStay],
        estimatedDays: 1,
        requiresAppointment: false,
      },

      // === LAISSEZ-PASSER ===
      {
        slug: "laissez-passer",
        code: "LAISSEZ_PASSER",
        name: {
          fr: "Laissez-passer",
          en: "Travel document (laissez-passer)",
        },
        description: {
          fr: "Document de voyage à usage unique délivré aux Gabonais sans passeport valide pour rejoindre le Gabon ou un autre pays de résidence.",
          en: "Single-use travel document issued to Gabonese citizens without a valid passport to return to Gabon or another country of residence.",
        },
        category: ServiceCategory.TravelDocument,
        icon: "Plane",
        eligibleProfiles: [PublicUserType.LongStay, PublicUserType.ShortStay],
        estimatedDays: 3,
        requiresAppointment: true,
      },

      // === ÉTAT CIVIL ===
      {
        slug: "acte-naissance-transcription",
        code: "BIRTH_TRANSCRIPTION",
        name: {
          fr: "Transcription d'acte de naissance",
          en: "Birth certificate transcription",
        },
        description: {
          fr: "Transcription sur les registres consulaires de l'acte de naissance d'un enfant né à l'étranger d'au moins un parent gabonais. Démarche gratuite.",
          en: "Transcription on the consular registry of the birth certificate of a child born abroad to at least one Gabonese parent. Free procedure.",
        },
        category: ServiceCategory.Transcript,
        icon: "Baby",
        eligibleProfiles: [PublicUserType.LongStay, PublicUserType.ShortStay],
        estimatedDays: 14,
        requiresAppointment: false,
      },
      {
        slug: "acte-naissance-copie",
        code: "BIRTH_CERTIFICATE_COPY",
        name: {
          fr: "Copie d'acte de naissance gabonais",
          en: "Copy of Gabonese birth certificate",
        },
        description: {
          fr: "Délivrance d'une copie intégrale ou d'un extrait d'acte de naissance inscrit sur les registres d'état civil gabonais (consulat ou commune au Gabon).",
          en: "Issuance of a full copy or extract of a birth certificate registered on the Gabonese civil status registry (consulate or municipality in Gabon).",
        },
        category: ServiceCategory.CivilStatus,
        icon: "FileText",
        eligibleProfiles: [PublicUserType.LongStay, PublicUserType.ShortStay, PublicUserType.AdminServices],
        estimatedDays: 7,
        requiresAppointment: false,
      },
      {
        slug: "acte-mariage-transcription",
        code: "MARRIAGE_TRANSCRIPTION",
        name: {
          fr: "Transcription d'acte de mariage",
          en: "Marriage certificate transcription",
        },
        description: {
          fr: "Transcription sur les registres consulaires d'un acte de mariage célébré à l'étranger entre Gabonais ou avec un conjoint étranger.",
          en: "Transcription on the consular registry of a marriage celebrated abroad between Gabonese citizens or with a foreign spouse.",
        },
        category: ServiceCategory.Transcript,
        icon: "Heart",
        eligibleProfiles: [PublicUserType.LongStay, PublicUserType.ShortStay],
        estimatedDays: 21,
        requiresAppointment: false,
      },
      {
        slug: "acte-mariage-copie",
        code: "MARRIAGE_CERTIFICATE_COPY",
        name: {
          fr: "Copie d'acte de mariage gabonais",
          en: "Copy of Gabonese marriage certificate",
        },
        description: {
          fr: "Délivrance d'une copie intégrale ou d'un extrait d'acte de mariage inscrit sur les registres d'état civil gabonais.",
          en: "Issuance of a copy or extract of a marriage certificate registered on the Gabonese civil status registry.",
        },
        category: ServiceCategory.CivilStatus,
        icon: "FileText",
        eligibleProfiles: [PublicUserType.LongStay, PublicUserType.ShortStay, PublicUserType.AdminServices],
        estimatedDays: 7,
        requiresAppointment: false,
      },
      {
        slug: "acte-deces-transcription",
        code: "DEATH_TRANSCRIPTION",
        name: {
          fr: "Transcription d'acte de décès",
          en: "Death certificate transcription",
        },
        description: {
          fr: "Transcription sur les registres consulaires d'un acte de décès d'un ressortissant gabonais survenu à l'étranger.",
          en: "Transcription on the consular registry of a death certificate of a Gabonese national who passed away abroad.",
        },
        category: ServiceCategory.Transcript,
        icon: "FileText",
        eligibleProfiles: [PublicUserType.LongStay, PublicUserType.ShortStay],
        estimatedDays: 14,
        requiresAppointment: false,
      },

      // === LÉGALISATION / CERTIFICATION ===
      {
        slug: "legalisation-document",
        code: "DOCUMENT_LEGALIZATION",
        name: {
          fr: "Légalisation de documents",
          en: "Document legalization",
        },
        description: {
          fr: "Authentification de la signature et du sceau d'une autorité gabonaise sur un document destiné à être utilisé à l'étranger, ou inversement.",
          en: "Authentication of the signature and seal of a Gabonese authority on a document for use abroad, or vice versa.",
        },
        category: ServiceCategory.Certification,
        icon: "Stamp",
        eligibleProfiles: [PublicUserType.LongStay, PublicUserType.ShortStay, PublicUserType.AdminServices],
        estimatedDays: 3,
        requiresAppointment: false,
      },
      {
        slug: "legalisation-signature",
        code: "SIGNATURE_LEGALIZATION",
        name: {
          fr: "Légalisation de signature",
          en: "Signature legalization",
        },
        description: {
          fr: "Certification de l'authenticité d'une signature apposée devant l'agent consulaire (procurations, attestations sur l'honneur, etc.).",
          en: "Certification of the authenticity of a signature affixed before the consular agent (proxies, sworn statements, etc.).",
        },
        category: ServiceCategory.Certification,
        icon: "PenLine",
        eligibleProfiles: [PublicUserType.LongStay, PublicUserType.ShortStay, PublicUserType.AdminServices],
        estimatedDays: 1,
        requiresAppointment: true,
      },
      {
        slug: "certification-conforme",
        code: "CERTIFIED_COPY",
        name: {
          fr: "Certification conforme à l'original",
          en: "Certified true copy",
        },
        description: {
          fr: "Certification qu'une copie est conforme à l'original d'un document gabonais (diplôme, contrat, acte).",
          en: "Certification that a copy matches the original of a Gabonese document (diploma, contract, deed).",
        },
        category: ServiceCategory.Certification,
        icon: "CheckCircle2",
        eligibleProfiles: [PublicUserType.LongStay, PublicUserType.ShortStay, PublicUserType.AdminServices],
        estimatedDays: 1,
        requiresAppointment: false,
      },
      {
        slug: "procuration-consulaire",
        code: "CONSULAR_PROXY",
        name: {
          fr: "Procuration consulaire",
          en: "Consular power of attorney",
        },
        description: {
          fr: "Établissement d'une procuration authentifiée par le consulat pour donner pouvoir à un tiers d'agir en votre nom au Gabon ou à l'étranger.",
          en: "Establishment of a power of attorney authenticated by the consulate to delegate authority to a third party in Gabon or abroad.",
        },
        category: ServiceCategory.Certification,
        icon: "Handshake",
        eligibleProfiles: [PublicUserType.LongStay, PublicUserType.ShortStay],
        estimatedDays: 1,
        requiresAppointment: true,
      },

      // === INSCRIPTION & VOTE ===
      {
        slug: "inscription-registre-consulaire",
        code: "CONSULAR_REGISTRATION",
        name: {
          fr: "Inscription au registre consulaire",
          en: "Consular registry enrollment",
        },
        description: {
          fr: "Inscription officielle des Gabonais résidant à l'étranger. Démarche gratuite et 100 % en ligne, requise pour accéder à la plupart des services consulaires et pour voter.",
          en: "Official enrollment for Gabonese citizens residing abroad. Free and fully online procedure, required to access most consular services and to vote.",
        },
        category: ServiceCategory.Registration,
        icon: "UserPlus",
        eligibleProfiles: [PublicUserType.LongStay],
        estimatedDays: 3,
        requiresAppointment: false,
        titleValidity: { fr: "5 ans renouvelables", en: "5 years renewable" },
        processSteps: [
          { label: { fr: "Formulaire en ligne", en: "Online form" }, icon: "FileEdit" },
          { label: { fr: "Pièces justificatives", en: "Supporting documents" }, icon: "Files" },
          { label: { fr: "Validation par le consulat", en: "Consulate validation" }, icon: "ShieldCheck" },
          { label: { fr: "Confirmation par e-mail", en: "Email confirmation" }, icon: "Mail" },
        ],
      },
      {
        slug: "inscription-liste-electorale",
        code: "ELECTORAL_REGISTRATION",
        name: {
          fr: "Inscription sur la liste électorale consulaire",
          en: "Consular electoral roll registration",
        },
        description: {
          fr: "Inscription sur la liste électorale de votre représentation consulaire pour voter aux élections gabonaises depuis l'étranger.",
          en: "Registration on your consular post's electoral roll to vote in Gabonese elections from abroad.",
        },
        category: ServiceCategory.Registration,
        icon: "Vote",
        eligibleProfiles: [PublicUserType.LongStay],
        estimatedDays: 7,
        requiresAppointment: false,
      },

      // === VISA ÉTRANGER ===
      {
        slug: "evisa-gabon",
        code: "E_VISA",
        name: {
          fr: "e-Visa Gabon — visa électronique",
          en: "Gabon e-Visa — electronic visa",
        },
        description: {
          fr: "Demande de visa électronique pour le Gabon via le portail e-Visa officiel. Délivré sous 72 h pour les nationalités éligibles. Court séjour, affaires et famille.",
          en: "Electronic visa application for Gabon via the official e-Visa portal. Issued within 72 h for eligible nationalities. Short-stay, business and family visits.",
        },
        category: ServiceCategory.Visa,
        icon: "Globe",
        eligibleProfiles: [PublicUserType.VisaTourism, PublicUserType.VisaBusiness],
        estimatedDays: 3,
        requiresAppointment: false,
        titleValidity: { fr: "30 à 90 jours selon catégorie", en: "30 to 90 days depending on category" },
        processSteps: [
          { label: { fr: "Création de compte e-Visa", en: "Create e-Visa account" }, icon: "UserPlus" },
          { label: { fr: "Saisie du formulaire", en: "Fill the form" }, icon: "FileEdit" },
          { label: { fr: "Paiement en ligne", en: "Online payment" }, icon: "CreditCard" },
          { label: { fr: "Réception de l'autorisation", en: "Receive authorization" }, icon: "Mail" },
          { label: { fr: "Validation à l'arrivée à Libreville", en: "Validation on arrival in Libreville" }, icon: "PlaneLanding" },
        ],
      },
      {
        slug: "visa-tourisme",
        code: "VISA_TOURISM",
        name: {
          fr: "Visa touristique",
          en: "Tourist visa",
        },
        description: {
          fr: "Visa de court séjour (jusqu'à 90 jours) délivré aux ressortissants étrangers pour des séjours touristiques au Gabon.",
          en: "Short-stay visa (up to 90 days) issued to foreign nationals for tourism in Gabon.",
        },
        category: ServiceCategory.Visa,
        icon: "Camera",
        eligibleProfiles: [PublicUserType.VisaTourism],
        estimatedDays: 7,
        requiresAppointment: true,
        titleValidity: { fr: "30 ou 90 jours", en: "30 or 90 days" },
      },
      {
        slug: "visa-affaires",
        code: "VISA_BUSINESS",
        name: {
          fr: "Visa affaires",
          en: "Business visa",
        },
        description: {
          fr: "Visa de court séjour pour mission professionnelle au Gabon. Nécessite une lettre d'invitation d'une entité gabonaise.",
          en: "Short-stay visa for business missions in Gabon. Requires an invitation letter from a Gabonese entity.",
        },
        category: ServiceCategory.Visa,
        icon: "Briefcase",
        eligibleProfiles: [PublicUserType.VisaBusiness],
        estimatedDays: 7,
        requiresAppointment: true,
        titleValidity: { fr: "30 à 90 jours, mono ou multi-entrées", en: "30 to 90 days, single or multi-entry" },
      },
      {
        slug: "visa-long-sejour",
        code: "VISA_LONG_STAY",
        name: {
          fr: "Visa long séjour",
          en: "Long-stay visa",
        },
        description: {
          fr: "Visa d'établissement au Gabon pour études, travail, regroupement familial ou retraite. Dossier complémentaire requis.",
          en: "Long-term residence visa for studies, work, family reunification or retirement in Gabon. Additional documentation required.",
        },
        category: ServiceCategory.Visa,
        icon: "Home",
        eligibleProfiles: [PublicUserType.VisaLongStay],
        estimatedDays: 30,
        requiresAppointment: true,
        titleValidity: { fr: "1 an renouvelable", en: "1 year renewable" },
      },

      // === ASSISTANCE / URGENCE ===
      {
        slug: "assistance-consulaire",
        code: "CONSULAR_ASSISTANCE",
        name: {
          fr: "Assistance consulaire d'urgence",
          en: "Emergency consular assistance",
        },
        description: {
          fr: "Aide aux Gabonais en difficulté à l'étranger : hospitalisation, arrestation, perte de documents, victime d'accident ou de catastrophe.",
          en: "Help for Gabonese citizens in distress abroad: hospitalization, arrest, loss of documents, accident or disaster victims.",
        },
        category: ServiceCategory.Assistance,
        icon: "LifeBuoy",
        eligibleProfiles: [PublicUserType.LongStay, PublicUserType.ShortStay],
        estimatedDays: 1,
        requiresAppointment: false,
      },
      {
        slug: "rapatriement-corps",
        code: "BODY_REPATRIATION",
        name: {
          fr: "Rapatriement de corps",
          en: "Repatriation of remains",
        },
        description: {
          fr: "Coordination du rapatriement de la dépouille d'un ressortissant gabonais décédé à l'étranger vers le Gabon : certificats, autorisations sanitaires, transport.",
          en: "Coordination of the repatriation of a Gabonese national who passed away abroad: certificates, health authorizations, transport.",
        },
        category: ServiceCategory.Assistance,
        icon: "Cross",
        eligibleProfiles: [PublicUserType.LongStay, PublicUserType.ShortStay],
        estimatedDays: 5,
        requiresAppointment: true,
      },
      {
        slug: "rapatriement-sanitaire",
        code: "MEDICAL_REPATRIATION",
        name: {
          fr: "Rapatriement sanitaire",
          en: "Medical repatriation",
        },
        description: {
          fr: "Évacuation médicale d'un Gabonais malade ou blessé à l'étranger vers une structure hospitalière au Gabon ou un pays tiers.",
          en: "Medical evacuation of a Gabonese national who is ill or injured abroad to a hospital in Gabon or a third country.",
        },
        category: ServiceCategory.Assistance,
        icon: "Ambulance",
        eligibleProfiles: [PublicUserType.LongStay, PublicUserType.ShortStay],
        estimatedDays: 3,
        requiresAppointment: true,
      },

      // === NOTIFICATIONS / DÉCLARATIONS ===
      {
        slug: "declaration-perte-cni",
        code: "ID_CARD_LOSS_DECLARATION",
        name: {
          fr: "Déclaration de perte de CNI gabonaise",
          en: "Gabonese ID card loss declaration",
        },
        description: {
          fr: "Déclaration officielle de perte ou de vol de carte nationale d'identité gabonaise à l'étranger, à transmettre à la DGDI au Gabon.",
          en: "Official declaration of loss or theft of a Gabonese national ID card abroad, to be forwarded to the DGDI in Gabon.",
        },
        category: ServiceCategory.Declaration,
        icon: "ShieldAlert",
        eligibleProfiles: [PublicUserType.LongStay, PublicUserType.ShortStay],
        estimatedDays: 1,
        requiresAppointment: false,
      },
      {
        slug: "certificat-residence",
        code: "RESIDENCE_CERTIFICATE",
        name: {
          fr: "Certificat de résidence à l'étranger",
          en: "Certificate of residence abroad",
        },
        description: {
          fr: "Attestation officielle que vous résidez à l'étranger, utilisée pour les démarches fiscales, bancaires ou administratives au Gabon.",
          en: "Official certificate that you reside abroad, used for tax, banking or administrative procedures in Gabon.",
        },
        category: ServiceCategory.Certification,
        icon: "MapPinned",
        eligibleProfiles: [PublicUserType.LongStay],
        estimatedDays: 3,
        requiresAppointment: false,
      },
    ];

    let inserted = 0;
    let skipped = 0;
    for (const s of seeds) {
      if (existingCodes.has(s.code)) {
        skipped++;
        continue;
      }
      await ctx.db.insert("services", {
        slug: s.slug,
        code: s.code,
        name: s.name,
        description: s.description,
        category: s.category,
        icon: s.icon,
        eligibleProfiles: s.eligibleProfiles,
        estimatedDays: s.estimatedDays,
        requiresAppointment: s.requiresAppointment,
        requiresPickupAppointment: s.requiresPickupAppointment ?? false,
        titleValidity: s.titleValidity,
        processSteps: s.processSteps,
        isActive: true,
        updatedAt: now,
      });
      inserted++;
    }

    return { inserted, skipped, totalSeeded: seeds.length };
  },
});
