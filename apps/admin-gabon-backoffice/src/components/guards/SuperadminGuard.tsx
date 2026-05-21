"use client";

import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ArrowLeft, Loader2, ShieldX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStableConvexAuth } from "@workspace/api/hooks";
import { Button } from "@/components/ui/button";
import { useSuperAdminData } from "@/hooks/use-superadmin-data";

interface SuperadminGuardProps {
	children: React.ReactNode;
}

export function SuperadminGuard({ children }: SuperadminGuardProps) {
	const { t } = useTranslation();
	const { isAuthenticated, isUnauthenticated } = useStableConvexAuth();
	const { userData, isBackOffice, isPending } = useSuperAdminData();
	const ensureUser = useMutation(api.functions.users.ensureUser);
	const hasEnsuredRef = useRef(false);
	const router = useRouter();

	// Force ensureUser dès que l'utilisateur est authentifié — patch le rôle
	// pour les comptes DEV (admin_system, admin) avant que le guard ne
	// décide "non autorisé" sur la base d'un userData incomplet.
	useEffect(() => {
		if (isAuthenticated && !hasEnsuredRef.current) {
			hasEnsuredRef.current = true;
			ensureUser({}).catch(() => {
				// ignore — le user sera créé/patché à la prochaine query
			});
		}
		if (!isAuthenticated) {
			hasEnsuredRef.current = false;
		}
	}, [isAuthenticated, ensureUser]);

	useEffect(() => {
		if (isUnauthenticated) {
			router.push("/sign-in");
		}
	}, [isUnauthenticated, router]);

	// Show loading state while checking auth or permissions
	if (!isAuthenticated || isPending) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center space-y-4">
					<Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
					<p className="text-sm text-muted-foreground">{t("common.loading")}</p>
				</div>
			</div>
		);
	}

	// Show unauthorized message with back button
	if (!userData || !isBackOffice) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center space-y-6">
					<ShieldX className="h-12 w-12 mx-auto text-destructive" />
					<div className="space-y-2">
						<h1 className="text-xl font-semibold">
							{t("errors.unauthorized")}
						</h1>
						<p className="text-sm text-muted-foreground">
							{t("errors.superadminRequired")}
						</p>
					</div>
					<Button asChild variant="outline">
						<Link href="/">
							<ArrowLeft className="mr-2 h-4 w-4" />
							{t("common.back")}
						</Link>
					</Button>
				</div>
			</div>
		);
	}

	return <>{children}</>;
}
