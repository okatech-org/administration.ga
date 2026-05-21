import { GabonStripe } from "./GabonStripe"

interface PublicHeroProps {
  kicker: string
  title: string
  titleAccent?: string
  lede: string
  children?: React.ReactNode
}

/**
 * Hero clair des pages publiques (Slate Trust v3, oklch warm-gray)
 * Pattern : gabon-stripe + kicker + H1 (avec accent primary) + lede + slot (search, tags, stats)
 */
export function PublicHero({
  kicker,
  title,
  titleAccent,
  lede,
  children,
}: PublicHeroProps) {
  return (
    <section className="py-14 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <GabonStripe />
        <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1.5 text-[13px] font-medium tracking-tight text-primary">
          {kicker}
        </span>
        <h1 className="mt-4 max-w-[18ch] text-[clamp(40px,5.2vw,64px)] font-semibold leading-[1.05] tracking-[-0.025em] text-foreground">
          {title}
          {titleAccent ? (
            <>
              {" "}
              <span className="text-primary">{titleAccent}</span>
            </>
          ) : null}
        </h1>
        <p className="mt-4 max-w-[640px] text-[17px] leading-[1.55] text-muted-foreground">
          {lede}
        </p>
        {children}
      </div>
    </section>
  )
}
