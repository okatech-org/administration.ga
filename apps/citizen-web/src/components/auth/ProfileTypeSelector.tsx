import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Globe2, Plane, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PublicUserType } from "@convex/lib/constants";

interface ProfileTypeSelectorProps {
  onSelect: (type: PublicUserType) => void;
}

export function ProfileTypeSelector({ onSelect }: ProfileTypeSelectorProps) {
  const { t } = useTranslation();

  const profiles = [
    {
      type: PublicUserType.LongStay,
      icon: User,
      title: t("register.profiles.resident.title"),
      description: t("register.profiles.resident.description"),
      features: [
        t("register.profiles.resident.feature1"),
        t("register.profiles.resident.feature2"),
        t("register.profiles.resident.feature3"),
        t("register.profiles.resident.feature4"),
      ],
      color: "primary" as const,
      hoverBorder: "hover:border-primary",
      hoverBg: "bg-primary/5",
      iconBg: "bg-primary/10",
      iconHoverBg: "group-hover:bg-primary",
    },
    {
      type: PublicUserType.ShortStay,
      icon: Plane,
      title: t("register.profiles.passage.title"),
      description: t("register.profiles.passage.description"),
      features: [
        t("register.profiles.passage.feature1"),
        t("register.profiles.passage.feature2"),
        t("register.profiles.passage.feature3"),
      ],
      color: "yellow" as const,
      hoverBorder: "hover:border-yellow-500",
      hoverBg: "bg-yellow-500/5",
      iconBg: "bg-yellow-100 text-yellow-600",
      iconHoverBg: "group-hover:bg-yellow-500 group-hover:text-white",
    },
    {
      type: PublicUserType.VisaTourism, // Default for foreigners, they choose specific type in form
      icon: Globe2,
      title: t("register.profiles.foreigner.title"),
      description: t("register.profiles.foreigner.description"),
      features: [
        t("register.profiles.foreigner.feature1"),
        t("register.profiles.foreigner.feature2"),
        t("register.profiles.foreigner.feature3"),
        t("register.profiles.foreigner.feature4"),
      ],
      color: "blue" as const,
      hoverBorder: "hover:border-blue-500",
      hoverBg: "bg-blue-500/5",
      iconBg: "bg-blue-100 text-blue-600",
      iconHoverBg: "group-hover:bg-blue-500 group-hover:text-white",
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-3">
          {t("register.selectProfile.title")}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t("register.selectProfile.subtitle")}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {profiles.map((profile) => (
          <Card
            key={profile.type}
            data-testid={`profile-card-${profile.type}`}
            className={`cursor-pointer ${profile.hoverBorder} hover:shadow-lg transition-all group relative overflow-hidden`}
            onClick={() => onSelect(profile.type)}
          >
            <div
              className={`absolute inset-0 ${profile.hoverBg} opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}
            />
            <CardHeader className="relative">
              <div
                className={`w-12 h-12 rounded-full ${profile.iconBg} flex items-center justify-center mb-4 ${profile.iconHoverBg} transition-colors`}
              >
                <profile.icon className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">{profile.title}</CardTitle>
              <CardDescription>{profile.description}</CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                {profile.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    ✓ {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full group-hover:translate-x-1 transition-transform"
                variant={profile.color === "primary" ? "default" : "outline"}
              >
                {t("register.startRegistration")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
