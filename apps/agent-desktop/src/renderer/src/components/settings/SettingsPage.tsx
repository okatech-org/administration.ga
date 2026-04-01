/**
 * Settings page — Full version matching web, plus desktop-specific Language & Printer tabs
 */

import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import {
  Bell,
  Bot,
  Briefcase,
  Building2,
  Check,
  Clock,
  Edit,
  Globe,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  Palette,
  Phone,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Settings2,
  Trash2,
  X,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { useOrg } from "../../hooks/useOrg"
import { useCanDoTask } from "../../hooks/useCanDoTask"
import { type ConsularTheme, useConsularTheme } from "../../hooks/useConsularTheme"
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "../../hooks/useConvexHooks"
import { useSettings } from "../../hooks/useSettings"
import { authClient } from "../../lib/auth-client"
import { cn } from "../../lib/utils"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Separator } from "@workspace/ui/components/separator"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"

/* ================================================== */
/*  Settings Layout (inlined from web shared)         */
/* ================================================== */

interface SettingsTab {
  id: string
  label: string
  icon?: React.ReactNode
  variant?: "default" | "destructive"
}

interface SettingsTabGroup {
  label: string
  tabs: SettingsTab[]
}

function SettingsLayout({
  title,
  description,
  groups,
  activeTab,
  onTabChange,
  children,
}: {
  title: string
  description?: string
  groups: SettingsTabGroup[]
  activeTab: string
  onTabChange: (tabId: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col p-3 md:p-6 min-h-full overflow-auto w-full max-w-[1400px] mx-auto">
      <div className="flex flex-col gap-1 mb-4 md:mb-6">
        <h1 className="text-xl md:text-3xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm md:text-base text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="flex flex-col md:flex-row bg-card rounded-2xl border shadow-sm flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-full md:w-56 lg:w-64 border-b md:border-b-0 md:border-r px-2 py-2 md:p-4 shrink-0 flex flex-row md:flex-col gap-1 bg-muted/20 overflow-x-auto">
          {groups.map((group, gi) => (
            <div
              key={group.label || gi}
              className={cn(
                "flex flex-row md:flex-col gap-1",
                gi > 0 && "md:mt-3 md:pt-3 md:border-t md:border-border/30",
              )}
            >
              {group.label && (
                <p className="hidden md:block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-4 py-1">
                  {group.label}
                </p>
              )}
              {group.tabs.map((tab) => {
                const isActive = tab.id === activeTab
                return (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={cn(
                      "flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-sm transition-colors text-left whitespace-nowrap shrink-0 md:shrink md:w-full",
                      isActive
                        ? "bg-primary text-primary-foreground font-medium"
                        : tab.variant === "destructive"
                          ? "text-destructive hover:bg-destructive/10"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {tab.icon && <span className="shrink-0">{tab.icon}</span>}
                    {tab.label}
                  </button>
                )
              })}
            </div>
          ))}
        </aside>

        {/* Content */}
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

function SettingsSectionHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

function SettingsRow({
  title,
  description,
  action,
  value,
  className: extraClassName,
}: {
  title: string | React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  value?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b last:border-b-0 gap-3",
        extraClassName,
      )}
    >
      <div className="flex-1 space-y-0.5 pr-4">
        <div className="font-medium text-sm text-foreground">{title}</div>
        {description && (
          <div className="text-sm text-muted-foreground">{description}</div>
        )}
      </div>
      <div className="flex items-center gap-4 sm:shrink-0">
        {value && (
          <div className="text-sm font-medium truncate max-w-[200px] sm:max-w-[300px]">
            {value}
          </div>
        )}
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  )
}

function SettingsDivider() {
  return <Separator className="my-8" />
}

/* ================================================== */
/*  Constants                                         */
/* ================================================== */

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]

/* ================================================== */
/*  Main Settings Page                                */
/* ================================================== */

export function SettingsPage() {
  const { orgId } = useOrg()
  const { t, i18n } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState("profile")

  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const { canDo, isReady: permissionsReady } = useCanDoTask(orgId ?? undefined)

  // ── Session data ──
  const { data: session } = authClient.useSession()

  // ── Desktop-specific settings ──
  const { settings: desktopSettings, updateSettings: updateDesktopSettings, resetSettings: resetDesktopSettings } = useSettings()

  // ── OTP reset state ──
  const [resetStep, setResetStep] = useState<"idle" | "otp_sent" | "done">("idle")
  const [resetOtp, setResetOtp] = useState("")
  const [resetNewPassword, setResetNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState(false)

  const handleSendResetOtp = async () => {
    const email = session?.user?.email
    if (!email) return
    setResetError(null)
    setResetLoading(true)
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "forget-password",
      })
      if (result.error) {
        setResetError(result.error.message || t("settings.security.changeFailed"))
      } else {
        setResetStep("otp_sent")
      }
    } catch {
      setResetError(t("settings.security.changeFailed"))
    } finally {
      setResetLoading(false)
    }
  }

  const handleResetWithOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = session?.user?.email
    if (!email) return
    if (resetNewPassword.length < 8) {
      setResetError(t("settings.security.passwordTooShort"))
      return
    }
    if (resetNewPassword !== confirmPassword) {
      setResetError(t("settings.security.passwordMismatch"))
      return
    }
    setResetError(null)
    setResetLoading(true)
    try {
      const result = await authClient.emailOtp.resetPassword({
        email,
        otp: resetOtp,
        password: resetNewPassword,
      })
      if (result.error) {
        setResetError(result.error.message || t("settings.security.changeFailed"))
      } else {
        setResetSuccess(true)
        setResetStep("done")
        setResetOtp("")
        setResetNewPassword("")
        setConfirmPassword("")
        setTimeout(() => {
          setResetSuccess(false)
          setResetStep("idle")
        }, 4000)
      }
    } catch {
      setResetError(t("settings.security.changeFailed"))
    } finally {
      setResetLoading(false)
    }
  }

  // Granular permission checks
  const canViewOrgSettings = permissionsReady && canDo("settings.view")
  const canManageSettings = permissionsReady && canDo("settings.manage")

  const { data: org } = useAuthenticatedConvexQuery(
    api.functions.orgs.getById,
    orgId ? { orgId } : "skip",
  )
  const { mutateAsync: updateProfile } = useConvexMutationQuery(
    api.functions.orgs.update,
  )

  // ── Form state (plain React, no @tanstack/react-form) ──
  const [formValues, setFormValues] = useState({
    name: "",
    description: "",
    phone: "",
    email: "",
    website: "",
    street: "",
    city: "",
    postalCode: "",
    country: "",
    workingHours: {} as Record<string, any[]>,
    appointmentBuffer: 30,
    requestAssignment: "manual",
    defaultProcessingDays: 15,
    aiAnalysisEnabled: true,
  })

  const setField = <K extends keyof typeof formValues>(key: K, value: (typeof formValues)[K]) => {
    setFormValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleEdit = () => {
    if (org) {
      setFormValues({
        name: org.name || "",
        description: org.description || "",
        phone: org.phone || "",
        email: org.email || "",
        website: org.website || "",
        street: org.address?.street || "",
        city: org.address?.city || "",
        postalCode: org.address?.postalCode || "",
        country: org.address?.country || "",
        workingHours: (org.settings?.workingHours as Record<string, any[]>) || {},
        appointmentBuffer: org.settings?.appointmentBuffer || 30,
        requestAssignment: (org.settings?.requestAssignment as string) || "manual",
        defaultProcessingDays: org.settings?.defaultProcessingDays || 15,
        aiAnalysisEnabled: org.settings?.aiAnalysisEnabled !== false,
      })
      setIsEditing(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId) return
    try {
      await updateProfile({
        orgId,
        name: formValues.name || undefined,
        description: formValues.description || undefined,
        phone: formValues.phone || undefined,
        email: formValues.email || undefined,
        website: formValues.website || undefined,
        address: {
          street: formValues.street,
          city: formValues.city,
          postalCode: formValues.postalCode,
          country: formValues.country as any,
        },
        settings: {
          workingHours: formValues.workingHours,
          appointmentBuffer: Number(formValues.appointmentBuffer),
          maxActiveRequests: org?.settings?.maxActiveRequests || 10,
          requestAssignment: formValues.requestAssignment as "manual" | "auto",
          defaultProcessingDays: Number(formValues.defaultProcessingDays),
          aiAnalysisEnabled: formValues.aiAnalysisEnabled,
        },
      })
      toast.success(t("dashboard.settings.updateSuccess"))
      setIsEditing(false)
    } catch {
      toast.error(t("dashboard.settings.updateError"))
    }
  }

  // ── Language state (desktop-specific) ──
  const currentLang = i18n.language?.startsWith("en") ? "en" : "fr"

  if (org === undefined || !permissionsReady) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[200px]" />
        </div>
      </div>
    )
  }

  if (!org) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <p className="text-muted-foreground">
          {t("dashboard.settings.notFound")}
        </p>
      </div>
    )
  }

  const getOrgTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      embassy: t("dashboard.settings.orgTypes.embassy"),
      high_representation: t("dashboard.settings.orgTypes.highRepresentation"),
      general_consulate: t("dashboard.settings.orgTypes.generalConsulate"),
      high_commission: t("dashboard.settings.orgTypes.highCommission"),
      permanent_mission: t("dashboard.settings.orgTypes.permanentMission"),
      third_party: t("dashboard.settings.orgTypes.thirdParty"),
    }
    return types[type] || type
  }

  const GROUPS: SettingsTabGroup[] = [
    // ── Organisme (admin only) ──
    ...(canViewOrgSettings
      ? [
          {
            label: "Organisme",
            tabs: [
              {
                id: "profile",
                label: "Profil & Identite",
                icon: <Building2 className="size-4" />,
              },
              {
                id: "hours",
                label: "Horaires & Accueil",
                icon: <Clock className="size-4" />,
              },
              {
                id: "services",
                label: "Services",
                icon: <Briefcase className="size-4" />,
              },
              {
                id: "requestProcessing",
                label: "Traitement",
                icon: <Settings2 className="size-4" />,
              },
            ],
          },
        ]
      : []),
    // ── Mon espace (all) ──
    {
      label: "Mon espace",
      tabs: [
        {
          id: "preferences",
          label: "Notifications",
          icon: <Bell className="size-4" />,
        },
        {
          id: "appearance",
          label: "Apparence",
          icon: <Palette className="size-4" />,
        },
        {
          id: "language",
          label: t("desktop.settings.tabs.language"),
          icon: <Globe className="size-4" />,
        },
        {
          id: "printer",
          label: t("desktop.settings.tabs.printer"),
          icon: <Printer className="size-4" />,
        },
      ],
    },
    // ── Compte (all) ──
    {
      label: "Compte",
      tabs: [
        {
          id: "accountSecurity",
          label: "Securite",
          icon: <KeyRound className="size-4" />,
        },
      ],
    },
  ]

  return (
    <>
      <SettingsLayout
        title={t("dashboard.settings.title")}
        description={t("dashboard.settings.description")}
        groups={GROUPS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        <div className="flex justify-end mb-6">
          {canManageSettings &&
            !isEditing &&
            activeTab in { profile: 1, hours: 1, requestProcessing: 1 } && (
              <Button onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                {t("dashboard.settings.edit")}
              </Button>
            )}
          {isEditing && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsEditing(false)}
              >
                <X className="mr-2 h-4 w-4" />
                {t("common.cancel")}
              </Button>
              <Button type="submit" form="settings-form">
                <Save className="mr-2 h-4 w-4" />
                {t("dashboard.settings.save")}
              </Button>
            </div>
          )}
        </div>

        <form id="settings-form" onSubmit={handleSubmit}>
          {/* ─── Org Settings ─── */}
          {canViewOrgSettings && (
            <>
              {/* Profile tab */}
              <div
                className={cn(
                  "space-y-8 animate-in fade-in duration-300",
                  activeTab !== "profile" && "hidden",
                )}
              >
                <div>
                  <SettingsSectionHeader
                    title={t("dashboard.settings.orgProfile")}
                    description={t("dashboard.settings.orgProfileDescription")}
                  />
                  <div className="max-w-2xl px-1">
                    <FieldGroup>
                      {isEditing ? (
                        <>
                          <Field>
                            <FieldLabel htmlFor="name">
                              {t("dashboard.settings.name")}
                            </FieldLabel>
                            <Input
                              id="name"
                              value={formValues.name}
                              onChange={(e) => setField("name", e.target.value)}
                            />
                          </Field>
                          <div>
                            <FieldLabel>
                              {t("dashboard.settings.type")}
                            </FieldLabel>
                            <Badge variant="secondary">
                              {getOrgTypeLabel(org.type)}
                            </Badge>
                          </div>
                          <Field>
                            <FieldLabel htmlFor="description">
                              {t("dashboard.settings.descriptionLabel")}
                            </FieldLabel>
                            <Textarea
                              id="description"
                              value={formValues.description}
                              onChange={(e) => setField("description", e.target.value)}
                              rows={3}
                            />
                          </Field>
                        </>
                      ) : (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {t("dashboard.settings.name")}
                            </p>
                            <p className="font-medium">{org.name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {t("dashboard.settings.type")}
                            </p>
                            <Badge variant="secondary">
                              {getOrgTypeLabel(org.type)}
                            </Badge>
                          </div>
                          {org.description && (
                            <div>
                              <p className="text-sm text-muted-foreground">
                                {t("dashboard.settings.descriptionLabel")}
                              </p>
                              <p className="text-sm">{org.description}</p>
                            </div>
                          )}
                        </>
                      )}
                    </FieldGroup>
                  </div>
                </div>

                {/* Address */}
                <div className="mt-8">
                  <SettingsSectionHeader title={t("dashboard.settings.address")} />
                  <div className="max-w-2xl px-1">
                    <FieldGroup>
                      {isEditing ? (
                        <>
                          <Field>
                            <FieldLabel htmlFor="street">
                              {t("dashboard.settings.street")}
                            </FieldLabel>
                            <Input
                              id="street"
                              value={formValues.street}
                              onChange={(e) => setField("street", e.target.value)}
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="city">
                              {t("dashboard.settings.city")}
                            </FieldLabel>
                            <Input
                              id="city"
                              value={formValues.city}
                              onChange={(e) => setField("city", e.target.value)}
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="postalCode">
                              {t("dashboard.settings.postalCode")}
                            </FieldLabel>
                            <Input
                              id="postalCode"
                              value={formValues.postalCode}
                              onChange={(e) => setField("postalCode", e.target.value)}
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="country">
                              {t("dashboard.settings.country")}
                            </FieldLabel>
                            <Input
                              id="country"
                              value={formValues.country}
                              onChange={(e) => setField("country", e.target.value)}
                            />
                          </Field>
                        </>
                      ) : org.address ? (
                        <>
                          {org.address.street && <p>{org.address.street}</p>}
                          <p>
                            {org.address.city}
                            {org.address.postalCode && `, ${org.address.postalCode}`}
                          </p>
                          <p>{org.address.country}</p>
                        </>
                      ) : (
                        <p className="text-muted-foreground">
                          {t("dashboard.settings.noAddress")}
                        </p>
                      )}
                    </FieldGroup>
                  </div>
                </div>

                {/* Contact */}
                <div className="mt-8">
                  <SettingsSectionHeader title={t("dashboard.settings.contact")} />
                  <div className="max-w-2xl px-1">
                    <FieldGroup>
                      {isEditing ? (
                        <>
                          <Field>
                            <FieldLabel htmlFor="phone">
                              {t("dashboard.settings.phone")}
                            </FieldLabel>
                            <Input
                              id="phone"
                              value={formValues.phone}
                              onChange={(e) => setField("phone", e.target.value)}
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="email">
                              {t("dashboard.settings.email")}
                            </FieldLabel>
                            <Input
                              id="email"
                              type="email"
                              value={formValues.email}
                              onChange={(e) => setField("email", e.target.value)}
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="website">
                              {t("dashboard.settings.website")}
                            </FieldLabel>
                            <Input
                              id="website"
                              value={formValues.website}
                              onChange={(e) => setField("website", e.target.value)}
                            />
                          </Field>
                        </>
                      ) : (
                        <>
                          {org.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span>{org.phone}</span>
                            </div>
                          )}
                          {org.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span>{org.email}</span>
                            </div>
                          )}
                          {org.website && (
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-muted-foreground" />
                              <a
                                href={org.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {org.website}
                              </a>
                            </div>
                          )}
                          {!org.phone && !org.email && !org.website && (
                            <p className="text-muted-foreground">
                              {t("dashboard.settings.noContact")}
                            </p>
                          )}
                        </>
                      )}
                    </FieldGroup>
                  </div>
                </div>
              </div>

              {/* Hours tab */}
              <div
                className={cn(
                  "space-y-8 animate-in fade-in duration-300",
                  activeTab !== "hours" && "hidden",
                )}
              >
                <div>
                  <SettingsSectionHeader title={t("dashboard.settings.workingHours")} />
                  <div className="max-w-2xl px-1">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 max-w-sm">
                          <FieldLabel className="whitespace-nowrap">
                            {t("dashboard.settings.appointmentBuffer")}
                          </FieldLabel>
                          <Input
                            type="number"
                            min="0"
                            value={formValues.appointmentBuffer}
                            onChange={(e) =>
                              setField("appointmentBuffer", Number(e.target.value))
                            }
                            className="w-24"
                          />
                          <span className="text-sm text-muted-foreground">min</span>
                        </div>

                        <div className="grid gap-4">
                          {DAYS_OF_WEEK.map((day) => (
                            <div
                              key={day}
                              className="flex flex-col sm:flex-row sm:items-center gap-4 p-3 border rounded-lg"
                            >
                              <div className="w-32 font-medium capitalize">
                                {t(`dashboard.settings.days.${day}`)}
                              </div>
                              <WorkingHoursSlots
                                slots={(formValues.workingHours[day] as any[]) || []}
                                onChange={(newSlots) => {
                                  setField("workingHours", {
                                    ...formValues.workingHours,
                                    [day]: newSlots,
                                  })
                                }}
                                t={t}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        <div className="flex gap-2 text-sm text-muted-foreground mb-2">
                          <span>{t("dashboard.settings.appointmentBuffer")}:</span>
                          <span className="font-medium text-foreground">
                            {org.settings?.appointmentBuffer || 30} min
                          </span>
                        </div>
                        {DAYS_OF_WEEK.map((day) => {
                          const slots = org.settings?.workingHours?.[day] || []
                          return (
                            <div
                              key={day}
                              className="flex justify-between items-center py-2 border-b last:border-0"
                            >
                              <span className="capitalize">
                                {t(`dashboard.settings.days.${day}`)}
                              </span>
                              <div className="text-right">
                                {slots.length > 0 ? (
                                  slots.map((slot: any, idx: number) => (
                                    <div key={idx} className="text-sm">
                                      {slot.start} - {slot.end}
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    {t("dashboard.settings.closed")}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Request Processing tab */}
              <div
                className={cn(
                  "space-y-8 animate-in fade-in duration-300",
                  activeTab !== "requestProcessing" && "hidden",
                )}
              >
                <div>
                  <SettingsSectionHeader
                    title={t("dashboard.settings.requestProcessing.title")}
                    description={t("dashboard.settings.requestProcessing.description")}
                  />
                  <div className="max-w-2xl px-1">
                    <FieldGroup>
                      {isEditing ? (
                        <div className="space-y-4">
                          {/* Assignment mode */}
                          <Field>
                            <FieldLabel>
                              {t("dashboard.settings.requestProcessing.assignmentMode")}
                            </FieldLabel>
                            <Select
                              value={formValues.requestAssignment}
                              onValueChange={(val) => setField("requestAssignment", val)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="manual">
                                  {t("dashboard.settings.requestProcessing.manual")}
                                </SelectItem>
                                <SelectItem value="auto">
                                  {t("dashboard.settings.requestProcessing.auto")}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              {formValues.requestAssignment === "auto"
                                ? t("dashboard.settings.requestProcessing.autoDesc")
                                : t("dashboard.settings.requestProcessing.manualDesc")}
                            </p>
                          </Field>

                          {/* Default processing days */}
                          <Field>
                            <FieldLabel>
                              {t("dashboard.settings.requestProcessing.processingDays")}
                            </FieldLabel>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={1}
                                max={365}
                                value={formValues.defaultProcessingDays}
                                onChange={(e) =>
                                  setField("defaultProcessingDays", Number(e.target.value))
                                }
                                className="w-24"
                              />
                              <span className="text-sm text-muted-foreground">
                                {t("dashboard.settings.requestProcessing.days")}
                              </span>
                            </div>
                          </Field>

                          {/* AI Analysis toggle */}
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="flex items-center gap-2">
                                <Bot className="h-4 w-4" />
                                {t("dashboard.settings.requestProcessing.aiAnalysis")}
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                {t("dashboard.settings.requestProcessing.aiAnalysisDesc")}
                              </p>
                            </div>
                            <Switch
                              checked={formValues.aiAnalysisEnabled}
                              onCheckedChange={(checked) =>
                                setField("aiAnalysisEnabled", checked)
                              }
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              {t("dashboard.settings.requestProcessing.assignmentMode")}
                            </span>
                            <Badge variant="secondary">
                              {org.settings?.requestAssignment === "auto"
                                ? t("dashboard.settings.requestProcessing.auto")
                                : t("dashboard.settings.requestProcessing.manual")}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              {t("dashboard.settings.requestProcessing.processingDays")}
                            </span>
                            <span className="font-medium text-sm">
                              {org.settings?.defaultProcessingDays || 15}{" "}
                              {t("dashboard.settings.requestProcessing.days")}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Bot className="h-3.5 w-3.5" />
                              {t("dashboard.settings.requestProcessing.aiAnalysis")}
                            </span>
                            <Badge
                              variant={
                                org.settings?.aiAnalysisEnabled !== false
                                  ? "default"
                                  : "outline"
                              }
                            >
                              {org.settings?.aiAnalysisEnabled !== false
                                ? t("common.enabled")
                                : t("common.disabled")}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </FieldGroup>
                  </div>
                </div>
              </div>
            </>
          )}
        </form>

        {/* ─── Services Tab ─── */}
        {canViewOrgSettings && (
          <div
            className={cn(
              "animate-in fade-in duration-300",
              activeTab !== "services" && "hidden",
            )}
          >
            <ServicesSettingsPanel orgId={orgId!} />
          </div>
        )}

        {/* ─── Notifications / Preferences ─── */}
        <div
          className={cn(
            "space-y-8 animate-in fade-in duration-300",
            activeTab !== "preferences" && "hidden",
          )}
        >
          {orgId && <MemberPreferencesCard orgId={orgId} />}
        </div>

        {/* ─── Account Security ─── */}
        <div
          className={cn(
            "animate-in fade-in duration-300",
            activeTab !== "accountSecurity" && "hidden",
          )}
        >
          <SettingsSectionHeader
            title={t("settings.security.accountInfo")}
            description={t("settings.security.accountInfoDesc")}
          />
          <div>
            <SettingsRow
              title={t("common.name")}
              value={session?.user?.name || "\u2014"}
            />
            <SettingsRow
              title={t("common.email")}
              value={session?.user?.email || "\u2014"}
            />
          </div>

          <SettingsDivider />

          {/* Password section */}
          <div className="max-w-2xl">
            <SettingsSectionHeader
              title={t("settings.security.changePassword")}
              description={t("settings.security.changePasswordDesc")}
            />
            <div className="max-w-md space-y-3">
              {resetError && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {resetError}
                </div>
              )}
              {resetSuccess && (
                <div className="rounded-lg border border-primary/50 bg-primary/10 px-3 py-2 text-sm text-primary flex items-center gap-2">
                  <Check className="size-4" />
                  {t("settings.security.resetSuccess")}
                </div>
              )}

              {resetStep === "idle" && (
                <Button
                  variant="outline"
                  onClick={handleSendResetOtp}
                  disabled={resetLoading || !session?.user?.email}
                >
                  {resetLoading ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 size-4" />
                  )}
                  {t("settings.security.sendResetCode")}
                </Button>
              )}

              {resetStep === "otp_sent" && (
                <form onSubmit={handleResetWithOtp} className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {t("settings.security.otpSentTo", {
                      email: session?.user?.email,
                    })}
                  </p>
                  <div className="space-y-2">
                    <Label>{t("settings.security.otpCode")}</Label>
                    <Input
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value)}
                      placeholder="123456"
                      required
                      autoComplete="one-time-code"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings.security.newPassword")}</Label>
                    <Input
                      type="password"
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings.security.confirmPassword")}</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={
                        resetLoading ||
                        !resetOtp ||
                        !resetNewPassword ||
                        !confirmPassword ||
                        resetNewPassword !== confirmPassword
                      }
                    >
                      {resetLoading && (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      )}
                      {t("settings.security.resetPassword")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setResetStep("idle")
                        setResetError(null)
                        setResetOtp("")
                        setResetNewPassword("")
                        setConfirmPassword("")
                      }}
                    >
                      {t("common.cancel")}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>

          <SettingsDivider />

          {/* Logout section */}
          <SettingsSectionHeader
            title={t("settings.account.title")}
            description={t("settings.account.description")}
          />
          <div>
            <SettingsRow
              title={t("common.logout")}
              description={t(
                "common.logoutConfirmDescription",
                "Vous allez etre deconnecte de votre session.",
              )}
              action={
                <Button
                  variant="destructive"
                  type="button"
                  onClick={() => setShowLogoutDialog(true)}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("common.logout")}
                </Button>
              }
            />
          </div>
        </div>

        {/* ─── Appearance ─── */}
        <div
          className={cn(
            "space-y-8 animate-in fade-in duration-300",
            activeTab !== "appearance" && "hidden",
          )}
        >
          <div>
            <SettingsSectionHeader
              title={t("settings.display.title")}
              description={t("settings.display.description")}
            />
            <DarkModeToggle />
          </div>

          <div className="mt-8">
            <SettingsSectionHeader
              title={t("settings.consularTheme.title")}
              description={t("settings.consularTheme.description")}
            />
            <ThemeSwitcher />
          </div>
        </div>

        {/* ─── Language (desktop-specific) ─── */}
        <div
          className={cn(
            "space-y-8 animate-in fade-in duration-300",
            activeTab !== "language" && "hidden",
          )}
        >
          <div>
            <SettingsSectionHeader
              title={t("desktop.settings.language.title")}
              description={t("desktop.settings.language.description")}
            />
            <div className="flex gap-2">
              <button
                onClick={() => i18n.changeLanguage("fr")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all",
                  currentLang === "fr"
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <span className="text-base">{"\uD83C\uDDEB\uD83C\uDDF7"}</span>
                {t("desktop.settings.language.french")}
              </button>
              <button
                onClick={() => i18n.changeLanguage("en")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all",
                  currentLang === "en"
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <span className="text-base">{"\uD83C\uDDEC\uD83C\uDDE7"}</span>
                {t("desktop.settings.language.english")}
              </button>
            </div>
          </div>
        </div>

        {/* ─── Printer (desktop-specific) ─── */}
        <div
          className={cn(
            "space-y-8 animate-in fade-in duration-300",
            activeTab !== "printer" && "hidden",
          )}
        >
          <div>
            <SettingsSectionHeader
              title={t("desktop.settings.printer.title")}
            />
            <div className="max-w-xl space-y-4">
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t("desktop.settings.printer.duplex")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("desktop.settings.printer.duplexDesc")}
                  </p>
                </div>
                <Switch
                  checked={desktopSettings.defaultDuplex}
                  onCheckedChange={(v) => updateDesktopSettings({ defaultDuplex: v })}
                />
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t("desktop.settings.printer.priority")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("desktop.settings.printer.priorityDesc")}
                  </p>
                </div>
                <Select
                  value={desktopSettings.defaultPriority}
                  onValueChange={(v) =>
                    updateDesktopSettings({ defaultPriority: v as any })
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">
                      {t("desktop.settings.printer.priorityNormal")}
                    </SelectItem>
                    <SelectItem value="high">
                      {t("desktop.settings.printer.priorityHigh")}
                    </SelectItem>
                    <SelectItem value="urgent">
                      {t("desktop.settings.printer.priorityUrgent")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t("desktop.settings.printer.autoPrint")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("desktop.settings.printer.autoPrintDesc")}
                  </p>
                </div>
                <Switch
                  checked={desktopSettings.autoStartPrint}
                  onCheckedChange={(v) => updateDesktopSettings({ autoStartPrint: v })}
                />
              </div>

              <div className="pt-4">
                <button
                  onClick={resetDesktopSettings}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <RotateCcw className="size-4" />
                  {t("desktop.settings.reset")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </SettingsLayout>

      {/* Logout confirmation dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.logoutConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "common.logoutConfirmDescription",
                "Vous allez etre deconnecte de votre session. Vous devrez vous reconnecter pour acceder a votre espace.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await authClient.signOut()
                window.location.href = "/"
              }}
            >
              {t("common.logout")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/* ================================================== */
/*  Working Hours Slots Editor                        */
/* ================================================== */

function WorkingHoursSlots({
  slots,
  onChange,
  t,
}: {
  slots: any[]
  onChange: (newSlots: any[]) => void
  t: (key: string) => string
}) {
  return (
    <div className="flex-1 space-y-2">
      {slots.map((slot: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            type="time"
            value={slot.start}
            onChange={(e) => {
              const newSlots = [...slots]
              newSlots[index] = { ...slot, start: e.target.value }
              onChange(newSlots)
            }}
            className="w-32"
          />
          <span>-</span>
          <Input
            type="time"
            value={slot.end}
            onChange={(e) => {
              const newSlots = [...slots]
              newSlots[index] = { ...slot, end: e.target.value }
              onChange(newSlots)
            }}
            className="w-32"
          />
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => {
              onChange(slots.filter((_, i) => i !== index))
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        type="button"
        onClick={() => {
          onChange([...slots, { start: "09:00", end: "17:00", isOpen: true }])
        }}
      >
        <Plus className="mr-2 h-4 w-4" />
        {t("dashboard.settings.addSlot")}
      </Button>
    </div>
  )
}

/* ================================================== */
/*  Dark Mode Toggle                                  */
/* ================================================== */

function DarkModeToggle() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <label className="text-sm font-medium">
          {t("settings.display.darkMode")}
        </label>
        <p className="text-sm text-muted-foreground">
          {t("settings.display.darkModeDesc")}
        </p>
      </div>
      <Switch
        checked={theme === "dark"}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
      />
    </div>
  )
}

/* ================================================== */
/*  Theme Switcher (Classique / Homeomorphism)        */
/* ================================================== */

function ThemePreview({
  themeId,
  label,
  description,
  isActive,
  onClick,
}: {
  themeId: ConsularTheme
  label: string
  description: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer w-full text-left",
        isActive
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border hover:border-muted-foreground/30 hover:bg-muted/30",
      )}
    >
      <div
        className={cn(
          "w-16 h-12 rounded-lg overflow-hidden relative shrink-0",
          themeId === "default"
            ? "bg-card border border-border"
            : "bg-[oklch(0.92_0.005_250)]",
        )}
      >
        {themeId === "default" ? (
          <div className="p-1.5 space-y-1">
            <div className="h-1.5 w-5 bg-primary/20 rounded" />
            <div className="h-2.5 bg-muted rounded border border-border" />
            <div className="flex gap-0.5">
              <div className="h-2 flex-1 bg-muted rounded border border-border" />
              <div className="h-2 flex-1 bg-muted rounded border border-border" />
            </div>
          </div>
        ) : (
          <div className="p-1.5 space-y-1">
            <div className="h-1.5 w-5 bg-primary/20 rounded" />
            <div className="h-2.5 rounded neu-preview-element" />
            <div className="flex gap-0.5">
              <div className="h-2 flex-1 rounded neu-preview-element" />
              <div className="h-2 flex-1 rounded neu-preview-element" />
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground leading-tight truncate">
          {description}
        </p>
      </div>
      {isActive && <div className="w-3 h-3 rounded-full bg-primary shrink-0" />}
    </button>
  )
}

function ThemeSwitcher() {
  const { t } = useTranslation()
  const { consularTheme, setConsularTheme } = useConsularTheme()
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <ThemePreview
        themeId="default"
        label={t("settings.consularTheme.default")}
        description={t("settings.consularTheme.defaultDesc")}
        isActive={consularTheme === "default"}
        onClick={() => setConsularTheme("default")}
      />
      <ThemePreview
        themeId="homeomorphism"
        label={t("settings.consularTheme.homeomorphism")}
        description={t("settings.consularTheme.homeomorphismDesc")}
        isActive={consularTheme === "homeomorphism"}
        onClick={() => setConsularTheme("homeomorphism")}
      />
    </div>
  )
}

/* ================================================== */
/*  Member Preferences Card                           */
/* ================================================== */

function MemberPreferencesCard({ orgId }: { orgId: Id<"orgs"> }) {
  const { t } = useTranslation()

  const { data: memberSettings } = useAuthenticatedConvexQuery(
    api.functions.userPreferences.getMyMembershipSettings,
    { orgId },
  )
  const { mutateAsync: updateSettings } = useConvexMutationQuery(
    api.functions.userPreferences.updateMyMembershipSettings,
  )

  const handleToggle = async (key: string, value: boolean) => {
    try {
      await updateSettings({
        orgId,
        [key]: value,
      })
      toast.success(t("settings.memberPreferences.updateSuccess"))
    } catch {
      toast.error(t("settings.memberPreferences.updateError"))
    }
  }

  if (memberSettings === undefined) {
    return (
      <div className="py-6 border rounded-xl bg-card p-6">
        <Skeleton className="h-[120px]" />
      </div>
    )
  }

  if (memberSettings === null) return null

  const settings = memberSettings.settings

  const toggleItems = [
    {
      key: "notifyOnNewRequest",
      label: t("settings.memberPreferences.notifyOnNewRequest"),
      desc: t("settings.memberPreferences.notifyOnNewRequestDesc"),
      value: settings.notifyOnNewRequest ?? true,
    },
    {
      key: "notifyOnAssignment",
      label: t("settings.memberPreferences.notifyOnAssignment"),
      desc: t("settings.memberPreferences.notifyOnAssignmentDesc"),
      value: settings.notifyOnAssignment ?? true,
    },
    {
      key: "dailyDigest",
      label: t("settings.memberPreferences.dailyDigest"),
      desc: t("settings.memberPreferences.dailyDigestDesc"),
      value: settings.dailyDigest ?? false,
    },
  ]

  return (
    <div>
      <SettingsSectionHeader
        title={t("settings.memberPreferences.title")}
        description={t("settings.memberPreferences.description")}
      />
      <div className="space-y-0 max-w-xl">
        {toggleItems.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between py-4 border-b last:border-0"
          >
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">{item.label}</Label>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <Switch
              checked={item.value}
              onCheckedChange={(checked) => handleToggle(item.key, checked)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ================================================== */
/*  Services Settings Panel                           */
/* ================================================== */

function ServicesSettingsPanel({ orgId }: { orgId: Id<"orgs"> }) {
  const { t, i18n } = useTranslation()

  const [searchQuery, setSearchQuery] = useState("")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<string>("")
  const [activationForm, setActivationForm] = useState({
    fee: 0,
    currency: "EUR",
    requiresAppointment: false,
    requiresAppointmentForPickup: false,
    instructions: "",
  })

  // ── Queries ──
  const { data: catalogServices } = useAuthenticatedConvexQuery(
    api.functions.services.listCatalog,
    {},
  )
  const { data: orgServices } = useAuthenticatedConvexQuery(
    api.functions.services.listByOrg,
    { orgId, activeOnly: false },
  )

  // ── Mutations ──
  const { mutateAsync: toggleActive } = useConvexMutationQuery(
    api.functions.services.toggleOrgServiceActive,
  )
  const { mutateAsync: activateService } = useConvexMutationQuery(
    api.functions.services.activateForOrg,
  )

  // ── Merge catalog + org services ──
  const mergedServices = useMemo(() => {
    if (!catalogServices) return []
    const orgMap = new Map(
      (orgServices ?? []).map((os: any) => [os.serviceId, os]),
    )
    return catalogServices.map((cs: any) => {
      const os = orgMap.get(cs._id) as any
      let activationState: "active" | "inactive" | "not_activated" = "not_activated"
      if (os) {
        activationState = os.isActive ? "active" : "inactive"
      }
      return {
        catalogId: cs._id,
        slug: cs.slug,
        name: cs.name,
        description: cs.description,
        category: cs.category,
        icon: cs.icon,
        estimatedDays: cs.estimatedDays,
        requiresAppointment: cs.requiresAppointment,
        activationState,
        orgServiceId: os?._id,
        pricing: os?.pricing as { amount: number; currency: string } | undefined,
        isActive: os?.isActive,
      }
    })
  }, [catalogServices, orgServices])

  const availableForActivation = mergedServices.filter(
    (s) => s.activationState === "not_activated",
  )

  // ── Filtering ──
  const filteredServices = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    return mergedServices.filter((service) => {
      const name =
        typeof service.name === "string"
          ? service.name
          : ((service.name as any)?.[i18n.language] ||
              (service.name as any)?.fr ||
              (service.name as any)?.en ||
              "")
      const desc =
        typeof service.description === "string"
          ? service.description
          : ((service.description as any)?.[i18n.language] ||
              (service.description as any)?.fr ||
              (service.description as any)?.en ||
              "")
      return !query || name.toLowerCase().includes(query) || desc.toLowerCase().includes(query)
    })
  }, [mergedServices, searchQuery, i18n.language])

  // ── Handlers ──
  const handleToggle = async (service: any) => {
    if (!service.orgServiceId) return
    try {
      await toggleActive({ orgServiceId: service.orgServiceId as any })
      toast.success(t("dashboard.services.statusUpdated"))
    } catch {
      toast.error(t("dashboard.services.updateError"))
    }
  }

  const handleActivateService = async () => {
    if (!selectedService) return
    try {
      await activateService({
        orgId,
        serviceId: selectedService as any,
        pricing: { amount: activationForm.fee, currency: activationForm.currency },
        requiresAppointment: activationForm.requiresAppointment,
        requiresAppointmentForPickup: activationForm.requiresAppointmentForPickup,
      })
      toast.success(t("dashboard.services.activated"))
      setAddDialogOpen(false)
      setSelectedService("")
      setActivationForm({
        fee: 0,
        currency: "EUR",
        requiresAppointment: false,
        requiresAppointmentForPickup: false,
        instructions: "",
      })
    } catch (error: any) {
      toast.error(error.message || t("dashboard.services.updateError"))
    }
  }

  if (!catalogServices) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  const activeCount = mergedServices.filter((s) => s.activationState === "active").length
  const totalCount = mergedServices.length

  return (
    <>
      <SettingsSectionHeader
        title="Services"
        description={t(
          "dashboard.services.description",
          "Gerez les services disponibles pour votre organisme. Activez ou desactivez les services du catalogue.",
        )}
      />

      {/* Stats row */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2 text-sm">
          <div className="size-2 rounded-full bg-green-500" />
          <span className="text-muted-foreground">
            {activeCount} {t("dashboard.services.status.active", "actifs")}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="size-2 rounded-full bg-muted-foreground/30" />
          <span className="text-muted-foreground">
            {totalCount - activeCount}{" "}
            {t("dashboard.services.status.notActivated", "non actives")}
          </span>
        </div>
      </div>

      {/* Search + Add */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={t(
              "dashboard.services.searchPlaceholder",
              "Rechercher un service...",
            )}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background outline-none transition-all text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        </div>
        <Button
          onClick={() => {
            setSelectedService("")
            setActivationForm({
              fee: 0,
              currency: "EUR",
              requiresAppointment: false,
              requiresAppointmentForPickup: false,
              instructions: "",
            })
            setAddDialogOpen(true)
          }}
          disabled={availableForActivation.length === 0}
          size="sm"
          className="gap-1.5 shrink-0"
        >
          <Plus className="size-4" />
          {t("dashboard.services.activate")}
        </Button>
      </div>

      {/* Services list */}
      <div className="space-y-2">
        {filteredServices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t(
              "dashboard.services.empty.description",
              "Aucun service ne correspond a votre recherche.",
            )}
          </div>
        ) : (
          filteredServices.map((service) => {
            const name =
              typeof service.name === "string"
                ? service.name
                : ((service.name as any)?.[i18n.language] ||
                    (service.name as any)?.fr ||
                    (service.name as any)?.en ||
                    "")
            const isActivated = service.activationState !== "not_activated"
            const isActive = service.activationState === "active"

            return (
              <div
                key={service.catalogId}
                className={cn(
                  "flex items-center justify-between gap-4 px-4 py-3 rounded-xl border transition-colors",
                  isActivated ? "bg-card" : "bg-muted/30 border-dashed",
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "size-9 rounded-lg flex items-center justify-center shrink-0",
                      isActive
                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                        : isActivated
                          ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Briefcase className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{name}</p>
                    <p className="text-xs text-muted-foreground">
                      {isActive
                        ? t("dashboard.services.status.active")
                        : isActivated
                          ? t("dashboard.services.status.inactive")
                          : t("dashboard.services.status.notActivated")}
                      {service.pricing && isActivated && (
                        <>
                          {" "}
                          ·{" "}
                          {service.pricing.amount === 0
                            ? t("services.free", "Gratuit")
                            : `${service.pricing.amount} ${service.pricing.currency}`}
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isActivated ? (
                    <Switch
                      checked={isActive}
                      onCheckedChange={() => handleToggle(service)}
                    />
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1"
                      onClick={() => {
                        setSelectedService(service.catalogId)
                        setAddDialogOpen(true)
                      }}
                    >
                      <Plus className="size-3" />
                      {t("dashboard.services.activate")}
                    </Button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Activation Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dashboard.services.dialog.title")}</DialogTitle>
            <DialogDescription>
              {t(
                "dashboard.services.dialog.description",
                "Selectionnez un service du catalogue a activer pour votre organisme.",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("dashboard.services.dialog.selectService")}</Label>
              <Select
                value={selectedService}
                onValueChange={setSelectedService}
                disabled={!!selectedService}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t(
                      "dashboard.services.dialog.selectPlaceholder",
                      "Choisir un service...",
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableForActivation.length === 0 ? (
                    <div className="p-2 text-center text-muted-foreground">
                      {t(
                        "dashboard.services.dialog.allActivated",
                        "Tous les services sont deja actives",
                      )}
                    </div>
                  ) : (
                    availableForActivation.map((s) => {
                      const sName =
                        typeof s.name === "string"
                          ? s.name
                          : ((s.name as any)?.[i18n.language] ||
                              (s.name as any)?.fr ||
                              (s.name as any)?.en ||
                              "")
                      return (
                        <SelectItem key={s.catalogId} value={s.catalogId}>
                          {sName}
                        </SelectItem>
                      )
                    })
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("dashboard.services.dialog.fee")}</Label>
                <Input
                  type="number"
                  value={activationForm.fee}
                  onChange={(e) =>
                    setActivationForm({
                      ...activationForm,
                      fee: Number(e.target.value),
                    })
                  }
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("dashboard.services.dialog.currency")}</Label>
                <Select
                  value={activationForm.currency}
                  onValueChange={(v) =>
                    setActivationForm({ ...activationForm, currency: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                {t(
                  "dashboard.services.dialog.instructions",
                  "Instructions personnalisees",
                )}
              </Label>
              <Textarea
                value={activationForm.instructions}
                onChange={(e) =>
                  setActivationForm({
                    ...activationForm,
                    instructions: e.target.value,
                  })
                }
                placeholder={t(
                  "dashboard.services.dialog.instructionsPlaceholder",
                  "Instructions specifiques pour ce service...",
                )}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleActivateService} disabled={!selectedService}>
              {t("dashboard.services.dialog.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
