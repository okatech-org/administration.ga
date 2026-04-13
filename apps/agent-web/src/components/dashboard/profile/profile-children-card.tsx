import Link from "next/link";
import { differenceInYears } from "date-fns";
import {
  ArrowRight,
  Baby,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FlatCard } from "@/components/my-space/flat-card";
import { cn } from "@/lib/utils";

// ─── Labels genre ─────────────────────────────────────────────
const GENDER_LABELS: Record<string, string> = {
  male: "Garcon",
  female: "Fille",
  M: "Garcon",
  F: "Fille",
};

// ─── Props ────────────────────────────────────────────────────
export interface ProfileChildrenCardProps {
  children: any[];
  basePath?: string;
}

/**
 * Calcul de l'age a partir d'une date de naissance.
 */
function getAge(birthDate?: string | number | null): number | null {
  if (!birthDate) return null;
  try {
    return differenceInYears(new Date(), new Date(birthDate));
  } catch {
    return null;
  }
}

/**
 * Liste scrollable des enfants rattaches au profil.
 * Chaque enfant affiche un avatar (initiales), nom, age et genre.
 */
export function ProfileChildrenCard({
  children: childProfiles,
  basePath = "/admin/profiles",
}: ProfileChildrenCardProps) {
  return (
    <FlatCard>
      <div className="pb-2 pt-3 px-4">
        <div className="text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-pink-500/10">
              <Users className="w-3.5 h-3.5 text-pink-500" />
            </div>
            Enfants
          </div>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-pink-500/10 text-pink-500">
            {childProfiles.length}
          </Badge>
        </div>
      </div>

      <div className="p-3 pt-1">
        {childProfiles.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Baby className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-[12px]">Aucun enfant</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin">
            {childProfiles.map((child) => {
              const childAge = getAge(child.identity?.birthDate);
              const firstName = child.identity?.firstName ?? "";
              const lastName = child.identity?.lastName ?? "";
              const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
              const gender = child.identity?.gender;

              return (
                <Link
                  key={child._id}
                  href={`${basePath}/${child._id}`}
                  className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors group border border-transparent hover:border-border/50"
                >
                  {/* Avatar avec initiales */}
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-[10px] font-bold bg-pink-500/10 text-pink-600 dark:text-pink-400">
                      {initials || "?"}
                    </AvatarFallback>
                  </Avatar>

                  {/* Nom et details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                      {firstName} {lastName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {childAge !== null && (
                        <span className="text-[10px] text-muted-foreground">
                          {childAge} ans
                        </span>
                      )}
                      {gender && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[8px] px-1 py-0",
                            gender === "male" || gender === "M"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                              : "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
                          )}
                        >
                          {GENDER_LABELS[gender] ?? gender}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Fleche de navigation */}
                  <ArrowRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </FlatCard>
  );
}
