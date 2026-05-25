import { ComingSoonPage } from "@/components/shared/ComingSoonPage";

export default function FinancementPage() {
  return (
    <ComingSoonPage
      title="Financement"
      description="Passerelle vers ANPI-Gabon pour la formalisation et accès aux financements."
      features={[
        "Création de dossier ANPI-Gabon pré-rempli",
        "Liste des partenaires financiers (banques, microcrédit)",
        "Suivi de la demande",
        "Aides publiques et dispositifs d'État",
      ]}
    />
  );
}
