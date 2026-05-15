"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, ShieldX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useSuperAdminData } from "@/hooks/use-superadmin-data";

interface SuperadminGuardProps {
	children: React.ReactNode;
}

export function SuperadminGuard({ children }: SuperadminGuardProps) {
	const { t } = useTranslation();
	const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
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

	// Sticky auth — `useConvexAuth` peut briefly retourner (loading=false,
	// isAuthenticated=false) avant que le JWT Convex soit appliqué au WS.
	// Pattern identique à citizen-web et agent-web : on attend une résolution
	// stable, et une fois `true` on n'y revient plus.
	const [resolvedAuth, setResolvedAuth] = useState<boolean | null>(null);
	useEffect(() => {
		if (isAuthLoading) return;
		setResolvedAuth((prev) => {
			if (prev === true) return prev;
			if (isAuthenticated) return true;
			if (prev === null) return false;
			return prev;
		});
	}, [isAuthLoading, isAuthenticated]);

	useEffect(() => {
		if (resolvedAuth === false) {
			router.push("/sign-in");
		}
	}, [resolvedAuth, router]);

	// Show loading state while checking auth or permissions
	if (resolvedAuth !== true || isPending) {
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
