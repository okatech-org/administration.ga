"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  FileText,
  GraduationCap,
  Home,
  Shield,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/information")({
  component: InformationPage,
});

const SERVICE_CATEGORIES = [
  {
    key: "administrative",
    icon: Shield,
    color: "stat-icon-blue",
    href: "/services?category=passport",
  },
  {
    key: "practical",
    icon: Home,
    color: "stat-icon-green",
    href: "/services?category=assistance",
  },
  {
    key: "education",
    icon: GraduationCap,
    color: "stat-icon-orange",
    href: "/services?category=transcript",
  },
] as const;

const QUICK_LINKS = [
  { key: "passport", icon: FileText, href: "/services?category=passport" },
  {
    key: "registration",
    icon: BookOpen,
    href: "/services?category=registration",
  },
  {
    key: "civil_status",
    icon: Shield,
    href: "/services?category=civil_status",
  },
  { key: "visa", icon: Briefcase, href: "/services?category=visa" },
] as const;

function InformationPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-background py-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <Badge
            variant="secondary"
            className="mb-4 bg-primary/10 text-primary"
          >
            {t("information.badge")}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {t("information.title")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t(
              "information.subtitle",
              "Retrouvez toutes les informations essentielles pour vos démarches consulaires, la vie pratique et l'éducation.",
            )}
          </p>
        </div>
      </section>

      {/* Service Categories */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SERVICE_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link key={cat.key} to={cat.href}>
                <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer h-full border-0 shadow-sm hover:-translate-y-1">
                  <CardHeader className="pb-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${cat.color} mb-3`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">
                      {t(`information.categories.${cat.key}.title`)}
                    </CardTitle>
                    <CardDescription>
                      {t(`information.categories.${cat.key}.description`)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-primary/50" />
                          {t(`information.categories.${cat.key}.items.${i}`)}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex items-center text-primary text-sm font-medium group-hover:gap-2 transition-all">
                      {t("information.seeMore")}
                      <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Quick Links */}
      <section className="container mx-auto px-4 py-12 border-t">
        <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
          {t("information.quickLinks.title")}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.key}
                to={link.href}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border flat-card-border hover:shadow-md hover:-translate-y-0.5 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-medium text-center">
                  {t(`information.quickLinks.${link.key}`)}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
