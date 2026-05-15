import Link from "next/link"
import { ArrowRight } from "lucide-react"

interface SectionHeadingProps {
  title: string
  titleAccent?: string
  lede?: string
  /** Lien "voir tout" à droite */
  allHref?: string
  allLabel?: string
}

export function SectionHeading({
  title,
  titleAccent,
  lede,
  allHref,
  allLabel = "Voir tout",
}: SectionHeadingProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-6">
      <div>
        <h2 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground">
          {title}
          {titleAccent ? (
            <>
              {" "}
              <span className="text-primary">{titleAccent}</span>
            </>
          ) : null}
        </h2>
        {lede ? (
          <p className="mt-2 max-w-[580px] text-[15px] leading-[1.5] text-muted-foreground">
            {lede}
          </p>
        ) : null}
      </div>
      {allHref ? (
        <Link
          href={allHref}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary"
        >
          {allLabel} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  )
}
