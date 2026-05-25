import { ComingSoonPage } from "@/components/shared/ComingSoonPage";

export default function ProspectionPage() {
  return (
    <ComingSoonPage
      title="Prospection"
      description="Suivi des contacts entreprises et nouveaux prospects employeurs."
      features={[
        "Pipeline de prospects par étape",
        "Tâches et relances programmées",
        "Lien WhatsApp/téléphone direct",
        "Historique des échanges",
      ]}
    />
  );
}
