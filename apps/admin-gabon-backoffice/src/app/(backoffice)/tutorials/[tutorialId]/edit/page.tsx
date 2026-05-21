"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  TutorialCategory,
  TutorialType,
  PostStatus,
} from "@convex/lib/constants";
import { useParams, useRouter } from "next/navigation";
import {
  BookOpen,
  FileText,
  GraduationCap,
  Upload,
  Video,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/common/lazy-rich-text-editor";
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
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks";

export default function AdminEditTutorialPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { tutorialId } = useParams<{ tutorialId: string }>();

  const { data: tutorial } = useAuthenticatedConvexQuery(
    api.functions.tutorials.getById,
    { tutorialId: tutorialId as Id<"tutorials"> },
  );
  const { mutateAsync: update } = useConvexMutationQuery(
    api.functions.tutorials.update,
  );
  const { mutateAsync: setStatus } = useConvexMutationQuery(
    api.functions.tutorials.setStatus,
  );
  const { mutateAsync: generateUploadUrl } = useConvexMutationQuery(
    api.functions.documents.generateUploadUrl,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [duration, setDuration] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  // Cover image
  const [coverImageStorageId, setCoverImageStorageId] = useState<
    Id<"_storage"> | undefined
  >();
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(
    null,
  );

  // Populate form when data loads
  useEffect(() => {
    if (tutorial) {
      setTitle(tutorial.title);
      setSlug(tutorial.slug);
      setExcerpt(tutorial.excerpt);
      setContent(tutorial.content);
      setCategory(tutorial.category);
      setType(tutorial.type);
      setDuration(tutorial.duration ?? "");
      setVideoUrl(tutorial.videoUrl ?? "");
      setCoverImagePreview(tutorial.coverImageUrl);
      setCoverImageStorageId(tutorial.coverImageStorageId);
    }
  }, [tutorial]);

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

    if (!title || !slug || !excerpt || !content) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setIsSubmitting(true);
    try {
      await update({
        tutorialId: tutorialId as Id<"tutorials">,
        title,
        slug,
        excerpt,
        content,
        category: category as any,
        type: type as any,
        duration: duration || undefined,
        videoUrl: videoUrl || undefined,
        coverImageStorageId,
      });

      toast.success("Tutoriel mis à jour");
      router.push("/tutorials");
    } catch (err: any) {
      toast.error(err.message || "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!tutorial) return;
    try {
      const newStatus =
        tutorial.status === PostStatus.Published ?
          PostStatus.Draft
        : PostStatus.Published;
      await setStatus({
        tutorialId: tutorialId as Id<"tutorials">,
        status: newStatus,
      });
      toast.success(
        newStatus === PostStatus.Published ?
          "Tutoriel publié"
        : "Tutoriel dépublié",
      );
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du changement de statut");
    }
  };

  if (!tutorial) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-96" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const isVideo = type === TutorialType.Video;

  return (
    <div className="flex flex-1 flex-col gap-4 px-7 pt-6 pb-[60px]">
      <PageHeader
        icon={<BookOpen className="h-5 w-5" />}
        title="Modifier le tutoriel"
        subtitle={tutorial.title}
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
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titre du tutoriel"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL) *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    /academy/
                  </span>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">Résumé *</Label>
                <Textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Corps du tutoriel *</Label>
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  className="min-h-[300px]"
                />
              </div>
            </div>
          </FlatCard>

          {isVideo && (
            <FlatCard>
              <div className="p-3 lg:p-4 space-y-4">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Vidéo externe
                </h2>
                <div className="space-y-2">
                  <Label htmlFor="videoUrl">Lien YouTube ou Vimeo</Label>
                  <Input
                    id="videoUrl"
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
              </div>
            </FlatCard>
          )}
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
                    <SelectItem value={TutorialCategory.Administrative}>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Administratif
                      </div>
                    </SelectItem>
                    <SelectItem value={TutorialCategory.Travel}>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Voyage
                      </div>
                    </SelectItem>
                    <SelectItem value={TutorialCategory.Entrepreneurship}>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Entrepreneuriat
                      </div>
                    </SelectItem>
                    <SelectItem value={TutorialCategory.PracticalLife}>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Vie pratique
                      </div>
                    </SelectItem>
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
                    <SelectItem value={TutorialType.Article}>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Article
                      </div>
                    </SelectItem>
                    <SelectItem value={TutorialType.Video}>
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Vidéo
                      </div>
                    </SelectItem>
                    <SelectItem value={TutorialType.Guide}>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Guide
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Durée</Label>
                <Input
                  id="duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="5 min, 10 min read..."
                />
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
            </div>
          </FlatCard>

          <div className="flex flex-col gap-2">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ?
                "Enregistrement..."
              : "Enregistrer les modifications"}
            </Button>
            <Button
              type="button"
              variant={
                tutorial.status === PostStatus.Published ? "outline" : "default"
              }
              className="w-full"
              onClick={handleTogglePublish}
            >
              {tutorial.status === PostStatus.Published ?
                "Dépublier"
              : "Publier"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
