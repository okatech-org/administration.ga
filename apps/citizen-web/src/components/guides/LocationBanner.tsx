import { ExternalLink, MapPin, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocationContext } from "@/contexts/LocationContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FlagIcon } from "@/components/ui/flag-icon";
import { getCountryName } from "@/lib/country-utils";
import { Skeleton } from "@/components/ui/skeleton";

interface LocationBannerProps {
  /** Mode compact pour la home page (pas de bouton site dedie) */
  compact?: boolean;
}

/** Timeout apres lequel on abandonne le loading et on affiche l'etat "non detecte" */
const LOADING_TIMEOUT_MS = 3000;

export function LocationBanner({ compact = false }: LocationBannerProps) {
  const { t } = useTranslation();
  const {
    country,
    countryName,
    org,
    orgWebsite,
    isManualOverride,
    isLoading,
    setJurisdiction,
    availableCountries,
  } = useLocationContext();

  // Timeout : apres 3s de loading, on passe a l'etat "non detecte"
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setTimedOut(true), LOADING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const showLoading = isLoading && !timedOut;

  if (showLoading) {
    return (
      <div className="rounded-[10px] bg-card border border-border p-4 flex items-center gap-4">
        <Skeleton className="h-6 w-6 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    );
  }

  if (!country) {
    return (
      <div className="rounded-[10px] bg-card border border-border p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-muted">
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          {t("guides.locationUnknown")}
        </p>
        <CountryDropdown
          availableCountries={availableCountries}
          onSelect={setJurisdiction}
        />
      </div>
    );
  }

  return (
    <div className="rounded-[10px] bg-card border border-border p-4 flex flex-wrap items-center justify-between gap-3">
      {/* Gauche : Drapeau + infos */}
      <div className="flex items-center gap-3">
        <FlagIcon
          countryCode={country}
          size={24}
          className="w-6 h-auto rounded-sm shadow-sm"
        />
        <div>
          <p className="text-sm font-semibold text-foreground">
            {t("guides.infoFor")} {countryName}
          </p>
          <p className="text-xs text-muted-foreground">
            {org?.name ?? t("guides.autoDetected")}
          </p>
        </div>
        <Badge variant="outline" className="text-xs hidden sm:inline-flex">
          {isManualOverride
            ? t("guides.manualSelection")
            : t("guides.autoDetectedBadge")}
        </Badge>
      </div>

      {/* Droite : Actions */}
      <div className="flex items-center gap-2">
        {isManualOverride && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setJurisdiction(null)}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t("guides.reset")}
          </Button>
        )}
        <CountryDropdown
          availableCountries={availableCountries}
          onSelect={setJurisdiction}
        />
        {!compact && orgWebsite && (
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
            <a href={orgWebsite} target="_blank" rel="noopener noreferrer">
              {t("guides.dedicatedSite")}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

function CountryDropdown({
  availableCountries,
  onSelect,
}: {
  availableCountries: string[];
  onSelect: (code: string) => void;
}) {
  const { t } = useTranslation();

  if (availableCountries.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {t("guides.changeCountry")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {availableCountries.map((code) => (
          <DropdownMenuItem
            key={code}
            onClick={() => onSelect(code)}
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
  );
}
