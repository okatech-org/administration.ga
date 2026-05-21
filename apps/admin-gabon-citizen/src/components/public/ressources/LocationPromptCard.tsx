"use client"

import { MapPin, Crosshair, ChevronDown } from "lucide-react"
import { useLocationContext } from "@/contexts/LocationContext"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FlagIcon } from "@/components/ui/flag-icon"
import { getCountryName } from "@/lib/country-utils"

/**
 * Variante "marketing" de LocationBanner — invite l'usager à personnaliser
 * ses guides selon son pays de résidence. Réutilise LocationContext.
 */
export function LocationPromptCard() {
  const { country, countryName, availableCountries, setJurisdiction } =
    useLocationContext()

  const detectAuto = () => {
    setJurisdiction(null)
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
      <div className="flex flex-wrap items-center justify-between gap-6 rounded-xl border border-border bg-card px-6 py-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div
            aria-hidden
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"
          >
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              {country
                ? `Guides adaptés à ${countryName}.`
                : "Personnalisez vos guides selon votre pays de résidence."}
            </h3>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Nous adaptons les démarches, contacts et délais à votre
              représentation consulaire de rattachement.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-muted px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-card"
              >
                {country ? (
                  <>
                    <FlagIcon
                      countryCode={country}
                      size={14}
                      className="w-3.5 h-auto rounded-sm"
                    />
                    {countryName}
                  </>
                ) : (
                  <>
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    Choisir un pays
                  </>
                )}
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px]">
              {availableCountries.map((code) => (
                <DropdownMenuItem
                  key={code}
                  onClick={() => setJurisdiction(code)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <FlagIcon
                    countryCode={code}
                    size={16}
                    className="w-4 h-auto rounded-sm"
                  />
                  <span>{getCountryName(code)}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={detectAuto}
            size="sm"
            className="rounded-full gap-1.5"
          >
            <Crosshair className="h-3.5 w-3.5" />
            Détecter
          </Button>
        </div>
      </div>
    </section>
  )
}
