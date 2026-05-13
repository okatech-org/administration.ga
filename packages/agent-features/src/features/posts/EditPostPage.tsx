"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { PostCategory, PostStatus } from "@convex/lib/constants";
import { Link, useParams, useRouter } from "@workspace/routing";

import {
	ArrowLeft,
	Calendar,
	CalendarDays,
	FileText,
	Loader2,
	MapPin,
	Megaphone,
	Newspaper,
	Ticket,
	Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { RichTextEditor } from "./components/lazy-rich-text-editor";
import { useOrg } from "../../shell/org-provider";
import { Button } from "@workspace/ui/components/button";
import { FlatCard } from "../../components/my-space/flat-card";
import { SectionHeader } from "../../components/my-space/section-header";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";
import {
	usePageContext,
	useRegisterPageAction,
} from "../../hooks/use-page-context";
import type {
	PageAction,
	PageEntity,
} from "../../stores/page-context-store";


function slugify(text: string): string {
	return text
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
}

export default function EditPostPage() {
	const { postId } = useParams();
	// activeOrgId reserved for future use (cross-org routing)
	void useOrg();
	const router = useRouter();
	const { t } = useTranslation();

	const { data: post } = useAuthenticatedConvexQuery(
		api.functions.posts.getById,
		{ postId: postId as Id<"posts"> },
	);
	const { mutateAsync: update } = useConvexMutationQuery(
		api.functions.posts.update,
	);
	const { mutateAsync: generateUploadUrl } = useConvexMutationQuery(
		api.functions.documents.generateUploadUrl,
	);

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [category, setCategory] = useState<
		(typeof PostCategory)[keyof typeof PostCategory]
	>(PostCategory.News);
	const [title, setTitle] = useState("");
	const [slug, setSlug] = useState("");
	const [excerpt, setExcerpt] = useState("");
	const [content, setContent] = useState("");

	// Cover image
	const [coverImageStorageId, setCoverImageStorageId] = useState<
		Id<"_storage"> | undefined
	>();
	const [coverImagePreview, setCoverImagePreview] = useState<string | null>(
		null,
	);

	// Event-specific
	const [eventStartAt, setEventStartAt] = useState("");
	const [eventEndAt, setEventEndAt] = useState("");
	const [eventLocation, setEventLocation] = useState("");
	const [eventTicketUrl, setEventTicketUrl] = useState("");

	// Communique-specific
	const [documentStorageId, setDocumentStorageId] = useState<
		Id<"_storage"> | undefined
	>();
	const [documentName, setDocumentName] = useState<string | null>(null);

	// Load post data
	useEffect(() => {
		if (post) {
			setTitle(post.title);
			setSlug(post.slug);
			setExcerpt(post.excerpt);
			setContent(post.content);
			setCategory(post.category);
			setCoverImageStorageId(post.coverImageStorageId);
			setCoverImagePreview(post.coverImageUrl);
			setDocumentStorageId(post.documentStorageId);
			if (post.documentUrl) {
				setDocumentName("Document existant");
			}

			// Event fields
			if (post.eventStartAt) {
				setEventStartAt(new Date(post.eventStartAt).toISOString().slice(0, 16));
			}
			if (post.eventEndAt) {
				setEventEndAt(new Date(post.eventEndAt).toISOString().slice(0, 16));
			}
			if (post.eventLocation) {
				setEventLocation(post.eventLocation);
			}
			if (post.eventTicketUrl) {
				setEventTicketUrl(post.eventTicketUrl);
			}
		}
	}, [post]);

	const handleCoverImageUpload = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = e.target.files?.[0];
		if (!file) return;

		try {
			const postUrl = await generateUploadUrl({});
			const result = await fetch(postUrl, {
				method: "POST",
				headers: { "Content-Type": file.type },
				body: file,
			});
			if (!result.ok) throw new Error("Upload failed");
			const { storageId } = await result.json();
			setCoverImageStorageId(storageId);
			setCoverImagePreview(URL.createObjectURL(file));
			toast.success(t("dashboard.posts.imageUploaded"));
		} catch {
			toast.error(
				t("dashboard.posts.uploadError"),
			);
		}
	};

	const handleDocumentUpload = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = e.target.files?.[0];
		if (!file) return;

		try {
			const postUrl = await generateUploadUrl({});
			const result = await fetch(postUrl, {
				method: "POST",
				headers: { "Content-Type": file.type },
				body: file,
			});
			if (!result.ok) throw new Error("Upload failed");
			const { storageId } = await result.json();
			setDocumentStorageId(storageId);
			setDocumentName(file.name);
			toast.success(
				t("dashboard.posts.documentUploaded"),
			);
		} catch {
			toast.error(
				t("dashboard.posts.uploadError"),
			);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!title || !slug || !excerpt || !content) {
			toast.error(
				t(
					"dashboard.posts.requiredFields",
					"Veuillez remplir tous les champs obligatoires",
				),
			);
			return;
		}

		if (category === PostCategory.Announcement && !documentStorageId) {
			toast.error(
				t(
					"dashboard.posts.documentRequired",
					"Un document PDF est obligatoire pour les communiqués",
				),
			);
			return;
		}

		setIsSubmitting(true);
		try {
			await update({
				postId: postId as Id<"posts">,
				title,
				slug,
				excerpt,
				content,
				category,
				coverImageStorageId,
				// Event fields
				eventStartAt: eventStartAt
					? new Date(eventStartAt).getTime()
					: undefined,
				eventEndAt: eventEndAt ? new Date(eventEndAt).getTime() : undefined,
				eventLocation: eventLocation || undefined,
				eventTicketUrl: eventTicketUrl || undefined,
				// Communique fields
				documentStorageId,
			});

			toast.success(t("dashboard.posts.updatedSuccess"));
			router.push("/posts");
		} catch (err: any) {
			toast.error(err.message || t("common.error"));
		} finally {
			setIsSubmitting(false);
		}
	};

	// ─── iAsted page context ──────────────────────────────
	const pageEntities: PageEntity[] = post
		? [
			{
				id: post._id,
				type: "post",
				label: (post.title ?? title) || "Publication",
				data: {
					status: post.status,
					category: post.category,
					slug: post.slug,
				},
			},
		]
		: [];
	const pageActions: PageAction[] = [
		{
			id: "posts.set_title",
			label: "Mettre à jour le titre",
			description: "params.title (string).",
			params: { title: { type: "string" } },
		},
		{
			id: "posts.set_excerpt",
			label: "Mettre à jour le résumé",
			description: "params.excerpt (string).",
			params: { excerpt: { type: "string" } },
		},
		{
			id: "posts.set_content",
			label: "Mettre à jour le contenu",
			description: "params.content (string, Markdown).",
			params: { content: { type: "string" } },
		},
		{
			id: "posts.update",
			label: "Enregistrer les modifications",
			description: "Met à jour la publication.",
			requiresConfirmation: true,
		},
	];
	usePageContext({
		module: "posts",
		title: "Éditer publication",
		summary: `Édition de la publication « ${title || (post?.title ?? "—")} » · Catégorie: ${category}${post ? ` · Statut: ${post.status}` : ""}.`,
		visibleEntities: pageEntities,
		availableActions: pageActions,
		scopedToolNames: [],
	});
	useRegisterPageAction("posts.set_title", async (params) => {
		const v = String(params?.title ?? "");
		setTitle(v);
		if (!slug || slug === slugify(title)) setSlug(slugify(v));
		return { success: true };
	});
	useRegisterPageAction("posts.set_excerpt", async (params) => {
		setExcerpt(String(params?.excerpt ?? ""));
		return { success: true };
	});
	useRegisterPageAction("posts.set_content", async (params) => {
		setContent(String(params?.content ?? ""));
		return { success: true };
	});
	useRegisterPageAction("posts.update", async () => {
		await handleSubmit({ preventDefault: () => {} } as React.FormEvent);
		return { success: true };
	});

	if (!post) {
		return (
			<div className="flex flex-1 items-center justify-center p-4">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const isEvent = category === PostCategory.Event;
	const isCommunique = category === PostCategory.Announcement;

	return (
		<div className="flex flex-1 flex-col gap-4 p-4">
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="sm" className="active:scale-[0.97] transition-transform" asChild>
					<Link href="/posts">
						<ArrowLeft className="mr-2 h-4 w-4" />
						{t("common.back")}
					</Link>
				</Button>
				<div>
					<h1 className="text-2xl font-bold tracking-tight">
						{t("dashboard.posts.edit.title")}
					</h1>
					<p className="text-muted-foreground line-clamp-1">{post.title}</p>
				</div>
			</div>

			<form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
				{/* Main content */}
				<div className="lg:col-span-2 space-y-6">
					<FlatCard>
						<div className="p-3 lg:p-4 pb-0">
							<h3 className="text-sm font-bold">{t("dashboard.posts.form.content")}</h3>
						</div>
						<div className="p-3 lg:p-4 space-y-4">
							<div className="space-y-2">
								<Label htmlFor="title">
									{t("dashboard.posts.form.title")} *
								</Label>
								<Input
									id="title"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									placeholder={t(
										"dashboard.posts.form.titlePlaceholder",
										"Titre de l'article",
									)}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="slug">
									{t("dashboard.posts.form.slug")} *
								</Label>
								<div className="flex items-center gap-2">
									<span className="text-sm text-muted-foreground">/news/</span>
									<Input
										id="slug"
										value={slug}
										onChange={(e) => setSlug(slugify(e.target.value))}
										placeholder="mon-article"
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="excerpt">
									{t("dashboard.posts.form.excerpt")} *
								</Label>
								<Textarea
									id="excerpt"
									value={excerpt}
									onChange={(e) => setExcerpt(e.target.value)}
									placeholder={t(
										"dashboard.posts.form.excerptPlaceholder",
										"Un court résumé...",
									)}
									rows={3}
								/>
							</div>

							<div className="space-y-2">
								<Label>
									{t("dashboard.posts.form.body")} *
								</Label>
								<RichTextEditor
									content={content}
									onChange={setContent}
									className="min-h-[300px]"
								/>
							</div>
						</div>
					</FlatCard>

					{/* Event-specific fields */}
					{isEvent && (
						<FlatCard>
							<div className="p-3 lg:p-4 pb-0">
								<SectionHeader icon={<CalendarDays className="h-5 w-5" />} title={t(
									"dashboard.posts.form.eventDetails",
									"Détails de l'événement",
								)} />
							</div>
							<div className="p-3 lg:p-4 space-y-4">
								<div className="grid gap-4 sm:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="eventStartAt">
											<Calendar className="inline mr-2 h-4 w-4" />
											{t("dashboard.posts.form.eventStart")}
										</Label>
										<Input
											id="eventStartAt"
											type="datetime-local"
											value={eventStartAt}
											onChange={(e) => setEventStartAt(e.target.value)}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="eventEndAt">
											<Calendar className="inline mr-2 h-4 w-4" />
											{t("dashboard.posts.form.eventEnd")}
										</Label>
										<Input
											id="eventEndAt"
											type="datetime-local"
											value={eventEndAt}
											onChange={(e) => setEventEndAt(e.target.value)}
										/>
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="eventLocation">
										<MapPin className="inline mr-2 h-4 w-4" />
										{t("dashboard.posts.form.eventLocation")}
									</Label>
									<Input
										id="eventLocation"
										value={eventLocation}
										onChange={(e) => setEventLocation(e.target.value)}
										placeholder={t(
											"dashboard.posts.form.eventLocationPlaceholder",
											"Adresse ou nom du lieu",
										)}
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="eventTicketUrl">
										<Ticket className="inline mr-2 h-4 w-4" />
										{t(
											"dashboard.posts.form.eventTicket",
											"Lien billetterie / inscription",
										)}
									</Label>
									<Input
										id="eventTicketUrl"
										type="url"
										value={eventTicketUrl}
										onChange={(e) => setEventTicketUrl(e.target.value)}
										placeholder="https://..."
									/>
								</div>
							</div>
						</FlatCard>
					)}

					{/* Communique-specific fields */}
					{isCommunique && (
						<FlatCard>
							<div className="p-3 lg:p-4 pb-0">
								<SectionHeader icon={<Megaphone className="h-5 w-5" />} title={t(
									"dashboard.posts.form.communiqueDetails",
									"Document officiel",
								)} />
								<p className="text-xs text-muted-foreground mt-1">
									{t(
										"dashboard.posts.form.communiqueHint",
										"Téléchargez le document PDF officiel (obligatoire)",
									)}
								</p>
							</div>
							<div className="p-3 lg:p-4">
								<div className="border-2 border-dashed rounded-lg p-6 text-center">
									<input
										type="file"
										accept="application/pdf"
										onChange={handleDocumentUpload}
										className="hidden"
										id="document-upload"
									/>
									{documentName ? (
										<div className="flex items-center justify-center gap-3">
											<FileText className="h-8 w-8 text-emerald-600" />
											<div>
												<p className="font-medium">{documentName}</p>
												<Button
													type="button"
													variant="link"
													size="sm"
													className="active:scale-[0.97] transition-transform"
													onClick={() =>
														document.getElementById("document-upload")?.click()
													}
												>
													{t("common.change")}
												</Button>
											</div>
										</div>
									) : (
										<label htmlFor="document-upload" className="cursor-pointer">
											<Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
											<p className="text-sm text-muted-foreground">
												{t(
													"dashboard.posts.form.uploadDocument",
													"Cliquez pour télécharger un PDF",
												)}
											</p>
										</label>
									)}
								</div>
							</div>
						</FlatCard>
					)}
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					<FlatCard>
						<div className="p-3 lg:p-4 pb-0">
							<h3 className="text-sm font-bold">{t("dashboard.posts.form.settings")}</h3>
						</div>
						<div className="p-3 lg:p-4 space-y-4">
							<div className="space-y-2">
								<Label>
									{t("dashboard.posts.form.category")} *
								</Label>
								<Select
									value={category}
									onValueChange={(v) => setCategory(v as any)}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={PostCategory.News}>
											<div className="flex items-center gap-2">
												<Newspaper className="h-4 w-4" />
												{t("dashboard.posts.category.news")}
											</div>
										</SelectItem>
										<SelectItem value={PostCategory.Event}>
											<div className="flex items-center gap-2">
												<CalendarDays className="h-4 w-4" />
												{t("dashboard.posts.category.event")}
											</div>
										</SelectItem>
										<SelectItem value={PostCategory.Announcement}>
											<div className="flex items-center gap-2">
												<Megaphone className="h-4 w-4" />
												{t(
													"dashboard.posts.category.communique",
													"Communiqué officiel",
												)}
											</div>
										</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label>
									{t("dashboard.posts.form.coverImage")}
								</Label>
								<div className="border-2 border-dashed rounded-lg p-4 text-center">
									<input
										type="file"
										accept="image/*"
										onChange={handleCoverImageUpload}
										className="hidden"
										id="cover-upload"
									/>
									{coverImagePreview ? (
										<div>
											<img
												src={coverImagePreview}
												alt="Cover"
												className="w-full h-32 object-cover rounded mb-2"
											/>
											<Button
												type="button"
												variant="link"
												size="sm"
												className="active:scale-[0.97] transition-transform"
												onClick={() =>
													document.getElementById("cover-upload")?.click()
												}
											>
												{t("common.change")}
											</Button>
										</div>
									) : (
										<label htmlFor="cover-upload" className="cursor-pointer">
											<Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
											<p className="text-xs text-muted-foreground">
												{t("dashboard.posts.form.uploadImage")}
											</p>
										</label>
									)}
								</div>
							</div>

							<div className="p-3 bg-muted rounded-lg">
								<p className="text-sm">
									<span className="font-medium">
										{t("dashboard.posts.form.status")}:
									</span>{" "}
									{post.status === PostStatus.Published ? (
										<span className="text-green-600">
											{t("dashboard.posts.statusPublished")}
										</span>
									) : (
										<span className="text-muted-foreground">
											{t("dashboard.posts.statusDraft")}
										</span>
									)}
								</p>
							</div>
						</div>
					</FlatCard>

					<Button type="submit" className="w-full active:scale-[0.97] transition-transform" disabled={isSubmitting}>
						{isSubmitting
							? t("common.saving")
							: t("dashboard.posts.form.save")}
					</Button>
				</div>
			</form>
		</div>
	);
}
