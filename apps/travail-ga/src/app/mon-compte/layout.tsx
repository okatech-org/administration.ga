"use client";

/**
 * Layout /mon-compte — espace authentifié TRAVAIL.GA.
 *
 * Architecture deux colonnes :
 *  - Sidebar gauche (AccountSidebar, 268px) avec navigation + déconnexion
 *  - Contenu principal (flex 1)
 *
 * Sur mobile (<900px), la sidebar bascule en drawer (bouton "Menu compte"
 * dans la barre supérieure du contenu). Pour les utilisateurs non
 * authentifiés, on n'affiche pas la sidebar — les pages enfant rendent
 * leur propre état "Anon → connectez-vous sur PNPE".
 */

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AccountSidebar } from "@/components/account/account-sidebar";
import { Icons } from "@/components/design/icons";

export default function MonCompteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isPending } = authClient.useSession();
  const isAuthed = !!session?.user;
  const userName = session?.user?.name ?? null;
  const userEmail = session?.user?.email ?? null;
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <SiteHeader />

      <main style={{ flex: 1, background: "var(--bg)" }}>
        {isPending ? (
          <div
            className="travail-container"
            style={{ padding: "48px 0", color: "var(--fg-muted)", fontSize: 14 }}
          >
            Chargement de votre espace…
          </div>
        ) : isAuthed ? (
          <div
            className="travail-container travail-account-grid"
            style={{
              padding: "32px 0 80px",
              display: "grid",
              gridTemplateColumns: "268px 1fr",
              gap: 32,
              alignItems: "start",
            }}
          >
            {/* Sidebar desktop */}
            <div
              className="travail-account-sidebar-desktop"
              style={{ position: "sticky", top: 88 }}
            >
              <AccountSidebar
                userName={userName}
                userEmail={userEmail}
              />
            </div>

            {/* Contenu */}
            <div style={{ minWidth: 0 }}>
              {/* Bouton drawer mobile */}
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="travail-account-drawer-trigger"
                style={{
                  display: "none",
                  alignItems: "center",
                  gap: 8,
                  height: 36,
                  padding: "0 14px",
                  background: "var(--bg-elev-1)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  color: "var(--fg)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  marginBottom: 16,
                }}
              >
                <Icons.Menu size={14} />
                Menu de mon compte
              </button>

              {children}
            </div>

            {/* Drawer mobile */}
            {drawerOpen && (
              <>
                <div
                  onClick={() => setDrawerOpen(false)}
                  aria-hidden
                  style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0,0,0,0.45)",
                    zIndex: 80,
                    animation: "travail-fade-in 200ms var(--ease-out)",
                  }}
                />
                <div
                  role="dialog"
                  aria-label="Menu du compte"
                  style={{
                    position: "fixed",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: 300,
                    maxWidth: "85vw",
                    zIndex: 81,
                    background: "var(--bg)",
                    borderRight: "1px solid var(--border)",
                    padding: 18,
                    overflowY: "auto",
                    animation:
                      "travail-slide-in-left 240ms var(--ease-out)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--fg-subtle)",
                      }}
                    >
                      Mon espace
                    </span>
                    <button
                      type="button"
                      onClick={() => setDrawerOpen(false)}
                      aria-label="Fermer"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        background: "var(--bg-elev-1)",
                        color: "var(--fg-muted)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <Icons.Close size={14} />
                    </button>
                  </div>
                  <AccountSidebar
                    userName={userName}
                    userEmail={userEmail}
                    onNavigate={() => setDrawerOpen(false)}
                  />
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="travail-container" style={{ padding: "32px 0" }}>
            {children}
          </div>
        )}
      </main>

      <SiteFooter />

      <style>{`
        @media (max-width: 900px) {
          .travail-account-sidebar-desktop { display: none !important; }
          .travail-account-drawer-trigger { display: inline-flex !important; }
          .travail-account-grid { grid-template-columns: 1fr !important; }
        }
        @keyframes travail-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes travail-slide-in-left {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
