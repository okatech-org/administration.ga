import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useRef } from "react";

import { Hero } from "../components/home/Hero";
import { ProfilesSection } from "../components/home/ProfilesSection";
import { ServicesSection } from "../components/home/ServicesSection";
import { NewsSection } from "../components/home/NewsSection";
import { WhySection } from "../components/home/WhySection";
import { CTASection } from "../components/home/CTASection";

const WorldMapSection = lazy(() =>
  import("../components/home/WorldMapSection").then((m) => ({
    default: m.WorldMapSection,
  })),
);

export const Route = createFileRoute("/")({ component: App });

function App() {
  const servicesRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-dvh bg-background">
      {/* Hero Section */}
      <Hero />

      {/* User Profiles Section */}
      <ProfilesSection />

      {/* Services Section */}
      <div ref={servicesRef}>
        <ServicesSection />
      </div>

      {/* News Section */}
      <NewsSection />

      {/* Map Section */}
      <Suspense fallback={<div className="h-[500px]" />}>
        <WorldMapSection />
      </Suspense>

      {/* Why Section */}
      <WhySection />

      {/* CTA Section */}
      <CTASection />

      {/* Footer */}
    </div>
  );
}
