import type { Metadata } from "next"
import { JsonLd } from "@/components/seo/JsonLd"
import { breadcrumbSchema, howToSchema } from "@/lib/json-ld"
import { buildMetadata } from "@/lib/seo"
import GuideRetourPageClient from "./retour-page-client"

const TITLE = "Guide de retour au Gabon"
const DESCRIPTION =
  "Préparer son retour ou installation au Gabon : dédouanement, scolarisation, immatriculation véhicule, reprise d'activité, démarches administratives."

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/ressources/guides/retour",
})

const STEPS = [
  {
    name: "Anticiper son retour 6 à 12 mois avant",
    text: "Établir un calendrier de retour, comparer les devis de déménagement international, lister les démarches administratives à clôturer dans le pays de résidence (impôts, sécurité sociale, baux, scolarité).",
  },
  {
    name: "Mettre à jour son inscription en ligne",
    text: "Notifier son installation au Gabon via administration.ga. Demander une attestation de résidence à l'étranger pour bénéficier de l'exonération douanière sur les effets personnels (régime du retour des nationaux).",
  },
  {
    name: "Organiser le déménagement et le dédouanement",
    text: "Préparer l'inventaire détaillé des biens, conserver les factures pour les douanes gabonaises, anticiper 4 à 8 semaines de transit maritime. Le régime de retour exonère les effets personnels usagés de plus de 6 mois.",
  },
  {
    name: "Importer son véhicule",
    text: "Le véhicule doit avoir plus de 6 mois d'immatriculation à l'étranger. Documents requis : carte grise, facture, certificat de non-gage, attestation de résidence. Droits réduits sous régime « retour des nationaux ».",
  },
  {
    name: "Régulariser sa situation fiscale gabonaise",
    text: "Se déclarer à la Direction Générale des Impôts (DGI) dans les 30 jours suivant l'installation. Demander un numéro d'identifiant fiscal (NIF) si nécessaire.",
  },
  {
    name: "Inscrire les enfants à l'école",
    text: "Présenter actes de naissance, livret scolaire traduit, certificat de scolarité antérieur. Anticiper l'année scolaire (rentrée en septembre). Les écoles internationales nécessitent une inscription 6 à 12 mois à l'avance.",
  },
  {
    name: "Reprendre ou créer une activité",
    text: "Salarié : transmettre son CV via administration.ga (rubrique « Mon CV »). Entrepreneur : créer son entreprise au Centre de Développement des Entreprises (CDE) en 72 h ; capital minimum 100 000 XAF pour une SARL.",
  },
  {
    name: "Souscrire à la CNSS et à une mutuelle santé",
    text: "Affiliation à la Caisse Nationale de Sécurité Sociale dès la prise d'emploi. Pour les indépendants, adhésion volontaire. Compléter par une mutuelle privée vu la couverture limitée du régime public.",
  },
]

export default function GuideRetourPage() {
  return (
    <>
      <JsonLd
        data={howToSchema({
          name: TITLE,
          description: DESCRIPTION,
          path: "/ressources/guides/retour",
          totalTime: "P180D",
          steps: STEPS,
          tool: [
            "Attestation de résidence à l'étranger",
            "Inventaire des biens",
            "Carte grise du véhicule",
            "Acte de naissance",
          ],
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Accueil", path: "/" },
          { name: "Ressources", path: "/ressources" },
          { name: "Guide de retour", path: "/ressources/guides/retour" },
        ])}
      />
      <GuideRetourPageClient />
    </>
  )
}
