/**
 * Seed du réseau diplomatique gabonais (50+ postes)
 * Source: consulat-core/src/data/mock-diplomatic-network.ts
 *
 * Utilisation:
 * npx convex run seeds/diplomatic_network:seedDiplomaticNetwork
 */
import { mutation } from "../_generated/server";
import { OrganizationType } from "../lib/constants";

// Données du réseau diplomatique
const DIPLOMATIC_NETWORK = [
  // ═══════════════════════════════════════════════════════════════════════════
  // AFRIQUE (22 postes)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    slug: "za-ambassade-pretoria",
    name: "Ambassade du Gabon en Afrique du Sud",
    type: OrganizationType.Embassy,
    country: "ZA",
    timezone: "Africa/Johannesburg",
    address: { city: "Pretoria", street: "921 Francis Baard Street, Arcadia" },
    jurisdictionCountries: ["ZA", "BW", "MZ", "ZW"],
    phone: "+27 12 430 2969",
    email: "ambagabonsa@gmail.com",
    notes: "Situé au cœur du quartier diplomatique d'Arcadia.",
  },
  {
    slug: "dz-ambassade-alger",
    name: "Ambassade du Gabon en Algérie",
    type: OrganizationType.Embassy,
    country: "DZ",
    timezone: "Africa/Algiers",
    address: { city: "Alger", street: "Villa N°2, Impasse Ahmed Kara" },
    jurisdictionCountries: ["DZ", "MR"],
    phone: "+213 23 38 12 36",
    fax: "+213 23 38 12 36",
    email: "ambaga.algerie@diplomatie.gouv.ga",
  },
  {
    slug: "ao-ambassade-luanda",
    name: "Ambassade du Gabon en Angola",
    type: OrganizationType.Embassy,
    country: "AO",
    timezone: "Africa/Luanda",
    address: {
      city: "Luanda",
      street: "Rua Eng° Armindo de Andrade N°149, Miramar",
    },
    jurisdictionCountries: ["AO", "NA", "ZM"],
    phone: "+244 222 042 943",
    email: "ambagabonluanda@hotmail.com",
  },
  {
    slug: "bj-consulat-cotonou",
    name: "Consulat Général du Gabon au Bénin",
    type: OrganizationType.GeneralConsulate,
    country: "BJ",
    timezone: "Africa/Porto-Novo",
    address: {
      city: "Cotonou",
      street: "Quartier Patte d'Oie Cadjèhoun C-615 A",
    },
    jurisdictionCountries: ["BJ"],
    phone: "+229 64 13 22 88",
    email: "consga.benin@diplomatie.gouv.ga",
    notes: "La juridiction politique est couverte par l'Ambassade au Togo.",
  },
  {
    slug: "cm-ambassade-yaounde",
    name: "Ambassade du Gabon au Cameroun",
    type: OrganizationType.Embassy,
    country: "CM",
    timezone: "Africa/Douala",
    address: { city: "Yaoundé", street: "Quartier Bastos, Ekoudou, BP 4130" },
    jurisdictionCountries: ["CM", "CF", "TD"],
    phone: "+237 222 608 703",
    email: "ambaga.cameroun@diplomatie.gouv.ga",
  },
  {
    slug: "cg-ambassade-brazzaville",
    name: "Ambassade du Gabon au Congo",
    type: OrganizationType.Embassy,
    country: "CG",
    timezone: "Africa/Brazzaville",
    address: {
      city: "Brazzaville",
      street: "40, Avenue du Maréchal Lyautey, Centre-ville",
    },
    jurisdictionCountries: ["CG"],
    phone: "+242 22 281 56 20",
    email: "ambagaboncongo@diplomatie.gouv.ga",
  },
  {
    slug: "ci-ambassade-abidjan",
    name: "Ambassade du Gabon en Côte d'Ivoire",
    type: OrganizationType.Embassy,
    country: "CI",
    timezone: "Africa/Abidjan",
    address: {
      city: "Abidjan",
      street: "Immeuble Les Hévéas, Boulevard Carde, Plateau",
    },
    jurisdictionCountries: ["CI"],
    phone: "+225 27 22 44 51 54",
    email: "ambga.cotedivoire@diplomatie.gouv.ga",
    notes: "Situé dans le quartier d'affaires du Plateau.",
  },
  {
    slug: "eg-ambassade-le-caire",
    name: "Ambassade du Gabon en Égypte",
    type: OrganizationType.Embassy,
    country: "EG",
    timezone: "Africa/Cairo",
    address: { city: "Le Caire", street: "59, rue Syrie, Mohandessine" },
    jurisdictionCountries: ["EG"],
    phone: "+20 2 304 39 72",
    email: "amba.gabon@yahoo.fr",
  },
  {
    slug: "et-mission-addis-abeba",
    name: "Mission Permanente du Gabon en Éthiopie / UA",
    type: OrganizationType.PermanentMission,
    country: "ET",
    timezone: "Africa/Addis_Ababa",
    address: {
      city: "Addis-Abeba",
      street: "Bole Sub City, Kebele-18, H. No. 1026",
    },
    jurisdictionCountries: ["ET"],
    phone: "+251 116 61 10 75",
    email: "ambagabaddis@gmail.com",
    notes: "Couvre Union Africaine, CEA, PNUE.",
  },
  {
    slug: "gh-consulat-accra",
    name: "Consulat Honoraire du Gabon au Ghana",
    type: OrganizationType.GeneralConsulate,
    country: "GH",
    timezone: "Africa/Accra",
    address: { city: "Accra", street: "Flat 5 Agostinho Neto Rd" },
    jurisdictionCountries: ["GH"],
    phone: "+233 302 906 994",
    email: "celps_center@yahoo.com",
    notes:
      "Le Togo couvre diplomatiquement le Ghana. Présence consulaire locale pour les urgences.",
  },
  {
    slug: "gq-ambassade-malabo",
    name: "Ambassade du Gabon en Guinée Équatoriale",
    type: OrganizationType.Embassy,
    country: "GQ",
    timezone: "Africa/Malabo",
    address: { city: "Malabo", street: "Quartier Paraiso" },
    jurisdictionCountries: ["GQ"],
    phone: "+240 333 093 108",
    email: "ambagabonguineq@diplomatie.gouv.ga",
  },
  {
    slug: "gq-consulat-bata",
    name: "Consulat Général du Gabon à Bata",
    type: OrganizationType.GeneralConsulate,
    country: "GQ",
    timezone: "Africa/Malabo",
    address: { city: "Bata", street: "Plazza del Ayuntamiento, BP 933" },
    jurisdictionCountries: ["GQ"],
    phone: "+240 222 10 11 70",
    email: "samuelnangnang@yahoo.fr",
    notes: "Gestion des flux frontaliers terrestres. Horaires : 08h00 - 16h00.",
  },
  {
    slug: "ml-consulat-bamako",
    name: "Consulat Général du Gabon au Mali",
    type: OrganizationType.GeneralConsulate,
    country: "ML",
    timezone: "Africa/Bamako",
    address: {
      city: "Bamako",
      street: "Bacodjikoroni Golf, rue 727 Lot 4132",
    },
    jurisdictionCountries: ["ML"],
    phone: "+223 20 28 13 99",
    email: "consgegabmali@yahoo.com",
    notes: "Service consulaire de plein exercice.",
  },
  {
    slug: "ma-ambassade-rabat",
    name: "Ambassade du Gabon au Maroc",
    type: OrganizationType.Embassy,
    country: "MA",
    timezone: "Africa/Casablanca",
    address: { city: "Rabat", street: "72 Av. Mehdi Ben Barka, Souissi" },
    jurisdictionCountries: ["MA"],
    phone: "+212 537 75 19 50",
    email: "ambga.maroc@diplomatie.gouv.ga",
  },
  {
    slug: "ma-consulat-laayoune",
    name: "Consulat Général du Gabon à Laâyoune",
    type: OrganizationType.GeneralConsulate,
    country: "MA",
    timezone: "Africa/Casablanca",
    address: { city: "Laâyoune", street: "Quartier diplomatique" },
    jurisdictionCountries: ["MA"],
    phone: "+212 537 75 19 50",
    notes:
      "Inauguré en janvier 2020. Soutien à la souveraineté marocaine et services de proximité.",
  },
  {
    slug: "ng-ambassade-abuja",
    name: "Ambassade du Gabon au Nigeria",
    type: OrganizationType.Embassy,
    country: "NG",
    timezone: "Africa/Lagos",
    address: {
      city: "Abuja",
      street: "2B, Orange Close, Off Volta Street, Maitama",
    },
    jurisdictionCountries: ["NG"],
    phone: "+234 98 734 965",
    email: "ambagabngr@yahoo.fr",
    notes: "Couvre également CEDEAO.",
  },
  {
    slug: "cd-ambassade-kinshasa",
    name: "Ambassade du Gabon en RDC",
    type: OrganizationType.Embassy,
    country: "CD",
    timezone: "Africa/Kinshasa",
    address: {
      city: "Kinshasa",
      street: "167, avenue Colonel Mondjiba, Zone de Kintambo",
    },
    jurisdictionCountries: ["CD", "BI", "RW"],
    phone: "+243 971 190 647",
    email: "rdcambassadedugabon@gmail.com",
  },
  {
    slug: "rw-haut-commissariat-kigali",
    name: "Haut-Commissariat du Gabon au Rwanda",
    type: OrganizationType.HighCommission,
    country: "RW",
    timezone: "Africa/Kigali",
    address: { city: "Kigali", street: "" },
    jurisdictionCountries: ["RW"],
    notes:
      "Ouverture récente août 2024. Chef de Mission : S.E.M. Sylver Aboubakar Minko Mi Nseme.",
  },
  {
    slug: "st-ambassade-sao-tome",
    name: "Ambassade du Gabon à São Tomé",
    type: OrganizationType.Embassy,
    country: "ST",
    timezone: "Africa/Sao_Tome",
    address: { city: "São Tomé", street: "Rua Damão, C.P. 394" },
    jurisdictionCountries: ["ST"],
    phone: "+239 222 44 34",
    email: "ambagabon@estome.net",
  },
  {
    slug: "sn-ambassade-dakar",
    name: "Ambassade du Gabon au Sénégal",
    type: OrganizationType.Embassy,
    country: "SN",
    timezone: "Africa/Dakar",
    address: { city: "Dakar", street: "Avenue Cheikh Anta Diop, BP 436" },
    jurisdictionCountries: ["SN", "CV", "GM", "GW", "GN"],
    phone: "+221 33 865 22 34",
    email: "ambagabsen@diplomatie.gouv.ga",
  },
  {
    slug: "tg-ambassade-lome",
    name: "Ambassade du Gabon au Togo",
    type: OrganizationType.Embassy,
    country: "TG",
    timezone: "Africa/Lome",
    address: { city: "Lomé", street: "Boulevard Jean Paul II, BP 9118" },
    jurisdictionCountries: ["TG", "BJ", "GH"],
    phone: "+228 22 26 75 63",
    email: "ambaga.togo@diplomatie.gouv.ga",
  },
  {
    slug: "tn-ambassade-tunis",
    name: "Ambassade du Gabon en Tunisie",
    type: OrganizationType.Embassy,
    country: "TN",
    timezone: "Africa/Tunis",
    address: {
      city: "Tunis",
      street: "7, Rue de l'Ile de Rhodes, Les Jardins de Lac II",
    },
    jurisdictionCountries: ["TN"],
    phone: "+216 71 197 216",
    email: "ambassadegabon.tn@gmail.com",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EUROPE (14 postes)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    slug: "de-ambassade-berlin",
    name: "Ambassade du Gabon en Allemagne",
    type: OrganizationType.Embassy,
    country: "DE",
    timezone: "Europe/Berlin",
    address: { city: "Berlin", street: "Hohensteiner Straße 16, 14197" },
    jurisdictionCountries: ["DE", "AT"],
    phone: "+49 30 89 73 34 40",
    email: "botschaft@botschaft-gabun.de",
    notes: "Horaires : 09h00-16h00 (Lun-Ven).",
    openingHours: {
      monday: { open: "09:00", close: "16:00" },
      tuesday: { open: "09:00", close: "16:00" },
      wednesday: { open: "09:00", close: "16:00" },
      thursday: { open: "09:00", close: "16:00" },
      friday: { open: "09:00", close: "16:00" },
      saturday: { closed: true },
      sunday: { closed: true },
    },
  },
  {
    slug: "be-ambassade-bruxelles",
    name: "Ambassade du Gabon en Belgique / UE",
    type: OrganizationType.Embassy,
    country: "BE",
    timezone: "Europe/Brussels",
    address: {
      city: "Bruxelles",
      street: "112, Avenue Winston Churchill, 1180",
    },
    jurisdictionCountries: ["BE", "NL", "LU"],
    phone: "+32 2 340 62 10",
    email: "ambagabbelg@yahoo.fr",
    notes: "Représentation auprès de l'Union Européenne.",
  },
  {
    slug: "es-ambassade-madrid",
    name: "Ambassade de la République Gabonaise près le Royaume d'Espagne",
    type: OrganizationType.Embassy,
    country: "ES",
    timezone: "Europe/Madrid",
    address: {
      city: "Madrid",
      street: "Calle de Orense, Nº 68, 2º Dcha, 28020",
    },
    jurisdictionCountries: ["ES", "PT", "AD"],
    phone: "+34 914 138 211",
    email: "olgagabon@gmail.com",
    website: "https://espagne.ambassade.ga",
    notes:
      "Représentation Permanente du Gabon auprès de l'Organisation des Nations Unies pour le Tourisme (ONU Tourisme). Chef de mission : S.E. Mme Allegra Pamela BONGO.",
    openingHours: {
      monday: { open: "09:00", close: "16:00" },
      tuesday: { open: "09:00", close: "16:00" },
      wednesday: { open: "09:00", close: "16:00" },
      thursday: { open: "09:00", close: "16:00" },
      friday: { open: "09:00", close: "16:00" },
      saturday: { closed: true },
      sunday: { closed: true },
    },
  },
  {
    slug: "fr-ambassade-paris",
    name: "Ambassade du Gabon en France",
    type: OrganizationType.Embassy,
    country: "FR",
    timezone: "Europe/Paris",
    address: { city: "Paris", street: "26 bis, Avenue Raphaël, 75016" },
    coordinates: { lat: 48.8583866, lng: 2.2669538 },
    jurisdictionCountries: ["FR", "PT", "MC", "AD"],
    phone: "+33 1 42 99 68 68",
    email: "ambassade.gabonfrance@gmail.com",
    website: "ambassadedugabonenfrance.com",
    openingHours: {
      monday: { open: "09:00", close: "16:30" },
      tuesday: { open: "09:00", close: "16:30" },
      wednesday: { open: "09:00", close: "16:30" },
      thursday: { open: "09:00", close: "16:30" },
      friday: { open: "09:00", close: "16:00" },
      saturday: { closed: true },
      sunday: { closed: true },
      notes: "Couvre également l'OIF.",
    },
  },
  {
    slug: "fr-consulat-paris",
    name: "Consulat Général du Gabon à Paris",
    type: OrganizationType.GeneralConsulate,
    country: "FR",
    timezone: "Europe/Paris",
    address: { city: "Paris", street: "26 bis, Avenue Raphaël, 75016" },
    coordinates: { lat: 48.8583866, lng: 2.2669538 },
    jurisdictionCountries: ["FR"],
    phone: "+33 1 42 99 68 62",
    email: "cgeneralgabon@hotmail.fr",
    notes:
      "Horaires : Lun-Jeu 09h00-16h30, Ven 09h00-16h00. Services : Visas, Passeports (DGDI), État civil.",
    openingHours: {
      monday: { open: "09:00", close: "16:30" },
      tuesday: { open: "09:00", close: "16:30" },
      wednesday: { open: "09:00", close: "16:30" },
      thursday: { open: "09:00", close: "16:30" },
      friday: { open: "09:00", close: "16:00" },
      saturday: { closed: true },
      sunday: { closed: true },
    },
  },
  {
    slug: "fr-delegation-unesco",
    name: "Délégation Permanente du Gabon auprès de l'UNESCO",
    type: OrganizationType.PermanentMission,
    country: "FR",
    timezone: "Europe/Paris",
    address: { city: "Paris", street: "1, rue Miollis, 75015" },
    coordinates: { lat: 48.849, lng: 2.3063 },
    jurisdictionCountries: ["FR"],
    phone: "+33 1 45 68 33 50",
    email: "dl.gabon@unesco-delegations.org",
    notes: "Représentation auprès de l'UNESCO.",
  },
  {
    slug: "it-ambassade-rome",
    name: "Ambassade du Gabon en Italie",
    type: OrganizationType.Embassy,
    country: "IT",
    timezone: "Europe/Rome",
    address: { city: "Rome", street: "Lungotevere Michelangelo, 9, 00192" },
    jurisdictionCountries: ["IT", "GR", "CY"],
    phone: "+39 06 5272 9121",
    email: "ambagabonrome@gmail.com",
    notes: "Représentation auprès de la FAO.",
  },
  {
    slug: "gb-haut-commissariat-londres",
    name: "Haut-Commissariat du Gabon au Royaume-Uni",
    type: OrganizationType.HighCommission,
    country: "GB",
    timezone: "Europe/London",
    address: { city: "Londres", street: "27 Elvaston Place, SW7 5NL" },
    jurisdictionCountries: ["GB", "IE", "SE", "DK", "NO", "FI"],
    phone: "+44 20 7823 9986",
    email: "gabonembassyuk@gmail.com",
    notes: "Statut : High Commission (Commonwealth).",
  },
  {
    slug: "ru-ambassade-moscou",
    name: "Ambassade du Gabon en Russie",
    type: OrganizationType.Embassy,
    country: "RU",
    timezone: "Europe/Moscow",
    address: { city: "Moscou", street: "Denezhny Per. 16/1, 119002" },
    jurisdictionCountries: ["RU"],
    phone: "+7 495 241 00 80",
    email: "ambagab_ru@mail.ru",
    notes: "Couvre l'Europe de l'Est.",
  },
  {
    slug: "va-ambassade-vatican",
    name: "Ambassade du Gabon près le Saint-Siège",
    type: OrganizationType.Embassy,
    country: "VA",
    timezone: "Europe/Rome",
    address: {
      city: "Vatican",
      street: "Via Ovidio, 7a, 00193 Rome / Piazzale Clodio 12",
    },
    jurisdictionCountries: ["VA"],
    phone: "+39 06 3974 5043",
    email: "ambagabon.vatican@yahoo.com",
    notes: "Relations avec le Vatican et l'Ordre de Malte.",
  },
  {
    slug: "ch-mission-geneve",
    name: "Mission Permanente du Gabon à Genève",
    type: OrganizationType.PermanentMission,
    country: "CH",
    timezone: "Europe/Zurich",
    address: { city: "Genève", street: "Avenue de France 23, 1202" },
    jurisdictionCountries: ["CH"],
    phone: "+41 22 731 68 69",
    email: "mission.gabon@gabon-onug.ch",
    notes: "Représentation auprès de l'ONU, OMC, OIT, OMS.",
  },
  {
    slug: "tr-ambassade-ankara",
    name: "Ambassade du Gabon en Turquie",
    type: OrganizationType.Embassy,
    country: "TR",
    timezone: "Europe/Istanbul",
    address: {
      city: "Ankara",
      street: "16/609 Ilkbahar Mahallesi, Oran, Çankaya",
    },
    jurisdictionCountries: ["TR"],
    phone: "+90 312 490 94 94",
    email: "embagabonturkey@gmail.com",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AMÉRIQUES (6 postes)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    slug: "br-ambassade-brasilia",
    name: "Ambassade du Gabon au Brésil",
    type: OrganizationType.Embassy,
    country: "BR",
    timezone: "America/Sao_Paulo",
    address: {
      city: "Brasilia",
      street: "SHIS QI 09 conjunto 11 casa 09, Lago Sul",
    },
    jurisdictionCountries: ["BR"],
    phone: "+55 61 3248 3533",
    email: "bresil.embgabon@gmail.com",
    notes: "Horaires : 09h00-16h00. Couvre l'Amérique du Sud.",
  },
  {
    slug: "ca-ambassade-ottawa",
    name: "Ambassade du Gabon au Canada",
    type: OrganizationType.Embassy,
    country: "CA",
    timezone: "America/Toronto",
    address: { city: "Ottawa", street: "1285, rue Labelle" },
    jurisdictionCountries: ["CA"],
    phone: "+1 613 232 5301",
    website: "ambassadegabon.ca",
  },
  {
    slug: "cu-ambassade-la-havane",
    name: "Ambassade du Gabon à Cuba",
    type: OrganizationType.Embassy,
    country: "CU",
    timezone: "America/Havana",
    address: {
      city: "La Havane",
      street: "5ta. Ave. No. 1808 e/ 18 y 20, Miramar",
    },
    jurisdictionCountries: ["CU"],
    phone: "+53 7 204 0472",
    notes: "Couvre les Caraïbes.",
  },
  {
    slug: "us-ambassade-washington",
    name: "Ambassade du Gabon aux États-Unis",
    type: OrganizationType.Embassy,
    country: "US",
    timezone: "America/New_York",
    address: {
      city: "Washington",
      street: "2034 20th Street NW, Suite 200, DC 20009",
    },
    jurisdictionCountries: ["US", "MX"],
    phone: "+1 202 797-1000",
    email: "info@gabonembassyusa.org",
    notes: "Horaires : 09h00-17h00. Représentation Banque Mondiale / FMI.",
    openingHours: {
      monday: { open: "09:00", close: "17:00" },
      tuesday: { open: "09:00", close: "17:00" },
      wednesday: { open: "09:00", close: "17:00" },
      thursday: { open: "09:00", close: "17:00" },
      friday: { open: "09:00", close: "17:00" },
      saturday: { closed: true },
      sunday: { closed: true },
    },
  },
  {
    slug: "us-consulat-new-york",
    name: "Consulat Général du Gabon à New York",
    type: OrganizationType.GeneralConsulate,
    country: "US",
    timezone: "America/New_York",
    address: {
      city: "New York",
      street: "122 East 42nd Street, Suite 519, NY 10168",
    },
    jurisdictionCountries: ["US"],
    phone: "+1 212 683-7371",
    email: "consulatgabon@aol.com",
    notes: "Services : Visas, Légalisations pour la côte Est.",
  },
  {
    slug: "us-mission-new-york",
    name: "Mission Permanente du Gabon à l'ONU",
    type: OrganizationType.PermanentMission,
    country: "US",
    timezone: "America/New_York",
    address: {
      city: "New York",
      street: "18 East 41st Street, 9th Floor, NY 10017",
    },
    jurisdictionCountries: ["US"],
    phone: "+1 212 686-9720",
    email: "info@gabonunmission.com",
    notes: "Représentation auprès du siège des Nations Unies.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ASIE & MOYEN-ORIENT (6 postes)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    slug: "sa-ambassade-riyad",
    name: "Ambassade du Gabon en Arabie Saoudite",
    type: OrganizationType.Embassy,
    country: "SA",
    timezone: "Asia/Riyadh",
    address: {
      city: "Riyad",
      street: "Al-Morsalat Q. Bin Tofiel Street, P.O. Box 94325",
    },
    jurisdictionCountries: ["SA", "KW", "AE"],
    phone: "+966 11 456 7173",
    email: "ambagabonriyadh@yahoo.com",
  },
  {
    slug: "cn-ambassade-pekin",
    name: "Ambassade du Gabon en Chine",
    type: OrganizationType.Embassy,
    country: "CN",
    timezone: "Asia/Shanghai",
    address: {
      city: "Pékin",
      street: "36, Guang Hua Lu, Jian Guo Men Wai, Beijing 100600",
    },
    jurisdictionCountries: ["CN", "SG", "VN"],
    phone: "+86 10 6532 2810",
    fax: "+86 10 6532 2621",
    email: "ambagabonchine@yahoo.fr",
  },
  {
    slug: "kr-ambassade-seoul",
    name: "Ambassade du Gabon en Corée du Sud",
    type: OrganizationType.Embassy,
    country: "KR",
    timezone: "Asia/Seoul",
    address: {
      city: "Séoul",
      street: "4th Floor, Yoosung Building, 239 Itaewon-ro, Yongsan-gu",
    },
    jurisdictionCountries: ["KR", "TH"],
    phone: "+82 2 793 9575",
    email: "amgabsel@unitel.co.kr",
  },
  {
    slug: "in-ambassade-new-delhi",
    name: "Ambassade du Gabon en Inde",
    type: OrganizationType.Embassy,
    country: "IN",
    timezone: "Asia/Kolkata",
    address: {
      city: "New Delhi",
      street: "E-84, Paschimi Marg, Vasant Vihar, 110057",
    },
    jurisdictionCountries: ["IN"],
    phone: "+91 11 4101 2513",
    email: "gabon.secretariat22@gmail.com",
  },
  {
    slug: "jp-ambassade-tokyo",
    name: "Ambassade du Gabon au Japon",
    type: OrganizationType.Embassy,
    country: "JP",
    timezone: "Asia/Tokyo",
    address: {
      city: "Tokyo",
      street: "1-34-11, Higashigaoka, Meguro-ku, 152-0021",
    },
    jurisdictionCountries: ["JP"],
    phone: "+81 3 5430 9171",
    email: "info@gabonembassy-tokyo.org",
    notes: "Horaires : 09h00-12h00 / 13h00-16h00.",
    openingHours: {
      monday: { open: "09:00", close: "16:00" },
      tuesday: { open: "09:00", close: "16:00" },
      wednesday: { open: "09:00", close: "16:00" },
      thursday: { open: "09:00", close: "16:00" },
      friday: { open: "09:00", close: "16:00" },
      saturday: { closed: true },
      sunday: { closed: true },
      notes: "Pause 12h00-13h00.",
    },
  },
  {
    slug: "lb-consulat-beyrouth",
    name: "Consulat Général du Gabon au Liban",
    type: OrganizationType.GeneralConsulate,
    country: "LB",
    timezone: "Asia/Beirut",
    address: { city: "Beyrouth", street: "" },
    jurisdictionCountries: ["LB"],
    phone: "+961 5 956 048",
    fax: "+961 5 924 643",
    notes:
      "Gestion de l'importante communauté libanaise au Gabon et visas d'affaires.",
  },
];

