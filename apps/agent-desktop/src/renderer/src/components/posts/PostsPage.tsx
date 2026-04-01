"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { PostCategory, PostStatus } from "@convex/lib/constants";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  Calendar,
  CalendarDays,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  MapPin,
  Megaphone,
  MoreHorizontal,
  Newspaper,
  Pencil,
  Plus,
  Ticket,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useOrg } from "../../hooks/useOrg";
import {
  useAuthenticatedConvexQuery,
  useAuthenticatedPaginatedQuery,
  useConvexMutationQuery,
} from "../../hooks/useConvexHooks";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Switch } from "@workspace/ui/components/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Textarea } from "@workspace/ui/components/textarea";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewState =
  | { mode: "list" }
  | { mode: "create" }
  | { mode: "edit"; postId: Id<"posts"> };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const categoryLabels: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  news: { label: "Actualité", variant: "secondary" },
  event: { label: "Événement", variant: "default" },
  communique: { label: "Communiqué", variant: "outline" },
  announcement: { label: "Communiqué", variant: "outline" },
};

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------

export function PostsPage() {
  const [view, setView] = useState<ViewState>({ mode: "list" });

  if (view.mode === "create") {
    return <PostForm onBack={() => setView({ mode: "list" })} />;
  }
  if (view.mode === "edit") {
    return (
      <PostForm
        postId={view.postId}
        onBack={() => setView({ mode: "list" })}
      />
    );
  }

  return <PostList onNavigate={setView} />;
}

// ---------------------------------------------------------------------------
// Post List
// ---------------------------------------------------------------------------

