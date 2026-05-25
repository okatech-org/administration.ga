import { ComingSoonPage } from "@/components/shared/ComingSoonPage";

export default function DemandeurMessagesPage() {
  return (
    <ComingSoonPage
      title="Messages"
      description="iBoîte spécialisée pour échanger avec votre conseiller PNPE et les employeurs."
      features={[
        "Conversations avec conseiller PNPE de votre antenne",
        "Échanges avec employeurs lors d'une candidature",
        "Pièces jointes (CV, lettre, attestations)",
        "Notifications push + email",
      ]}
    />
  );
}
