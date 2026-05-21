import type { LucideIcon } from "lucide-react";

export interface GuideItem {
  title: string;
  detail: string;
}

export interface UsefulLink {
  label: string;
  url: string;
  description: string;
}

export interface GuideSection {
  id: string;
  icon: LucideIcon;
  title: string;
  color: string;
  iconBg: string;
  gradientFrom?: string;
  gradientTo?: string;
  intro: string;
  image?: string;
  items: GuideItem[];
  tips: string[];
  links?: UsefulLink[];
}

export interface SavoirVivreItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface ErreurItem {
  erreur: string;
  conseil: string;
}

export interface NumeroUtile {
  label: string;
  number: string;
  color: string;
  category: "local" | "gabon";
  type: "phone" | "email" | "address";
  description?: string;
}
