"use client";

import { AlertCircle, Globe, Mail, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export interface CitizenSummary {
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  nip: string | null;
  nationality: string | null;
  birthDate: number | null;
  countryOfResidence: string | null;
}

export interface CitizenFlags {
  urgentOpenCount: number;
  openRequestsCount: number;
}

function formatDate(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Panneau identité citoyen en en-tête du drawer.
 * Respecte la palette Soft UI (pas de Tailwind raw, tokens uniquement).
 */
export function CitizenContextPanel({
  citizen,
  flags,
}: {
  citizen: CitizenSummary;
  flags: CitizenFlags;
}) {
  const { t } = useTranslation();

  const initials =
    citizen.name
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <div className="flex flex-col gap-4 border-b px-5 pb-4 pt-5">
      {/* Flags d'urgence */}
      {flags.urgentOpenCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
          <span className="text-[11px] font-semibold text-destructive">
            {t("callCenter.drawer.dossiers.openCount", {
              count: flags.urgentOpenCount,
            })}
          </span>
        </div>
      )}

      {/* Identité principale */}
      <div className="flex items-start gap-3">
        <Avatar className="h-14 w-14">
          <AvatarImage src={citizen.avatarUrl ?? undefined} />
          <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold leading-tight">{citizen.name}</p>
          {citizen.nip ? (
            <Badge
              variant="outline"
              className="mt-1 font-mono text-[10px] font-medium"
            >
              {t("callCenter.drawer.citizen.nip")} · {citizen.nip}
            </Badge>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground/70">
              {t("callCenter.drawer.citizen.noIdentity")}
            </p>
          )}
        </div>
      </div>

      {/* Coordonnées */}
      <dl className="grid grid-cols-1 gap-2 text-[12px]">
        {citizen.phone && (
          <InfoRow
            icon={<Phone className="h-3.5 w-3.5" />}
            label={t("callCenter.drawer.citizen.phone")}
            value={citizen.phone}
          />
        )}
        {citizen.email && (
          <InfoRow
            icon={<Mail className="h-3.5 w-3.5" />}
            label={t("callCenter.drawer.citizen.email")}
            value={citizen.email}
          />
        )}
        {citizen.nationality && (
          <InfoRow
            icon={<Globe className="h-3.5 w-3.5" />}
            label={t("callCenter.drawer.citizen.nationality")}
            value={citizen.nationality}
          />
        )}
        {citizen.birthDate && (
          <InfoRow
            icon={null}
            label={t("callCenter.drawer.citizen.birthDate")}
            value={formatDate(citizen.birthDate)}
          />
        )}
      </dl>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      {icon && (
        <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      )}
      <dt className="mt-0.5 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground/70">
        {label}
      </dt>
      <dd className="ml-auto min-w-0 break-all text-right font-medium">
        {value}
      </dd>
    </div>
  );
}
