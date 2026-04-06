import { api } from "@convex/_generated/api";
import {
	createFileRoute,
	Link,
	Outlet,
	useParams,
} from "@tanstack/react-router";
import { FileText, Loader2, PlusCircle } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/my-space/page-header";
import { RequestCard } from "@/components/my-space/request-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthenticatedPaginatedQuery } from "@/integrations/convex/hooks";

export const Route = createFileRoute("/my-space/requests")({
	component: RequestsLayout,
});

function RequestsLayout() {
	// Check if we're on a child route
	const params = useParams({ strict: false });
	const hasChildRoute = "reference" in params || "requestId" in params;

	// If we have a child route, just render the Outlet
	if (hasChildRoute) {
		return <Outlet />;
	}

	// Otherwise render the requests list
	return <RequestsPage />;
}

function RequestsPage() {
	const { t } = useTranslation();
	const {
		results: requests,
		status: paginationStatus,
		loadMore,
		isLoading: isPending,
	} = useAuthenticatedPaginatedQuery(
		api.functions.requests.listMine,
		{},
		{ initialNumItems: 20 },
	);

	if (isPending && requests.length === 0) {
		return (
			<div className="flex justify-center p-8">
				<Loader2 className="animate-spin h-8 w-8 text-primary" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<PageHeader
				title={t("mySpace.screens.requests.heading")}
				subtitle={t(
					"mySpace.screens.requests.subtitle",
					"Suivez vos demandes de services consulaires",
				)}
				icon={<FileText className="h-6 w-6 text-primary" />}
				actions={
					<Button asChild>
						<Link to="/services">
							<PlusCircle className="mr-2 h-4 w-4" />
							{t("requests.new")}
						</Link>
					</Button>
				}
			/>

			{/* Content */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2, delay: 0.1 }}
			>
				{!requests || requests.length === 0 ? (
					<Card>
						<CardContent className="flex flex-col items-center justify-center py-16 text-center">
							<FileText className="h-16 w-16 mb-4 text-muted-foreground/30" />
							<h3 className="text-lg font-medium mb-2">
								{t("requests.empty.title")}
							</h3>
							<p className="text-muted-foreground mb-6 max-w-sm">
								{t(
									"requests.empty.desc",
									"Vous n'avez pas encore effectué de demande de service consulaire.",
								)}
							</p>
							<Button asChild>
								<Link to="/services">
									<PlusCircle className="mr-2 h-4 w-4" />
									{t("requests.empty.action")}
								</Link>
							</Button>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{requests.map((request: any) => (
							<RequestCard key={request._id} request={request} />
						))}
					</div>
				)}

				{/* Load More */}
				{paginationStatus === "CanLoadMore" && (
					<div className="flex justify-center mt-4">
						<Button variant="outline" onClick={() => loadMore(20)}>
							Charger plus
						</Button>
					</div>
				)}
				{paginationStatus === "LoadingMore" && (
					<div className="flex justify-center mt-4">
						<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
					</div>
				)}
			</motion.div>
		</div>
	);
}
