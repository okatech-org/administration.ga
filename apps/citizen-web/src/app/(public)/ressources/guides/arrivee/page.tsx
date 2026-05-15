import type { Metadata } from "next"
import { JsonLd } from "@/components/seo/JsonLd"
import { breadcrumbSchema, howToSchema } from "@/lib/json-ld"
import { buildMetadata } from "@/lib/seo"
import GuideArriveePageClient from "./arrivee-page-client"

const TITLE = "Guide d'arrivée au Gabon"
const DESCRIPTION =
  "Tout ce qu'il faut savoir pour s'installer au Gabon : formalités d'entrée, démarches administratives à l'arrivée, logement, santé, transport et vie quotidienne."

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/ressources/guides/arrivee",
})

const STEPS = [
  {
    name: "Préparer ses documents avant le départ",
    text: "Vérifier la validité du passeport (au moins 6 mois), obtenir le visa d'entrée approprié, rassembler les justificatifs (billet retour, hébergement, vaccinations dont la fièvre jaune obligatoire) et faire des copies certifiées des actes d'état civil.",
  },
  {
    name: "Passer les formalités à l'aéroport de Libreville",
    text: "Présenter passeport, visa, carnet de vaccination international et déclaration douanière. Récupérer le tampon d'entrée et conserver le coupon d'arrivée pour la suite des démarches.",
  },
  {
    name: "S'inscrire au registre consulaire",
    text: "Pour les ressortissants étrangers et la diaspora, déclarer sa présence auprès de son ambassade. Pour les Gabonais, mettre à jour son adresse via consulat.ga.",
  },
  {
    name: "Ouvrir un compte bancaire local",
    text: "Présenter passeport, justificatif de domicile, attestation d'emploi ou de revenus. Le franc CFA (XAF) est la monnaie officielle. Comptez 1 à 2 semaines pour la délivrance d'une carte.",
  },
  {
    name: "Souscrire une assurance santé et choisir un médecin",
    text: "Le système de santé local étant limité, prévoir une assurance internationale couvrant l'évacuation sanitaire. Identifier les cliniques privées de Libreville (Polyclinique El-Rapha, Centre Hospitalier Universitaire).",
  },
  {
    name: "Trouver un logement et l'équiper",
    text: "Privilégier les quartiers résidentiels (Glass, Quartier Louis, Sablière). Vérifier que l'eau et l'électricité (SEEG) sont raccordées avant signature du bail. Compter 2 à 3 mois de caution.",
  },
  {
    name: "Inscrire ses enfants à l'école",
    text: "Trois options principales : système gabonais public/privé, Lycée français Blaise Pascal, écoles internationales. Constituer le dossier avec actes de naissance traduits, carnets scolaires et certificats médicaux.",
  },
  {
    name: "Obtenir un permis de conduire reconnu",
    text: "Le permis international est accepté 6 mois. Au-delà, conversion en permis gabonais à la Direction Générale des Transports Terrestres avec traduction officielle si nécessaire.",
  },
]

export default function GuideArriveePage() {
  return (
    <>
      <JsonLd
        data={howToSchema({
          name: TITLE,
          description: DESCRIPTION,
          path: "/ressources/guides/arrivee",
          totalTime: "P30D",
          steps: STEPS,
          tool: ["Passeport", "Visa", "Carnet de vaccination", "Acte de naissance"],
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Accueil", path: "/" },
          { name: "Ressources", path: "/ressources" },
          { name: "Guide d'arrivée", path: "/ressources/guides/arrivee" },
        ])}
      />
      <GuideArriveePageClient />
    </>
  )
}
