import { differenceInYears, format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertTriangle,
  Mail,
  MapPin,
  Phone,
  Shield,
} from "lucide-react";

import { FlatCard } from "@/components/design-system/flat-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Constantes de labellisation ──────────────────────────────
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

// ─── Props ────────────────────────────────────────────────────
export interface ProfileHeroCardProps {
  profile: any;
  user: any;
  identityPhotoUrl?: string | null;
  registrations?: any[];
  completionScore: number;
}

/**
 * Carte Hero du profil citoyen : photo, identite, badges, contact, completion ring.
 * Adaptee du pattern iProfil citizen-web pour le contexte backoffice.
 */
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
  const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";

  // Calcul de l'age
  const age = (() => {
    if (!identity?.birthDate) return null;
    try {
      return differenceInYears(new Date(), new Date(identity.birthDate));
    } catch {
      return null;
    }
  })();

  // Matricule depuis la premiere inscription
  const matricule = registrations?.[0]?.matricule ?? profile?.matricule;

  // Alerte expiration passeport
  const passportAlert = (() => {
    if (!passportInfo?.expiryDate) return null;
    const expiry = new Date(passportInfo.expiryDate);
    const now = new Date();
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { level: "expired" as const, label: "Expire", daysLeft };
    if (daysLeft < 90) return { level: "warning" as const, label: `Expire dans ${daysLeft}j`, daysLeft };
    return null;
  })();

  return (
    <FlatCard>
      <div className="p-3 lg:p-4">
        <div className="flex items-start gap-4">
          {/* Photo + completion ring */}
          <div className="relative shrink-0">
            <Avatar className="h-20 w-20 border-2 border-white dark:border-gray-700">
              <AvatarImage src={identityPhotoUrl ?? undefined} alt={`${firstName} ${lastName}`} />
              <AvatarFallback className="text-xl font-bold bg-teal-500 text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            {/* Anneau de progression */}
            <div className="absolute -bottom-1 -right-1 bg-card rounded-full p-0.5 border border-border">
              <div className="relative h-7 w-7 flex items-center justify-center bg-muted rounded-full">
                <svg className="absolute inset-0 h-7 w-7 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" className="stroke-muted/30" />
                  <circle
                    cx="18" cy="18" r="15.5" fill="none" strokeWidth="3"
                    strokeDasharray={`${completionScore} ${100 - completionScore}`}
                    strokeLinecap="round"
                    stroke={completionScore >= 80 ? "#14b8a6" : completionScore >= 50 ? "#f59e0b" : "#ef4444"}
                  />
                </svg>
                <span className="text-[7px] font-bold z-10">{completionScore}%</span>
              </div>
            </div>
          </div>

          {/* Identite et badges */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-black uppercase text-foreground leading-none truncate">
                {lastName}
              </h2>
              <p className="text-sm font-medium text-muted-foreground capitalize truncate">
                {firstName}
              </p>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {identity?.gender && (
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20">
                  {GENDER_LABELS[identity.gender] ?? identity.gender}
                </Badge>
              )}
              {age !== null && (
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                  {age} ans
                </Badge>
              )}
              {profile?.userType && (
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                  {USER_TYPE_LABELS[profile.userType] ?? profile.userType}
                </Badge>
              )}
              {user?.role && user.role !== "citizen" && (
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                  <Shield className="h-2.5 w-2.5 mr-1" />
                  {user.role}
                </Badge>
              )}
            </div>

            {/* Matricule */}
            {matricule && (
              <p className="text-[10px] text-muted-foreground mt-1.5 font-mono">
                Matricule: <span className="font-semibold text-teal-600 dark:text-teal-400">{matricule}</span>
              </p>
            )}
          </div>
        </div>

        {/* Contact info — bloc incruste */}
        <div className="mt-3 space-y-1.5 bg-muted/50 rounded-lg p-2.5 border border-border/50">
          {(contacts?.email || user?.email) && (
            <a
              href={`mailto:${contacts?.email ?? user?.email}`}
              className="flex items-center gap-2 text-[11px] font-medium hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
            >
              <Mail className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <span className="truncate">{contacts?.email ?? user?.email}</span>
            </a>
          )}
          {contacts?.phone && (
            <a
              href={`tel:${contacts.phone}`}
              className="flex items-center gap-2 text-[11px] font-medium hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
            >
              <Phone className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
              <span className="truncate font-bold text-[12px]">{contacts.phone}</span>
            </a>
          )}
          {addresses?.residence?.city && (
            <div className="flex items-center gap-2 text-[11px] font-medium">
              <MapPin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="truncate">
                {[addresses.residence.city, addresses.residence.country].filter(Boolean).join(", ")}
              </span>
            </div>
          )}
        </div>

        {/* Alerte passeport */}
        {passportAlert && (
          <div
            className={cn(
              "mt-2 flex items-center gap-2 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg",
              passportAlert.level === "expired"
                ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20",
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>
              Passeport : {passportAlert.label}
              {passportInfo?.expiryDate && (
                <> ({format(new Date(passportInfo.expiryDate), "dd MMM yyyy", { locale: fr })})</>
              )}
            </span>
          </div>
        )}
      </div>
    </FlatCard>
  );
}
