"use client"

import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { useForm } from "@tanstack/react-form"
import { useParams, useRouter, useSearchParams } from "@workspace/routing"
import { ArrowLeft, Save, Sparkles } from "lucide-react"
import { useCallback, useId } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { useOrg } from "../../shell/org-provider"
import { AutoGenerationRulesPanel } from "./components/auto-generation-rules-panel"
import { Button } from "@workspace/ui/components/button"
import { FlatCard } from "../../components/my-space/flat-card"
import { Field, FieldError, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Switch } from "@workspace/ui/components/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@workspace/api/hooks"

type TabValue = "general" | "autoGeneration"

function isTabValue(v: string | null): v is TabValue {
  return v === "general" || v === "autoGeneration"
}

export default function EditServicePage() {
  const formId = useId()
  const { serviceId } = useParams()
  const { activeOrgId } = useOrg()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation()

  // Onglet actif persisté dans l'URL (?tab=general | ?tab=autoGeneration).
  const rawTab = searchParams.get("tab")
  const activeTab: TabValue = isTabValue(rawTab) ? rawTab : "general"

  const setActiveTab = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next === "general") {
        params.delete("tab")
      } else {
        params.set("tab", next)
      }
      const query = params.toString()
      router.replace(
        query
          ? `/services/${serviceId}/edit?${query}`
          : `/services/${serviceId}/edit`,
        { scroll: false }
      )
    },
    [router, searchParams, serviceId]
  )

  const { data } = useAuthenticatedConvexQuery(
    api.functions.services.getOrgServiceById,
    { orgServiceId: serviceId as Id<"orgServices"> }
  )

  const { mutateAsync: updateConfig } = useConvexMutationQuery(
    api.functions.services.updateOrgService
  )

  const form = useForm({
    defaultValues: {
      isActive: data?.isActive ?? false,
      fee: data?.pricing?.amount ?? 0,
      currency: data?.pricing?.currency ?? "XAF",
      estimatedDays: data?.estimatedDays ?? 0,
      depositInstructions: data?.depositInstructions ?? "",
      pickupInstructions: data?.pickupInstructions ?? "",
      requiresAppointment: data?.requiresAppointment ?? false,
      requiresAppointmentForPickup: data?.requiresAppointmentForPickup ?? false,
    },
    onSubmit: async ({ value }) => {
      if (!activeOrgId) {
        toast.error(
          t("dashboard.services.edit.noOrgError") ||
            "Représentation introuvable"
        )
        return
      }

      try {
        await updateConfig({
          orgServiceId: data?._id as Id<"orgServices">,
          isActive: value.isActive,
          pricing: {
            amount: value.fee,
            currency: value.currency,
          },
          estimatedDays: value.estimatedDays,
          depositInstructions: value.depositInstructions || undefined,
          pickupInstructions: value.pickupInstructions || undefined,
          requiresAppointment: value.requiresAppointment,
          requiresAppointmentForPickup: value.requiresAppointmentForPickup,
        })
        toast.success(t("dashboard.services.edit.saved"))
      } catch (err: any) {
        const errorMessage =
          err.message || t("dashboard.services.edit.saveError")
        toast.error(errorMessage)
      }
    },
  })

  if (!data) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[600px] max-w-3xl" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 overflow-hidden p-4 md:p-6">
      <div className="flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="transition-transform active:scale-[0.97]"
            onClick={() => router.push("/services")}
            type="button"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("dashboard.services.edit.title")}
            </h1>
          </div>
        </div>
        {activeTab === "general" ? (
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              form={formId}
              className="transition-transform active:scale-[0.97]"
            >
              <Save className="mr-2 h-4 w-4" />
              {t("dashboard.services.edit.save")}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="general">
              {t("dashboard.services.edit.tabs.general")}
            </TabsTrigger>
            <TabsTrigger value="autoGeneration">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {t("dashboard.services.edit.tabs.autoGeneration")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="autoGeneration">
            <AutoGenerationRulesPanel
              orgServiceId={serviceId as Id<"orgServices">}
            />
          </TabsContent>

          <TabsContent value="general">
            <form
              id={formId}
              onSubmit={(e) => {
                e.preventDefault()
                form.handleSubmit()
              }}
            >
              <div className="grid gap-6">
                <FlatCard>
                  <div className="p-3 pb-0 lg:p-4">
                    <h3 className="text-sm font-bold">
                      {t("dashboard.services.edit.serviceInfo")}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("dashboard.services.edit.serviceInfoDescription")}
                    </p>
                  </div>
                  <div className="space-y-4 p-3 lg:p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{t("dashboard.services.edit.activate")}</Label>
                        <p className="text-sm text-muted-foreground">
                          {t("dashboard.services.edit.activateDescription")}
                        </p>
                      </div>
                      <form.Field
                        name="isActive"
                        children={(field) => (
                          <Switch
                            checked={field.state.value}
                            onCheckedChange={field.handleChange}
                          />
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <form.Field
                        name="fee"
                        children={(field) => (
                          <div className="space-y-2">
                            <Label>{t("dashboard.services.edit.fee")}</Label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                value={field.state.value}
                                onChange={(e) =>
                                  field.handleChange(Number(e.target.value))
                                }
                              />
                              <form.Field
                                name="currency"
                                children={(subField) => (
                                  <Select
                                    value={subField.state.value}
                                    onValueChange={subField.handleChange}
                                  >
                                    <SelectTrigger className="w-[100px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="XAF">XAF</SelectItem>
                                      <SelectItem value="EUR">EUR</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </div>
                          </div>
                        )}
                      />
                      <form.Field
                        name="estimatedDays"
                        children={(field) => {
                          const isInvalid =
                            field.state.meta.isTouched &&
                            !field.state.meta.isValid
                          return (
                            <Field data-invalid={isInvalid}>
                              <FieldLabel htmlFor={field.name}>
                                {t("dashboard.services.edit.estimatedDays")}
                              </FieldLabel>
                              <Input
                                id={field.name}
                                type="number"
                                min="0"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                  field.handleChange(Number(e.target.value))
                                }
                              />
                              {isInvalid && (
                                <FieldError errors={field.state.meta.errors} />
                              )}
                            </Field>
                          )
                        }}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <form.Field
                        name="requiresAppointment"
                        children={(field) => (
                          <Switch
                            id="requiresAppointment"
                            checked={field.state.value}
                            onCheckedChange={(checked) =>
                              field.handleChange(checked)
                            }
                          />
                        )}
                      />
                      <Label htmlFor="requiresAppointment">
                        {t("dashboard.services.edit.requiresAppointment") ||
                          "Rendez-vous requis (dépôt)"}
                      </Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <form.Field
                        name="requiresAppointmentForPickup"
                        children={(field) => (
                          <Switch
                            id="requiresAppointmentForPickup"
                            checked={field.state.value}
                            onCheckedChange={(checked) =>
                              field.handleChange(checked)
                            }
                          />
                        )}
                      />
                      <Label htmlFor="requiresAppointmentForPickup">
                        {t("dashboard.services.edit.requiresAppointmentForPickup")}
                      </Label>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <form.Field
                        name="depositInstructions"
                        children={(field) => {
                          const isInvalid =
                            field.state.meta.isTouched &&
                            !field.state.meta.isValid
                          return (
                            <Field data-invalid={isInvalid}>
                              <FieldLabel htmlFor={field.name}>
                                {t(
                                  "dashboard.services.edit.depositInstructions",
                                  "Instructions de dépôt"
                                )}
                              </FieldLabel>
                              <Textarea
                                id={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                                placeholder={t(
                                  "dashboard.services.edit.depositInstructionsPlaceholder",
                                  "Documents à apporter, présentation physique requise, etc."
                                )}
                                className="min-h-[120px]"
                              />
                              {isInvalid && (
                                <FieldError errors={field.state.meta.errors} />
                              )}
                            </Field>
                          )
                        }}
                      />

                      <form.Field
                        name="pickupInstructions"
                        children={(field) => {
                          const isInvalid =
                            field.state.meta.isTouched &&
                            !field.state.meta.isValid
                          return (
                            <Field data-invalid={isInvalid}>
                              <FieldLabel htmlFor={field.name}>
                                {t(
                                  "dashboard.services.edit.pickupInstructions",
                                  "Instructions de retrait"
                                )}
                              </FieldLabel>
                              <Textarea
                                id={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                                placeholder={t(
                                  "dashboard.services.edit.pickupInstructionsPlaceholder",
                                  "Apporter le récépissé, procuration acceptée, etc."
                                )}
                                className="min-h-[120px]"
                              />
                              {isInvalid && (
                                <FieldError errors={field.state.meta.errors} />
                              )}
                            </Field>
                          )
                        }}
                      />
                    </div>
                  </div>
                </FlatCard>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function Label({
  children,
  className,
  htmlFor,
}: {
  children: React.ReactNode
  className?: string
  htmlFor?: string
}) {
  return (
    <FieldLabel className={className} htmlFor={htmlFor}>
      {children}
    </FieldLabel>
  )
}
