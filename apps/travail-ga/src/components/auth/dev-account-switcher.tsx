"use client";

/**
 * Dev Account Switcher — bouton flottant "DEV" + dialog de connexion rapide.
 *
 * Reprend le pattern PNPE.GA (cf. apps/pnpe/src/components/auth/DevAccountSwitcher.tsx)
 * mais avec un design éditorial cohérent avec TRAVAIL.GA (palette achromatique
 * + brand emerald). Triple gate prod : aucun rendu si NODE_ENV === "production",
 * aucun rendu si NEXT_PUBLIC_DEV_ACCOUNTS est vide.
 *
 * Flow :
 *   1. fetch /api/dev/sign-in pour récupérer un tempPassword Convex
 *   2. authClient.signIn.email() via le proxy /api/auth/*
 *   3. reload pour rehydrater la session ConvexBetterAuthProvider
 */

import { Bug, Loader2, LogIn, UserCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { authClient } from "@/lib/auth-client";

interface DevAccount {
  label: string;
  email: string;
  group: string;
  role?: string;
}

interface DevAccountGroup {
  group: string;
  accounts: DevAccount[];
}

function parseDevAccounts(): DevAccountGroup[] {
  try {
    const raw = process.env.NEXT_PUBLIC_DEV_ACCOUNTS;
    if (!raw) return [];
    const accounts: DevAccount[] = JSON.parse(raw);
    const grouped = new Map<string, DevAccount[]>();
    for (const account of accounts) {
      const group = account.group || "Dev";
      if (!grouped.has(group)) grouped.set(group, []);
      grouped.get(group)!.push(account);
    }
    return Array.from(grouped.entries()).map(([group, accounts]) => ({
      group,
      accounts,
    }));
  } catch {
    console.error("[DevAccountSwitcher] NEXT_PUBLIC_DEV_ACCOUNTS invalide");
    return [];
  }
}

export function DevAccountSwitcher() {
  if (process.env.NODE_ENV === "production") return null;
  return <DevAccountSwitcherInner />;
}

function DevAccountSwitcherInner() {
  const { data: session } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const devAccounts = useMemo(() => parseDevAccounts(), []);

  const currentEmail = session?.user?.email;

  if (devAccounts.length === 0) return null;

  const handleSignIn = async (account: DevAccount) => {
    setLoading(account.email);
    setError(null);

    try {
      if (session) {
        await authClient.signOut();
        await new Promise((r) => setTimeout(r, 300));
      }

      const devRes = await fetch("/api/dev/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: account.email }),
      });

      if (!devRes.ok) {
        const data = await devRes.json().catch(() => ({}));
        throw new Error(data.error || `Échec connexion (${devRes.status})`);
      }

      const { tempPassword } = await devRes.json();

      const signInResult = await authClient.signIn.email({
        email: account.email,
        password: tempPassword,
      });

      if (signInResult.error) {
        throw new Error(
          signInResult.error.message || "Échec de connexion Better Auth",
        );
      }

      setOpen(false);
      toast.success(`Connecté en tant que ${account.label}`, {
        description: account.email,
      });
      await new Promise((r) => setTimeout(r, 500));
      window.location.reload();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erreur de connexion";
      setError(message);
      toast.error("Échec de connexion", { description: message });
    } finally {
      setLoading(null);
    }
  };

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      toast.success("Déconnecté");
      await new Promise((r) => setTimeout(r, 300));
      window.location.reload();
    } catch {
      toast.error("Échec de déconnexion");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Dev Account Switcher"
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: 9999,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            borderRadius: 9999,
            background: "var(--brand-emerald, #2D9F6E)",
            color: "#0A0B0E",
            border: "1px solid rgba(0,0,0,0.08)",
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            boxShadow:
              "0 1px 2px rgba(0,0,0,0.08), 0 6px 16px rgba(45,159,110,0.28)",
            cursor: "pointer",
            transition: "transform 120ms ease, box-shadow 120ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <Bug size={14} />
          <span>DEV</span>
          {currentEmail && (
            <span
              style={{
                marginLeft: 4,
                width: 6,
                height: 6,
                borderRadius: 9999,
                background: "#0A0B0E",
                opacity: 0.55,
              }}
              aria-hidden
            />
          )}
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md p-0">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Bug className="size-5 text-amber-500" />
            Comptes de démo
          </DialogTitle>
          <DialogDescription>
            Connexion rapide aux comptes de test (dev uniquement).
            {currentEmail && (
              <span className="mt-1 block text-xs text-emerald-500">
                Connecté : {currentEmail}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="mx-5 mt-3 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <ScrollArea className="max-h-[60vh]">
          <div className="flex flex-col gap-1 px-5 pb-5 pt-3">
            {devAccounts.map((group, gi) => (
              <div key={group.group}>
                <div
                  className={`sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2 text-xs font-semibold text-muted-foreground tracking-wide ${
                    gi > 0 ? "mt-2 border-t border-border pt-3" : ""
                  }`}
                >
                  {group.group}
                </div>

                <div className="flex flex-col gap-1">
                  {group.accounts.map((account) => {
                    const isCurrentUser = currentEmail === account.email;
                    const isLoading = loading === account.email;

                    return (
                      <button
                        type="button"
                        key={account.email}
                        disabled={isLoading || isCurrentUser}
                        onClick={() => handleSignIn(account)}
                        className={`group flex items-center gap-3 rounded-lg border p-2.5 text-left transition-all ${
                          isCurrentUser
                            ? "border-emerald-500/30 bg-emerald-500/10 cursor-default"
                            : "border-border hover:border-amber-500/50 hover:bg-amber-500/5 cursor-pointer"
                        }`}
                      >
                        <div
                          className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                            isCurrentUser
                              ? "bg-emerald-500/20 text-emerald-500"
                              : "bg-muted text-muted-foreground group-hover:bg-amber-500/20 group-hover:text-amber-500"
                          }`}
                        >
                          <UserCircle className="size-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm leading-tight">
                            {account.label}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-emerald-500">
                                ● actif
                              </span>
                            )}
                            {account.role && (
                              <span className="ml-1.5 text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                                {account.role}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {account.email}
                          </div>
                        </div>

                        {!isCurrentUser && (
                          <div className="shrink-0">
                            {isLoading ? (
                              <Loader2 className="size-4 animate-spin text-amber-500" />
                            ) : (
                              <LogIn className="size-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {currentEmail && (
              <button
                type="button"
                onClick={handleSignOut}
                className="mt-3 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-destructive/50 hover:text-destructive transition-colors"
              >
                Déconnexion
              </button>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
