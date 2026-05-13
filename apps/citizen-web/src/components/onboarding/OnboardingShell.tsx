"use client"

import "./onboarding.css"
import { Footer } from "@/components/Footer"
import Header from "@/components/Header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PublicUserType } from "@convex/lib/constants"
import { useConvex } from "convex/react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { DesktopRecapSidebar } from "./DesktopRecapSidebar"
import { DesktopStepsSidebar } from "./DesktopStepsSidebar"
import {
  PROFILE_TITLES,
  STEPS_BY_TYPE,
  type OnboardingStepKey,
} from "./lib/onboardingFlow"
import { submitRegistration } from "./lib/submitRegistration"
import { OnboardingMobileActionBar } from "./MobileActionBar"
import { OnboardingMobileHeader } from "./MobileHeader"
import { OnboardingMobileProgressHeader } from "./MobileProgressHeader"
import { ProfileSelectorScreen } from "./ProfileSelectorScreen"
import { ContactsStep } from "./steps/ContactsStep"
import { DocumentsStep, type RegistrationFiles } from "./steps/DocumentsStep"
import { FamilyStep } from "./steps/FamilyStep"
import { IdentityStep } from "./steps/IdentityStep"
import { ProfessionStep } from "./steps/ProfessionStep"
import { ReviewStep } from "./steps/ReviewStep"
import { StepPlaceholder } from "./steps/StepPlaceholder"
import { SubmittedScreen } from "./SubmittedScreen"
import type { OnboardingData } from "./types"
import { stripSensitive } from "./types"
import { GabonStripe } from "./ui/GabonStripe"

const VALID_TYPES = new Set<string>(Object.values(PublicUserType))

const DRAFT_KEY_PREFIX = "consulat_onboarding_draft_"

function loadDraft(userType: PublicUserType): OnboardingData {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(`${DRAFT_KEY_PREFIX}${userType}`)
    if (!raw) return {}
    return JSON.parse(raw) as OnboardingData
  } catch {
    return {}
  }
}

function saveDraft(userType: PublicUserType, data: OnboardingData) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(
      `${DRAFT_KEY_PREFIX}${userType}`,
      JSON.stringify(stripSensitive(data))
    )
  } catch (err) {
    console.error("Failed to save draft:", err)
  }
}

