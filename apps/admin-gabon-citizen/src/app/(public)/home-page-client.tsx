"use client"

import { useRef } from "react"
import { Hero } from "@/components/home/Hero"
import { ProfilesSection } from "@/components/home/ProfilesSection"
import { ServicesSection } from "@/components/home/ServicesSection"
import { NewsSection } from "@/components/home/NewsSection"
import { WhySection } from "@/components/home/WhySection"
import { CTASection } from "@/components/home/CTASection"

// NOTE: WorldMapSection retirée — affichait la carte mondiale des
// représentations diplomatiques (héritage gabon-diplomatie). Non pertinent
// pour administration.ga qui couvre le territoire national. À remplacer
// ultérieurement par une carte des administrations provinciales si besoin.

export default function HomePage() {
  const servicesRef = useRef<HTMLDivElement>(null)

  return (
    <div className="min-h-dvh bg-background">
      <Hero />
      <ProfilesSection />
      <div ref={servicesRef}>
        <ServicesSection />
      </div>
      <NewsSection />
      <WhySection />
      <CTASection />
    </div>
  )
}
