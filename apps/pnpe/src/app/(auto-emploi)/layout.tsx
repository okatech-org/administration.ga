/**
 * Layout Espace Auto-Emploi PNPE.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Briefcase,
  GraduationCap,
  HandshakeIcon,
  Landmark,
  LineChart,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/auto-emploi/presentation", label: "Présentation", icon: Sparkles },
  { href: "/auto-emploi/inscription", label: "S'inscrire", icon: BookOpen },
  { href: "/auto-emploi/formation", label: "Formation BMC", icon: GraduationCap },
  { href: "/auto-emploi/business-plan", label: "Business Plan", icon: Briefcase },
  { href: "/auto-emploi/mentorat", label: "Mentorat", icon: HandshakeIcon },
  { href: "/auto-emploi/financement", label: "Financement", icon: Landmark },
  { href: "/auto-emploi/suivi", label: "Suivi", icon: LineChart },
] as const;

export default function AutoEmploiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center font-bold text-primary-foreground">
              G
            </div>
            <span className="font-display font-black text-lg tracking-tight">
              PNPE<span className="text-emerald-500">.GA</span>
            </span>
          </Link>
          <div className="text-sm text-muted-foreground">
            Programme Auto-Emploi
          </div>
        </div>
      </header>
      <div className="container mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
        <aside className="space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
