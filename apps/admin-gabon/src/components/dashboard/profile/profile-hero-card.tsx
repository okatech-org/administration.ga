import { differenceInYears, format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, Mail, MapPin, Phone, Shield } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FlatCard } from "@/components/my-space/flat-card";
import { cn } from "@/lib/utils";

const GENDER_LABELS: Record<string, string> = {
  male: "Homme",
  female: "Femme",
  M: "Homme",
  F: "Femme",
};

const USER_TYPE_LABELS: Record<string, string> = {
  long_stay: "Long sejour",
  short_stay: "Court sejour",
  passing_through: "De passage",
};

export interface ProfileHeroCardProps {
  profile: any;
  user: any;
  identityPhotoUrl?: string | null;
  registrations?: any[];
  completionScore: number;
}

export function ProfileHeroCard({
  profile,
  user,
  identityPhotoUrl,
  registrations = [],
  completionScore,
}: ProfileHeroCardProps) {
  const identity = profile?.identity;
  const contacts = profile?.contacts;
  const addresses = profile?.addresses;
  const passportInfo = profile?.passportInfo;

  const firstName = identity?.firstName ?? "";
  const lastName = identity?.lastName ?? "";
  const initials =
    `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";

  const age = (() => {
    if (!identity?.birthDate) return null;
    try {
      return differenceInYears(new Date(), new Date(identity.birthDate));
    } catch {
      return null;
    }
  })();

  const matricule = registrations?.[0]?.matricule ?? profile?.matricule;

  const passportAlert = (() => {
    if (!passportInfo?.expiryDate) return null;
    const expiry = new Date(passportInfo.expiryDate);
    const now = new Date();
    const daysLeft = Math.ceil(
      (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysLeft < 0)
      return { level: "expired" as const, label: "Expire", daysLeft };
    if (daysLeft < 90)
      return {
        level: "warning" as const,
        label: `Expire dans ${daysLeft}j`,
        daysLeft,
      };
    return null;
  })();

  const completionColor =
    completionScore >= 80
      ? "var(--success)"
      : completionScore >= 50
        ? "var(--warning)"
        : "var(--destructive)";

  return (
    <FlatCard className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <Avatar className="h-20 w-20 border-2 border-card shadow-md">
              <AvatarImage
                src={identityPhotoUrl ?? undefined}
                alt={`${firstName} ${lastName}`}
              />
              <AvatarFallback className="text-xl font-bold bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-bold uppercase text-foreground leading-none truncate">
                {lastName}
              </h2>
              <p className="text-sm font-medium text-muted-foreground capitalize truncate">
                {firstName}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2">
              {identity?.gender && (
                <Badge variant="outline" className="text-xs">
                  {GENDER_LABELS[identity.gender] ?? identity.gender}
                </Badge>
              )}
              {age !== null && (
                <Badge variant="outline" className="text-xs">
                  {age} ans
                </Badge>
              )}
              {profile?.userType && (
                <Badge variant="outline" className="text-xs">
                  {USER_TYPE_LABELS[profile.userType] ?? profile.userType}
                </Badge>
              )}
              {user?.role && user.role !== "citizen" && (
                <Badge
                  variant="outline"
                  className="text-xs bg-primary/10 text-primary border-primary/20"
                >
                  <Shield className="h-2.5 w-2.5 mr-1" />
                  {user.role}
                </Badge>
              )}
            </div>

            {matricule && (
              <p className="text-xs text-muted-foreground mt-2 font-mono">
                Matricule:{" "}
                <span className="font-semibold text-primary">{matricule}</span>
              </p>
            )}

            {/* Barre de completion - plus lisible que l'anneau */}
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${completionScore}%`,
                    backgroundColor: completionColor,
                  }}
                />
              </div>
              <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                {completionScore}%
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-1.5 bg-muted/50 rounded-lg p-2.5 border border-border/50">
          {(contacts?.email || user?.email) && (
            <a
              href={`mailto:${contacts?.email ?? user?.email}`}
              className="flex items-center gap-2 text-xs font-medium hover:text-primary transition-colors"
            >
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{contacts?.email ?? user?.email}</span>
            </a>
          )}
          {contacts?.phone && (
            <a
              href={`tel:${contacts.phone}`}
              className="flex items-center gap-2 text-xs font-medium hover:text-primary transition-colors"
            >
              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate font-semibold">{contacts.phone}</span>
            </a>
          )}
          {addresses?.residence?.city && (
            <div className="flex items-center gap-2 text-xs font-medium">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">
                {[addresses.residence.city, addresses.residence.country]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </div>
          )}
        </div>

        {passportAlert && (
          <div
            className={cn(
              "mt-2 flex items-center gap-2 text-xs font-semibold px-2.5 py-1.5 rounded-lg border",
              passportAlert.level === "expired"
                ? "bg-destructive-light text-destructive border-destructive/20"
                : "bg-warning-light text-warning border-warning/20",
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>
              Passeport : {passportAlert.label}
              {passportInfo?.expiryDate && (
                <>
                  {" "}
                  (
                  {format(new Date(passportInfo.expiryDate), "dd MMM yyyy", {
                    locale: fr,
                  })}
                  )
                </>
              )}
            </span>
          </div>
        )}
      </div>
    </FlatCard>
  );
}
