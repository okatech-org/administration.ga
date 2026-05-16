"use client";

import { api } from "@convex/_generated/api";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { DataTable } from "@/components/ui/data-table";
import { tutorialsColumns } from "@/components/admin/tutorials-columns";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";

export default function AdminTutorialsPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: tutorials, isLoading } = useAuthenticatedConvexQuery(
    api.functions.tutorials.listAll,
    {},
  );

  const filtered = useMemo(() => {
    if (!tutorials) return [];
    if (!searchQuery.trim()) return tutorials;
    const q = searchQuery.toLowerCase();
    return tutorials.filter(
      (t) =>
        t.title.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q),
    );
  }, [tutorials, searchQuery]);

  return (
    <div className="flex flex-1 flex-col gap-4 px-7 pt-6 pb-[60px]">
      <PageHeader
        icon={<BookOpen className="h-5 w-5" />}
        title={t("superadmin.tutorials.title")}
        subtitle={t(
          "superadmin.tutorials.description",
          "Gérer les guides et tutoriels de l'Académie",
        )}
        actions={
          <Button asChild>
            <Link href="/tutorials/new">
              <Plus className="mr-2 h-4 w-4" />
              {t("superadmin.tutorials.new")}
            </Link>
          </Button>
        }
      />

      <FlatCard>
        <div className="p-3 lg:p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder={t("superadmin.tutorials.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {isLoading ?
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          : <DataTable columns={tutorialsColumns} data={filtered} />}
        </div>
      </FlatCard>
    </div>
  );
}
