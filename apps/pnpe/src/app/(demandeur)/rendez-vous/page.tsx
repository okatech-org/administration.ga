import { ComingSoonPage } from "@/components/shared/ComingSoonPage";

export default function DemandeurRdvPage() {
  return (
    <ComingSoonPage
      title="Mes rendez-vous"
      description="Réservez un rendez-vous avec votre conseiller PNPE ou un employeur."
      features={[
        "Calendrier des disponibilités du conseiller",
        "Rendez-vous en présentiel (antenne) ou en ligne (LiveKit)",
        "Rappels SMS + WhatsApp",
        "Annulation et report",
      ]}
    />
  );
}
