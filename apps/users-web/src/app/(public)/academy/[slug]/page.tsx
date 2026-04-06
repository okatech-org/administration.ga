"use client";

import { sanitizeHtml } from "@workspace/shared/utils/sanitize";
import { api } from "@convex/_generated/api";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  FileText,
  GraduationCap,
  PlayCircle,
  User,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, typeof PlayCircle> = {
  video: PlayCircle,
  article: FileText,
  guide: BookOpen,
};

const typeBadgeStyles: Record<string, string> = {
  video: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  article: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  guide:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
};

export default function TutorialDetailPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();

  const { data: tutorial, isLoading } = useConvexQuery(
    api.functions.tutorials.getBySlug,
    { slug },
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!tutorial) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <GraduationCap className="h-16 w-16 text-muted-foreground/30 mx-auto" />
          <h1 className="text-2xl font-bold">
            {t("academy.notFound.title", "Guide introuvable")}
          </h1>
          <p className="text-muted-foreground">
            {t(
              "academy.notFound.description",
              "Ce guide n'existe pas ou a été retiré.",
            )}
          </p>
          <Button asChild variant="outline">
            <Link href="/academy">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("academy.backToList", "Retour à l'Académie")}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const TypeIcon = typeIcons[tutorial.type] ?? BookOpen;
  const publishedDate = tutorial.publishedAt
    ? new Date(tutorial.publishedAt).toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero / Cover */}
      <div className="relative">
        {tutorial.coverImageUrl ? (
          <div className="aspect-[21/9] max-h-[400px] w-full overflow-hidden bg-muted">
            <img
              src={tutorial.coverImageUrl}
              alt={tutorial.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          </div>
        ) : (
          <div className="h-48 bg-gradient-to-b from-primary/10 to-background" />
        )}
      </div>

      <article className="max-w-4xl mx-auto px-4 -mt-16 relative z-10 pb-16">
        {/* Back button */}
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <Link href="/academy">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("academy.backToList", "Retour à l'Académie")}
          </Link>
        </Button>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span
            className={cn(
              "text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1",
              typeBadgeStyles[tutorial.type] ?? "bg-gray-100 text-gray-800",
            )}
          >
            <TypeIcon className="h-3.5 w-3.5" />
            {t(`academy.types.${tutorial.type}`, tutorial.type)}
          </span>
          <Badge variant="outline" className="text-xs">
            {t(
              `academy.categories.${tutorial.category}`,
              tutorial.category,
            )}
          </Badge>
          {tutorial.duration && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {tutorial.duration}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          {tutorial.title}
        </h1>

        {/* Author + Date */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8 pb-8 border-b">
          <span className="flex items-center gap-1.5">
            <User className="h-4 w-4" />
            {tutorial.authorName}
          </span>
          {publishedDate && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {publishedDate}
            </span>
          )}
        </div>

        {/* Video embed */}
        {tutorial.videoUrl && (
          <div className="mb-8 rounded-xl overflow-hidden border">
            <div className="aspect-video">
              <iframe
                src={tutorial.videoUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={tutorial.title}
              />
            </div>
          </div>
        )}

        {/* Content (HTML from Tiptap) */}
        <div
          className="prose prose-lg dark:prose-invert max-w-none
            prose-headings:font-bold prose-headings:text-foreground
            prose-p:text-muted-foreground prose-p:leading-relaxed
            prose-a:text-primary prose-a:underline
            prose-img:rounded-xl prose-img:shadow-md
            prose-blockquote:border-primary/30
            prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
            prose-pre:bg-muted prose-pre:border
            prose-li:text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(tutorial.content) }}
        />
      </article>
    </div>
  );
}
