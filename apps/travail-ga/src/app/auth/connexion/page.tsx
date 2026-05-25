import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SignInCard } from "@/components/auth/sign-in-card";

export const metadata = {
  title: "Connexion — TRAVAIL.GA",
};

export default function ConnexionPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-6 lg:px-10 max-w-md">
          <Suspense
            fallback={
              <div className="rounded-2xl border bg-card p-8 animate-pulse h-80" />
            }
          >
            <SignInCard mode="connexion" />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
