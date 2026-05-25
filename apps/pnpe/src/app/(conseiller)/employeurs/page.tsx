import { ComingSoonPage } from "@/components/shared/ComingSoonPage";

export default function ConseillerEmployeursPage() {
  return (
    <ComingSoonPage
      title="Portefeuille employeurs"
      description="Vue et gestion des employeurs de votre antenne — mini CRM."
      features={[
        "Liste filtrable par secteur, taille, statut vérification",
        "Notes internes et historique d'échanges",
        "Validation DGI/CNSS en attente",
        "Prospection (relance entreprises)",
      ]}
    />
  );
}
