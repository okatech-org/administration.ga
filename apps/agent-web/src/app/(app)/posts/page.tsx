"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { PostStatus } from "@convex/lib/constants";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Eye,
  EyeOff,
  MoreHorizontal,
  Newspaper,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useOrg } from "@/components/org/org-provider";
import { useModuleAccess } from "@/components/shared/access-gate";
import { FlatCard } from "@/components/my-space/flat-card";
import { SectionHeader } from "@/components/my-space/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAuthenticatedPaginatedQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks";


const categoryLabels: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  news: { label: "Actualité", variant: "secondary" },
  event: { label: "Événement", variant: "default" },
  communique: { label: "Communiqué", variant: "outline" },
};

export default function DashboardPosts() {
  const { activeOrgId } = useOrg();
  const { t } = useTranslation();
  const { hasMin: hasComAccess } = useModuleAccess("communication");
  const canPublish = hasComAccess("editor");
  const canAdminCom = hasComAccess("admin");

  const {
    results: posts,
    status: paginationStatus,
    loadMore,
  } = useAuthenticatedPaginatedQuery(
    api.functions.posts.listByOrg,
    activeOrgId ? { orgId: activeOrgId } : "skip",
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
      currentStatus === PostStatus.Published ?
        PostStatus.Draft
      : PostStatus.Published;
    try {
      await setStatus({ postId, status: newStatus });
      toast.success(
        newStatus === PostStatus.Published ?
          t("dashboard.posts.published")
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
        {canPublish && (
          <Button asChild className="active:scale-[0.97] transition-transform">
            <Link href="/posts/new">
              <Plus className="mr-2 h-4 w-4" />
              {t("dashboard.posts.create")}
            </Link>
          </Button>
        )}
      </div>

      <FlatCard>
        <div className="p-3 lg:p-4">
          <SectionHeader
            icon={<Newspaper className="h-5 w-5" />}
            title={t("dashboard.posts.listTitle")}
          />
          {posts.length === 0 ?
            <div className="text-center py-12">
              <Newspaper className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground mb-4">
                {t(
                  "dashboard.posts.empty",
                  "Aucune publication pour le moment",
                )}
              </p>
              <Button asChild>
                <Link href="/posts/new">
                  <Plus className="mr-2 h-4 w-4" />
                  {t(
                    "dashboard.posts.createFirst",
                    "Créer votre première publication",
                  )}
                </Link>
              </Button>
            </div>
          : <Table>
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
                          {post.coverImageUrl ?
                            <img
                              src={post.coverImageUrl}
                              alt=""
                              className="h-10 w-16 rounded object-cover"
                            />
                          : <div className="h-10 w-16 rounded bg-muted flex items-center justify-center">
                              <Newspaper className="h-5 w-5 text-muted-foreground/30" />
                            </div>
                          }
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
                            post.status === PostStatus.Published ?
                              "default"
                            : "outline"
                          }
                        >
                          {post.status === PostStatus.Published ?
                            "Publié"
                          : "Brouillon"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {post.publishedAt ?
                          format(new Date(post.publishedAt), "d MMM yyyy", {
                            locale: fr,
                          })
                        : format(new Date(post.createdAt), "d MMM yyyy", {
                            locale: fr,
                          })
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/posts/${post._id}/edit`}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                {t("common.edit")}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleToggleStatus(post._id, post.status)
                              }
                            >
                              {post.status === PostStatus.Published ?
                                <>
                                  <EyeOff className="mr-2 h-4 w-4" />
                                  {t("dashboard.posts.unpublish")}
                                </>
                              : <>
                                  <Eye className="mr-2 h-4 w-4" />
                                  {t("dashboard.posts.publish")}
                                </>
                              }
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
          }

          {/* Load More */}
          {paginationStatus === "CanLoadMore" && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={() => loadMore(30)} className="active:scale-[0.97] transition-transform">
                Charger plus
              </Button>
            </div>
          )}
        </div>
      </FlatCard>
    </div>
  );
}