// Type for diplomatic network entries
type DiplomaticOrg = (typeof DIPLOMATIC_NETWORK)[number] & {
  fax?: string;
  email?: string;
  website?: string;
  notes?: string;
  coordinates?: { lat: number; lng: number };
  openingHours?: {
    monday?: { open: string; close: string } | { closed: boolean };
    tuesday?: { open: string; close: string } | { closed: boolean };
    wednesday?: { open: string; close: string } | { closed: boolean };
    thursday?: { open: string; close: string } | { closed: boolean };
    friday?: { open: string; close: string } | { closed: boolean };
    saturday?: { open: string; close: string } | { closed: boolean };
    sunday?: { open: string; close: string } | { closed: boolean };
    notes?: string;
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// SEED FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/* eslint-disable @typescript-eslint/no-explicit-any */
export const seedDiplomaticNetwork = mutation({
  args: {},
  handler: async (ctx) => {
    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const rawOrg of DIPLOMATIC_NETWORK) {
      const org = rawOrg as DiplomaticOrg;
      try {
        // Check if org already exists by slug
        const existing = await ctx.db
          .query("orgs")
          .withIndex("by_slug", (q) => q.eq("slug", org.slug))
          .first();

        if (existing) {
          results.skipped++;
          continue;
        }

        // Build address with required fields (postalCode defaults to empty string)
        const address: any = {
          street: org.address.street,
          city: org.address.city,
          postalCode: "", // Not available in source data
          country: org.country,
        };
        if (org.coordinates) address.coordinates = org.coordinates;

        // Insert the organization with optional fields
        // Using 'as any' to bypass strict type checking for this one-time seed script
        await ctx.db.insert("orgs", {
          slug: org.slug,
          name: org.name,
          type: org.type,
          country: org.country,
          timezone: org.timezone,
          address,
          ...(org.jurisdictionCountries && { 
            jurisdictionCountries: org.jurisdictionCountries 
          }),
          ...(org.phone && { phone: org.phone }),
          ...(org.fax && { fax: org.fax }),
          ...(org.email && { email: org.email }),
          ...(org.website && { website: org.website }),
          ...(org.notes && { notes: org.notes }),
          ...(org.openingHours && { openingHours: org.openingHours }),
          isActive: true,
        } as any);

        results.created++;
      } catch (error) {
        results.errors.push(
          `${org.slug}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return results;
  },
});
