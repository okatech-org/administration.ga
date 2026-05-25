"use client";

/**
 * Carte de connexion / inscription unifiee — TRAVAIL.GA.
 *
 * Flux email OTP en deux etapes :
 *   1) saisie email -> envoi OTP via Convex/Better Auth (Resend)
 *   2) saisie code 6 chiffres -> creation/connexion + redirection
 *
 * Pour un nouveau compte, l'utilisateur fournit aussi son nom et son
 * prenom lors de l'etape 2 ; ces infos sont propagees a Better Auth via
 * `signIn.emailOtp({ ..., name })` puis copiees dans la table
 * `citoyenAccounts` cote Convex (mutation ensureMyCitoyenAccount).
 */
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";

type Step = "email" | "otp";

export function SignInCard({
  mode,
}: {
  mode: "connexion" | "inscription";
}) {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") ?? "/mon-compte";

  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [prenoms, setPrenoms] = useState("");
  const [nom, setNom] = useState("");

  const isSignup = mode === "inscription";

  const onRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim().toLowerCase(),
        type: "sign-in",
      });
      if (error) throw new Error(error.message ?? "Erreur");
      toast.success(`Code envoye a ${email}`);
      setStep("otp");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'envoi");
    } finally {
      setLoading(false);
    }
  };

  const onSubmitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Le code doit contenir 6 chiffres.");
      return;
    }
    if (isSignup && (!nom.trim() || !prenoms.trim())) {
      toast.error("Nom et prenoms requis.");
      return;
    }
    setLoading(true);
    try {
      const fullName = `${prenoms.trim()} ${nom.trim()}`.trim();
      const { error } = await authClient.signIn.emailOtp({
        email: email.trim().toLowerCase(),
        otp,
        ...(isSignup && fullName ? { name: fullName } : {}),
      });
      if (error) throw new Error(error.message ?? "Code invalide");

      toast.success(isSignup ? "Compte cree" : "Connecte");
      router.push(redirect);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-sm">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold tracking-tight">
          {isSignup ? "Creer mon compte" : "Se connecter"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isSignup
            ? "Compte gratuit pour suivre vos candidatures et publier des annonces."
            : "Pas de mot de passe : un code a 6 chiffres par email."}
        </p>
      </div>

      {step === "email" ? (
        <form onSubmit={onRequestOtp} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="text-sm font-medium block mb-1.5"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="vous@exemple.ga"
                className="w-full rounded-lg border bg-background pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Recevoir le code
          </button>

          <p className="text-xs text-muted-foreground text-center">
            En continuant, vous acceptez nos{" "}
            <a href="/cgu" className="underline">
              CGU
            </a>{" "}
            et notre{" "}
            <a href="/confidentialite" className="underline">
              politique de confidentialite
            </a>
            .
          </p>
        </form>
      ) : (
        <form onSubmit={onSubmitOtp} className="space-y-4">
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setOtp("");
            }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ArrowLeft className="size-3" /> Changer d'email
          </button>

          {isSignup && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1.5">
                  Prenoms
                </label>
                <input
                  type="text"
                  value={prenoms}
                  onChange={(e) => setPrenoms(e.target.value)}
                  required
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Nom</label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  required
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="otp" className="text-sm font-medium block mb-1.5">
              Code recu par email
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              required
              placeholder="123456"
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-center text-lg tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Code envoye a <strong>{email}</strong>. Valable 5 min.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {isSignup ? "Creer mon compte" : "Se connecter"}
          </button>
        </form>
      )}

      <div className="mt-6 pt-6 border-t text-sm text-center text-muted-foreground">
        {isSignup ? (
          <>
            Deja un compte ?{" "}
            <a href="/auth/connexion" className="text-primary font-medium underline">
              Se connecter
            </a>
          </>
        ) : (
          <>
            Pas de compte ?{" "}
            <a href="/auth/inscription" className="text-primary font-medium underline">
              Creer un compte
            </a>
          </>
        )}
      </div>
    </div>
  );
}
