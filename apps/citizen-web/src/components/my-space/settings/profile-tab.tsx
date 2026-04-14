"use client"

import { api } from "@convex/_generated/api"
import type { Doc, Id } from "@convex/_generated/dataModel"
import {
  CountryCode,
  Gender,
  MaritalStatus,
  NationalityAcquisition,
} from "@convex/lib/constants"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Briefcase,
  Edit,
  FileText,
  Loader2,
  MapPin,
  Phone,
  Save,
  User,
  Users,
  X,
} from "lucide-react"
import { useEffect, useState } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  PROFILE_FIELD_MAPPING,
  useFormFillEffect,
} from "@/components/ai/useFormFillEffect"
import { DocumentField } from "@/components/documents/DocumentField"
import { PROFILE_DOCUMENTS, type ProfileDocuments } from "@/components/registration/steps/DocumentsStep"
import { ContactsStep } from "@/components/registration/steps/ContactsStep"
import { FamilyStep } from "@/components/registration/steps/FamilyStep"
import { IdentityStep } from "@/components/registration/steps/IdentityStep"
import { ProfessionalStep } from "@/components/registration/steps/ProfessionalStep"
import { FlatCard } from "@/components/my-space/flat-card"
import { Button } from "@/components/ui/button"
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks"
import { captureEvent } from "@/lib/analytics"
import {
  getChangedFields,
  transformFormDataToPayload,
} from "@/lib/profile-utils"
import {
  type ProfileFormValues,
  profileFormSchema,
} from "@/lib/validation/profile"

type SectionId = "identity" | "contacts" | "family" | "profession"

