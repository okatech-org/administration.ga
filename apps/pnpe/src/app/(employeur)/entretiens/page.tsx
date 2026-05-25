import { ComingSoonPage } from "@/components/shared/ComingSoonPage";

export default function EmployeurEntretiensPage() {
  return (
    <ComingSoonPage
      title="Entretiens"
      description="Agenda des entretiens avec les candidats — présentiel ou visio LiveKit."
      features={[
        "Planification automatique selon disponibilités",
        "Visio LiveKit avec partage d'écran et chat",
        "PV d'entretien à rédiger après séance",
        "Décision : préselection / retenu / non retenu",
      ]}
    />
  );
}
