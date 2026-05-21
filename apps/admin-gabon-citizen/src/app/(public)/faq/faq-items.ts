export const faqItems = [
  // ─── Identité (CNI, Passeport) ─────────────────────────────────────────────
  {
    question: "Comment obtenir ma Carte Nationale d'Identité (CNI) ?",
    answer:
      "La CNI biométrique gabonaise s'obtient auprès de la Direction Générale de la Documentation et de l'Immigration (DGDI) ou de son guichet décentralisé le plus proche. Pièces à fournir : acte de naissance (moins de 3 mois), 2 photos d'identité aux normes, justificatif de domicile, et l'ancienne CNI en cas de renouvellement. Délai moyen : 2 à 4 semaines. Pour un premier titre dès 18 ans, l'enregistrement biométrique (empreintes + photo) sur place est obligatoire.",
  },
  {
    question: "Comment renouveler mon passeport gabonais ?",
    answer:
      "Le renouvellement du passeport biométrique s'effectue auprès de la DGDI à Libreville ou de l'antenne provinciale dont vous dépendez. Pièces à fournir : ancien passeport, acte de naissance récent, CNI en cours de validité, 2 photos d'identité aux normes ICAO, justificatif de domicile. Délai moyen : 3 à 4 semaines. Tarif officiel : 75 000 XAF (passeport ordinaire 5 ans). La prise d'empreintes est obligatoire en personne.",
  },
  {
    question: "Que faire en cas de perte ou de vol de mes papiers d'identité ?",
    answer:
      "Déposez d'abord une déclaration de perte ou de vol auprès du commissariat de police dans les 48 h. Présentez ensuite ce procès-verbal au guichet administratif compétent (DGDI pour CNI/passeport, mairie pour autres documents) avec 2 photos récentes et un justificatif de domicile. Un duplicata ou un titre d'urgence peut être délivré selon la nature du document.",
  },
  {
    question: "Quel est le tarif d'un passeport gabonais en 2026 ?",
    answer:
      "Selon la grille tarifaire en vigueur : passeport ordinaire 5 ans 75 000 XAF, passeport ordinaire 10 ans 100 000 XAF, passeport d'urgence 150 000 XAF, passeport pour mineur 50 000 XAF. Paiement par virement, carte bancaire ou via un opérateur de paiement mobile agréé. Consultez la page /tarifs pour la grille complète à jour.",
  },
  {
    question: "Comment obtenir un passeport pour mon enfant mineur ?",
    answer:
      "Un mineur doit obtenir son propre passeport (les inscriptions sur passeport parent ne sont plus acceptées depuis 2010). Le dossier comprend : acte de naissance de l'enfant, livret de famille, pièces d'identité des deux parents, autorisation écrite du parent absent en cas de séparation, 2 photos récentes de l'enfant. Présence du mineur obligatoire pour la prise d'empreintes dès 12 ans.",
  },

  // ─── État civil ────────────────────────────────────────────────────────────
  {
    question: "Comment obtenir un acte de naissance ?",
    answer:
      "L'acte de naissance se demande auprès de la mairie du lieu de naissance, ou via le téléservice de la Direction Générale de l'État Civil quand il est disponible pour votre commune. Pièces à fournir : pièce d'identité, justificatif de la qualité du demandeur (parent, intéressé majeur, ayant droit). Délai : immédiat à 5 jours selon la commune. Tarif : timbres fiscaux variables (généralement 500 à 2 000 XAF).",
  },
  {
    question: "Comment déclarer une naissance ?",
    answer:
      "La déclaration de naissance doit être faite à la mairie du lieu de naissance dans les 30 jours suivant l'événement. Pièces à fournir : certificat médical d'accouchement, pièces d'identité des deux parents, livret de famille s'il existe. Au-delà du délai, une procédure de déclaration tardive devant le tribunal compétent est nécessaire.",
  },
  {
    question: "Comment célébrer un mariage civil au Gabon ?",
    answer:
      "Le mariage civil est célébré à la mairie du domicile de l'un des futurs époux. Le dossier comprend : actes de naissance (moins de 3 mois), pièces d'identité, justificatifs de domicile, certificats prénuptiaux (médicaux), témoins majeurs, et publication des bans (10 jours minimum). Le mariage religieux n'a pas de valeur civile : seul le mariage en mairie produit des effets juridiques.",
  },

  // ─── Création d'entreprise ─────────────────────────────────────────────────
  {
    question: "Comment créer mon entreprise au Gabon ?",
    answer:
      "Les formalités sont centralisées au Centre de Développement des Entreprises (ANPI-Gabon) ou via le Guichet Unique des Entreprises. Étapes : choix de la forme juridique, dépôt du dossier (statuts, pièces d'identité associés, justificatif de siège), immatriculation au RCCM, attribution du NIF (Numéro d'Identification Fiscale) et de l'identifiant statistique, déclaration à la CNSS. Délai cible : 48 heures pour les SARL classiques.",
  },
  {
    question: "Quels sont les régimes fiscaux pour les entreprises ?",
    answer:
      "Les principaux régimes sont : Contribution Forfaitaire Libératoire (CFL) pour les très petites activités ; Régime Réel Simplifié (RRS) pour les PME jusqu'à un seuil de chiffre d'affaires fixé par la loi de finances ; Régime Réel Normal (RRN) pour les autres. La Direction Générale des Impôts détermine le régime applicable selon votre chiffre d'affaires et votre secteur. L'option entre régimes est possible dans certains cas.",
  },

  // ─── Foncier, urbanisme ────────────────────────────────────────────────────
  {
    question: "Comment obtenir un titre foncier ?",
    answer:
      "La procédure d'immatriculation foncière relève de l'Agence Nationale de l'Urbanisme, des Travaux Topographiques et du Cadastre (ANUTTC) et de la Direction Générale des Impôts (Conservation Foncière). Étapes principales : demande d'immatriculation, bornage contradictoire, publicité foncière (publication, opposition possible), enregistrement et établissement du titre. Délais longs : prévoir 12 à 24 mois selon les contestations éventuelles.",
  },
  {
    question: "Comment obtenir un permis de construire ?",
    answer:
      "Le permis de construire se demande auprès de la mairie de la commune ou auprès de la Direction de l'Urbanisme (ANUTTC) pour les grands projets. Pièces à fournir : titre de propriété ou attestation foncière, plans (situation, masse, façades, coupes), notice descriptive, étude d'impact pour les grands ouvrages. Délai d'instruction : 1 à 3 mois selon la complexité.",
  },

  // ─── Permis de conduire, véhicules ─────────────────────────────────────────
  {
    question: "Comment obtenir mon permis de conduire ?",
    answer:
      "Le permis de conduire gabonais est délivré par la Direction Générale des Transports Terrestres. Étapes : inscription dans une auto-école agréée, examen du code de la route, examen pratique (conduite). Pièces à fournir : pièce d'identité, certificat médical d'aptitude à la conduite, photos d'identité, justificatif de domicile. Tarif total (cours + examens + titre) : variable selon l'auto-école.",
  },
  {
    question: "Comment immatriculer mon véhicule ?",
    answer:
      "L'immatriculation se fait auprès de la Direction Générale des Transports Terrestres. Pièces à fournir : certificat de cession ou facture d'achat, déclaration en douane pour un véhicule importé, certificat de visite technique, pièce d'identité du propriétaire, justificatif de domicile, attestation d'assurance. Une carte grise est délivrée après paiement des droits.",
  },

  // ─── Protection sociale ────────────────────────────────────────────────────
  {
    question: "Comment m'inscrire à la Caisse Nationale de Sécurité Sociale ?",
    answer:
      "L'inscription à la CNSS est obligatoire dès l'embauche du premier salarié pour l'employeur, et automatique pour le salarié à travers son employeur. Pour les travailleurs indépendants, une affiliation volontaire est possible auprès de l'agence CNSS de votre province. Pièces à fournir : registre du commerce ou statut professionnel, pièces d'identité, déclaration d'activité.",
  },

  // ─── Plateforme & usage ────────────────────────────────────────────────────
  {
    question: "Comment créer mon espace personnel sur demarche.ga ?",
    answer:
      "Cliquez sur \"M'inscrire\" en haut à droite. Renseignez votre nom, votre date de naissance, votre numéro de CNI ou de passeport, et votre adresse e-mail. Un code de vérification vous est envoyé pour activer le compte. Une fois connecté, vous pouvez suivre vos demandes en cours, recevoir des notifications et discuter avec l'assistant administratif iAsted.",
  },
  {
    question: "Comment suivre l'avancement de ma démarche ?",
    answer:
      "Toutes vos demandes en cours sont visibles depuis votre espace personnel sous \"Mes démarches\". Chaque demande affiche son statut (déposée, en instruction, complément demandé, traitée, retirée), les pièces fournies et les éventuels échanges avec l'administration. Vous recevez une notification à chaque changement de statut.",
  },
  {
    question: "Mes données personnelles sont-elles protégées ?",
    answer:
      "Oui. Le traitement de vos données respecte la loi gabonaise sur la protection des données personnelles ainsi que les bonnes pratiques internationales. Vos pièces justificatives sont chiffrées au stockage, l'accès est strictement réservé aux agents instructeurs habilités, et vous pouvez à tout moment exercer vos droits d'accès, de rectification et de suppression depuis votre espace personnel. Consultez la page /confidentialite pour le détail.",
  },
]
