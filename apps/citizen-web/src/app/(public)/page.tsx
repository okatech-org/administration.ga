"use client"

import { useRef } from "react"
import { Hero } from "@/components/home/Hero"
import { ServicesSection } from "@/components/home/ServicesSection"
import { NewsSection } from "@/components/home/NewsSection"
import { WhySection } from "@/components/home/WhySection"
import { GuidesPreviewSection } from "@/components/home/GuidesPreviewSection"
import { TestimonialsSection } from "@/components/home/TestimonialsSection"

export default function HomePage() {
  const servicesRef = useRef<HTMLDivElement>(null)

  return (
    <div className="min-h-dvh bg-background">
      {/* Hero Section — mots rotatifs animés */}
      <Hero />

      {/* Services Section — accordion interactif */}
      <div ref={servicesRef}>
        <ServicesSection />
      </div>

      {/* Guides Section — tabs personnalisés */}
      <GuidesPreviewSection />

      {/* Testimonials Section — témoignages auto-rotatifs */}
      <TestimonialsSection />

      {/* News Section — actualités */}
      <NewsSection />

      {/* About Section — grille bento + stats KPI */}
      <WhySection />
    </div>
  )
}

