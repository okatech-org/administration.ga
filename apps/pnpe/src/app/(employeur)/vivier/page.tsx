import { ComingSoonPage } from "@/components/shared/ComingSoonPage";

export default function EmployeurVivierPage() {
  return (
    <ComingSoonPage
      title="Vivier (CVthèque)"
      description="Recherchez dans la base de D.E ayant rendu leur profil visible."
      features={[
        "Filtres par compétences, niveau d'études, expérience, province",
        "Aperçu CV PDF",
        "Sauvegarde de profils favoris",
        "Contact direct via messagerie ou rendez-vous",
      ]}
    />
  );
}
