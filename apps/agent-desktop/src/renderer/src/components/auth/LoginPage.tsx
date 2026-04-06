import { useEffect, useRef, useState } from "react"
import { authClient } from "../../lib/auth-client"
import {
  Shield,
  Mail,
  ArrowRight,
  ArrowLeft,
  Loader2,
  KeyRound,
  Lock,
} from "lucide-react"

type Step = "email" | "otp-code" | "password"

const STORAGE_KEY = "login-state"

function loadSaved(): { step: Step; email: string } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed.step && parsed.email) return parsed
  } catch { /* ignore */ }
  return null
}

function saveToDisk(step: Step, email: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step, email }))
  } catch { /* ignore */ }
}

function clearSaved() {
  try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}

export function LoginPage() {
  const saved = loadSaved()
  const [step, setStep] = useState<Step>(saved?.step ?? "email")
  const [email, setEmail] = useState(saved?.email ?? "")
  const [otpCode, setOtpCode] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [otpSent, setOtpSent] = useState(saved?.step === "otp-code")
  const otpInputRef = useRef<HTMLInputElement>(null)

  // Persist step + email so a page reload doesn't lose progress
  useEffect(() => {
    if (step !== "email" && email) {
      saveToDisk(step, email)
    } else {
      clearSaved()
    }
  }, [step, email])

  useEffect(() => {
    if (step === "otp-code" && otpInputRef.current) {
      otpInputRef.current.focus()
    }
  }, [step])

  const handleSendOtp = async () => {
    if (!email.trim()) return
    setLoading(true)
    setError("")
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim(),
        type: "sign-in",
      })
      if (result.error) {
        setError(result.error.message || "Impossible d'envoyer le code")
      } else {
        setOtpSent(true)
        setStep("otp-code")
      }
    } catch (err: any) {
      setError(err?.message || "Erreur d'envoi du code")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) return
    setLoading(true)
    setError("")
    try {
      const result = await authClient.signIn.emailOtp({
        email: email.trim(),
        otp: otpCode,
      })
      if (result.error) {
        setError(result.error.message || "Code invalide")
      } else {
        clearSaved()
      }
    } catch (err: any) {
      setError(err?.message || "Erreur de vérification")
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSignIn = async () => {
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    setError("")
    try {
      const result = await authClient.signIn.email({
        email: email.trim(),
        password: password.trim(),
      })
      if (result.error) {
        setError(result.error.message || "Identifiants incorrects")
      } else {
        clearSaved()
      }
    } catch (err: any) {
      setError(err?.message || "Erreur de connexion")
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setStep("email")
    setError("")
    setOtpCode("")
    setPassword("")
    setOtpSent(false)
    clearSaved()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (step === "email") handleSendOtp()
      else if (step === "otp-code") handleVerifyOtp()
      else if (step === "password") handlePasswordSignIn()
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Diplomate<span className="text-primary">.ga</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Portail Agent Consulaire
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          {error && (
            <div className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-2.5">
              {error}
            </div>
          )}

          {/* Step 1: Email */}
          {step === "email" && (
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
                    onKeyDown={handleKeyDown}
                    placeholder="agent@consulat.ga"
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-muted text-foreground text-sm placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <button
                onClick={handleSendOtp}
                disabled={loading || !email.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                {loading ? "Envoi..." : "Envoyer le code par email"}
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-4 text-muted-foreground">ou</span>
                </div>
              </div>

              <button
                onClick={() => {
                  if (email.trim()) setStep("password")
                }}
                disabled={!email.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 disabled:opacity-50 transition-colors"
              >
                <KeyRound className="w-4 h-4" />
                Se connecter avec mot de passe
              </button>
            </>
          )}

          {/* Step 2a: OTP Code */}
          {step === "otp-code" && (
            <>
              <button
                onClick={handleBack}
                className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                {email}
              </button>

              {otpSent && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm text-foreground">
                  <Mail className="inline mr-1.5 h-4 w-4 text-primary" />
                  Code envoyé à <strong>{email}</strong>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Code de vérification
                </label>
                <input
                  ref={otpInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={handleKeyDown}
                  placeholder="000000"
                  className="w-full py-3 rounded-xl border border-border bg-muted text-foreground text-center text-2xl tracking-[0.5em] font-mono placeholder:text-muted-foreground/30 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={loading || otpCode.length !== 6}
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
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
              >
                Renvoyer le code
              </button>
            </>
          )}

          {/* Step 2b: Password */}
          {step === "password" && (
            <>
              <button
                onClick={handleBack}
                className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                {email}
              </button>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-foreground">
                    Mot de passe
                  </label>
                  <button
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="••••••••"
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-muted text-foreground text-sm placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <button
                onClick={handlePasswordSignIn}
                disabled={loading || !password.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </>
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground/50 mt-6">
          Diplomate.ga — République Gabonaise
        </p>
      </div>
    </div>
  )
}
