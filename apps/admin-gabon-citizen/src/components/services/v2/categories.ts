import {
  BookOpen,
  BookOpenCheck,
  Building2,
  CreditCard,
  FileCheck,
  FileText,
  Globe,
  Heart,
  type LucideIcon,
  Plane,
  ShieldAlert,
} from "lucide-react"
import { ServiceCategory } from "@convex/lib/constants"

export type CategoryTint = "blue" | "green" | "yellow" | "warm" | "danger"

export type CategoryConfig = {
  icon: LucideIcon
  tint: CategoryTint
  i18nKey: string
}

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  [ServiceCategory.Passport]: {
    icon: BookOpenCheck,
    tint: "yellow",
    i18nKey: "services.category.passport",
  },
  [ServiceCategory.Identity]: {
    icon: BookOpenCheck,
    tint: "yellow",
    i18nKey: "services.categoriesMap.passport",
  },
  [ServiceCategory.Visa]: {
    icon: Globe,
    tint: "blue",
    i18nKey: "services.categoriesMap.visa",
  },
  [ServiceCategory.CivilStatus]: {
    icon: FileText,
    tint: "green",
    i18nKey: "services.categoriesMap.civil_status",
  },
  [ServiceCategory.Registration]: {
    icon: BookOpen,
    tint: "blue",
    i18nKey: "services.categoriesMap.registration",
  },
  [ServiceCategory.Certification]: {
    icon: FileCheck,
    tint: "yellow",
    i18nKey: "services.categoriesMap.certification",
  },
  [ServiceCategory.Assistance]: {
    icon: ShieldAlert,
    tint: "warm",
    i18nKey: "services.categoriesMap.assistance",
  },
  [ServiceCategory.Transcript]: {
    icon: FileText,
    tint: "green",
    i18nKey: "services.categoriesMap.civil_status",
  },
  [ServiceCategory.Notification]: {
    icon: Heart,
    tint: "warm",
    i18nKey: "services.categoriesMap.assistance",
  },
  [ServiceCategory.TravelDocument]: {
    icon: Plane,
    tint: "yellow",
    i18nKey: "services.categoriesMap.passport",
  },
  [ServiceCategory.Declaration]: {
    icon: Building2,
    tint: "blue",
    i18nKey: "services.category.declaration",
  },
  [ServiceCategory.Other]: {
    icon: CreditCard,
    tint: "blue",
    i18nKey: "services.categoriesMap.other",
  },
}

export const TINT_CLASSES: Record<CategoryTint, { bg: string; fg: string }> = {
  blue: {
    bg: "bg-[var(--pub-gabon-blue-tint)]",
    fg: "text-[var(--pub-gabon-blue)]",
  },
  green: {
    bg: "bg-[var(--pub-gabon-green-tint)]",
    fg: "text-[var(--pub-gabon-green)]",
  },
  yellow: {
    bg: "bg-[var(--pub-gabon-yellow-tint)]",
    fg: "text-[#8a6b00]",
  },
  warm: {
    bg: "bg-[var(--pub-warning-tint)]",
    fg: "text-[var(--pub-warning)]",
  },
  danger: {
    bg: "bg-[var(--pub-danger-tint)]",
    fg: "text-[var(--pub-danger)]",
  },
}

export function isFullyOnline(service: {
  requiresAppointment?: boolean
  requiresPickupAppointment?: boolean
}): boolean {
  return !service.requiresAppointment && !service.requiresPickupAppointment
}