function PostList({ onNavigate }: { onNavigate: (v: ViewState) => void }) {
  const { orgId } = useOrg();
  const { t } = useTranslation();

  const {
    results: posts,
    status: paginationStatus,
    loadMore,
  } = useAuthenticatedPaginatedQuery(
    api.functions.posts.listByOrg,
    orgId ? { orgId } : "skip",
    { initialNumItems: 30 },
  );

  const { mutateAsync: setStatus } = useConvexMutationQuery(
    api.functions.posts.setStatus,
  );
  const { mutateAsync: remove } = useConvexMutationQuery(
    api.functions.posts.remove,
  );

  const handleToggleStatus = async (
    postId: Id<"posts">,
    currentStatus: string,
  ) => {
    const newStatus =
      currentStatus === PostStatus.Published
        ? PostStatus.Draft
        : PostStatus.Published;
    try {
      await setStatus({ postId, status: newStatus });
      toast.success(
        newStatus === PostStatus.Published
          ? t("dashboard.posts.published")
          : t("dashboard.posts.unpublished"),
      );
    } catch (err: any) {
      toast.error(err.message || t("common.error"));
    }
  };

  const handleDelete = async (postId: Id<"posts">) => {
    if (
      !confirm(
        t(
          "dashboard.posts.confirmDelete",
          "Êtes-vous sûr de vouloir supprimer cet article ?",
        ),
      )
    ) {
      return;
    }
    try {
      await remove({ postId });
      toast.success(t("dashboard.posts.deleted"));
    } catch (err: any) {
      toast.error(err.message || t("common.error"));
    }
  };

  if (posts.length === 0 && paginationStatus === "LoadingFirstPage") {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("dashboard.posts.title")}
          </h1>
          <p className="text-muted-foreground">
            {t(
              "dashboard.posts.description",
              "Gérez les actualités, événements et communiqués de votre organisation.",
            )}
          </p>
        </div>
        <Button onClick={() => onNavigate({ mode: "create" })}>
          <Plus className="mr-2 h-4 w-4" />
          {t("dashboard.posts.create")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            {t("dashboard.posts.listTitle")}
          </CardTitle>
          <CardDescription>
            {t(
              "dashboard.posts.listDescription",
              "Liste de toutes vos publications",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <Newspaper className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground mb-4">
                {t(
                  "dashboard.posts.empty",
                  "Aucune publication pour le moment",
                )}
              </p>
              <Button onClick={() => onNavigate({ mode: "create" })}>
                <Plus className="mr-2 h-4 w-4" />
                {t(
                  "dashboard.posts.createFirst",
                  "Créer votre première publication",
                )}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {t("dashboard.posts.columns.title")}
                  </TableHead>
                  <TableHead>
                    {t("dashboard.posts.columns.category")}
                  </TableHead>
                  <TableHead>
                    {t("dashboard.posts.columns.status")}
                  </TableHead>
                  <TableHead>
                    {t("dashboard.posts.columns.date")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("dashboard.posts.columns.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post: any) => {
                  const catConfig = categoryLabels[post.category] ?? {
                    label: post.category,
                    variant: "secondary" as const,
                  };
                  return (
                    <TableRow key={post._id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {post.coverImageUrl ? (
                            <img
                              src={post.coverImageUrl}
                              alt=""
                              className="h-10 w-16 rounded object-cover"
                            />
                          ) : (
                            <div className="h-10 w-16 rounded bg-muted flex items-center justify-center">
                              <Newspaper className="h-5 w-5 text-muted-foreground/30" />
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="line-clamp-1">{post.title}</span>
                            <span className="text-xs text-muted-foreground">
                              par {post.authorName}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={catConfig.variant}>
                          {catConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            post.status === PostStatus.Published
                              ? "default"
                              : "outline"
                          }
                        >
                          {post.status === PostStatus.Published
                            ? "Publié"
                            : "Brouillon"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {post.publishedAt
                          ? format(new Date(post.publishedAt), "d MMM yyyy", {
                              locale: fr,
                            })
                          : format(new Date(post.createdAt), "d MMM yyyy", {
                              locale: fr,
                            })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                onNavigate({
                                  mode: "edit",
                                  postId: post._id,
                                })
                              }
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              {t("common.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleToggleStatus(post._id, post.status)
                              }
                            >
                              {post.status === PostStatus.Published ? (
                                <>
                                  <EyeOff className="mr-2 h-4 w-4" />
                                  {t("dashboard.posts.unpublish")}
                                </>
                              ) : (
                                <>
                                  <Eye className="mr-2 h-4 w-4" />
                                  {t("dashboard.posts.publish")}
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(post._id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t("common.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Load More */}
          {paginationStatus === "CanLoadMore" && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={() => loadMore(30)}>
                Charger plus
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Post Form (create + edit)
// ---------------------------------------------------------------------------

function PostForm({
  postId,
  onBack,
}: {
  postId?: Id<"posts">;
  onBack: () => void;
}) {
  const isEditing = !!postId;
  const { orgId } = useOrg();
  const { t } = useTranslation();

  // Fetch existing post when editing
  const { data: post } = useAuthenticatedConvexQuery(
    api.functions.posts.getById,
    isEditing ? { postId: postId! } : "skip",
  );

  const { mutateAsync: create } = useConvexMutationQuery(
    api.functions.posts.create,
  );
  const { mutateAsync: update } = useConvexMutationQuery(
    api.functions.posts.update,
  );
  const { mutateAsync: generateUploadUrl } = useConvexMutationQuery(
    api.functions.documents.generateUploadUrl,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [category, setCategory] = useState<
    (typeof PostCategory)[keyof typeof PostCategory]
  >(PostCategory.News);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [publish, setPublish] = useState(false);

  // Cover image
  const [coverImageStorageId, setCoverImageStorageId] = useState<
    Id<"_storage"> | undefined
  >();
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(
    null,
  );

  // Event-specific
  const [eventStartAt, setEventStartAt] = useState("");
  const [eventEndAt, setEventEndAt] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventTicketUrl, setEventTicketUrl] = useState("");

  // Communique-specific
  const [documentStorageId, setDocumentStorageId] = useState<
    Id<"_storage"> | undefined
  >();
  const [documentName, setDocumentName] = useState<string | null>(null);

  // Load post data when editing
  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setSlug(post.slug);
      setExcerpt(post.excerpt);
      setContent(post.content);
      setCategory(post.category);
      setCoverImageStorageId(post.coverImageStorageId);
      setCoverImagePreview(post.coverImageUrl ?? null);
      setDocumentStorageId(post.documentStorageId);
      if (post.documentUrl) {
        setDocumentName("Document existant");
      }

      // Event fields
      if (post.eventStartAt) {
        setEventStartAt(
          new Date(post.eventStartAt).toISOString().slice(0, 16),
        );
      }
      if (post.eventEndAt) {
        setEventEndAt(new Date(post.eventEndAt).toISOString().slice(0, 16));
      }
      if (post.eventLocation) {
        setEventLocation(post.eventLocation);
      }
      if (post.eventTicketUrl) {
        setEventTicketUrl(post.eventTicketUrl);
      }
    }
  }, [post]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!isEditing && (!slug || slug === slugify(title))) {
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
      toast.success(t("dashboard.posts.imageUploaded"));
    } catch {
      toast.error(t("dashboard.posts.uploadError"));
    }
  };

  const handleDocumentUpload = async (
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
      setDocumentStorageId(storageId);
      setDocumentName(file.name);
      toast.success(t("dashboard.posts.documentUploaded"));
    } catch {
      toast.error(t("dashboard.posts.uploadError"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;

    if (!title || !slug || !excerpt || !content) {
      toast.error(
        t(
          "dashboard.posts.requiredFields",
          "Veuillez remplir tous les champs obligatoires",
        ),
      );
      return;
    }

    if (category === PostCategory.Announcement && !documentStorageId) {
      toast.error(
        t(
          "dashboard.posts.documentRequired",
          "Un document PDF est obligatoire pour les communiqués",
        ),
      );
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await update({
          postId: postId!,
          title,
          slug,
          excerpt,
          content,
          category,
          coverImageStorageId,
          eventStartAt: eventStartAt
            ? new Date(eventStartAt).getTime()
            : undefined,
          eventEndAt: eventEndAt ? new Date(eventEndAt).getTime() : undefined,
          eventLocation: eventLocation || undefined,
          eventTicketUrl: eventTicketUrl || undefined,
          documentStorageId,
        });
        toast.success(t("dashboard.posts.updatedSuccess"));
      } else {
        await create({
          title,
          slug,
          excerpt,
          content,
          category,
          coverImageStorageId,
          orgId,
          publish,
          eventStartAt: eventStartAt
            ? new Date(eventStartAt).getTime()
            : undefined,
          eventEndAt: eventEndAt ? new Date(eventEndAt).getTime() : undefined,
          eventLocation: eventLocation || undefined,
          eventTicketUrl: eventTicketUrl || undefined,
          documentStorageId,
        });
        toast.success(
          publish
            ? t("dashboard.posts.publishedSuccess")
            : t("dashboard.posts.savedSuccess"),
        );
      }
      onBack();
    } catch (err: any) {
      toast.error(err.message || t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loader while fetching post data in edit mode
  if (isEditing && !post) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isEvent = category === PostCategory.Event;
  const isCommunique = category === PostCategory.Announcement;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("common.back")}
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEditing
              ? t("dashboard.posts.edit.title")
              : t("dashboard.posts.new.title")}
          </h1>
          <p className="text-muted-foreground">
            {isEditing
              ? post?.title
              : t(
                  "dashboard.posts.new.description",
                  "Créez une actualité, un événement ou un communiqué",
                )}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.posts.form.content")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  {t("dashboard.posts.form.title")} *
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder={t(
                    "dashboard.posts.form.titlePlaceholder",
                    "Titre de l'article",
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">
                  {t("dashboard.posts.form.slug")} *
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/news/</span>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    placeholder="mon-article"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">
                  {t("dashboard.posts.form.excerpt")} *
                </Label>
                <Textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder={t(
                    "dashboard.posts.form.excerptPlaceholder",
                    "Un court résumé qui apparaîtra dans les listes...",
                  )}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">
                  {t("dashboard.posts.form.body")} *
                </Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t(
                    "dashboard.posts.form.bodyPlaceholder",
                    "Contenu de l'article...",
                  )}
                  rows={12}
                  className="min-h-[300px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Event-specific fields */}
          {isEvent && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  {t(
                    "dashboard.posts.form.eventDetails",
                    "Détails de l'événement",
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="eventStartAt">
                      <Calendar className="inline mr-2 h-4 w-4" />
                      {t("dashboard.posts.form.eventStart")}
                    </Label>
                    <Input
                      id="eventStartAt"
                      type="datetime-local"
                      value={eventStartAt}
                      onChange={(e) => setEventStartAt(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eventEndAt">
                      <Calendar className="inline mr-2 h-4 w-4" />
                      {t("dashboard.posts.form.eventEnd")}
                    </Label>
                    <Input
                      id="eventEndAt"
                      type="datetime-local"
                      value={eventEndAt}
                      onChange={(e) => setEventEndAt(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eventLocation">
                    <MapPin className="inline mr-2 h-4 w-4" />
                    {t("dashboard.posts.form.eventLocation")}
                  </Label>
                  <Input
                    id="eventLocation"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    placeholder={t(
                      "dashboard.posts.form.eventLocationPlaceholder",
                      "Adresse ou nom du lieu",
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eventTicketUrl">
                    <Ticket className="inline mr-2 h-4 w-4" />
                    {t(
                      "dashboard.posts.form.eventTicket",
                      "Lien billetterie / inscription",
                    )}
                  </Label>
                  <Input
                    id="eventTicketUrl"
                    type="url"
                    value={eventTicketUrl}
                    onChange={(e) => setEventTicketUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Communique-specific fields */}
          {isCommunique && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5" />
                  {t(
                    "dashboard.posts.form.communiqueDetails",
                    "Document officiel",
                  )}
                </CardTitle>
                <CardDescription>
                  {t(
                    "dashboard.posts.form.communiqueHint",
                    "Téléchargez le document PDF officiel (obligatoire)",
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleDocumentUpload}
                    className="hidden"
                    id="document-upload"
                  />
                  {documentName ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="h-8 w-8 text-emerald-600" />
                      <div>
                        <p className="font-medium">{documentName}</p>
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          onClick={() =>
                            document
                              .getElementById("document-upload")
                              ?.click()
                          }
                        >
                          {t("common.change")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <label
                      htmlFor="document-upload"
                      className="cursor-pointer"
                    >
                      <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {t(
                          "dashboard.posts.form.uploadDocument",
                          "Cliquez pour télécharger un PDF",
                        )}
                      </p>
                    </label>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.posts.form.settings")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("dashboard.posts.form.category")} *</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PostCategory.News}>
                      <div className="flex items-center gap-2">
                        <Newspaper className="h-4 w-4" />
                        {t("dashboard.posts.category.news")}
                      </div>
                    </SelectItem>
                    <SelectItem value={PostCategory.Event}>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        {t("dashboard.posts.category.event")}
                      </div>
                    </SelectItem>
                    <SelectItem value={PostCategory.Announcement}>
                      <div className="flex items-center gap-2">
                        <Megaphone className="h-4 w-4" />
                        {t(
                          "dashboard.posts.category.communique",
                          "Communiqué officiel",
                        )}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("dashboard.posts.form.coverImage")}</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverImageUpload}
                    className="hidden"
                    id="cover-upload"
                  />
                  {coverImagePreview ? (
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
                        {t("common.change")}
                      </Button>
                    </div>
                  ) : (
                    <label htmlFor="cover-upload" className="cursor-pointer">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        {t("dashboard.posts.form.uploadImage")}
                      </p>
                    </label>
                  )}
                </div>
              </div>

              {isEditing && post ? (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    <span className="font-medium">
                      {t("dashboard.posts.form.status")}:
                    </span>{" "}
                    {post.status === PostStatus.Published ? (
                      <span className="text-green-600">
                        {t("dashboard.posts.statusPublished")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {t("dashboard.posts.statusDraft")}
                      </span>
                    )}
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <Label htmlFor="publish">
                    {t("dashboard.posts.form.publishNow")}
                  </Label>
                  <Switch
                    id="publish"
                    checked={publish}
                    onCheckedChange={setPublish}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting
              ? t("common.saving")
              : isEditing
                ? t("dashboard.posts.form.save")
                : publish
                  ? t("dashboard.posts.form.publish")
                  : t(
                      "dashboard.posts.form.saveDraft",
                      "Enregistrer le brouillon",
                    )}
          </Button>
        </div>
      </form>
    </div>
  );
}
