import { useState } from "react"
import { authClient } from "../../lib/auth-client"
import { Shield, Mail, ArrowRight, Loader2, KeyRound } from "lucide-react"

type Step = "email" | "otp"

export function LoginPage() {
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSendOTP = async () => {
    if (!email.trim()) return
    setLoading(true)
    setError("")
    try {
      await authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "sign-in" })
      setStep("otp")
    } catch (err: any) {
      setError(err?.message || "Erreur d'envoi du code")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (!otp.trim()) return
    setLoading(true)
    setError("")
    try {
      const result = await authClient.emailOtp.verifyEmail({ email: email.trim(), otp: otp.trim() })
      if (result.error) {
        setError(result.error.message || "Code invalide")
      }
      // If successful, ConvexBetterAuthProvider will detect the session
    } catch (err: any) {
      setError(err?.message || "Code invalide ou expiré")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm mx-auto">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Agent Desktop</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connectez-vous pour accéder au designer de cartes
          </p>
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          {error && (
            <div className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-2.5">
              {error}
            </div>
          )}

          {step === "email" ? (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
                    placeholder="agent@consulat.ga"
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-muted text-foreground text-sm placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <button
                onClick={handleSendOTP}
                disabled={loading || !email.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                {loading ? "Envoi..." : "Recevoir un code"}
              </button>
            </>
          ) : (
            <>
              <div className="text-center text-sm text-muted-foreground mb-2">
                Un code a été envoyé à <strong className="text-foreground">{email}</strong>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Code de vérification
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyOTP()}
                    placeholder="000000"
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-muted text-foreground text-sm text-center tracking-[0.3em] font-mono placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <button
                onClick={handleVerifyOTP}
                disabled={loading || otp.length < 6}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                {loading ? "Vérification..." : "Se connecter"}
              </button>
              <button
                onClick={() => { setStep("email"); setOtp(""); setError("") }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Changer d'adresse email
              </button>
            </>
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground/50 mt-6">
          Gabon Diplomatie — Système consulaire
        </p>
      </div>
    </div>
  )
}
