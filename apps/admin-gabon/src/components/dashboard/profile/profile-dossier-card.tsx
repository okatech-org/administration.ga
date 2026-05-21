import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Briefcase,
  FileBadge2,
  FileText,
  MapPin,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { FlatCard } from "@/components/my-space/flat-card";
import { cn } from "@/lib/utils";

const COUNTRY_LABELS: Record<string, string> = {
  GA: "Gabon",
  FR: "France",
  CM: "Cameroun",
  CG: "Congo",
  CD: "RD Congo",
  SN: "Senegal",
  CI: "Cote d'Ivoire",
  MA: "Maroc",
  BE: "Belgique",
  CH: "Suisse",
  CA: "Canada",
  US: "Etats-Unis",
};
const MARITAL_LABELS: Record<string, string> = {
  single: "Celibataire",
  married: "Marie(e)",
  divorced: "Divorce(e)",
  widowed: "Veuf/Veuve",
  pacs: "Pacse(e)",
};
const PROFESSION_LABELS: Record<string, string> = {
  employed: "Salarie(e)",
  self_employed: "Independant(e)",
  unemployed: "Sans emploi",
  student: "Etudiant(e)",
  retired: "Retraite(e)",
};

function lbl(map: Record<string, string>, code?: string) {
  return code ? (map[code] ?? code) : undefined;
}

function fmtDate(ts?: number) {
  if (!ts) return "\u2014";
  return format(new Date(ts), "dd MMM yyyy", { locale: fr });
}

export interface ProfileDossierCardProps {
  profile: any;
}

function InfoRow({
  label,
  value,
  className,
}: {
  label: string;
  value?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col overflow-hidden", className)}>
      <span className="text-xs text-muted-foreground uppercase font-semibold leading-none tracking-wider mb-1">
        {label}
      </span>
      {typeof value === "string" ? (
        <span
          className="text-sm font-semibold leading-tight truncate text-foreground"
          title={value || ""}
        >
          {value || "\u2014"}
        </span>
      ) : value ? (
        <div className="text-sm font-semibold leading-tight text-foreground">
          {value}
        </div>
      ) : (
        <span className="text-sm font-semibold leading-tight text-foreground">
          {"\u2014"}
        </span>
      )}
    </div>
  );
}

export function ProfileDossierCard({ profile }: ProfileDossierCardProps) {
  const identity = profile?.identity;
  const contacts = profile?.contacts;
  const addresses = profile?.addresses;
  const passportInfo = profile?.passportInfo;
  const family = profile?.family;
  const profession = profile?.profession;

  const passportExpired = (() => {
    if (!passportInfo?.expiryDate) return false;
    return new Date(passportInfo.expiryDate) < new Date();
  })();

  const passportWarning = (() => {
    if (!passportInfo?.expiryDate || passportExpired) return false;
    const daysLeft = Math.ceil(
      (new Date(passportInfo.expiryDate).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24),
    );
    return daysLeft < 90;
  })();

  const emergency = contacts?.emergencyResidence ?? contacts?.emergencyHomeland;
  const emergencyIsInResidence = !!contacts?.emergencyResidence;

  return (
    <FlatCard>
      <div className="pb-0 pt-3 px-4">
        <div className="text-sm font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <FileBadge2 className="w-3.5 h-3.5 text-primary" />
          </div>
          Dossier Citoyen
        </div>
      </div>

      <div className="p-3 pt-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
          {/* Identite */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase border-b border-border pb-1 flex items-center gap-1.5">
              <FileBadge2 className="w-3 h-3 text-primary" /> Identite
            </p>
            <div className="grid grid-cols-2 gap-2">
              <InfoRow label="Lieu naiss." value={identity?.birthPlace} />
              <InfoRow label="Date naiss." value={fmtDate(identity?.birthDate)} />
              <InfoRow
                label="Pays naiss."
                value={lbl(COUNTRY_LABELS, identity?.birthCountry)}
              />
              <InfoRow
                label="Nationalite"
                value={lbl(COUNTRY_LABELS, identity?.nationality)}
              />
              <InfoRow label="NIP" value={identity?.nip} className="col-span-2" />
            </div>
          </div>

          {/* Contact & Adresse */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase border-b border-border pb-1 flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-primary" /> Contact
            </p>
            <div className="grid grid-cols-1 gap-2">
              <InfoRow
                label="Residence Actuelle"
                value={
                  addresses?.residence ? (
                    <div className="flex flex-col gap-0.5">
                      {addresses.residence.street && (
                        <span className="truncate">
                          {addresses.residence.street}
                        </span>
                      )}
                      <span className="truncate">
                        {[addresses.residence.postalCode, addresses.residence.city]
                          .filter(Boolean)
                          .join(" ")}
                      </span>
                      <span className="truncate">
                        {lbl(COUNTRY_LABELS, addresses.residence.country)}
                      </span>
                    </div>
                  ) : undefined
                }
              />
              <InfoRow
                label="Pays d'origine"
                value={
                  addresses?.homeland
                    ? [
                        addresses.homeland.city,
                        lbl(COUNTRY_LABELS, addresses.homeland.country),
                      ]
                        .filter(Boolean)
                        .join(", ")
                    : undefined
                }
              />
            </div>
          </div>

          {/* Passeport & Famille */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase border-b border-border pb-1 flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-primary" /> Passeport & Famille
            </p>
            <div className="grid grid-cols-2 gap-2">
              <InfoRow label="N. Passeport" value={passportInfo?.number} />
              <InfoRow
                label="Expiration"
                value={
                  passportInfo?.expiryDate ? (
                    <span
                      className={cn(
                        passportExpired && "text-destructive",
                        passportWarning && "text-warning",
                      )}
                    >
                      {fmtDate(passportInfo.expiryDate)}
                      {passportExpired && (
                        <Badge
                          variant="destructive"
                          className="ml-1 text-xs"
                        >
                          Expire
                        </Badge>
                      )}
                      {passportWarning && !passportExpired && (
                        <Badge
                          variant="outline"
                          className="ml-1 text-xs bg-warning-light text-warning border-warning/20"
                        >
                          Bientot
                        </Badge>
                      )}
                    </span>
                  ) : undefined
                }
              />
              <InfoRow
                label="Situation"
                value={lbl(MARITAL_LABELS, family?.maritalStatus)}
              />
              <InfoRow
                label="Conjoint(e)"
                value={
                  [family?.spouse?.firstName, family?.spouse?.lastName]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
              />
              <InfoRow
                label="Pere"
                value={
                  [family?.father?.firstName, family?.father?.lastName]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
              />
              <InfoRow
                label="Mere"
                value={
                  [family?.mother?.firstName, family?.mother?.lastName]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
              />
            </div>
          </div>

          {/* Profession & Contact Urgence */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase border-b border-border pb-1 flex items-center gap-1.5">
              <Briefcase className="w-3 h-3 text-primary" /> Profession
            </p>
            <div className="grid grid-cols-2 gap-2">
              <InfoRow
                label="Statut Pro."
                value={lbl(PROFESSION_LABELS, profession?.status)}
              />
              <InfoRow label="Profession" value={profession?.title} />
            </div>

            {emergency && (
              <div className="mt-2 p-2 rounded-lg bg-destructive-light border border-destructive/20">
                <p className="text-xs font-semibold text-destructive uppercase mb-1 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  Contact Urgence
                  {emergencyIsInResidence && (
                    <Badge variant="destructive" className="text-xs ml-1">
                      Pays residence
                    </Badge>
                  )}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium truncate">
                    {emergency.firstName} {emergency.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {emergency.phone}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </FlatCard>
  );
}