function formatHourMinute(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`
}

const STEP_TITLES: Record<
  OnboardingStepKey,
  { title: string; description?: string }
> = {
  identity: {
    title: "Identité",
    description:
      "Vos nom, coordonnées, mot de passe, code PIN et informations d'état civil.",
  },
  family: {
    title: "Situation familiale",
    description: "Statut marital et filiation.",
  },
  contacts: {
    title: "Adresses & contacts d'urgence",
    description: "Vos adresses et les personnes à contacter en cas de besoin.",
  },
  profession: {
    title: "Situation professionnelle",
    description: "Votre activité actuelle.",
  },
  documents: {
    title: "Pièces justificatives",
    description: "Téléversez les pièces nécessaires à votre dossier.",
  },
  review: {
    title: "Révision et soumission",
    description: "Relisez votre dossier avant l'envoi.",
  },
}

export function OnboardingShell() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const typeParam = searchParams.get("type")
  const initialType =
    typeParam && VALID_TYPES.has(typeParam)
      ? (typeParam as PublicUserType)
      : null

  const convex = useConvex()

  const [userType, setUserType] = useState<PublicUserType | null>(initialType)
  const [stepIndex, setStepIndex] = useState(0)
  const [data, setData] = useState<OnboardingData>({})
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  // Fichiers en mémoire — non persistés (File n'est pas sérialisable).
  // Si l'utilisateur recharge la page, il devra re-téléverser.
  const [files, setFiles] = useState<RegistrationFiles>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submittedRef, setSubmittedRef] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const setFile = useCallback((key: string, file: File) => {
    setFiles((prev) => ({ ...prev, [key]: file }))
  }, [])

  const removeFile = useCallback((key: string) => {
    setFiles((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  // Sync URL when userType changes (without scroll reset)
  useEffect(() => {
    if (!userType) return
    const currentType = searchParams.get("type")
    if (currentType !== userType) {
      const params = new URLSearchParams(searchParams.toString())
      params.set("type", userType)
      router.replace(`/register?${params.toString()}`, { scroll: false })
    }
  }, [userType, router, searchParams])

  // Load draft on userType change
  useEffect(() => {
    if (!userType) return
    const draft = loadDraft(userType)
    setData(draft)
  }, [userType])

  // Autosave draft on data change (without sensitive fields)
  useEffect(() => {
    if (!userType) return
    saveDraft(userType, data)
    setLastSavedAt(new Date())
  }, [userType, data])

  const updateData = useCallback((patch: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...patch }))
  }, [])

  const steps = useMemo(
    () => (userType ? STEPS_BY_TYPE[userType] : []),
    [userType]
  )

  const currentStep = steps[stepIndex]
  const stepTitle = currentStep
    ? STEP_TITLES[currentStep.key]
    : { title: "", description: undefined }

  const canPrev = stepIndex > 0
  const canNext = stepIndex < steps.length - 1

  const handleNext = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, steps.length - 1))
  }, [steps.length])

  const handlePrev = useCallback(() => {
    setStepIndex((i) => Math.max(i - 1, 0))
  }, [])

  const handleJump = useCallback(
    (idx: number) => {
      if (idx >= 0 && idx <= stepIndex) setStepIndex(idx)
    },
    [stepIndex]
  )

  const handleRestart = useCallback(() => {
    setUserType(null)
    setStepIndex(0)
    setData({})
    setFiles({})
    setSubmittedRef(null)
    setIsSubmitted(false)
    setSubmitError(null)
    router.replace("/register", { scroll: false })
  }, [router])

  const handleJumpByKey = useCallback(
    (key: OnboardingStepKey) => {
      const idx = steps.findIndex((s) => s.key === key)
      if (idx >= 0 && idx <= stepIndex) setStepIndex(idx)
    },
    [steps, stepIndex]
  )

  const handleSubmit = useCallback(async () => {
    if (!userType) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const result = await submitRegistration({
        convex,
        userType,
        data,
        files,
      })
      setSubmittedRef(result.reference ?? null)
      setIsSubmitted(true)
      // Purge le brouillon — soumission réussie.
      if (typeof window !== "undefined") {
        localStorage.removeItem(`${DRAFT_KEY_PREFIX}${userType}`)
      }
    } catch (err) {
      console.error("Submit error:", err)
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de la soumission."
      )
    } finally {
      setSubmitting(false)
    }
  }, [convex, data, files, userType])

  if (isSubmitted) {
    return (
      <div className="onboarding-root">
        <SubmittedScreen
          reference={submittedRef || undefined}
          onRestart={handleRestart}
        />
      </div>
    )
  }

  if (!userType) {
    return (
      <div className="onboarding-root flex min-h-svh flex-col">
        <Header />
        <main className="flex-1">
          <ProfileSelectorScreen
            onSelectPrimary={(t) => setUserType(t)}
            onSelectVisa={(t) => setUserType(t)}
          />
        </main>
        <Footer />
      </div>
    )
  }

  const profileTitle = PROFILE_TITLES[userType]
  const savedAtLabel = lastSavedAt ? formatHourMinute(lastSavedAt) : undefined

  // Étapes qui gèrent leur propre navigation (Prev/Next contextuels).
  const selfNav =
    currentStep?.key === "identity" || currentStep?.key === "review"

  const stepBody = (() => {
    if (!currentStep) return null
    switch (currentStep.key) {
      case "identity":
        return (
          <IdentityStep
            data={data}
            updateData={updateData}
            onComplete={handleNext}
            setFile={setFile}
          />
        )
      case "family":
        return <FamilyStep data={data} updateData={updateData} />
      case "contacts":
        return (
          <ContactsStep
            data={data}
            updateData={updateData}
            userType={userType}
          />
        )
      case "profession":
        return <ProfessionStep data={data} updateData={updateData} />
      case "documents":
        return (
          <DocumentsStep
            data={data}
            updateData={updateData}
            userType={userType}
            files={files}
            setFile={setFile}
            removeFile={removeFile}
          />
        )
      case "review":
        return (
          <ReviewStep
            data={data}
            userType={userType}
            onJump={handleJumpByKey}
            onSubmit={handleSubmit}
            submitting={submitting}
            submitError={submitError}
          />
        )
      default:
        return (
          <div className="flex flex-col gap-6">
            <StepPlaceholder
              title={stepTitle.title}
              description={stepTitle.description}
            />
          </div>
        )
    }
  })()

  return (
    <div className="onboarding-root">
      {/* Mobile / tablet */}
      <div className="flex min-h-svh flex-col lg:hidden">
        <OnboardingMobileHeader
          onBack={canPrev ? handlePrev : handleRestart}
          savedAt={savedAtLabel}
        />
        {currentStep && (
          <OnboardingMobileProgressHeader
            step={currentStep}
            currentIndex={stepIndex}
            totalSteps={steps.length}
          />
        )}
        <main className="onboarding-mobile-main flex flex-1 flex-col px-4 py-5">
          {stepBody}
        </main>
        {!selfNav && (
          <OnboardingMobileActionBar
            onPrev={handlePrev}
            onNext={handleNext}
            canPrev={canPrev}
            canNext={canNext}
          />
        )}
      </div>

      {/* Desktop */}
      <div className="hidden lg:block">
        <Header />

        <div className="mx-auto grid max-w-[1400px] grid-cols-[260px_1fr_320px] gap-8 px-8 py-8">
          <DesktopStepsSidebar
            steps={steps}
            currentIndex={stepIndex}
            onJump={handleJump}
            profileTitle={profileTitle}
            onChangeProfile={handleRestart}
          />

          <div className="flex min-w-0 flex-col gap-6">
            <Card className="relative overflow-hidden p-0">
              <GabonStripe variant="compact" />
              <CardContent className="p-6">{stepBody}</CardContent>
            </Card>
            {!selfNav && (
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handlePrev}
                  disabled={!canPrev}
                >
                  <ArrowLeft className="mr-1 size-4" />
                  Précédent
                </Button>
                <Button onClick={handleNext} disabled={!canNext}>
                  Continuer
                  <ArrowRight className="ml-1 size-4" />
                </Button>
              </div>
            )}
          </div>

          <DesktopRecapSidebar
            data={data}
            userType={userType}
            savedAtLabel={savedAtLabel}
            files={files}
          />
        </div>
      </div>
    </div>
  )
}
