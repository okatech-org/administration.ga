"use client";

import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";

import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useConvexMutationQuery } from "@/integrations/convex/hooks";

type Agent = {
  membershipId: Id<"memberships">;
  userId: Id<"users">;
  name: string;
  avatarUrl?: string;
};

type EnrichedCallLine = Doc<"callLines"> & { agents: Agent[] };

const COLOR_PRESETS = ["gray", "blue", "green", "amber", "rose", "purple"] as const;
type ColorPreset = (typeof COLOR_PRESETS)[number];

const COLOR_CLASSES: Record<ColorPreset, string> = {
  gray: "bg-gray-400",
  blue: "bg-blue-500",
  green: "bg-green-500",
  amber: "bg-amber-400",
  rose: "bg-rose-400",
  purple: "bg-purple-500",
};

interface CallLineFormDialogProps {
  mode: "create" | "edit";
  orgId: Id<"orgs">;
  line?: EnrichedCallLine;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CallLineFormDialog({
  mode,
  orgId,
  line,
  open,
  onOpenChange,
}: CallLineFormDialogProps) {
  const { t } = useTranslation();

  const { mutateAsync: createLine, isPending: isCreating } = useConvexMutationQuery(
    api.functions.callLines.create,
  );
  const { mutateAsync: updateLine, isPending: isUpdating } = useConvexMutationQuery(
    api.functions.callLines.update,
  );

  const isPending = isCreating || isUpdating;

  const form = useForm({
    defaultValues: {
      label: line?.label ?? "",
      description: line?.description ?? "",
      color: (line?.color as ColorPreset | undefined) ?? "gray",
      priority: line?.priority ?? 1,
      isDefault: line?.isDefault ?? false,
      isActive: line?.isActive ?? true,
    },
    onSubmit: async ({ value }) => {
      try {
        if (mode === "create") {
          await createLine({
            orgId,
            label: value.label.trim(),
            description: value.description?.trim() || undefined,
            color: value.color || undefined,
            priority: value.priority,
            isDefault: value.isDefault,
          });
          toast.success(t("callLines.toast.created"));
        } else if (line) {
          await updateLine({
            callLineId: line._id,
            label: value.label.trim(),
            description: value.description?.trim() || undefined,
            color: value.color || undefined,
            priority: value.priority,
            isDefault: value.isDefault,
            isActive: value.isActive,
          });
          toast.success(t("callLines.toast.updated"));
        }
        handleClose();
      } catch (err) {
        const msg = err instanceof Error ? err.message : t("callLines.toast.error");
        toast.error(msg);
      }
    },
  });

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? t("callLines.createTitle") : t("callLines.editTitle")}
          </DialogTitle>
          <DialogDescription>{t("callLines.description")}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.Field name="label">
              {(field) => (
                <Field>
                  <FieldLabel>{t("callLines.fields.label")}</FieldLabel>
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder={t("callLines.fields.labelPlaceholder")}
                    required
                  />
                  <FieldError>{field.state.meta.errors[0]}</FieldError>
                </Field>
              )}
            </form.Field>

            <form.Field name="description">
              {(field) => (
                <Field>
                  <FieldLabel>{t("callLines.fields.description")}</FieldLabel>
                  <Textarea
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder={t("callLines.fields.descriptionPlaceholder")}
                    rows={2}
                    className="resize-none"
                  />
                </Field>
              )}
            </form.Field>

            <div className="grid grid-cols-2 gap-3">
              <form.Field name="color">
                {(field) => (
                  <Field>
                    <FieldLabel>{t("callLines.fields.color")}</FieldLabel>
                    <Select
                      value={field.state.value}
                      onValueChange={(v) => field.handleChange(v as ColorPreset)}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-3 w-3 rounded-full ${COLOR_CLASSES[field.state.value as ColorPreset] ?? "bg-gray-400"}`}
                            />
                            <span>{t(`callLines.colors.${field.state.value}`)}</span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {COLOR_PRESETS.map((c) => (
                          <SelectItem key={c} value={c}>
                            <div className="flex items-center gap-2">
                              <span className={`h-3 w-3 rounded-full ${COLOR_CLASSES[c]}`} />
                              <span>{t(`callLines.colors.${c}`)}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </form.Field>

              <form.Field name="priority">
                {(field) => (
                  <Field>
                    <FieldLabel>{t("callLines.fields.priority")}</FieldLabel>
                    <Input
                      type="number"
                      min={1}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(Number(e.target.value))}
                    />
                  </Field>
                )}
              </form.Field>
            </div>

            <form.Field name="isDefault">
              {(field) => (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <p className="text-sm font-medium">{t("callLines.fields.isDefault")}</p>
                  <Switch checked={field.state.value} onCheckedChange={field.handleChange} />
                </div>
              )}
            </form.Field>

            {mode === "edit" && (
              <form.Field name="isActive">
                {(field) => (
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <p className="text-sm font-medium">{t("callLines.fields.isActive")}</p>
                    <Switch checked={field.state.value} onCheckedChange={field.handleChange} />
                  </div>
                )}
              </form.Field>
            )}
          </FieldGroup>

          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "create" ? (
                t("common.create")
              ) : (
                t("common.save")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
