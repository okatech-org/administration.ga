"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { useCurrentAdminRole } from "@/hooks/use-current-admin-role";

/**
 * Redirige vers la sous-route adaptée au rôle :
 *  - super_admin / admin_system → /icorrespondance/network (vue réseau)
 *  - admin / autres → /icorrespondance/operate (exploitation par rep)
 *
 * Cette page existe pour préserver les anciens liens externes vers
 * /icorrespondance sans casser. L'item de sidebar n'y pointe plus.
 */
export default function ICorrespondanceRedirectPage() {
  const router = useRouter();
  const { isSuperAdmin, isAdminSystem, isPending } = useCurrentAdminRole();

  useEffect(() => {
    if (isPending) return;
    const dest =
      isSuperAdmin || isAdminSystem
        ? "/icorrespondance/network"
        : "/icorrespondance/operate";
    router.replace(dest);
  }, [isPending, isSuperAdmin, isAdminSystem, router]);

  return (
    <PageHeader
      title="iCorrespondance"
      subtitle="Redirection vers votre tableau de bord…"
      icon={Mail}
    />
  );
}
