import { ComingSoonPage } from "@/components/shared/ComingSoonPage";

export default function ConseillerStatsPage() {
  return (
    <ComingSoonPage
      title="Statistiques personnelles"
      description="Vos KPI : D.E suivis, validations, placements, taux de réussite."
      features={[
        "Tableau de bord mensuel",
        "Comparaison vs antenne et national",
        "Tendance sur 12 mois",
        "Export PDF pour entretien individuel",
      ]}
    />
  );
}
