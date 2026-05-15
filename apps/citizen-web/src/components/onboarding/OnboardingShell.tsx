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
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  captureEvent,
  toRegistrationFlowType,
} from "@/lib/analytics"
import { useRegistrationAnalytics } from "@/lib/useRegistrationAnalytics"
import { DesktopRecapSidebar } from "./DesktopRecapSidebar"
import { DesktopStepsSidebar } from "./DesktopStepsSidebar"
import {
  STEPS_BY_TYPE,
  type IdentityPhase,
  type OnboardingStepKey,
} from "./lib/onboardingFlow"
import type { StepHandle } from "./lib/stepHandle"
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

/**
 * Track whether the viewport is desktop-sized (lg breakpoint = 1024px). We
 * render only ONE of the two layouts at a time — otherwise both trees mount
 * and keep their own per-instance state (e.g. IdentityStep's `phase`), which
 * causes the mobile tree to stay frozen at the initial sub-phase while the
 * desktop one progresses, and vice-versa.
 */
function useIsLargeViewport() {
  const [isLarge, setIsLarge] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)")
    const update = () => setIsLarge(mql.matches)
    update()
    mql.addEventListener("change", update)
    return () => mql.removeEventListener("change", update)
  }, [])
  return isLarge
}

export function OnboardingShell() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isLargeViewport = useIsLargeViewport()

  const STEP_TITLES: Record<
    OnboardingStepKey,
    { title: string; description?: string }
  > = useMemo(
    () => ({
      identity: {
        title: t("onboarding.shell.steps.identity.title"),
        description: t("onboarding.shell.steps.identity.description"),
      },
      family: {
        title: t("onboarding.shell.steps.family.title"),
        description: t("onboarding.shell.steps.family.description"),
      },
      contacts: {
        title: t("onboarding.shell.steps.contacts.title"),
        description: t("onboarding.shell.steps.contacts.description"),
      },
      profession: {
        title: t("onboarding.shell.steps.profession.title"),
        description: t("onboarding.shell.steps.profession.description"),
      },
      documents: {
        title: t("onboarding.shell.steps.documents.title"),
        description: t("onboarding.shell.steps.documents.description"),
      },
      review: {
        title: t("onboarding.shell.steps.review.title"),
        description: t("onboarding.shell.steps.review.description"),
      },
    }),
    [t]
  )

  const typeParam = searchParams.get("type")
  const initialType =
    typeParam && VALID_TYPES.has(typeParam)
      ? (typeParam as PublicUserType)
      : null

  const convex = useConvex()

  const [userType, setUserType] = useState<PublicUserType | null>(initialType)
  const [stepIndex, setStepIndex] = useState(0)
  const [data, setData] = useState<OnboardingData>({})
  const [draftLoaded, setDraftLoaded] = useState(!initialType)
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

  // Load draft on userType change. We reset `draftLoaded` first so that the
  // step bodies don't mount with empty defaults while waiting for the read.
  useEffect(() => {
    if (!userType) {
      setDraftLoaded(true)
      return
    }
    setDraftLoaded(false)
    const draft = loadDraft(userType)
    setData(draft)
    setDraftLoaded(true)
  }, [userType])

  // Autosave draft on data change (without sensitive fields).
  // Skip until the draft has been loaded — otherwise the initial empty `data`
  // overwrites the persisted draft before we get a chance to read it.
  useEffect(() => {
    if (!userType || !draftLoaded) return
    saveDraft(userType, data)
    setLastSavedAt(new Date())
  }, [userType, data, draftLoaded])

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

  // ── PostHog analytics ──────────────────────────────────────────
  // Émet automatiquement registration_started, registration_step_viewed
  // (sur main step) et registration_abandoned (beforeunload).
  const analyticsSteps = useMemo(
    () => steps.map((s) => ({ stepId: s.key })),
    [steps]
  )
  const flowType = userType
    ? toRegistrationFlowType(userType)
    : ("long_stay" as const)
  const analytics = useRegistrationAnalytics({
    flowType,
    step: stepIndex,
    steps: analyticsSteps,
  })

  // Sous-phases de IdentityStep : on émet step_viewed / step_completed /
  // step_back séparés pour garder la granularité PIN/OTP dans les funnels.
  // step_name suit le format `identity_<phase>` (identity_name, …).
  const handleIdentityPhaseChange = useCallback(
    (phase: IdentityPhase) => {
      captureEvent("registration_step_viewed", {
        flow_type: flowType,
        step_name: `identity_${phase}`,
        step_index: stepIndex,
        total_steps: steps.length,
      })
    },
    [flowType, stepIndex, steps.length]
  )

  const handleIdentityPhaseCompleted = useCallback(
    (phase: IdentityPhase, durationMs: number) => {
      captureEvent("registration_step_completed", {
        flow_type: flowType,
        step_name: `identity_${phase}`,
        step_index: stepIndex,
        total_steps: steps.length,
        time_on_step_ms: durationMs,
      })
    },
    [flowType, stepIndex, steps.length]
  )

  const handleIdentityPhaseBack = useCallback(
    (from: IdentityPhase, to: IdentityPhase) => {
      captureEvent("registration_step_back", {
        flow_type: flowType,
        from_step: `identity_${from}`,
        to_step: `identity_${to}`,
        from_step_index: stepIndex,
      })
    },
    [flowType, stepIndex]
  )

  const handleDocumentUploaded = useCallback(
    (docKey: string) => analytics.trackDocumentUploaded(docKey),
    [analytics]
  )

  const stepHandleRef = useRef<StepHandle | null>(null)

  const handleNext = useCallback(async () => {
    const handle = stepHandleRef.current
    if (handle) {
      const ok = await handle.validateAndNext()
      if (!ok) return
    }
    analytics.trackStepCompleted()
    setStepIndex((i) => Math.min(i + 1, steps.length - 1))
  }, [analytics, steps.length])

  const handlePrev = useCallback(() => {
    analytics.trackStepBack(Math.max(stepIndex - 1, 0))
    setStepIndex((i) => Math.max(i - 1, 0))
  }, [analytics, stepIndex])

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
      analytics.trackSubmitted({
        marital_status: data.maritalStatus,
        has_children: false,
        jurisdiction_country: data.address?.country,
      })
      // Purge le brouillon — soumission réussie.
      if (typeof window !== "undefined") {
        localStorage.removeItem(`${DRAFT_KEY_PREFIX}${userType}`)
      }
    } catch (err) {
      console.error("Submit error:", err)
      setSubmitError(
        err instanceof Error
          ? err.message
          : t("onboarding.shell.errors.submitGeneric")
      )
    } finally {
      setSubmitting(false)
    }
  }, [convex, data, files, userType, t, analytics])

  if (isSubmitted) {
    return (
      <div className="onboarding-root flex min-h-svh flex-col">
        <Header />
        <main className="flex-1">
          <SubmittedScreen
            reference={submittedRef || undefined}
            onRestart={handleRestart}
          />
        </main>
        <Footer />
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

  const profileTitle = t(`onboarding.shell.profileTitles.${userType}`)
  const savedAtLabel = lastSavedAt ? formatHourMinute(lastSavedAt) : undefined

  // Étapes qui gèrent leur propre navigation (Prev/Next contextuels).
  const selfNav =
    currentStep?.key === "identity" || currentStep?.key === "review"

  const stepBody = (() => {
    if (!currentStep) return null
    // Wait for the draft to be read from localStorage before mounting the
    // step component — otherwise useForm captures empty defaultValues and
    // wipes out the persisted data on the user's first interaction.
    if (!draftLoaded) {
      return (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <span suppressHydrationWarning>…</span>
        </div>
      )
    }
    switch (currentStep.key) {
      case "identity":
        return (
          <IdentityStep
            data={data}
            updateData={updateData}
            onComplete={handleNext}
            setFile={setFile}
            onPhaseChange={handleIdentityPhaseChange}
            onPhaseCompleted={handleIdentityPhaseCompleted}
            onPhaseBack={handleIdentityPhaseBack}
            onScanSuccess={analytics.trackAiScanUsed}
            onScanFailed={analytics.trackAiScanFailed}
          />
        )
      case "family":
        return (
          <FamilyStep
            ref={stepHandleRef}
            data={data}
            updateData={updateData}
          />
        )
      case "contacts":
        return (
          <ContactsStep
            ref={stepHandleRef}
            data={data}
            updateData={updateData}
            userType={userType}
          />
        )
      case "profession":
        return (
          <ProfessionStep
            ref={stepHandleRef}
            data={data}
            updateData={updateData}
          />
        )
      case "documents":
        return (
          <DocumentsStep
            ref={stepHandleRef}
            data={data}
            updateData={updateData}
            userType={userType}
            files={files}
            setFile={setFile}
            removeFile={removeFile}
            onDocumentUploaded={handleDocumentUploaded}
          />
        )
      case "review":
        return (
          <ReviewStep
            data={data}
            userType={userType}
            files={files}
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
      {/* Mobile / tablet — only mounted when viewport < lg, otherwise the
          desktop tree below holds the active component state. */}
      {!isLargeViewport && (
        <div className="flex min-h-svh flex-col">
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
      )}

      {/* Desktop */}
      {isLargeViewport && (
        <div>
        <Header />

        <div className="mx-auto grid grid-cols-[260px_1fr_320px] gap-8 px-8 py-8">
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
                  <span suppressHydrationWarning>
                    {t("onboarding.shell.nav.previous")}
                  </span>
                </Button>
                <Button onClick={handleNext} disabled={!canNext}>
                  <span suppressHydrationWarning>
                    {t("onboarding.shell.nav.continue")}
                  </span>
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
      )}
    </div>
  )
}
