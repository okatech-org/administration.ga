"use client";

import { useConvexAuth } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
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
	const router = useRouter();

	// Redirect to sign-in when not authenticated (after auth finishes loading)
	useEffect(() => {
		if (!isAuthLoading && !isAuthenticated) {
			router.push("/sign-in");
		}
	}, [isAuthLoading, isAuthenticated, router]);

	// Show loading state while checking auth or permissions
	if (isAuthLoading || (!isAuthenticated) || isPending) {
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
