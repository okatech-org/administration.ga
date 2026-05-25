import { ComingSoonPage } from "@/components/shared/ComingSoonPage";

export default function ConseillerRdvPage() {
  return (
    <ComingSoonPage
      title="Mes rendez-vous"
      description="Agenda des RDV D.E et entretiens employeurs."
      features={[
        "Vue jour / semaine / mois",
        "Filtres par type (D.E, employeur, partenaire)",
        "Lien LiveKit direct pour les visios",
        "Notes et bilan d'entretien",
      ]}
    />
  );
}
