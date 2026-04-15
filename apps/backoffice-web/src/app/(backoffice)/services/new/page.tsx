"use client";

import { api } from "@convex/_generated/api";
import { ServiceCategory } from "@convex/lib/validators";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { Briefcase, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/common/lazy-rich-text-editor";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useConvexMutationQuery } from "@/integrations/convex/hooks";

interface RequiredDocument {
  type: string;
  label: { fr: string; en?: string };
  required: boolean;
}

export default function NewServicePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [documents, setDocuments] = useState<RequiredDocument[]>([]);
  const [contentFr, setContentFr] = useState("");
  const [contentEn, setContentEn] = useState("");
  const [requiresAppointment, setRequiresAppointment] = useState(true);
  const [requiresPickupAppointment, setRequiresPickupAppointment] =
    useState(false);

  const { mutateAsync: createService, isPending } = useConvexMutationQuery(
    api.functions.services.create,
  );

  const form = useForm({
    defaultValues: {
      nameFr: "",
      nameEn: "",
      descriptionFr: "",
      descriptionEn: "",
      category: ServiceCategory.Other as string,
      icon: "",
      estimatedDays: "7",
      slug: "",
    },
    onSubmit: async ({ value }) => {
      if (!value.nameFr || value.nameFr.length < 3) {
        toast.error(t("superadmin.organizations.form.error.nameLength"));
        return;
      }
      if (!value.slug || value.slug.length < 2) {
        toast.error(t("superadmin.organizations.form.error.slugLength"));
        return;
      }
      if (!value.descriptionFr) {
        toast.error(
          t("superadmin.services.form.description") +
            " (FR) " +
            t("superadmin.organizations.form.error.required"),
        );
        return;
      }

      try {
        await createService({
          slug: value.slug,
          code: value.slug.toUpperCase().replace(/-/g, "_"),
          name: { fr: value.nameFr || "", ...(value.nameEn ? { en: value.nameEn } : {}) } as Record<string, string>,
          description: { fr: value.descriptionFr || "", ...(value.descriptionEn ? { en: value.descriptionEn } : {}) } as Record<string, string>,
          content:
            contentFr ?
              ({ fr: contentFr, ...(contentEn ? { en: contentEn } : {}) } as Record<string, string>)
            : undefined,
          category: value.category as any,
          icon: value.icon || undefined,
          estimatedDays: parseInt(value.estimatedDays) || 7,
          requiresAppointment,
          requiresPickupAppointment,
          joinedDocuments: documents as any,
        });
        toast.success(t("superadmin.services.form.success"));
        router.push("/services");
      } catch (error: any) {
        const errorKey = error.message || null;
        toast.error(
          errorKey ? t(errorKey as string, errorKey as string) : t("superadmin.common.error"),
        );
      }
    },
  });

  const handleNameChange = (name: string, lang: "fr" | "en") => {
    if (lang === "fr") {
      form.setFieldValue("nameFr", name);
      const slug = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      form.setFieldValue("slug", slug);
    } else {
      form.setFieldValue("nameEn", name);
    }
  };

  const addDocument = () => {
    setDocuments([
      ...documents,
      { type: "document", label: { fr: "", en: "" }, required: true },
    ]);
  };

  const updateDocumentLabel = (
    index: number,
    lang: "fr" | "en",
    value: string,
  ) => {
    const newDocs = [...documents];
    newDocs[index] = {
      ...newDocs[index],
      label: { ...newDocs[index].label, [lang]: value },
    };
    setDocuments(newDocs);
  };

  const updateDocumentType = (index: number, value: string) => {
    const newDocs = [...documents];
    newDocs[index] = { ...newDocs[index], type: value };
    setDocuments(newDocs);
  };

  const updateDocumentRequired = (index: number, value: boolean) => {
    const newDocs = [...documents];
    newDocs[index] = { ...newDocs[index], required: value };
    setDocuments(newDocs);
  };

  const removeDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 md:p-4">
      <PageHeader
        icon={<Briefcase className="h-5 w-5" />}
        title={t("superadmin.services.form.create")}
        subtitle={t("superadmin.services.description")}
        showBackButton
        onBack={() => router.push("/services")}
      />

      <FlatCard className="flex-1">
        <div className="p-3 lg:p-4">
          <form
            id="service-form"
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
            className="space-y-8"
          >
            {/* Name & Description with Tabs */}
            <FieldGroup>
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  {t("superadmin.services.form.name")} &{" "}
                  {t("superadmin.services.form.description")}
                </Label>
                <Tabs defaultValue="fr" className="w-full">
                  <TabsList>
                    <TabsTrigger value="fr">🇫🇷 Français</TabsTrigger>
                    <TabsTrigger value="en">🇬🇧 English</TabsTrigger>
                  </TabsList>
                  <TabsContent value="fr" className="space-y-4 mt-4">
                    <form.Field
                      name="nameFr"
                      children={(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid;
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>
                              {t("superadmin.services.form.name")} *
                            </FieldLabel>
                            <Input
                              id={field.name}
                              name={field.name}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                handleNameChange(e.target.value, "fr")
                              }
                              placeholder="ex. Demande de passeport"
                              autoComplete="off"
                            />
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        );
                      }}
                    />
                    <form.Field
                      name="descriptionFr"
                      children={(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid;
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>
                              {t("superadmin.services.form.description")} *
                            </FieldLabel>
                            <Textarea
                              id={field.name}
                              name={field.name}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              rows={3}
                              placeholder="Description courte du service..."
                            />
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        );
                      }}
                    />
                  </TabsContent>
                  <TabsContent value="en" className="space-y-4 mt-4">
                    <form.Field
                      name="nameEn"
                      children={(field) => (
                        <Field>
                          <FieldLabel htmlFor={field.name}>
                            {t("superadmin.services.form.name")}
                          </FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) =>
                              handleNameChange(e.target.value, "en")
                            }
                            placeholder="ex. Passport application"
                            autoComplete="off"
                          />
                        </Field>
                      )}
                    />
                    <form.Field
                      name="descriptionEn"
                      children={(field) => (
                        <Field>
                          <FieldLabel htmlFor={field.name}>
                            {t("superadmin.services.form.description")}
                          </FieldLabel>
                          <Textarea
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            rows={3}
                            placeholder="Short service description..."
                          />
                        </Field>
                      )}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </FieldGroup>

            <Separator />

            {/* Slug, Category & Icon */}
            <FieldGroup>
              <form.Field
                name="slug"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        {t("superadmin.services.form.slug")} *
                      </FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="demande-passeport"
                        autoComplete="off"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("superadmin.organizations.form.slugHelp")}
                      </p>
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <form.Field
                  name="category"
                  children={(field) => (
                    <Field>
                      <FieldLabel>
                        {t("superadmin.services.form.category")}
                      </FieldLabel>
                      <Select
                        value={field.state.value}
                        onValueChange={(value) => field.handleChange(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="passport">
                            {t("superadmin.services.categories.passport")}
                          </SelectItem>
                          <SelectItem value="identity">
                            {t("superadmin.services.categories.identity")}
                          </SelectItem>
                          <SelectItem value="visa">
                            {t("superadmin.services.categories.visa")}
                          </SelectItem>
                          <SelectItem value="civil_status">
                            {t("superadmin.services.categories.civil_status")}
                          </SelectItem>
                          <SelectItem value="registration">
                            {t("superadmin.services.categories.registration")}
                          </SelectItem>
                          <SelectItem value="certification">
                            {t("superadmin.services.categories.legalization")}
                          </SelectItem>
                          <SelectItem value="transcript">
                            Transcription
                          </SelectItem>
                          <SelectItem value="travel_document">
                            Document de voyage
                          </SelectItem>
                          <SelectItem value="assistance">
                            {t("superadmin.services.categories.emergency")}
                          </SelectItem>
                          <SelectItem value="other">
                            {t("superadmin.services.categories.other")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
                <form.Field
                  name="icon"
                  children={(field) => (
                    <Field>
                      <FieldLabel>
                        {t("superadmin.services.form.icon")}
                      </FieldLabel>
                      <Input
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="passport, file-text, etc."
                      />
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <form.Field
                  name="estimatedDays"
                  children={(field) => (
                    <Field>
                      <FieldLabel>
                        {t("superadmin.services.form.estimatedDays") ||
                          "Délai estimé (jours)"}
                      </FieldLabel>
                      <Input
                        type="number"
                        min="0"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </Field>
                  )}
                />
                <Field>
                  <FieldLabel>
                    {t("superadmin.services.form.requiresAppointment") ||
                      "Rendez-vous requis"}
                  </FieldLabel>
                  <div className="flex items-center gap-2 h-10">
                    <Switch
                      checked={requiresAppointment}
                      onCheckedChange={setRequiresAppointment}
                    />
                    <span className="text-sm text-muted-foreground">
                      {requiresAppointment ? "Oui" : "Non"}
                    </span>
                  </div>
                </Field>
                <Field>
                  <FieldLabel>
                    {t(
                      "superadmin.services.form.requiresPickupAppointment",
                    ) || "Retrait sur rendez-vous"}
                  </FieldLabel>
                  <div className="flex items-center gap-2 h-10">
                    <Switch
                      checked={requiresPickupAppointment}
                      onCheckedChange={setRequiresPickupAppointment}
                    />
                    <span className="text-sm text-muted-foreground">
                      {requiresPickupAppointment ? "Oui" : "Non"}
                    </span>
                  </div>
                </Field>
              </div>
            </FieldGroup>

            <Separator />

            {/* Content (Rich Text) with Tabs */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                {t("superadmin.services.form.content") || "Contenu détaillé"}
              </Label>
              <p className="text-sm text-muted-foreground">
                Informations détaillées, procédures, documents nécessaires, etc.
              </p>
              <Tabs defaultValue="fr" className="w-full">
                <TabsList>
                  <TabsTrigger value="fr">🇫🇷 Français</TabsTrigger>
                  <TabsTrigger value="en">🇬🇧 English</TabsTrigger>
                </TabsList>
                <TabsContent value="fr" className="mt-2">
                  <RichTextEditor
                    content={contentFr}
                    onChange={setContentFr}
                    placeholder="Contenu détaillé du service..."
                  />
                </TabsContent>
                <TabsContent value="en" className="mt-2">
                  <RichTextEditor
                    content={contentEn}
                    onChange={setContentEn}
                    placeholder="Detailed service content..."
                  />
                </TabsContent>
              </Tabs>
            </div>

            <Separator />

            {/* Required Documents */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold">
                    {t("superadmin.services.form.requiredDocuments")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Documents requis pour cette démarche
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addDocument}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t("superadmin.services.form.addDocument")}
                </Button>
              </div>

              {documents.length === 0 ?
                <p className="text-sm text-muted-foreground text-center py-8 border rounded-md bg-muted/30">
                  {t("superadmin.services.form.noDocuments")}
                </p>
              : <div className="space-y-3">
                  {documents.map((doc, index) => (
                    <div
                      key={index}
                      className="p-4 border rounded-md space-y-3 bg-muted/20"
                    >
                      <div className="flex gap-2 items-start">
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <Input
                              placeholder="Label (FR) *"
                              value={doc.label.fr}
                              onChange={(e) =>
                                updateDocumentLabel(index, "fr", e.target.value)
                              }
                            />
                            <Input
                              placeholder="Label (EN)"
                              value={doc.label.en || ""}
                              onChange={(e) =>
                                updateDocumentLabel(index, "en", e.target.value)
                              }
                            />
                          </div>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Type (ex: birth_certificate, photo)"
                              value={doc.type}
                              onChange={(e) =>
                                updateDocumentType(index, e.target.value)
                              }
                              className="flex-1"
                            />
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={doc.required}
                                onCheckedChange={(v) =>
                                  updateDocumentRequired(index, v)
                                }
                              />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {doc.required ? "Requis" : "Optionnel"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDocument(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              }
            </div>
          </form>
        </div>
        <div className="flex justify-between border-t p-3 lg:p-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/services")}
          >
            {t("superadmin.services.form.cancel")}
          </Button>
          <Button type="submit" form="service-form" disabled={isPending}>
            {isPending ?
              t("superadmin.organizations.form.saving")
            : t("superadmin.services.form.save")}
          </Button>
        </div>
      </FlatCard>
    </div>
  );
}
