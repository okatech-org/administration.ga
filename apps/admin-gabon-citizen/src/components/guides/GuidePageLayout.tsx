import { api } from "@convex/_generated/api";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocationContext } from "@/contexts/LocationContext";
import { useConvexQuery } from "@/integrations/convex/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GuideSectionCard } from "./GuideSectionCard";
import { LocationBanner } from "./LocationBanner";
import { SectionNav } from "./SectionNav";
import {
  SavoirVivreGrid,
  ErreursCourantesGrid,
  NumerosUtilesGrid,
} from "./SharedSections";
import { resolveLucideIcon } from "./resolveLucideIcon";
import type { GuideSection } from "./guide.types";

type GuideType = "arrival" | "practical" | "return";

interface GuidePageLayoutProps {
  type: GuideType;
}

const GUIDE_META: Record<
  GuideType,
  { badgeKey: string; titleKey: string; subtitleKey: string; defaultBadge: string; defaultTitle: string; defaultSubtitle: string }
> = {
  arrival: {
    badgeKey: "guides.arrival.badge",
    titleKey: "guides.arrival.title",
    subtitleKey: "guides.arrival.subtitle",
    defaultBadge: "Guide d'arrivee",
    defaultTitle: "S'installer a l'etranger",
    defaultSubtitle: "Tout ce que vous devez savoir pour bien vous installer dans votre pays de residence.",
  },
  practical: {
    badgeKey: "guides.practical.badge",
    titleKey: "guides.practical.title",
    subtitleKey: "guides.practical.subtitle",
    defaultBadge: "Guide pratique",
    defaultTitle: "Vivre a l'etranger",
    defaultSubtitle: "Logement, sante, education, emploi et droits : les informations essentielles du quotidien.",
  },
  return: {
    badgeKey: "guides.return.badge",
    titleKey: "guides.return.title",
    subtitleKey: "guides.return.subtitle",
    defaultBadge: "Guide de retour",
    defaultTitle: "Retour au Gabon",
    defaultSubtitle: "Preparez votre retour : demenagement, formalites, reinstallation et aides disponibles.",
  },
};

export function GuidePageLayout({ type }: GuidePageLayoutProps) {
  const { t, i18n } = useTranslation();
  const { country, isLoading: locationLoading } = useLocationContext();
  const meta = GUIDE_META[type];

  // Charger le guide pour le type + pays (toujours WORLD en fallback)
  const effectiveCountry = country ?? "WORLD";
  const { data: guide, isLoading: guideLoading, isFetched } = useConvexQuery(
    api.functions.guides.getByTypeAndCountry,
    { type, countryCode: effectiveCountry },
  );

  // Convertir les sections Convex en GuideSection (avec icones resolues)
  const sections: GuideSection[] = useMemo(() => {
    if (!guide?.sections) return [];
    return guide.sections.map((s) => ({
      ...s,
      icon: resolveLucideIcon(s.iconName),
    }));
  }, [guide]);

  // Section active pour la SectionNav
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    if (sections.length > 0 && !activeSection) {
      setActiveSection(sections[0].id);
    }
  }, [sections, activeSection]);

  const handleSelectSection = useCallback((id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Titre dynamique avec le nom du pays
  const lang = i18n.language.startsWith("en") ? "en" : "fr";
  const title = guide?.title?.[lang] ?? t(meta.titleKey, meta.defaultTitle);
  const subtitle = guide?.subtitle?.[lang] ?? t(meta.subtitleKey, meta.defaultSubtitle);

  // On ne bloque pas sur locationLoading — le guide WORLD sert de fallback
  const isLoading = guideLoading && !isFetched;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-background py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/ressources"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("guides.backToRessources")}
          </Link>

          <div className="text-center">
            <Badge
              variant="secondary"
              className="mb-4 bg-primary/10 text-primary"
            >
              {t(meta.badgeKey, meta.defaultBadge)}
            </Badge>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">
              {title}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* Location Banner */}
      <section className="container mx-auto px-4 mb-8">
        <LocationBanner />
      </section>

      {/* Content */}
      {isLoading ? (
        <div className="container mx-auto px-4 py-8 space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-[10px] border border-border bg-card p-8 space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="space-y-3 pt-4">
                <Skeleton className="h-12 w-full rounded-[10px]" />
                <Skeleton className="h-12 w-full rounded-[10px]" />
                <Skeleton className="h-12 w-full rounded-[10px]" />
              </div>
            </div>
          ))}
        </div>
      ) : !guide ? (
        <div className="container mx-auto px-4 py-20 text-center">
          <BookOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {t("guides.notAvailable")}
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {t("guides.notAvailableDesc")}
          </p>
          <Button asChild className="mt-6">
            <Link href="/ressources">{t("guides.seeRessources")}</Link>
          </Button>
        </div>
      ) : (
        <section className="container mx-auto px-4 py-8">
          <div className="flex gap-8">
            {/* Sidebar Navigation (desktop) */}
            {sections.length > 1 && (
              <div className="hidden lg:block w-64 shrink-0">
                <SectionNav
                  sections={sections}
                  activeSection={activeSection}
                  onSelect={handleSelectSection}
                />
              </div>
            )}

            {/* Main Content */}
            <div className="flex-1 space-y-8 min-w-0">
              {sections.map((section) => (
                <GuideSectionCard key={section.id} section={section} />
              ))}

              {/* Sections speciales */}
              {guide.savoirVivre && guide.savoirVivre.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-foreground">
                    {t("guides.savoirVivre")}
                  </h2>
                  <SavoirVivreGrid items={guide.savoirVivre} />
                </div>
              )}

              {guide.erreurs && guide.erreurs.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-foreground">
                    {t("guides.commonMistakes")}
                  </h2>
                  <ErreursCourantesGrid items={guide.erreurs} />
                </div>
              )}

              {guide.numeros && guide.numeros.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-foreground">
                    {t("guides.usefulNumbers")}
                  </h2>
                  <NumerosUtilesGrid items={guide.numeros} />
                </div>
              )}

              {/* CTA retour */}
              <div className="text-center pt-8 pb-4">
                <Button asChild variant="outline" size="lg" className="gap-2">
                  <Link href="/ressources">
                    {t("guides.seeAllGuides")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
