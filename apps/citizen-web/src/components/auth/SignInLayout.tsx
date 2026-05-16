"use client"

import type { ReactNode } from "react"
import { ArrowLeft, CheckCircle2, Shield } from "lucide-react"
import { Logo } from "@/components/Logo"
import { cn } from "@/lib/utils"

type SignInLayoutProps = {
  children: ReactNode
  eyebrow?: ReactNode
  title?: ReactNode
  subtitle?: ReactNode
  onBack?: () => void
  footer?: ReactNode
}

export function SignInLayout({
  children,
  eyebrow,
  title,
  subtitle,
  onBack,
  footer,
}: SignInLayoutProps) {
  return (
    <div className="min-h-dvh bg-background">
      <div className="flex min-h-dvh flex-col">
        <div className="grid flex-1 md:grid-cols-[1.05fr_0.95fr]">
          {/* Aside (desktop only) */}
          <aside
            className="relative hidden flex-col overflow-hidden p-12 text-white md:flex"
            style={{
              background:
                "linear-gradient(155deg, var(--gabon-blue-deep) 0%, var(--gabon-blue-hex) 55%, var(--gabon-green-hex) 130%)",
            }}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-32 -bottom-40 size-[520px] rounded-full bg-[radial-gradient(circle,rgba(241,197,49,0.22),transparent_65%)]"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-32 -left-32 size-[360px] rounded-full bg-[radial-gradient(circle,rgba(10,138,59,0.32),transparent_70%)]"
            />

            <div className="relative [&_small]:!text-white/70 [&_strong]:!text-white">
              <Logo href={null} />
            </div>

            <div className="relative mt-14 max-w-md">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-medium tracking-wider uppercase">
                <Shield className="size-3" /> Espace consulaire sécurisé
              </span>
              <h2 className="mt-5 text-4xl leading-[1.1] font-semibold tracking-tight">
                Votre administration consulaire, à portée de main.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed opacity-80">
                Passeport, actes d'état civil, inscription consulaire,
                légalisation — tous vos services en un seul espace, partout dans
                le monde.
              </p>
            </div>

            <div className="relative mt-auto flex flex-wrap gap-5 pt-8 text-xs opacity-70">
              <span className="flex items-center gap-1.5">
                <Shield className="size-3.5" /> Chiffrement de bout en bout
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5" /> Conforme RGPD
              </span>
            </div>
          </aside>

          {/* Main form panel */}
          <main className="relative flex min-h-dvh flex-col bg-background md:px-14 md:py-10">
            {/* Mobile header (logo + back) — hidden on desktop */}
            <header className="flex items-center justify-between border-b border-border px-6 py-3 md:hidden">
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  aria-label="Retour"
                  className="-ml-2 inline-flex size-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
                >
                  <ArrowLeft className="size-5" />
                </button>
              ) : (
                <Logo />
              )}
            </header>

            {onBack && (
              <div className="mb-6 hidden md:block">
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="size-3.5" /> Retour
                </button>
              </div>
            )}

            <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col px-6 py-6 pt-10 sm:px-10 md:justify-center md:px-0 md:py-0">
              <div className="flex flex-col gap-6">
                {(eyebrow || title || subtitle) && (
                  <header className="flex flex-col gap-3">
                    {eyebrow}
                    {title && (
                      <h1 className="text-[28px] leading-[1.15] font-semibold tracking-tight md:text-[32px]">
                        {title}
                      </h1>
                    )}
                    {subtitle && (
                      <p className="text-[15px] leading-relaxed text-muted-foreground">
                        {subtitle}
                      </p>
                    )}
                  </header>
                )}

                <div className={cn("flex flex-col gap-4")}>{children}</div>
              </div>

              {footer && (
                <div className="mt-auto border-t border-border pt-6 text-sm text-muted-foreground md:mt-8">
                  {footer}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
