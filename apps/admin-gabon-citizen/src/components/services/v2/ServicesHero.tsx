import { useTranslation } from "react-i18next"

type Stat = {
  value: string
  unit?: string
  label: string
}

export function ServicesHero({
  total,
  onlineCount,
  avgDays,
  timeSavedHoursPerOnlineRequest,
}: {
  total: number
  onlineCount: number
  avgDays: number
  timeSavedHoursPerOnlineRequest: number
}) {
  const { t } = useTranslation()

  const stats: Stat[] = [
    {
      value: String(total),
      unit: t("services.hero.statServicesUnit", "services"),
      label: t(
        "services.hero.statServicesLabel",
        "Démarches officielles disponibles dans le réseau des administrations.",
      ),
    },
    {
      value: String(onlineCount),
      label: t(
        "services.hero.statOnlineLabel",
        "Réalisables intégralement en ligne, depuis votre espace personnel.",
      ),
    },
    {
      value: `${avgDays}j`,
      unit: t("services.hero.statAvgUnit", "moy."),
      label: t(
        "services.hero.statAvgLabel",
        "Délai moyen de traitement, hors procédures spécifiques.",
      ),
    },
    {
      value: `~${timeSavedHoursPerOnlineRequest}h`,
      unit: t("services.hero.statTimeSavedUnit", "/ démarche"),
      label: t(
        "services.hero.statTimeSavedLabel",
        "Temps gagné en moyenne pour une démarche en ligne.",
      ),
    },
  ]

  return (
    <section className="border-b border-[var(--pub-border)] pt-10 pb-10 md:py-[64px] md:pb-12">
      <div className="mx-auto max-w-[1280px] px-5 md:px-8">
        <div className="grid items-end gap-12 md:grid-cols-[1.3fr_1fr]">
          <div>
            <span className="inline-block text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--pub-text-muted)]">
              {t("services.hero.kicker", "Nos services")}
            </span>
            <h1 className="mt-5 font-semibold leading-[1.02] tracking-[-0.025em] text-[var(--pub-text)] text-[clamp(44px,5.4vw,68px)]">
              {t("services.hero.titlePart1", "Toutes vos démarches")}
              <br />
              <em className="not-italic text-[var(--pub-gabon-blue)]">
                {t("services.hero.titleEm", "administratifs")}
              </em>{" "}
              {t("services.hero.titlePart2", "en un seul endroit.")}
            </h1>
            <p className="mt-6 max-w-[540px] text-[18px] leading-[1.55] text-[var(--pub-text-muted)]">
              {t(
                "services.hero.lede",
                "L'ensemble des démarches administratives proposées par les administrations de la République Gabonaise — disponibles en ligne, sur place, ou en circuit accéléré.",
              )}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-6">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-[12px] border border-[var(--pub-border)] bg-[var(--pub-surface)] px-3.5 py-3 sm:rounded-[14px] sm:px-6 sm:py-5"
              >
                <div className="flex items-baseline gap-1 text-[22px] font-semibold leading-none tracking-[-0.02em] text-[var(--pub-text)] sm:text-[32px]">
                  {s.value}
                  {s.unit && (
                    <small className="text-[12px] font-medium text-[var(--pub-text-muted)] sm:text-[14px]">
                      {s.unit}
                    </small>
                  )}
                </div>
                <div className="mt-1.5 text-[12px] leading-[1.35] text-[var(--pub-text-muted)] sm:mt-2.5 sm:text-[13px] sm:leading-[1.4]">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
