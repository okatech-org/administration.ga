import { ComingSoonPage } from "@/components/shared/ComingSoonPage";

export default function SuiviPostLancementPage() {
  return (
    <ComingSoonPage
      title="Suivi post-installation"
      description="Tableau de bord post-lancement avec votre conseiller PNPE."
      features={[
        "Indicateurs business (CA, clients, marges)",
        "Visites mensuelles du conseiller",
        "Alertes en cas de difficultés",
        "Réorientation salariée si besoin",
      ]}
    />
  );
}
