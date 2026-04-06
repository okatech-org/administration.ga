import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  ActivitySector,
  CompanyRole,
  CompanyType,
} from "@convex/lib/constants";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Check,
  Crown,
  Edit2,
  Globe,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  Trash2,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useConvexMutationQuery,
  useConvexQuery,
} from "@/integrations/convex/hooks";

const adminRoles = [CompanyRole.CEO, CompanyRole.Owner, CompanyRole.President];
const roleIcons: Partial<Record<CompanyRole, typeof Crown>> = {
  [CompanyRole.CEO]: Crown,
  [CompanyRole.Owner]: Crown,
  [CompanyRole.President]: Shield,
};

export function CompanyDetailContent({ id }: { id: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: company, isPending } = useConvexQuery(
    api.functions.companies.getById,
    { id: id as Id<"companies"> },
  );

  if (isPending)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  if (!company) {
    return (
      <div className="space-y-4 p-1">
        <Button
          variant="ghost"
          onClick={() => navigate({ to: "/my-space/companies" })}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Briefcase className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">
              {t("companies.notFound")}
            </h3>
          </CardContent>
        </Card>
      </div>
    );
  }

  const myMembership = company.members?.find((m: any) => m.user?._id);
  const isAdmin =
    myMembership ?
      adminRoles.includes(myMembership.role as CompanyRole)
    : false;

  const typeLabels: Record<CompanyType, string> = {
    [CompanyType.SARL]: "SARL",
    [CompanyType.SA]: "SA",
    [CompanyType.SAS]: "SAS",
    [CompanyType.SASU]: "SASU",
    [CompanyType.EURL]: "EURL",
    [CompanyType.EI]: "EI",
    [CompanyType.AutoEntrepreneur]: t(
      "companies.type.autoEntrepreneur",
      "Auto-entrepreneur",
    ),
    [CompanyType.Other]: t("common.other"),
  };
  const sectorLabels: Record<ActivitySector, string> = {
    [ActivitySector.Technology]: t(
      "companies.sector.technology",
      "Technologie",
    ),
    [ActivitySector.Commerce]: t("companies.sector.commerce"),
    [ActivitySector.Services]: t("companies.sector.services"),
    [ActivitySector.Industry]: t("companies.sector.industry"),
    [ActivitySector.Agriculture]: t(
      "companies.sector.agriculture",
      "Agriculture",
    ),
    [ActivitySector.Health]: t("companies.sector.health"),
    [ActivitySector.Education]: t("companies.sector.education"),
    [ActivitySector.Culture]: t("companies.sector.culture"),
    [ActivitySector.Tourism]: t("companies.sector.tourism"),
    [ActivitySector.Transport]: t("companies.sector.transport"),
    [ActivitySector.Construction]: t(
      "companies.sector.construction",
      "Construction",
    ),
    [ActivitySector.Other]: t("companies.sector.other"),
  };

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: "/my-space/companies" })}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center">
            {company.logoUrl ?
              <img
                src={company.logoUrl}
                alt={company.name}
                className="h-12 w-12 rounded-lg object-cover"
              />
            : <Briefcase className="h-7 w-7 text-primary" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{company.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">
                {typeLabels[company.companyType]}
              </Badge>
              {company.activitySector && (
                <Badge variant="outline">
                  {sectorLabels[company.activitySector]}
                </Badge>
              )}
              {myMembership && (
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/30"
                >
                  {myMembership.role}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info" className="gap-2">
            <Building2 className="h-4 w-4" />
            {t("common.info")}
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            {t("common.members")}
            {company.members && (
              <Badge variant="secondary" className="ml-1">
                {company.members.length}
              </Badge>
            )}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="settings" className="gap-2">
              <Edit2 className="h-4 w-4" />
              {t("common.settings")}
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="info">
          <InfoTab company={company} />
        </TabsContent>
        <TabsContent value="members">
          <MembersTab
            companyId={company._id}
            members={company.members ?? []}
            isAdmin={isAdmin}
          />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="settings">
            <SettingsTab company={company} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function InfoTab({ company }: { company: any }) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("companies.info.about")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {company.legalName && (
            <div className="text-sm">
              <span className="text-muted-foreground">
                {t("companies.info.legalName")} :{" "}
              </span>
              <span className="font-medium">{company.legalName}</span>
            </div>
          )}
          {company.siret && (
            <div className="text-sm">
              <span className="text-muted-foreground">SIRET : </span>
              <span className="font-medium font-mono">{company.siret}</span>
            </div>
          )}
          {company.description ?
            <p className="text-sm text-muted-foreground">
              {company.description}
            </p>
          : <p className="text-sm text-muted-foreground italic">
              {t("companies.info.noDescription")}
            </p>
          }
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("companies.info.contact")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {company.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a
                href={`mailto:${company.email}`}
                className="text-primary hover:underline"
              >
                {company.email}
              </a>
            </div>
          )}
          {company.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{company.phone}</span>
            </div>
          )}
          {company.website && (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline truncate"
              >
                {company.website.replace(/^https?:\/\//, "")}
              </a>
            </div>
          )}
          {company.address && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>
                {[
                  company.address.street,
                  company.address.postalCode,
                  company.address.city,
                  company.address.country,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </div>
          )}
          {!company.email &&
            !company.phone &&
            !company.website &&
            !company.address && (
              <p className="text-sm text-muted-foreground italic">
                {t("companies.info.noContact")}
              </p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

function MembersTab({
  companyId,
  members,
  isAdmin,
}: {
  companyId: Id<"companies">;
  members: any[];
  isAdmin: boolean;
}) {
  const { t } = useTranslation();
  const { mutate: removeMember, isPending: isRemoving } =
    useConvexMutationQuery(api.functions.companies.removeMember);
  const { mutate: updateRole, isPending: isUpdating } = useConvexMutationQuery(
    api.functions.companies.updateMemberRole,
  );
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<{
    userId: string;
    role: CompanyRole;
    title?: string;
  } | null>(null);

  const roleOptions: ComboboxOption<CompanyRole>[] = useMemo(
    () =>
      Object.values(CompanyRole).map((r) => ({
        value: r,
        label: {
          [CompanyRole.CEO]: "PDG",
          [CompanyRole.Owner]: t("companies.role.owner"),
          [CompanyRole.President]: t("companies.role.president"),
          [CompanyRole.Director]: t("companies.role.director"),
          [CompanyRole.Manager]: t("companies.role.manager"),
        }[r],
      })),
    [t],
  );

  const roleLabelMap = useMemo(
    () =>
      Object.fromEntries(roleOptions.map((o) => [o.value, o.label])) as Record<
        CompanyRole,
        string
      >,
    [roleOptions],
  );

  const handleRemove = (userId: string) => {
    removeMember(
      { companyId, userId: userId as Id<"users"> },
      {
        onSuccess: () => {
          toast.success(t("companies.memberRemoved"));
          setConfirmRemove(null);
        },
        onError: () =>
          toast.error(t("common.error")),
      },
    );
  };

  const handleUpdateRole = () => {
    if (!editRole) return;
    updateRole(
      {
        companyId,
        userId: editRole.userId as Id<"users">,
        role: editRole.role,
        title: editRole.title,
      },
      {
        onSuccess: () => {
          toast.success(t("companies.roleUpdated"));
          setEditRole(null);
        },
        onError: () =>
          toast.error(t("common.error")),
      },
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">
            {t("common.members")}
          </CardTitle>
          <CardDescription>
            {t("companies.membersCount", "{{count}} membre(s)", {
              count: members.length,
            })}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {members.map((member: any) => {
            const displayName =
              member.profile?.firstName && member.profile?.lastName ?
                `${member.profile.firstName} ${member.profile.lastName}`
              : (member.user?.name ?? "Utilisateur");
            const initials = displayName
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            const RoleIcon = roleIcons[member.role as CompanyRole];
            return (
              <div
                key={member._id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.user?.avatarUrl} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{displayName}</span>
                      {RoleIcon && (
                        <RoleIcon className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {roleLabelMap[member.role as CompanyRole] ??
                          member.role}
                      </Badge>
                      {member.title && (
                        <span className="text-xs text-muted-foreground">
                          {member.title}
                        </span>
                      )}
                      {member.user?.email && (
                        <span className="text-xs text-muted-foreground">
                          {member.user.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    {editRole?.userId === member.user?._id ?
                      <div className="flex items-center gap-1">
                        <Combobox<CompanyRole>
                          options={roleOptions}
                          value={editRole!.role}
                          onValueChange={(v) =>
                            setEditRole({
                              userId: editRole!.userId,
                              role: v,
                              title: editRole!.title,
                            })
                          }
                          placeholder={t("companies.role.select")}
                          searchPlaceholder={t(
                            "common.search",
                            "Rechercher...",
                          )}
                          emptyText={t("common.noResults")}
                          className="h-8 w-36 text-xs"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={handleUpdateRole}
                          disabled={isUpdating}
                        >
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => setEditRole(null)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    : <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() =>
                          setEditRole({
                            userId: member.user?._id ?? "",
                            role: member.role,
                            title: member.title,
                          })
                        }
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    }
                    {confirmRemove === member.user?._id ?
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 text-xs"
                          onClick={() => handleRemove(member.user?._id)}
                          disabled={isRemoving}
                        >
                          {isRemoving ?
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : t("common.confirm")}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => setConfirmRemove(null)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    : <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setConfirmRemove(member.user?._id)}
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </Button>
                    }
                  </div>
                )}
              </div>
            );
          })}
          {members.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("companies.noMembers")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsTab({ company }: { company: any }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { mutate: update, isPending: isUpdating } = useConvexMutationQuery(
    api.functions.companies.update,
  );
  const { mutate: deleteCompany, isPending: isDeleting } =
    useConvexMutationQuery(api.functions.companies.deleteCompany);
  const { mutate: leave, isPending: isLeaving } = useConvexMutationQuery(
    api.functions.companies.leave,
  );
  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [formData, setFormData] = useState({
    name: company.name ?? "",
    description: company.description ?? "",
    email: company.email ?? "",
    phone: company.phone ?? "",
    website: company.website ?? "",
    street: company.address?.street ?? "",
    city: company.address?.city ?? "",
    postalCode: company.address?.postalCode ?? "",
    country: company.address?.country ?? "",
  });

  const handleSave = () => {
    update(
      {
        id: company._id,
        name: formData.name || undefined,
        description: formData.description || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        website: formData.website || undefined,
        address:
          (
            formData.street ||
            formData.city ||
            formData.postalCode ||
            formData.country
          ) ?
            {
              street: formData.street || undefined,
              city: formData.city || undefined,
              postalCode: formData.postalCode || undefined,
              country: formData.country || undefined,
            }
          : undefined,
      },
      {
        onSuccess: () => {
          toast.success(t("companies.updated"));
          setEditing(false);
        },
        onError: () =>
          toast.error(t("common.error")),
      },
    );
  };

  const handleDelete = () => {
    deleteCompany(
      { id: company._id },
      {
        onSuccess: () => {
          toast.success(t("companies.deleted"));
          navigate({ to: "/my-space/companies" });
        },
        onError: () =>
          toast.error(t("common.error")),
      },
    );
  };

  const handleLeave = () => {
    leave(
      { companyId: company._id },
      {
        onSuccess: () => {
          toast.success(t("companies.left"));
          navigate({ to: "/my-space/companies" });
        },
        onError: () =>
          toast.error(t("common.error")),
      },
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            {t("companies.settings.edit")}
          </CardTitle>
          {!editing ?
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              {t("common.edit")}
            </Button>
          : <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                {isUpdating ?
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <Save className="h-4 w-4 mr-2" />}
                {t("common.save")}
              </Button>
            </div>
          }
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("companies.form.name")}</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                disabled={!editing}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("companies.form.email")}</Label>
              <Input
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                disabled={!editing}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("companies.form.phone")}</Label>
              <Input
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                disabled={!editing}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("companies.form.website")}</Label>
              <Input
                value={formData.website}
                onChange={(e) =>
                  setFormData({ ...formData, website: e.target.value })
                }
                disabled={!editing}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("companies.form.street")}</Label>
              <Input
                value={formData.street}
                onChange={(e) =>
                  setFormData({ ...formData, street: e.target.value })
                }
                disabled={!editing}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("companies.form.city")}</Label>
              <Input
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                disabled={!editing}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("companies.form.postalCode")}</Label>
              <Input
                value={formData.postalCode}
                onChange={(e) =>
                  setFormData({ ...formData, postalCode: e.target.value })
                }
                disabled={!editing}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("companies.form.country")}</Label>
              <Input
                value={formData.country}
                onChange={(e) =>
                  setFormData({ ...formData, country: e.target.value })
                }
                disabled={!editing}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("companies.form.description")}</Label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              disabled={!editing}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            {t("common.dangerZone")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {t("companies.leave.title")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t(
                  "companies.leave.settingsDesc",
                  "Vous ne serez plus membre de cette entreprise",
                )}
              </p>
            </div>
            <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <LogOut className="h-4 w-4" />
                  {t("companies.leave.confirm")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {t(
                      "companies.leave.confirmTitle",
                      "Quitter cette entreprise ?",
                    )}
                  </DialogTitle>
                </DialogHeader>
                <p className="text-muted-foreground text-sm">
                  {t(
                    "companies.leave.description",
                    "Vous ne serez plus membre de {{name}}.",
                    { name: company.name },
                  )}
                </p>
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowLeaveConfirm(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleLeave}
                    disabled={isLeaving}
                  >
                    {isLeaving && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {t("companies.leave.confirm")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-destructive">
                {t("companies.delete.title")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t(
                  "companies.delete.description",
                  "Cette action est irréversible",
                )}
              </p>
            </div>
            <Dialog
              open={showDeleteConfirm}
              onOpenChange={setShowDeleteConfirm}
            >
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  {t("common.delete")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {t(
                      "companies.delete.confirmTitle",
                      "Supprimer {{name}} ?",
                      { name: company.name },
                    )}
                  </DialogTitle>
                </DialogHeader>
                <p className="text-muted-foreground text-sm">
                  {t(
                    "companies.delete.confirmDescription",
                    "Tous les membres seront retirés et les données seront supprimées.",
                  )}
                </p>
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {t("common.delete")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