export function ProfileTab() {
  const { t, i18n } = useTranslation()
  const [editingSection, setEditingSection] = useState<SectionId | null>(null)

  const { data: profile, isPending } = useAuthenticatedConvexQuery(
    api.functions.profiles.getMine,
    {}
  )
  const { mutateAsync: updateProfile, isPending: isSaving } =
    useConvexMutationQuery(api.functions.profiles.update)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    mode: "onChange",
    defaultValues: buildDefaults(profile),
  })

  useEffect(() => {
    if (profile) form.reset(buildDefaults(profile))
  }, [profile])

  useFormFillEffect(form, "profile", PROFILE_FIELD_MAPPING)

  const handleStartEdit = (section: SectionId) => {
    if (profile) form.reset(buildDefaults(profile))
    setEditingSection(section)
  }

  const handleCancelEdit = () => {
    setEditingSection(null)
  }

  const handleDocumentChange = async (
    key: keyof ProfileDocuments,
    documentId: Id<"documents"> | undefined,
  ) => {
    if (!profile) return
    // On upload: documents.create already auto-patches profile.documents server-side
    // On delete: we must explicitly clear the stale reference
    if (documentId === undefined) {
      try {
        const currentDocs = (profile as any).documents ?? {}
        const { [key]: _removed, ...rest } = currentDocs
        await updateProfile({ id: (profile as any)._id, documents: rest } as any)
      } catch (e) {
        console.error("Failed to clear document reference:", e)
      }
    }
  }

  const handleSaveSection = async () => {
    if (!profile) return
    const isValid = await form.trigger()
    if (!isValid) {
      toast.error(
        t("settings.dossier.validationError")
      )
      return
    }
    try {
      const data = form.getValues()
      const changedFields = getChangedFields(data, profile as Doc<"profiles">)
      const payload = transformFormDataToPayload(changedFields)
      if (Object.keys(payload).length > 0) {
        await updateProfile({ id: (profile as any)._id, ...payload })
        captureEvent("myspace_profile_updated")
        toast.success(t("common.saved"))
      } else {
        toast.info(t("settings.dossier.noChanges"))
      }
      setEditingSection(null)
    } catch (e: unknown) {
      const error = e as Error
      console.error(error)
      toast.error(error.message || t("settings.dossier.saveError"))
    }
  }

  if (isPending) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!profile) {
    return (
      <FlatCard>
        <div className="p-6 text-center text-sm text-muted-foreground">
          {t("profile.notFound")}
        </div>
      </FlatCard>
    )
  }

  const nd = t("profile.fields.notSpecified")

  const formatDate = (ts: number | undefined) => {
    if (!ts) return nd
    return new Date(ts).toLocaleDateString(i18n.language, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const countryLabel = (code: string | undefined) =>
    code ? t(`superadmin.countryCodes.${code}`, code) : nd

  const genderLabel = (val: string | undefined) =>
    val ? t(`profile.gender.${val}`, val) : nd

  const maritalLabel = (val: string | undefined) => {
    if (!val) return nd
    const keyMap: Record<string, string> = {
      single: "single",
      married: "married",
      divorced: "divorced",
      widowed: "widowed",
      civil_union: "civilUnion",
      cohabiting: "cohabiting",
    }
    return t(`profile.maritalStatus.${keyMap[val] ?? val}`, val)
  }

  const workLabel = (val: string | undefined) => {
    if (!val) return nd
    const keyMap: Record<string, string> = {
      employee: "employee",
      self_employed: "selfEmployed",
      entrepreneur: "entrepreneur",
      student: "student",
      retired: "retired",
      unemployed: "unemployed",
      other: "other",
    }
    return t(`profile.profession.${keyMap[val] ?? val}`, val)
  }

  const acqLabel = (val: string | undefined) =>
    val ? t(`profile.nationalityAcquisition.${val}`, val) : nd

  const relationLabel = (val: string | undefined) =>
    val ? t(`profile.relationship.${val}`, val) : nd

  const id = profile.identity as any
  const addr = profile.addresses as any
  const contacts = profile.contacts as any
  const fam = profile.family as any
  const prof = profile.profession as any

  const editButton = (section: SectionId) =>
    editingSection === section ? (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancelEdit}
          className="gap-1.5"
        >
          <X className="h-3.5 w-3.5" />
          {t("common.cancel")}
        </Button>
        <Button
          size="sm"
          onClick={handleSaveSection}
          disabled={isSaving}
          className="gap-1.5"
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {t("common.save")}
        </Button>
      </div>
    ) : (
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleStartEdit(section)}
        disabled={editingSection !== null && editingSection !== section}
        className="gap-1.5"
      >
        <Edit className="h-3.5 w-3.5" />
        {t("common.edit")}
      </Button>
    )

  return (
    <FormProvider {...form}>
      <form
        id="settings-dossier-form"
        onSubmit={(e) => {
          e.preventDefault()
          handleSaveSection()
        }}
      >
        <div className="space-y-6">
          {/* ─── Identité ─── */}
          <FlatCard>
            <SectionHeader
              icon={<User className="h-3.5 w-3.5" />}
              title={t("profile.tabs.personal")}
              action={editButton("identity")}
            />
            {editingSection === "identity" ? (
              <div className="settings-forms settings-compact-form p-4">
                <IdentityStep
                  control={form.control}
                  errors={form.formState.errors}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-1.5 p-4 sm:grid-cols-2">
                <Row label={t("profile.fields.lastName")} value={id?.lastName} />
                <Row label={t("profile.fields.firstName")} value={id?.firstName} />
                <Row label={t("profile.fields.gender")} value={genderLabel(id?.gender)} />
                <Row label={t("profile.fields.birthDate")} value={formatDate(id?.birthDate)} />
                <Row label={t("profile.fields.birthPlace")} value={id?.birthPlace} />
                <Row label={t("profile.fields.birthCountry")} value={countryLabel(id?.birthCountry)} />
                <Row label={t("profile.fields.nationality")} value={countryLabel(id?.nationality)} />
                <Row label={t("profile.fields.nationalityAcquisition")} value={acqLabel(id?.nationalityAcquisition)} />
              </div>
            )}
          </FlatCard>

          {/* ─── Contact ─── */}
          <FlatCard>
            <SectionHeader
              icon={<MapPin className="h-3.5 w-3.5" />}
              title={t("profile.tabs.contacts")}
              action={editButton("contacts")}
            />
            {editingSection === "contacts" ? (
              <div className="settings-forms settings-compact-form p-4">
                <ContactsStep
                  control={form.control}
                  errors={form.formState.errors}
                />
              </div>
            ) : (
              <div className="space-y-4 p-4">
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  <Row label={t("profile.fields.email")} value={contacts?.email} />
                  <Row label={t("profile.fields.phone")} value={contacts?.phone} />
                </div>

                {addr?.residence && (
                  <div>
                    <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                      {t("profile.fields.residenceAddress")}
                    </p>
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      <Row label={t("profile.fields.street")} value={addr.residence.street} />
                      <Row label={t("profile.fields.city")} value={addr.residence.city} />
                      <Row label={t("profile.fields.postalCode")} value={addr.residence.postalCode} />
                      <Row label={t("profile.fields.country")} value={countryLabel(addr.residence.country)} />
                    </div>
                  </div>
                )}

                {addr?.homeland && (
                  <div>
                    <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                      {t("profile.fields.homelandAddress")}
                    </p>
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      <Row label={t("profile.fields.street")} value={addr.homeland.street} />
                      <Row label={t("profile.fields.city")} value={addr.homeland.city} />
                      <Row label={t("profile.fields.postalCode")} value={addr.homeland.postalCode} />
                      <Row label={t("profile.fields.country")} value={countryLabel(addr.homeland.country)} />
                    </div>
                  </div>
                )}

                {contacts?.emergencyContacts && contacts.emergencyContacts.length > 0 && (
                  <div>
                    <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                      {t("profile.fields.emergencyContacts")}
                    </p>
                    <div className="space-y-1.5">
                      {contacts.emergencyContacts.map((ec: any, i: number) => (
                        <div
                          key={i}
                          className="rounded-lg bg-[#FDFCFA] p-2.5 dark:bg-[#21201E]/77"
                        >
                          <p className="text-sm font-medium">
                            {ec.firstName} {ec.lastName}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                            {ec.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {ec.phone}
                              </span>
                            )}
                            {ec.relationship && (
                              <span>{relationLabel(ec.relationship)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </FlatCard>

          {/* ─── Famille ─── */}
          <FlatCard>
            <SectionHeader
              icon={<Users className="h-3.5 w-3.5" />}
              title={t("profile.tabs.family")}
              action={editButton("family")}
            />
            {editingSection === "family" ? (
              <div className="settings-forms settings-compact-form p-4">
                <FamilyStep
                  control={form.control}
                  errors={form.formState.errors}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-1.5 p-4 sm:grid-cols-2">
                <Row
                  label={t("profile.fields.maritalStatus")}
                  value={maritalLabel(fam?.maritalStatus)}
                />
                <Row
                  label={t("profile.fields.father")}
                  value={
                    fam?.father?.firstName || fam?.father?.lastName
                      ? `${fam.father.firstName ?? ""} ${fam.father.lastName ?? ""}`.trim()
                      : nd
                  }
                />
                <Row
                  label={t("profile.fields.mother")}
                  value={
                    fam?.mother?.firstName || fam?.mother?.lastName
                      ? `${fam.mother.firstName ?? ""} ${fam.mother.lastName ?? ""}`.trim()
                      : nd
                  }
                />
                {fam?.spouse && (fam.spouse.firstName || fam.spouse.lastName) && (
                  <Row
                    label={t("profile.fields.spouse")}
                    value={`${fam.spouse.firstName ?? ""} ${fam.spouse.lastName ?? ""}`.trim()}
                  />
                )}
              </div>
            )}
          </FlatCard>

          {/* ─── Profession ─── */}
          <FlatCard>
            <SectionHeader
              icon={<Briefcase className="h-3.5 w-3.5" />}
              title={t("profile.tabs.profession")}
              action={editButton("profession")}
            />
            {editingSection === "profession" ? (
              <div className="settings-forms settings-compact-form p-4">
                <ProfessionalStep
                  control={form.control}
                  errors={form.formState.errors}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-1.5 p-4 sm:grid-cols-2">
                <Row
                  label={t("profile.fields.professionalStatus")}
                  value={workLabel(prof?.status)}
                />
                <Row label={t("profile.fields.jobTitle")} value={prof?.title} />
                <Row label={t("profile.fields.employer")} value={prof?.employer} />
              </div>
            )}
          </FlatCard>

          {/* ─── Documents ─── */}
          <FlatCard>
            <SectionHeader
              icon={<FileText className="h-3.5 w-3.5" />}
              title={t("profile.tabs.documents")}
            />
            <div className="space-y-2 p-3 md:p-4">
              {PROFILE_DOCUMENTS.map((doc) => (
                <DocumentField
                  key={doc.key}
                  compact
                  documentKey={doc.key}
                  documentId={(profile as any).documents?.[doc.key]}
                  label={`${t(doc.labelKey)}${doc.required ? " *" : ""}`}
                  description={t(doc.descriptionKey)}
                  onChange={(newId) => handleDocumentChange(doc.key, newId)}
                />
              ))}
            </div>
          </FlatCard>
        </div>
      </form>
    </FormProvider>
  )
}

// ─── Section Header ─────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  action,
}: {
  icon: React.ReactNode
  title: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-t-xl bg-[#EBE6DC]/50 px-4 py-3 dark:bg-[#383633]/30">
      <div className="flex items-center gap-2.5">
        <div className="rounded-md bg-primary/10 p-1.5">
          <span className="text-primary">{icon}</span>
        </div>
        <span className="text-base font-bold">{title}</span>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

// ─── Row ────────────────────────────────────────────────────

function Row({
  label,
  value,
}: {
  label: string
  value: string | undefined | null
}) {
  const { t } = useTranslation()
  const nd = t("profile.fields.notSpecified")
  const display = value && value.trim() ? value : nd

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-[#FDFCFA] px-3 py-2.5 dark:bg-[#21201E]/77">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="ml-3 max-w-[220px] truncate text-sm font-medium sm:max-w-[300px]">
        {display}
      </span>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────

function buildDefaults(profile: any): ProfileFormValues {
  const p = profile ?? {}
  return {
    countryOfResidence: p?.countryOfResidence || undefined,
    identity: {
      firstName: p?.identity?.firstName || "",
      lastName: p?.identity?.lastName || "",
      birthDate: p?.identity?.birthDate
        ? new Date(p.identity.birthDate)
        : undefined,
      birthPlace: p?.identity?.birthPlace || "",
      birthCountry: p?.identity?.birthCountry || CountryCode.GA,
      gender: p?.identity?.gender || Gender.Male,
      nationality: p?.identity?.nationality || CountryCode.GA,
      nationalityAcquisition:
        p?.identity?.nationalityAcquisition || NationalityAcquisition.Birth,
    },
    passportInfo: p?.passportInfo
      ? {
          number: p.passportInfo.number || "",
          issueDate: p.passportInfo.issueDate
            ? new Date(p.passportInfo.issueDate)
            : undefined,
          expiryDate: p.passportInfo.expiryDate
            ? new Date(p.passportInfo.expiryDate)
            : undefined,
          issuingAuthority: p.passportInfo.issuingAuthority || "",
        }
      : undefined,
    addresses: {
      homeland: p?.addresses?.homeland
        ? {
            street: p.addresses.homeland.street || "",
            city: p.addresses.homeland.city || "",
            postalCode: p.addresses.homeland.postalCode || "",
            country: p.addresses.homeland.country || CountryCode.GA,
          }
        : { street: "", city: "", postalCode: "", country: CountryCode.GA },
      residence: p?.addresses?.residence
        ? {
            street: p.addresses.residence.street || "",
            city: p.addresses.residence.city || "",
            postalCode: p.addresses.residence.postalCode || "",
            country: p.addresses.residence.country || CountryCode.FR,
          }
        : { street: "", city: "", postalCode: "", country: CountryCode.FR },
    },
    contacts: {
      email: p?.contacts?.email || "",
      phone: p?.contacts?.phone || "",
      emergencyContacts: p?.contacts?.emergencyContacts || [],
    },
    family: {
      maritalStatus: p?.family?.maritalStatus || MaritalStatus.Single,
      father: p?.family?.father || { firstName: "", lastName: "" },
      mother: p?.family?.mother || { firstName: "", lastName: "" },
      spouse: p?.family?.spouse || { firstName: "", lastName: "" },
    },
    profession: p?.profession
      ? {
          status: p.profession.status || undefined,
          title: p.profession.title || "",
          employer: p.profession.employer || "",
        }
      : { status: undefined, title: "", employer: "" },
  }
}
