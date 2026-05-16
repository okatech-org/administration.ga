"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { CalendarDays, Upload } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function AdminNewEventPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const { data: orgs } = useAuthenticatedConvexQuery(
    api.functions.orgs.list,
    {},
  );
  const { mutateAsync: create } = useConvexMutationQuery(
    api.functions.communityEvents.create,
  );
  const { mutateAsync: generateUploadUrl } = useConvexMutationQuery(
    api.functions.documents.generateUploadUrl,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("celebration");
  const [selectedOrgId, setSelectedOrgId] = useState("none");
  const [publish, setPublish] = useState(false);

  // Cover image
  const [coverImageStorageId, setCoverImageStorageId] = useState<
    Id<"_storage"> | undefined
  >();
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(
    null,
  );

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slug || slug === slugify(title)) {
      setSlug(slugify(value));
    }
  };

  const handleCoverImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const postUrl = await generateUploadUrl({});
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!result.ok) throw new Error("Upload failed");
      const { storageId } = await result.json();
      setCoverImageStorageId(storageId);
      setCoverImagePreview(URL.createObjectURL(file));
      toast.success("Image téléchargée");
    } catch {
      toast.error("Erreur lors du téléchargement");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !slug || !date || !location) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setIsSubmitting(true);
    try {
      await create({
        title,
        slug,
        description: description || undefined,
        date: new Date(date).getTime(),
        location,
        category,
        coverImageStorageId,
        orgId:
          selectedOrgId !== "none" ? (selectedOrgId as Id<"orgs">) : undefined,
        publish,
      });

      toast.success(publish ? "Événement publié" : "Brouillon enregistré");
      router.push("/events");
    } catch (err: any) {
      toast.error(err.message || "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 px-7 pt-6 pb-[60px]">
      <PageHeader
        icon={<CalendarDays className="h-5 w-5" />}
        title="Nouvel événement"
        subtitle="Créer un événement communautaire"
        showBackButton
        onBack={() => router.push("/events")}
      />

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <FlatCard>
            <div className="p-3 lg:p-4 space-y-4">
              <h2 className="text-base font-semibold">Informations</h2>
              <div className="space-y-2">
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Titre de l'événement"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL) *</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="mon-evenement"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description de l'événement..."
                  rows={4}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="datetime-local"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Lieu *</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Paris, France"
                  />
                </div>
              </div>
            </div>
          </FlatCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <FlatCard>
            <div className="p-3 lg:p-4 space-y-4">
              <h2 className="text-base font-semibold">Paramètres</h2>
              <div className="space-y-2">
                <Label>Représentation</Label>
                <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Global (aucune)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Global (aucune)</SelectItem>
                    {orgs?.map((org) => (
                      <SelectItem key={org._id} value={org._id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Catégorie *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="celebration">Célébration</SelectItem>
                    <SelectItem value="culture">Culture</SelectItem>
                    <SelectItem value="diplomacy">Diplomatie</SelectItem>
                    <SelectItem value="sport">Sport</SelectItem>
                    <SelectItem value="charity">Charité</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Image de couverture</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverImageUpload}
                    className="hidden"
                    id="cover-upload"
                  />
                  {coverImagePreview ?
                    <div>
                      <img
                        src={coverImagePreview}
                        alt="Cover"
                        className="w-full h-32 object-cover rounded mb-2"
                      />
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() =>
                          document.getElementById("cover-upload")?.click()
                        }
                      >
                        Changer
                      </Button>
                    </div>
                  : <label htmlFor="cover-upload" className="cursor-pointer">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        Télécharger
                      </p>
                    </label>
                  }
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="publish">Publier maintenant</Label>
                <Switch
                  id="publish"
                  checked={publish}
                  onCheckedChange={setPublish}
                />
              </div>
            </div>
          </FlatCard>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ?
              "Enregistrement..."
            : publish ?
              "Publier"
            : "Enregistrer le brouillon"}
          </Button>
        </div>
      </form>
    </div>
  );
}
