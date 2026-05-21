"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { TutorialCategory, TutorialType } from "@convex/lib/constants";
import { useRouter } from "next/navigation";
import { BookOpen, Upload } from "lucide-react";
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
import { RichTextEditor } from "@/components/common/lazy-rich-text-editor";
import { useConvexMutationQuery } from "@/integrations/convex/hooks";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function AdminNewTutorialPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const { mutateAsync: create } = useConvexMutationQuery(
    api.functions.tutorials.create,
  );
  const { mutateAsync: generateUploadUrl } = useConvexMutationQuery(
    api.functions.documents.generateUploadUrl,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<string>(
    TutorialCategory.Administrative,
  );
  const [type, setType] = useState<string>(TutorialType.Article);
  const [duration, setDuration] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
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

    if (!title || !slug || !excerpt) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setIsSubmitting(true);
    try {
      await create({
        title,
        slug,
        excerpt,
        content,
        category: category as TutorialCategory,
        type: type as TutorialType,
        duration: duration || undefined,
        videoUrl: videoUrl || undefined,
        coverImageStorageId,
        publish,
      });

      toast.success(publish ? "Tutoriel publié" : "Brouillon enregistré");
      router.push("/tutorials");
    } catch (err: any) {
      toast.error(err.message || "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 px-7 pt-6 pb-[60px]">
      <PageHeader
        icon={<BookOpen className="h-5 w-5" />}
        title={t("superadmin.tutorials.newTitle")}
        subtitle="Créer un nouveau guide ou tutoriel"
        showBackButton
        onBack={() => router.push("/tutorials")}
      />

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <FlatCard>
            <div className="p-3 lg:p-4 space-y-4">
              <h2 className="text-base font-semibold">Contenu</h2>
              <div className="space-y-2">
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Titre du tutoriel"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL) *</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="mon-tutoriel"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">Extrait *</Label>
                <Textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Résumé court du tutoriel..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Contenu</Label>
                <RichTextEditor content={content} onChange={setContent} />
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
                <Label>Catégorie *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administrative">
                      Administratif
                    </SelectItem>
                    <SelectItem value="travel">Voyage</SelectItem>
                    <SelectItem value="entrepreneurship">
                      Entrepreneuriat
                    </SelectItem>
                    <SelectItem value="practical_life">Vie pratique</SelectItem>
                    <SelectItem value="culture">Culture</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="article">Article</SelectItem>
                    <SelectItem value="video">Vidéo</SelectItem>
                    <SelectItem value="guide">Guide</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Durée</Label>
                <Input
                  id="duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="5 min"
                />
              </div>

              {type === "video" && (
                <div className="space-y-2">
                  <Label htmlFor="videoUrl">URL Vidéo</Label>
                  <Input
                    id="videoUrl"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
              )}

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
