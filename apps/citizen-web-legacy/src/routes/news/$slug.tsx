"use client";

import { api } from "@convex/_generated/api";
import { PostCategory } from "@convex/lib/constants";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	ArrowLeft,
	Calendar,
	Clock,
	Download,
	FileText,
	MapPin,
	Share2,
	Ticket,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { RichTextRenderer } from "@/components/common/rich-text-editor";
import { Button } from "@/components/ui/button";
import { useConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/news/$slug")({
	component: PostDetailPage,
});

function CategoryBadge({ category }: { category: string }) {
	const config = {
		news: {
			label: "Actualité",
			class: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
		},
		event: {
			label: "Événement",
			class:
				"bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
		},
		communique: {
			label: "Communiqué officiel",
			class:
				"bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
		},
	}[category] ?? { label: category, class: "bg-gray-100 text-gray-800" };

	return (
		<span
			className={cn("text-sm font-medium px-3 py-1 rounded-full", config.class)}
		>
			{config.label}
		</span>
	);
}

function PostDetailPage() {
	const { t } = useTranslation();
	const { slug } = Route.useParams();

	const { data: post, isLoading } = useConvexQuery(
		api.functions.posts.getBySlug,
		{ slug },
	);

	if (isLoading) {
		return (
			<div className="min-h-screen bg-background">
				<div className="container mx-auto px-4 py-16">
					<div className="max-w-3xl mx-auto animate-pulse space-y-6">
						<div className="h-8 w-32 bg-muted rounded" />
						<div className="h-12 w-full bg-muted rounded" />
						<div className="aspect-[16/9] bg-muted rounded-xl" />
						<div className="space-y-4">
							<div className="h-4 w-full bg-muted rounded" />
							<div className="h-4 w-full bg-muted rounded" />
							<div className="h-4 w-3/4 bg-muted rounded" />
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (!post) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-bold mb-4">
						{t("news.notFound")}
					</h1>
					<Button asChild>
						<Link to="/news">
							<ArrowLeft className="mr-2 h-4 w-4" />
							{t("news.backToList")}
						</Link>
					</Button>
				</div>
			</div>
		);
	}

	const isEvent = post.category === PostCategory.Event;
	const isCommunique = post.category === PostCategory.Announcement;

	return (
		<div className="min-h-screen bg-background">
			{/* Header */}
			<div className="border-b">
				<div className="container mx-auto px-4 py-4">
					<Button variant="ghost" size="sm" asChild>
						<Link to="/news">
							<ArrowLeft className="mr-2 h-4 w-4" />
							{t("news.backToList")}
						</Link>
					</Button>
				</div>
			</div>

			<article className="container mx-auto px-4 py-8">
				<div className="max-w-3xl mx-auto">
					{/* Meta */}
					<div className="flex flex-wrap items-center gap-3 mb-6">
						<CategoryBadge category={post.category} />
						{post.publishedAt && (
							<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
								<Clock className="h-4 w-4" />
								<span>
									{format(new Date(post.publishedAt), "d MMMM yyyy", {
										locale: fr,
									})}
								</span>
							</div>
						)}
					</div>

					{/* Title */}
					<h1 className="text-3xl md:text-4xl font-bold mb-6">{post.title}</h1>

					{/* Excerpt */}
					<p className="text-lg text-muted-foreground mb-8">{post.excerpt}</p>

					{/* Event Info Banner */}
					{isEvent && (
						<div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 mb-8">
							<div className="grid gap-4 sm:grid-cols-2">
								{post.eventStartAt && (
									<div className="flex items-start gap-3">
										<Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
										<div>
											<div className="font-medium">
												{t("news.event.date")}
											</div>
											<div className="text-sm text-muted-foreground">
												{format(
													new Date(post.eventStartAt),
													"EEEE d MMMM yyyy 'à' HH:mm",
													{ locale: fr },
												)}
												{post.eventEndAt && (
													<>
														<br />
														jusqu'au{" "}
														{format(
															new Date(post.eventEndAt),
															"d MMMM yyyy 'à' HH:mm",
															{ locale: fr },
														)}
													</>
												)}
											</div>
										</div>
									</div>
								)}
								{post.eventLocation && (
									<div className="flex items-start gap-3">
										<MapPin className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
										<div>
											<div className="font-medium">
												{t("news.event.location")}
											</div>
											<div className="text-sm text-muted-foreground">
												{post.eventLocation}
											</div>
										</div>
									</div>
								)}
							</div>
							{post.eventTicketUrl && (
								<div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800">
									<Button asChild className="w-full sm:w-auto">
										<a
											href={post.eventTicketUrl}
											target="_blank"
											rel="noopener noreferrer"
										>
											<Ticket className="mr-2 h-4 w-4" />
											{t("news.event.getTickets")}
										</a>
									</Button>
								</div>
							)}
						</div>
					)}

					{/* Communique Document Banner */}
					{isCommunique && post.documentUrl && (
						<div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6 mb-8">
							<div className="flex items-center gap-4">
								<div className="p-3 bg-emerald-100 dark:bg-emerald-800 rounded-lg">
									<FileText className="h-8 w-8 text-emerald-600 dark:text-emerald-300" />
								</div>
								<div className="flex-1">
									<div className="font-medium">
										{t("news.communique.document")}
									</div>
									<div className="text-sm text-muted-foreground">
										{t(
											"news.communique.downloadHint",
											"Téléchargez le document officiel au format PDF",
										)}
									</div>
								</div>
								<Button asChild variant="outline">
									<a
										href={post.documentUrl}
										target="_blank"
										rel="noopener noreferrer"
										download
									>
										<Download className="mr-2 h-4 w-4" />
										{t("common.download")}
									</a>
								</Button>
							</div>
						</div>
					)}

					{/* Cover Image */}
					{post.coverImageUrl && (
						<div className="aspect-[16/9] rounded-xl overflow-hidden bg-muted mb-8">
							<img
								src={post.coverImageUrl}
								alt={post.title}
								className="w-full h-full object-cover"
							/>
						</div>
					)}

					{/* Content */}
					<RichTextRenderer content={post.content} className="mb-12" />

					{/* Share */}
					<div className="border-t pt-6 flex items-center justify-between">
						<Button variant="outline" size="sm" asChild>
							<Link to="/news">
								<ArrowLeft className="mr-2 h-4 w-4" />
								{t("news.backToList")}
							</Link>
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => {
								navigator.share?.({
									title: post.title,
									text: post.excerpt,
									url: window.location.href,
								});
							}}
						>
							<Share2 className="mr-2 h-4 w-4" />
							{t("common.share")}
						</Button>
					</div>
				</div>
			</article>
		</div>
	);
}
