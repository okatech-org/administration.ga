import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useAction, useMutation } from "convex/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Baby,
  Briefcase,
  Clock,
  CreditCard,
  Eye,
  FileText,
  FolderOpen,
  History,
  Image as ImageIcon,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  User,
  Users,
  Wand2,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useAuthenticatedConvexQuery } from "../../hooks/useConvexHooks";

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
} from "@workspace/ui/components/dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";

interface ProfileDetailViewProps {
  profileId: string;
}

export function ProfileDetailView({ profileId }: ProfileDetailViewProps) {
  const { t } = useTranslation();
  const [previewDoc, setPreviewDoc] = useState<{
    storageId: string;
    filename: string;
    mimeType?: string;
  } | null>(null);

  const { data: detailData, isLoading } = useAuthenticatedConvexQuery(
    api.functions.profiles.getProfileDetail,
    { profileId: profileId as Id<"profiles"> | Id<"childProfiles"> },
  );

  const identityPhotoId = detailData?.profile?.documents?.identityPhoto;
  const { data: identityPhotoDoc } = useAuthenticatedConvexQuery(
    api.functions.documents.getById,
    identityPhotoId ? { documentId: identityPhotoId } : "skip",
  );

  const { data: identityPhotoUrl } = useAuthenticatedConvexQuery(
    api.functions.documents.getUrl,
    identityPhotoDoc?.files[0]?.storageId
      ? { storageId: identityPhotoDoc.files[0].storageId }
      : "skip",
  );

  // Document preview URL
  const { data: previewUrl } = useAuthenticatedConvexQuery(
    api.functions.documents.getUrl,
    previewDoc?.storageId ? { storageId: previewDoc.storageId as Id<"_storage"> } : "skip",
  );

  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const removeBackgroundAction = useAction(
    api.functions.backgroundRemoval.removeBackgroundFromFile,
  );
  const generateUploadUrl = useMutation(
    api.functions.documents.generateUploadUrl,
  );
  const addFileToDoc = useMutation(api.functions.documents.addFile);
  const removeFileFromDoc = useMutation(api.functions.documents.removeFile);

  const handleRemoveBackground = async () => {
    if (!identityPhotoUrl || !identityPhotoDoc || !identityPhotoDoc.files[0])
      return;

    try {
      setIsRemovingBg(true);

      const response = await fetch(identityPhotoUrl);
      const blob = await response.blob();
      const reader = new FileReader();

      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () =>
          resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      const base64String = await base64Promise;

      const result = await removeBackgroundAction({
        fileBase64: base64String,
        fileName: identityPhotoDoc.files[0].filename,
      });

      if (!result.success || !result.imageUrl) {
        throw new Error(result.error || "Echec du detourage");
      }

      const uploadResponse = await fetch(result.imageUrl);
      const processedBlob = await uploadResponse.blob();
      const processedFile = new File(
        [processedBlob],
        `nobg_${identityPhotoDoc.files[0].filename.replace(/\.[^/.]+$/, "")}.png`,
        { type: "image/png" },
      );

      const postUrl = await generateUploadUrl();
      const storageResponse = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": processedFile.type },
        body: processedFile,
      });

      if (!storageResponse.ok) {
        throw new Error("Echec de l'upload de la nouvelle image");
      }

      const { storageId } = await storageResponse.json();
      const oldStorageId = identityPhotoDoc.files[0].storageId;

      await addFileToDoc({
        documentId: identityPhotoDoc._id,
        storageId: storageId,
        filename: processedFile.name,
        mimeType: processedFile.type,
        sizeBytes: processedFile.size,
      });

      await removeFileFromDoc({
        documentId: identityPhotoDoc._id,
        storageId: oldStorageId,
      });

      toast.success("L'arriere-plan a ete supprime avec succes.");
    } catch (error) {
      console.error("Error removing background:", error);
      toast.error(
        "Impossible de supprimer l'arriere-plan. Verifiez la cle API Remove.bg.",
      );
    } finally {
      setIsRemovingBg(false);
    }
  };

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (!detailData || !detailData.profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <User className="h-16 w-16 mb-4 opacity-20" />
        <h2 className="text-xl font-semibold mb-2">
          {t("profile.notFound.title")}
        </h2>
        <p>{t("profile.notFound.description")}</p>
      </div>
    );
  }

  const {
    profile,
    user,
    children = [],
    documents = [],
    requests = [],
    registrations = [],
  } = detailData;
  const parents = (profile as any).parents || [];
  const completionScore = (profile as any).completionScore ?? 0;

  // Helpers
  const getGenderLabel = (code?: string) =>
    code ? (t(`enums.gender.${code}`, code) as string) : undefined;
  const getCountryLabel = (code?: string) =>
    code ? (t(`countryList.${code}`, code) as string) : undefined;
  const getMaritalStatusLabel = (code?: string) =>
    code ? (t(`enums.maritalStatus.${code}`, code) as string) : undefined;
  const getNationalityAcquisitionLabel = (code?: string) =>
    code
      ? (t(`enums.nationalityAcquisition.${code}`, code) as string)
      : undefined;
  const getWorkStatusLabel = (code?: string) =>
    code ? (t(`enums.workStatus.${code}`, code) as string) : undefined;

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "\u2014";
    return format(new Date(timestamp), "dd MMMM yyyy", { locale: fr });
  };

  const getInitials = () => {
    const first = profile.identity?.firstName?.[0] || "";
    const last = profile.identity?.lastName?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  const fullName =
    [profile.identity?.firstName, profile.identity?.lastName]
      .filter(Boolean)
      .join(" ") || t("profile.empty.name");

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
      {/* Header Card */}
      <Card className="overflow-hidden border-0 shadow-md">
        <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/5 relative" />
        <div className="px-6 sm:px-10 pb-6 relative">
          <div className="flex flex-col sm:flex-row gap-6 sm:items-end -mt-12 mb-4">
            <Avatar className="h-24 w-24 border-4 border-background shadow-sm bg-muted">
              <AvatarFallback className="text-3xl font-bold bg-primary/10 text-primary">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold truncate">
                  {fullName}
                </h1>
                <Badge
                  variant={completionScore >= 80 ? "default" : "secondary"}
                >
                  {t("profile.completionBadge", { score: completionScore })}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                {profile.identity?.nip && (
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4" />
                    <span>NIP: {profile.identity.nip}</span>
                  </div>
                )}
                {(user?.email || profile.contacts?.email) && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4" />
                    <span>{user?.email || profile.contacts?.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="identity" className="w-full">
        <TabsList className="w-full justify-start h-12 bg-transparent border-b rounded-none p-0 overflow-x-auto overflow-y-hidden">
          <TabsTrigger
            value="identity"
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-6"
          >
            <User className="h-4 w-4 mr-2" />
            {t("profile.tabs.identity")}
          </TabsTrigger>
          <TabsTrigger
            value="documents"
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-6"
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            {t("profile.tabs.documents")}
            <Badge variant="secondary" className="ml-2 bg-muted/50">
              {documents.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="requests"
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-6"
          >
            <History className="h-4 w-4 mr-2" />
            {t("profile.tabs.requests")}
            <Badge variant="secondary" className="ml-2 bg-muted/50">
              {requests.length}
            </Badge>
          </TabsTrigger>
          {children.length > 0 && (
            <TabsTrigger
              value="children"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-6"
            >
              <Baby className="h-4 w-4 mr-2" />
              {t("profile.tabs.children")}
              <Badge variant="secondary" className="ml-2 bg-muted/50">
                {children.length}
              </Badge>
            </TabsTrigger>
          )}
          {parents.length > 0 && (
            <TabsTrigger
              value="parents"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-6"
            >
              <Users className="h-4 w-4 mr-2" />
              {t("profile.tabs.parents", "Parents")}
              <Badge variant="secondary" className="ml-2 bg-muted/50">
                {parents.length}
              </Badge>
            </TabsTrigger>
          )}
          {registrations.length > 0 && (
            <TabsTrigger
              value="registrations"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-6"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {t("profile.tabs.registrations")}
              <Badge variant="secondary" className="ml-2 bg-muted/50">
                {registrations.length}
              </Badge>
            </TabsTrigger>
          )}
        </TabsList>

        <div className="mt-6">
          {/* TAB: IDENTITY */}
          <TabsContent value="identity" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Identity Photo Section */}
              {identityPhotoUrl && (
                <Section
                  icon={ImageIcon}
                  title={t("documents.identityPhoto")}
                  className="md:col-span-2"
                >
                  <div className="flex items-start gap-6">
                    <div className="relative w-32 h-32 rounded-lg border bg-muted overflow-hidden flex-shrink-0">
                      <img
                        src={identityPhotoUrl}
                        alt="Identification"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {t("documents.identityPhoto")}
                      </p>
                      <Button
                        onClick={handleRemoveBackground}
                        disabled={isRemovingBg}
                        variant="secondary"
                        size="sm"
                      >
                        {isRemovingBg ? (
                          <span className="animate-pulse">...</span>
                        ) : (
                          <>
                            <Wand2 className="h-4 w-4 mr-2" />
                            Detourer la photo (IA)
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </Section>
              )}

              {/* Identity Section */}
              <Section icon={User} title={t("profile.sections.identity")}>
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem
                    label={t("profile.fields.firstName")}
                    value={profile.identity?.firstName}
                  />
                  <InfoItem
                    label={t("profile.fields.lastName")}
                    value={profile.identity?.lastName}
                  />
                  <InfoItem
                    label={t("profile.fields.birthDate")}
                    value={formatDate(profile.identity?.birthDate)}
                  />
                  <InfoItem
                    label={t("profile.fields.birthPlace")}
                    value={profile.identity?.birthPlace}
                  />
                  <InfoItem
                    label={t("profile.fields.birthCountry")}
                    value={getCountryLabel(profile.identity?.birthCountry)}
                  />
                  <InfoItem
                    label={t("profile.fields.gender")}
                    value={getGenderLabel(profile.identity?.gender)}
                  />
                  <InfoItem
                    label={t("profile.fields.nationality")}
                    value={getCountryLabel(profile.identity?.nationality)}
                  />
                  {profile.identity?.nationalityAcquisition && (
                    <InfoItem
                      label={t(
                        "documentTypes.types.nationality_acquisition_declaration",
                      )}
                      value={getNationalityAcquisitionLabel(
                        profile.identity.nationalityAcquisition,
                      )}
                    />
                  )}
                </div>
              </Section>

              {/* Passport Section */}
              <Section icon={FileText} title={t("profile.sections.passport")}>
                {profile.passportInfo?.number ? (
                  <div className="grid grid-cols-2 gap-4">
                    <InfoItem
                      label={t("profile.passport.number")}
                      value={profile.passportInfo.number}
                    />
                    <InfoItem
                      label={t("profile.passport.issueDate")}
                      value={formatDate(profile.passportInfo.issueDate)}
                    />
                    <InfoItem
                      label={t("profile.passport.expiryDate")}
                      value={formatDate(profile.passportInfo.expiryDate)}
                    />
                    <InfoItem
                      label={t("profile.passport.issuingAuthority")}
                      value={profile.passportInfo.issuingAuthority}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    {t("profile.empty.passport")}
                  </p>
                )}
              </Section>

              {/* Family Section */}
              <Section icon={Users} title={t("profile.sections.family")}>
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem
                    label={t("profile.fields.maritalStatus")}
                    value={getMaritalStatusLabel(profile.family?.maritalStatus)}
                  />
                  {profile.family?.spouse && (
                    <InfoItem
                      label={t("profile.relationship.spouse")}
                      value={[
                        profile.family.spouse.firstName,
                        profile.family.spouse.lastName,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    />
                  )}
                  {profile.family?.father && (
                    <InfoItem
                      label={t("profile.relationship.father")}
                      value={[
                        profile.family.father.firstName,
                        profile.family.father.lastName,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    />
                  )}
                  {profile.family?.mother && (
                    <InfoItem
                      label={t("profile.relationship.mother")}
                      value={[
                        profile.family.mother.firstName,
                        profile.family.mother.lastName,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    />
                  )}
                </div>
              </Section>

              {/* Profession Section */}
              <Section
                icon={Briefcase}
                title={t("profile.sections.profession")}
              >
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem
                    label={t("profile.profession.status")}
                    value={getWorkStatusLabel(profile.profession?.status)}
                  />
                  <InfoItem
                    label={t("profile.profession.title")}
                    value={profile.profession?.title}
                  />
                  <InfoItem
                    label={t("profile.profession.employer")}
                    value={profile.profession?.employer}
                  />
                </div>
              </Section>

              {/* Addresses Section */}
              <Section
                icon={MapPin}
                title={t("profile.sections.addresses")}
                className="md:col-span-2"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {profile.addresses?.residence ? (
                    <div className="bg-muted/30 rounded-lg p-4 border border-dashed">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        {t("profile.sections.addressAbroad")}
                      </p>
                      <p className="text-sm">
                        {[
                          profile.addresses.residence.street,
                          profile.addresses.residence.postalCode,
                          profile.addresses.residence.city,
                          getCountryLabel(profile.addresses.residence.country),
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      {t("profile.empty.addressResidence")}
                    </p>
                  )}
                  {profile.addresses?.homeland && (
                    <div className="bg-muted/30 rounded-lg p-4 border border-dashed">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        {t("profile.sections.addressHome")}
                      </p>
                      <p className="text-sm">
                        {[
                          profile.addresses.homeland.street,
                          profile.addresses.homeland.city,
                          getCountryLabel(profile.addresses.homeland.country),
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              </Section>

              {/* Emergency Contacts */}
              {(() => {
                const ec = (profile.contacts as any)?.emergencyContacts as Array<{ firstName: string; lastName: string; phone: string; country?: string }> | undefined;
                const legacyRes = profile.contacts?.emergencyResidence;
                const legacyHome = profile.contacts?.emergencyHomeland;
                const contacts = ec?.length ? ec : [
                  ...(legacyRes ? [legacyRes] : []),
                  ...(legacyHome ? [legacyHome] : []),
                ];
                return contacts.length > 0 ? (
                  <Section
                    icon={ShieldAlert}
                    title={t("profile.emergency.title")}
                    className="md:col-span-2"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {contacts.map((c, i) => (
                        <div key={i} className="bg-destructive/5 p-4 rounded-lg border border-destructive/10">
                          <p className="text-xs font-semibold text-destructive uppercase tracking-wide mb-3">
                            {t("profile.emergencyContacts.contactNumber", { number: i + 1 })}
                            {(c as any).country ? ` — ${t(`superadmin.countryCodes.${(c as any).country}`, (c as any).country)}` : ""}
                          </p>
                          <div className="space-y-3">
                            <InfoItem
                              label={t("profile.sections.identity")}
                              value={`${c.firstName} ${c.lastName}`}
                            />
                            <InfoItem
                              label={t("profile.fields.phone")}
                              value={c.phone}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                ) : null;
              })()}
            </div>
          </TabsContent>

          {/* TAB: DOCUMENTS */}
          <TabsContent value="documents">
            <Card>
              <CardContent className="p-6">
                {documents.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>{t("profile.empty.documents")}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {documents.map((doc: any) => {
                      const firstFile = doc.files?.[0];
                      const canPreview = firstFile?.storageId;
                      return (
                        <button
                          type="button"
                          key={doc._id}
                          className={`flex items-center gap-3 p-3 rounded-lg border bg-card text-left transition-colors ${
                            canPreview
                              ? "hover:bg-muted/50 hover:border-primary/30 cursor-pointer"
                              : "opacity-60 cursor-default"
                          }`}
                          onClick={() => {
                            if (canPreview) {
                              setPreviewDoc({
                                storageId: firstFile.storageId,
                                filename:
                                  firstFile.filename || doc.label || "Document",
                                mimeType: firstFile.mimeType,
                              });
                            }
                          }}
                        >
                          <div className="h-10 w-10 rounded-md bg-primary/10 flex flex-col items-center justify-center shrink-0">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-sm font-medium truncate"
                              title={doc.label || doc.documentType}
                            >
                              {doc.label ||
                                (t(
                                  `documentTypes.types.${doc.documentType}`,
                                  doc.documentType,
                                ) as string) ||
                                "Document"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatDate(doc._creationTime)}
                              {doc.files?.length > 0 &&
                                ` \u00b7 ${doc.files.length} fichier${doc.files.length > 1 ? "s" : ""}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant="outline"
                              className={getStatusBadgeColor(doc.status)}
                            >
                              {
                                t(
                                  `enums.documentStatus.${doc.status}`,
                                  doc.status,
                                ) as string
                              }
                            </Badge>
                            {canPreview && (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Inline Document Preview Dialog */}
            <Dialog
              open={!!previewDoc}
              onOpenChange={(open) => {
                if (!open) setPreviewDoc(null);
              }}
            >
              <DialogContent className="max-w-3xl max-h-[80vh] p-0 overflow-hidden">
                <div className="p-4 border-b">
                  <h3 className="font-semibold text-lg">
                    {previewDoc?.filename}
                  </h3>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  {previewUrl ? (
                    previewDoc?.mimeType?.startsWith("image/") ? (
                      <img
                        src={previewUrl}
                        alt={previewDoc?.filename}
                        className="max-w-full h-auto mx-auto rounded"
                      />
                    ) : previewDoc?.mimeType === "application/pdf" ? (
                      <iframe
                        src={previewUrl}
                        className="w-full h-[60vh] border-0 rounded"
                        title={previewDoc?.filename}
                      />
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">
                        <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p>Apercu non disponible pour ce type de fichier</p>
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline mt-2 inline-block"
                        >
                          Telecharger le fichier
                        </a>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center justify-center py-10">
                      <Skeleton className="h-40 w-full" />
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* TAB: REQUESTS */}
          <TabsContent value="requests">
            <Card>
              <CardContent className="p-0">
                {requests.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <History className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>{t("profile.empty.requests")}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b">
                        <tr>
                          <th className="px-6 py-3 font-medium">
                            {t("profile.requests.reference")}
                          </th>
                          <th className="px-6 py-3 font-medium">
                            {t("profile.requests.service")}
                          </th>
                          <th className="px-6 py-3 font-medium">
                            {t("profile.requests.date")}
                          </th>
                          <th className="px-6 py-3 font-medium">
                            {t("profile.requests.status")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {requests.map((req: any) => (
                          <tr
                            key={req._id}
                            className="bg-card hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-6 py-4 font-mono font-medium">
                              {req.reference || "\u2014"}
                            </td>
                            <td className="px-6 py-4">
                              {req.serviceName?.fr ||
                                t("profile.requests.fallbackService")}
                            </td>
                            <td className="px-6 py-4">
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatDate(
                                  req.submittedAt || req._creationTime,
                                )}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <Badge
                                variant="outline"
                                className={getRequestStatusBadgeColor(
                                  req.status,
                                )}
                              >
                                {
                                  t(
                                    `dashboard.requests.statuses.${req.status}`,
                                    req.status,
                                  ) as string
                                }
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: CHILDREN */}
          <TabsContent value="children">
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {children.map((child: any) => (
                    <div
                      key={child._id}
                      className="flex items-start gap-4 p-4 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/30 transition-colors"
                    >
                      <Avatar className="h-12 w-12 bg-indigo-100 text-indigo-700 font-bold shrink-0">
                        <AvatarFallback>
                          {child.identity?.firstName?.[0] || ""}
                          {child.identity?.lastName?.[0] || ""}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold">
                          {child.identity?.firstName} {child.identity?.lastName}
                        </h4>
                        <div className="text-sm text-muted-foreground mt-1 space-y-1">
                          <p>
                            {t("profile.children.bornOn", {
                              date: formatDate(child.identity?.birthDate),
                            })}
                          </p>
                          <p>
                            {t("profile.children.gender")}
                            {getGenderLabel(child.identity?.gender) || "\u2014"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: PARENTS */}
          <TabsContent value="parents">
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {parents.map((parent: any, idx: number) => {
                    const parentKey = parent.profileId ?? `parent-${idx}`;
                    return (
                      <div
                        key={parentKey}
                        className="flex items-start gap-4 p-4 rounded-xl border bg-card transition-colors"
                      >
                        <Avatar className="h-12 w-12 bg-indigo-100 text-indigo-700 font-bold shrink-0">
                          <AvatarFallback>
                            {parent.firstName?.[0] || ""}
                            {parent.lastName?.[0] || ""}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold transition-colors">
                              {parent.firstName} {parent.lastName}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {
                                t(
                                  `enums.parentalRole.${parent.role}`,
                                  parent.role,
                                ) as string
                              }
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1 space-y-1">
                            {parent.email && (
                              <p className="flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {parent.email}
                              </p>
                            )}
                            {parent.phone && (
                              <p className="flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {parent.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: REGISTRATIONS */}
          <TabsContent value="registrations">
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 gap-4">
                  {registrations.map((reg: any) => (
                    <div
                      key={reg._id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-base">
                            {
                              t(
                                `enums.registrationType.${reg.type}`,
                                reg.type,
                              ) as string
                            }
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {reg.cardNumber
                              ? t("profile.registrations.cardNumber", {
                                  number: reg.cardNumber,
                                })
                              : t("profile.registrations.pendingIssuance")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="space-y-1">
                          <p className="text-muted-foreground text-xs uppercase">
                            {t("profile.registrations.expiresAt")}
                          </p>
                          <p className="font-medium">
                            {formatDate(reg.expiresAt)}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={getRegStatusBadgeColor(reg.status)}
                        >
                          {String(
                            t(
                              `enums.registrationStatus.${reg.status}`,
                              reg.status,
                            ),
                          )}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// ── Subcomponents ────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-card border rounded-xl p-6 shadow-sm ${className || ""}`}
    >
      <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border/60">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h3 className="font-bold text-base">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className="text-sm font-medium">{value || "\u2014"}</p>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="flex gap-4">
        <Skeleton className="h-12 w-32" />
        <Skeleton className="h-12 w-32" />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <Skeleton className="h-[300px] w-full rounded-xl" />
        <Skeleton className="h-[300px] w-full rounded-xl" />
      </div>
    </div>
  );
}

// ── Badge Helpers ────────────────────────────────────────────────

function getStatusBadgeColor(status: string) {
  switch (status) {
    case "valid":
      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300";
    case "rejected":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300";
    case "pending":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300";
  }
}

function getRequestStatusBadgeColor(status: string) {
  switch (status) {
    case "completed":
    case "ready_for_pickup":
    case "validated":
      return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300";
    case "rejected":
    case "cancelled":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300";
    default:
      return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300";
  }
}

function getRegStatusBadgeColor(status: string) {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300";
    case "expired":
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400";
    default:
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300";
  }
}
