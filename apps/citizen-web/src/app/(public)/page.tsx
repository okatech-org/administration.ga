"use client"

import dynamic from "next/dynamic"
import { Suspense, useRef } from "react"
import { Hero } from "@/components/home/Hero"
import { ProfilesSection } from "@/components/home/ProfilesSection"
import { ServicesSection } from "@/components/home/ServicesSection"
import { NewsSection } from "@/components/home/NewsSection"
import { WhySection } from "@/components/home/WhySection"
import { CTASection } from "@/components/home/CTASection"

const WorldMapSection = dynamic(
  () =>
    import("@/components/home/WorldMapSection").then((m) => ({
      default: m.WorldMapSection,
    })),
  { ssr: false },
)

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
      <Suspense fallback={<div className="h-[500px]" />}>
        <WorldMapSection />
      </Suspense>
      <WhySection />
      <CTASection />
    </div>
  )
}
