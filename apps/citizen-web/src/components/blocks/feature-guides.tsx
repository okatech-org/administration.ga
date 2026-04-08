import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Link } from "@tanstack/react-router";
import { Plane, Compass, Globe } from "lucide-react";

interface TabContent {
  badge: string;
  title: string;
  description: string;
  buttonText: string;
  buttonHref: string;
  imageSrc: string;
  imageAlt: string;
}

interface Tab {
  value: string;
  icon: React.ReactNode;
  label: string;
  content: TabContent;
}

interface FeatureGuidesProps {
  badge?: string;
  heading?: string;
  description?: string;
  tabs?: Tab[];
}

export const FeatureGuides = ({
  badge = "Démarches & Informations",
  heading = "Vos Guides Personnalisés",
  description = "Retrouvez toutes les informations essentielles pour vos démarches consulaires, votre installation, et votre retour au pays.",
  tabs = [
    {
      value: "arrival",
      icon: <Plane className="h-auto w-4 shrink-0" />,
      label: "Arrivée & Intégration",
      content: {
        badge: "Nouveaux arrivants",
        title: "Préparez votre voyage et installation.",
        description: "Visas, inscription consulaire, et premiers pas dans votre nouveau pays de résidence.",
        buttonText: "Consulter le Guide d'Arrivée",
        buttonHref: "/ressources/guides/arrivee",
        imageSrc: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1200&auto=format&fit=crop",
        imageAlt: "Aéroport et voyage",
      },
    },
    {
      value: "practical",
      icon: <Compass className="h-auto w-4 shrink-0" />,
      label: "Vie Pratique",
      content: {
        badge: "Info au quotidien",
        title: "Tout savoir sur la vie sur place.",
        description: "Logement, santé, éducation, emploi et droits au quotidien dans votre juridiction.",
        buttonText: "Lire le Guide Pratique",
        buttonHref: "/ressources/guides/vie-pratique",
        imageSrc: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200&auto=format&fit=crop",
        imageAlt: "Bureau moderne, vie pratique",
      },
    },
    {
      value: "return",
      icon: <Globe className="h-auto w-4 shrink-0" />,
      label: "Retour au Gabon",
      content: {
        badge: "Rapatriement & Retour",
        title: "Sécurisez votre réinstallation.",
        description: "Préparer son retour: démarches douanières, déménagement, réinstallation au Gabon en toute sérénité.",
        buttonText: "Découvrir le Guide de Retour",
        buttonHref: "/ressources/guides/retour",
        imageSrc: "https://images.unsplash.com/photo-1547471080-7fc2caa62636?q=80&w=1200&auto=format&fit=crop",
        imageAlt: "Paysage Gabon",
      },
    },
  ],
}: FeatureGuidesProps) => {
  return (
    <section className="py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <Badge variant="outline" className="bg-background">{badge}</Badge>
          <h2 className="max-w-2xl text-3xl font-semibold md:text-4xl text-foreground">
            {heading}
          </h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Tabs defaultValue={tabs[0].value} className="mt-8">
          <TabsList className="min-h-12 h-auto flex flex-col items-center justify-center gap-2 sm:flex-row md:gap-6 mx-auto w-fit bg-transparent">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-muted-foreground data-[state=active]:bg-primary/5 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 shadow-none data-[state=active]:shadow-sm transition-all"
              >
                {tab.icon} {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="mx-auto mt-8 max-w-7xl rounded-[10px] bg-muted/20 border border-border/50 p-6 lg:p-12">
            {tabs.map((tab) => (
              <TabsContent
                key={tab.value}
                value={tab.value}
                className="grid place-items-center gap-12 lg:grid-cols-2 lg:gap-10 mt-0 focus-visible:outline-none"
              >
                <div className="flex flex-col gap-6 w-full max-w-lg mx-auto">
                  <Badge variant="outline" className="w-fit bg-background text-primary border-primary/20">
                    {tab.content.badge}
                  </Badge>
                  <h3 className="text-3xl font-semibold lg:text-4xl text-foreground leading-tight!">
                    {tab.content.title}
                  </h3>
                  <p className="text-muted-foreground lg:text-lg">
                    {tab.content.description}
                  </p>
                  <Button asChild className="mt-4 w-fit h-12 px-8 rounded-full shadow-sm hover:shadow-md transition-all gap-2" size="lg">
                    <Link to={tab.content.buttonHref}>
                        {tab.content.buttonText}
                    </Link>
                  </Button>
                </div>
                <div className="relative w-full aspect-4/3 rounded-[10px] overflow-hidden shadow-lg border border-border/50">
                  <img
                    src={tab.content.imageSrc}
                    alt={tab.content.imageAlt}
                    className="absolute inset-0 object-cover w-full h-full transition-transform duration-700 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-linear-to-tr from-black/20 to-transparent mix-blend-overlay pointer-events-none" />
                </div>
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </section>
  );
};
