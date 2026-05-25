import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CreditCard, RotateCcw } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/my-space/flat-card";
import { cn } from "@/lib/utils";

export interface ProfileConsularCardProps {
  registrations: any[];
  profile: any;
  identityPhotoUrl?: string | null;
}

export function ProfileConsularCard({
  registrations,
  profile,
  identityPhotoUrl,
}: ProfileConsularCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const latestRegistration = registrations?.[0];
  const identity = profile?.identity;
  const consularCard = profile?.consularCard;

  const firstName = identity?.firstName ?? "";
  const lastName = identity?.lastName ?? "";
  const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();

  const fmtDate = (ts: number) => format(new Date(ts), "dd/MM/yyyy", { locale: fr });

  const hasValidCard =
    consularCard?.cardNumber && consularCard.cardExpiresAt > Date.now();
  const hasExpiredCard =
    consularCard?.cardNumber && consularCard.cardExpiresAt <= Date.now();

  if (!latestRegistration && !consularCard) {
    return (
      <FlatCard>
        <div className="pb-2 pt-3 px-4">
          <div className="text-sm font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-muted">
              <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            Carte Consulaire
          </div>
        </div>
        <div className="flex flex-col items-center justify-center text-center py-6 px-4">
          <CreditCard className="h-8 w-8 mb-2 text-muted-foreground/20" />
          <p className="text-xs text-muted-foreground">
            Non inscrit au registre consulaire
          </p>
        </div>
      </FlatCard>
    );
  }

  if (hasExpiredCard && !hasValidCard) {
    return (
      <FlatCard>
        <div className="pb-2 pt-3 px-4">
          <div className="text-sm font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-destructive-light">
                <CreditCard className="w-3.5 h-3.5 text-destructive" />
              </div>
              Carte Consulaire
            </div>
            <Badge variant="destructive" className="text-xs">
              Expiree
            </Badge>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center text-center py-4 gap-1 px-4">
          <CreditCard className="h-8 w-8 text-destructive/30" />
          <p className="text-xs text-muted-foreground">
            Carte expiree le {fmtDate(consularCard.cardExpiresAt)}
          </p>
          <p className="text-xs font-mono text-muted-foreground">
            N. {consularCard.cardNumber}
          </p>
        </div>
      </FlatCard>
    );
  }

  if (hasValidCard) {
    return (
      <FlatCard className="overflow-hidden">
        <div className="pb-2 pt-3 px-4">
          <div className="text-sm font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-success-light">
                <CreditCard className="w-3.5 h-3.5 text-success" />
              </div>
              Carte Consulaire
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              {isFlipped ? "Recto" : "Verso"}
            </Button>
          </div>
        </div>

        <div className="p-3 pt-0">
          <div className="w-full flex justify-center perspective-[1000px]">
            <button
              type="button"
              className="relative w-full aspect-[1.6/1] max-w-[380px] cursor-pointer bg-transparent border-0 p-0 group"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div
                className={cn(
                  "relative w-full h-full transition-transform duration-500 transform-3d",
                  isFlipped && "transform-[rotateY(180deg)]",
                )}
              >
                {/* Recto */}
                <div className="absolute inset-0 w-full h-full backface-hidden rounded-xl overflow-hidden shadow-lg border border-border/20">
                  <div
                    className="absolute inset-0 w-full h-full"
                    style={{ background: "var(--card-gradient)" }}
                  />
                  <div className="absolute inset-0 p-3.5 flex flex-col justify-between">
                    <div className="text-center">
                      <p className="text-xs text-white font-medium uppercase tracking-wider">
                        Republique Gabonaise
                      </p>
                      <p className="text-xs text-white/70 leading-tight">
                        Consulat General du Gabon en France
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-14 h-18 bg-white/20 rounded-md flex items-center justify-center border-2 border-white/30 shrink-0 overflow-hidden">
                        {identityPhotoUrl ? (
                          <img
                            src={identityPhotoUrl}
                            alt="Photo"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Avatar className="h-full w-full rounded-none">
                            <AvatarFallback className="text-xs rounded-none bg-white/30 text-white">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                      <div className="flex-1 text-white space-y-0.5 text-left min-w-0">
                        <p className="font-bold text-sm uppercase truncate">
                          {lastName}
                        </p>
                        <p className="text-xs truncate">{firstName}</p>
                        <p className="text-xs font-mono text-white/80 pt-0.5">
                          N. {consularCard.cardNumber}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between text-xs text-white/80">
                      <div className="text-left">
                        <p className="text-xs text-white/60 uppercase font-semibold">
                          Delivree le
                        </p>
                        <p className="font-mono">
                          {fmtDate(consularCard.cardIssuedAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-white/60 uppercase font-semibold">
                          Expire le
                        </p>
                        <p className="font-mono">
                          {fmtDate(consularCard.cardExpiresAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-1 text-white">
                      <RotateCcw className="h-5 w-5" />
                      <span className="text-xs font-medium">Voir le verso</span>
                    </div>
                  </div>
                </div>

                {/* Verso */}
                <div className="absolute inset-0 w-full h-full backface-hidden transform-[rotateY(180deg)] rounded-xl overflow-hidden shadow-lg border border-border/20">
                  <div
                    className="absolute inset-0 w-full h-full"
                    style={{ background: "var(--card-gradient)" }}
                  />
                  <div className="absolute inset-0 p-4 flex flex-col justify-center items-center">
                    <div className="bg-card/95 rounded-lg p-3 text-center max-w-[80%] shadow-sm">
                      <p className="text-xs font-medium mb-2 leading-tight">
                        Cette carte est la propriete du Consulat General du Gabon
                      </p>
                      <p className="text-xs text-muted-foreground leading-snug">
                        En cas de perte, merci de la retourner
                      </p>
                      <div className="mt-2 pt-2 border-t border-border">
                        <p className="text-xs font-bold uppercase">
                          Consulat General du Gabon
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          26 bis, avenue Raphael — 75016 Paris
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-1 text-white">
                      <RotateCcw className="h-5 w-5" />
                      <span className="text-xs font-medium">Voir le recto</span>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          </div>

        </div>
      </FlatCard>
    );
  }

  // Inscription en cours
  return (
    <FlatCard>
      <div className="pb-2 pt-3 px-4">
        <div className="text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-warning-light">
              <CreditCard className="w-3.5 h-3.5 text-warning" />
            </div>
            Carte Consulaire
          </div>
          <Badge
            variant="outline"
            className="text-xs bg-warning-light text-warning border-warning/20"
          >
            En cours
          </Badge>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center text-center py-4 gap-1 px-4">
        <CreditCard className="h-8 w-8 text-warning/30" />
        <p className="text-xs text-muted-foreground">
          Inscription consulaire enregistree
        </p>
        {latestRegistration?.matricule && (
          <p className="text-xs font-mono text-muted-foreground">
            Matricule: {latestRegistration.matricule}
          </p>
        )}
      </div>
    </FlatCard>
  );
}
