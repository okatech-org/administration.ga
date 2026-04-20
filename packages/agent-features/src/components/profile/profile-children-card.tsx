import { Link } from "@workspace/routing";
import { differenceInYears } from "date-fns";
import { ArrowRight, Baby, Users } from "lucide-react";

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { FlatCard } from "../my-space/flat-card";

const GENDER_LABELS: Record<string, string> = {
  male: "Garcon",
  female: "Fille",
  M: "Garcon",
  F: "Fille",
};

export interface ProfileChildrenCardProps {
  children: any[];
  basePath?: string;
}

function getAge(birthDate?: string | number | null): number | null {
  if (!birthDate) return null;
  try {
    return differenceInYears(new Date(), new Date(birthDate));
  } catch {
    return null;
  }
}

export function ProfileChildrenCard({
  children: childProfiles,
  basePath = "/admin/profiles",
}: ProfileChildrenCardProps) {
  return (
    <FlatCard>
      <div className="pb-2 pt-3 px-4">
        <div className="text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Users className="w-3.5 h-3.5 text-primary" />
            </div>
            Enfants
          </div>
          <Badge variant="secondary" className="text-xs">
            {childProfiles.length}
          </Badge>
        </div>
      </div>

      <div className="p-3 pt-1">
        {childProfiles.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Baby className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-xs">Aucun enfant</p>
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
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                      {initials || "?"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                      {firstName} {lastName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {childAge !== null && (
                        <span className="text-xs text-muted-foreground">
                          {childAge} ans
                        </span>
                      )}
                      {gender && (
                        <Badge variant="outline" className="text-xs">
                          {GENDER_LABELS[gender] ?? gender}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </FlatCard>
  );
}
