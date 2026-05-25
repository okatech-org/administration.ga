import { ComingSoonPage } from "@/components/shared/ComingSoonPage";

export default function DemandeurFormationPage() {
  return (
    <ComingSoonPage
      title="Formations"
      description="Catalogue de formations professionnelles partenaires (Ediandza et autres)."
      features={[
        "Recherche par secteur, niveau, durée",
        "Inscription en ligne",
        "Attestations dans votre profil",
        "Suivi de progression",
      ]}
    />
  );
}
