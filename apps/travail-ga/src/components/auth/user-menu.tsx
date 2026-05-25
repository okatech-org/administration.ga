"use client";

/**
 * Menu utilisateur pour le header — TRAVAIL.GA.
 *
 * Affiche :
 *   - bouton "Se connecter" si non authentifie
 *   - menu dropdown (compte, deconnexion) si authentifie
 *
 * La session est lue via authClient.useSession() qui ecoute le cookie
 * Better Auth en temps reel.
 */
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, User, Briefcase, FileText, ChevronDown } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function UserMenu() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (isPending) {
    return <div className="h-9 w-24 rounded-lg bg-muted animate-pulse" />;
  }

  if (!session?.user) {
    return (
      <Link
        href="/auth/connexion"
        className="hidden md:inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
      >
        <LogIn className="size-4" />
        Connexion
      </Link>
    );
  }

  const name = session.user.name || session.user.email;
  const initials = (session.user.name || session.user.email || "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const onSignOut = async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="hidden md:inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
          {initials}
        </div>
        <span className="hidden lg:inline max-w-[140px] truncate">{name}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border bg-popover shadow-lg p-1 z-50">
          <div className="px-3 py-2 border-b">
            <div className="text-sm font-medium truncate">{name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {session.user.email}
            </div>
          </div>

          <MenuItem
            href="/mon-compte"
            icon={<User className="size-4" />}
            label="Mon compte"
            onClick={() => setOpen(false)}
          />
          <MenuItem
            href="/mon-compte/candidatures"
            icon={<FileText className="size-4" />}
            label="Mes candidatures"
            onClick={() => setOpen(false)}
          />
          <MenuItem
            href="/mon-compte/annonces"
            icon={<Briefcase className="size-4" />}
            label="Mes annonces"
            onClick={() => setOpen(false)}
          />

          <div className="border-t my-1" />

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted text-destructive"
          >
            <LogOut className="size-4" />
            Se deconnecter
          </button>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted"
    >
      {icon}
      {label}
    </Link>
  );
}
