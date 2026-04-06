"use client";

import { api } from "@convex/_generated/api";
import { PostCategory } from "@convex/lib/constants";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	ArrowRight,
	Calendar,
	CalendarDays,
	FileText,
	MapPin,
	Newspaper,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

interface Post {
	_id: string;
	slug: string;
	title: string;
	excerpt: string;
	category: string;
	coverImageUrl: string | null;
	publishedAt?: number;
	eventStartAt?: number;
	eventLocation?: string;
}

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
			label: "Communiqué",
			class:
				"bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
		},
	}[category] ?? { label: category, class: "bg-gray-100 text-gray-800" };

	return (
		<span
			className={cn(
				"text-xs font-medium px-2 py-0.5 rounded-full",
				config.class,
			)}
		>
			{config.label}
		</span>
	);
}

function FeaturedPost({ post }: { post: Post }) {
	const isEvent = post.category === PostCategory.Event;

	return (
		<Link
			to="/news/$slug"
			params={{ slug: post.slug }}
			className="group relative block h-full bg-card rounded-2xl overflow-hidden border hover:shadow-xl transition-all duration-300"
		>
			<div className="grid md:grid-cols-2 gap-0 h-full">
				{/* Image */}
				<div className="aspect-[4/3] md:aspect-auto md:min-h-full overflow-hidden bg-muted">
					{post.coverImageUrl ? (
						<img
							src={post.coverImageUrl}
							alt={post.title}
							className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
						/>
					) : (
						<div className="w-full h-full flex items-center justify-center min-h-[250px]">
							{post.category === PostCategory.Event ? (
								<CalendarDays className="h-16 w-16 text-muted-foreground/20" />
							) : post.category === PostCategory.Announcement ? (
								<FileText className="h-16 w-16 text-muted-foreground/20" />
							) : (
								<Newspaper className="h-16 w-16 text-muted-foreground/20" />
							)}
						</div>
					)}
				</div>

				{/* Content */}
				<div className="p-6 md:p-8 flex flex-col justify-center">
					<div className="flex items-center gap-2 mb-4">
						<CategoryBadge category={post.category} />
						{post.publishedAt && (
							<span className="text-xs text-muted-foreground">
								{format(new Date(post.publishedAt), "d MMM yyyy", {
									locale: fr,
								})}
							</span>
						)}
					</div>

					<h3 className="text-xl md:text-2xl font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2">
						{post.title}
					</h3>

					<p className="text-muted-foreground mb-4 line-clamp-2">
						{post.excerpt}
					</p>

					{isEvent && post.eventStartAt && (
						<div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
							<div className="flex items-center gap-1">
								<Calendar className="h-4 w-4" />
								<span>
									{format(new Date(post.eventStartAt), "d MMM yyyy", {
										locale: fr,
									})}
								</span>
							</div>
							{post.eventLocation && (
								<div className="flex items-center gap-1">
									<MapPin className="h-4 w-4" />
									<span className="truncate max-w-[200px]">
										{post.eventLocation}
									</span>
								</div>
							)}
						</div>
					)}

					<div className="flex items-center text-primary font-medium text-sm">
						Lire la suite
						<ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
					</div>
				</div>
			</div>
		</Link>
	);
}

function SmallPost({ post }: { post: Post }) {
	return (
		<Link
			to="/news/$slug"
			params={{ slug: post.slug }}
			className="group block bg-card rounded-xl overflow-hidden border hover:shadow-lg transition-all duration-300"
		>
			<div className="aspect-[16/9] overflow-hidden bg-muted">
				{post.coverImageUrl ? (
					<img
						src={post.coverImageUrl}
						alt={post.title}
						className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center">
						{post.category === PostCategory.Event ? (
							<CalendarDays className="h-10 w-10 text-muted-foreground/20" />
						) : post.category === PostCategory.Announcement ? (
							<FileText className="h-10 w-10 text-muted-foreground/20" />
						) : (
							<Newspaper className="h-10 w-10 text-muted-foreground/20" />
						)}
					</div>
				)}
			</div>
			<div className="p-4">
				<div className="flex items-center gap-2 mb-2">
					<CategoryBadge category={post.category} />
				</div>
				<h4 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
					{post.title}
				</h4>
				{post.publishedAt && (
					<span className="text-xs text-muted-foreground mt-2 block">
						{format(new Date(post.publishedAt), "d MMM yyyy", { locale: fr })}
					</span>
				)}
			</div>
		</Link>
	);
}

