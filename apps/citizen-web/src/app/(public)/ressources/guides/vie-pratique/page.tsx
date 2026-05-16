import type { Metadata } from "next"
import { JsonLd } from "@/components/seo/JsonLd"
import { breadcrumbSchema, howToSchema } from "@/lib/json-ld"
import { buildMetadata } from "@/lib/seo"
import GuideViePratiquePageClient from "./vie-pratique-page-client"

const TITLE = "Guide pratique de la vie au Gabon"
const DESCRIPTION =
  "Informations utiles pour vivre au Gabon ou à l'étranger : santé, banque, fiscalité, télécommunications, sécurité, éducation et services du quotidien."

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/ressources/guides/vie-pratique",
})

const STEPS = [
  {
    name: "Choisir sa banque et gérer son argent",
    text: "Les principales banques sont BGFI Bank, Ecobank, UBA, Orabank et BICIG. Compte courant en XAF accessible avec passeport et justificatif de domicile. Frais d'ouverture : 5 000 à 25 000 XAF. Mobile money omniprésent (Airtel Money, Moov Money).",
  },
  {
    name: "Se connecter : téléphonie et internet",
    text: "Trois opérateurs principaux : Airtel, Moov Africa et Gabon Telecom. SIM prépayée délivrée avec passeport. Forfait internet 4G illimité : 15 000 à 30 000 XAF/mois. La fibre optique (FTTH) est disponible à Libreville et Port-Gentil.",
  },
  {
    name: "Accéder aux soins de santé",
    text: "Pour les cas légers : pharmacies ouvertes 7/7 et cliniques privées. Pour les urgences : Centre Hospitalier Universitaire de Libreville (CHU) et Polyclinique El-Rapha. Évacuation sanitaire vers Paris ou Le Cap couverte par les assurances internationales (1,5 à 3 M XAF en moyenne).",
  },
  {
    name: "Comprendre la fiscalité",
    text: "Impôt sur le revenu progressif (0 à 35 % au-delà de 1,5 M XAF/an). TVA à 18 %. Déclaration annuelle entre le 1er mars et le 30 avril à la Direction Générale des Impôts. Numéro d'identifiant fiscal (NIF) obligatoire pour toute activité professionnelle.",
  },
  {
    name: "Se déplacer au Gabon",
    text: "Libreville et Port-Gentil sont reliées par avion (45 min) ou ferry (8 h). Taxis et VTC (Yango, Heetch) opérationnels en zone urbaine. Permis local ou international obligatoire ; conversion sous 6 mois si résidence permanente.",
  },
  {
    name: "Scolariser ses enfants",
    text: "École publique gratuite mais effectifs chargés. Lycée français Blaise Pascal (programme français) : 2,5 à 8 M XAF/an. American International School : tarification anglo-saxonne. Inscription à anticiper 6 à 12 mois à l'avance.",
  },
  {
    name: "Sécurité et urgences",
    text: "Numéros d'urgence : Police 1730, Gendarmerie 1731, Pompiers 18, SAMU 1300. La criminalité reste modérée ; vigilance dans les zones de marché et de nuit. S'inscrire sur le registre consulaire pour bénéficier des alertes diplomatiques.",
  },
  {
    name: "Suivre l'actualité officielle",
    text: "Consulter consulat.ga (rubrique Actualités) pour les communiqués diplomatiques. Les annonces officielles paraissent au Journal Officiel et sur les sites du gouvernement (gouvernement.ga, diplomatie.gouv.ga).",
  },
]

export default function GuideViePratiquePage() {
  return (
    <>
      <JsonLd
        data={howToSchema({
          name: TITLE,
          description: DESCRIPTION,
          path: "/ressources/guides/vie-pratique",
          steps: STEPS,
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Accueil", path: "/" },
          { name: "Ressources", path: "/ressources" },
          { name: "Vie pratique", path: "/ressources/guides/vie-pratique" },
        ])}
      />
      <GuideViePratiquePageClient />
    </>
  )
}
