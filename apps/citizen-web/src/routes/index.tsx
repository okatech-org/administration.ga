import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";

import { Hero } from "../components/home/Hero";
import { ServicesSection } from "../components/home/ServicesSection";
import { GuidesPreviewSection } from "../components/home/GuidesPreviewSection";
import { TestimonialsSection } from "../components/home/TestimonialsSection";
import { NewsSection } from "../components/home/NewsSection";
import { WhySection } from "../components/home/WhySection";

export const Route = createFileRoute("/")({ component: App });

function App() {
  const servicesRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-dvh bg-background">
      {/* Hero Section — mots rotatifs animes */}
      <Hero />

      {/* Services Section — accordion interactif */}
      <div ref={servicesRef}>
        <ServicesSection />
      </div>

      {/* Guides Section — tabs personnalises */}
      <GuidesPreviewSection />

      {/* Testimonials Section — temoignages auto-rotatifs */}
      <TestimonialsSection />

      {/* News Section — actualites */}
      <NewsSection />

      {/* About Section — grille bento + stats KPI */}
      <WhySection />
    </div>
  );
}