export function NewsSection() {
	const { t } = useTranslation();
	const { data: posts } = useConvexQuery(api.functions.posts.getLatest, {
		limit: 4,
	});

	const isLoading = posts === undefined;

	if (!isLoading && (!posts || posts.length === 0)) {
		return null; // Don't show section if no posts
	}

	const [featured, ...rest] = posts ?? [];

	return (
		<section className="py-16 md:py-24 bg-gradient-to-b from-background to-muted/30">
			<div className="container mx-auto px-4">
				{/* Header */}
				<div className="flex items-center justify-between mb-10">
					<div>
						<h2 className="text-3xl md:text-4xl font-bold mb-2">
							{t("home.news.title")}
						</h2>
						<p className="text-muted-foreground">{t("home.news.subtitle")}</p>
					</div>
					<Button variant="outline" asChild className="hidden sm:flex">
						<Link to="/news">
							{t("home.news.viewAll")}
							<ArrowRight className="ml-1 h-4 w-4" />
						</Link>
					</Button>
				</div>

				{/* Posts Grid */}
				<div className="grid lg:grid-cols-2 gap-6 mb-6">
					{isLoading ? (
						<>
							{/* Featured skeleton */}
							<div className="rounded-2xl border bg-card overflow-hidden">
								<div className="grid md:grid-cols-2 gap-0 h-full">
									<div className="aspect-[4/3] md:aspect-auto md:min-h-[250px] bg-muted animate-pulse" />
									<div className="p-6 md:p-8 space-y-4">
										<div className="flex items-center gap-2">
											<span className="h-5 w-16 rounded-full bg-muted animate-pulse" />
											<span className="h-4 w-20 rounded bg-muted animate-pulse" />
										</div>
										<div className="h-6 w-3/4 rounded bg-muted animate-pulse" />
										<div className="space-y-2">
											<div className="h-4 w-full rounded bg-muted animate-pulse" />
											<div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
										</div>
										<div className="h-4 w-24 rounded bg-muted animate-pulse" />
									</div>
								</div>
							</div>
							{/* Small post skeletons */}
							<div className="grid sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
								{[0, 1, 2].map((i) => (
									<div
										key={i}
										className="rounded-xl border bg-card overflow-hidden"
									>
										<div className="aspect-[16/9] bg-muted animate-pulse" />
										<div className="p-4 space-y-2">
											<span className="block h-5 w-16 rounded-full bg-muted animate-pulse" />
											<div className="h-4 w-full rounded bg-muted animate-pulse" />
											<div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
											<span className="block h-3 w-20 rounded bg-muted animate-pulse mt-1" />
										</div>
									</div>
								))}
							</div>
						</>
					) : (
						<>
							{/* Featured Post */}
							{featured && <FeaturedPost post={featured} />}

							{/* Secondary Posts */}
							<div className="grid sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
								{rest.slice(0, 3).map((post) => (
									<SmallPost key={post._id} post={post} />
								))}
							</div>
						</>
					)}
				</div>

				{/* Mobile CTA */}
				<div className="sm:hidden text-center">
					<Button variant="outline" asChild>
						<Link to="/news">
							{t("home.news.viewAll")}
							<ArrowRight className="ml-1 h-4 w-4" />
						</Link>
					</Button>
				</div>
			</div>
		</section>
	);
}
