import { ComingSoonPage } from "@/components/shared/ComingSoonPage";

export default function MentoratPage() {
  return (
    <ComingSoonPage
      title="Mentorat"
      description="Mise en relation avec un mentor PNPE ou partenaire externe."
      features={[
        "Mentor sectoriel selon votre projet",
        "Rendez-vous mensuels de suivi",
        "Mentor disponible aussi via WhatsApp",
        "Réseau d'entrepreneurs gabonais",
      ]}
    />
  );
}
