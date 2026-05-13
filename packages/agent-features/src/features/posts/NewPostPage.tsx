"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { PostCategory } from "@convex/lib/validators";
import { Link, useRouter } from "@workspace/routing";

import {
	ArrowLeft,
	Calendar,
	CalendarDays,
	FileText,
	MapPin,
	Megaphone,
	Newspaper,
	Ticket,
	Upload,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { RichTextEditor } from "./components/lazy-rich-text-editor";
import { useOrg } from "../../shell/org-provider";
import { FlatCard } from "../../components/my-space/flat-card";
import { SectionHeader } from "../../components/my-space/section-header";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import { useConvexMutationQuery } from "@workspace/api/hooks";
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

export default function NewPostPage() {
	const { activeOrgId } = useOrg();
	const router = useRouter();
	const { t } = useTranslation();

	const { mutateAsync: create } = useConvexMutationQuery(
		api.functions.posts.create,
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
	const [publish, setPublish] = useState(false);

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

	const handleTitleChange = (value: string) => {
		setTitle(value);
		if (!slug || slug === slugify(title)) {
			setSlug(slugify(value));
		}
	};

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
		if (!activeOrgId) return;

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
			await create({
				title,
				slug,
				excerpt,
				content,
				category,
				coverImageStorageId,
				orgId: activeOrgId,
				publish,
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

			toast.success(
				publish
					? t("dashboard.posts.publishedSuccess")
					: t("dashboard.posts.savedSuccess"),
			);
			router.push("/posts");
		} catch (err: any) {
			toast.error(err.message || t("common.error"));
		} finally {
			setIsSubmitting(false);
		}
	};

	const isEvent = category === PostCategory.Event;
	const isCommunique = category === PostCategory.Announcement;

	// ─── iAsted page context ──────────────────────────────
	const pageEntities: PageEntity[] = [
		{
			id: "post-draft.current",
			type: "post-draft",
			label: title || "Brouillon en cours",
			data: {
				category,
				slug,
				hasCover: Boolean(coverImageStorageId),
				hasDocument: Boolean(documentStorageId),
				publish,
			},
		},
	];
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
			id: "posts.set_category",
			label: "Changer la catégorie",
			description:
				"params.category ∈ ['News','Event','Announcement','Other'].",
			params: { category: { type: "string" } },
		},
		{
			id: "posts.save_draft",
			label: "Enregistrer comme brouillon",
			description: "Crée le post sans le publier.",
			requiresConfirmation: true,
		},
		{
			id: "posts.publish",
			label: "Publier",
			description:
				"Crée le post et le publie immédiatement. Confirmation requise.",
			requiresConfirmation: true,
		},
	];
	usePageContext({
		module: "posts",
		title: "Nouvelle publication",
		summary: `Création de publication · Catégorie: ${category}${title ? ` · « ${title} »` : ""}.`,
		visibleEntities: pageEntities,
		availableActions: pageActions,
		scopedToolNames: [],
	});
	useRegisterPageAction("posts.set_title", async (params) => {
		handleTitleChange(String(params?.title ?? ""));
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
	useRegisterPageAction("posts.set_category", async (params) => {
		const c = params?.category as string | undefined;
		if (!c) throw new Error("category requis");
		setCategory(c as any);
		return { success: true };
	});
	useRegisterPageAction("posts.save_draft", async () => {
		setPublish(false);
		await handleSubmit({ preventDefault: () => {} } as React.FormEvent);
		return { success: true };
	});
	useRegisterPageAction("posts.publish", async () => {
		setPublish(true);
		await handleSubmit({ preventDefault: () => {} } as React.FormEvent);
		return { success: true };
	});

	return (
		<div className="flex flex-1 flex-col gap-4 p-4">
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="sm" asChild>
					<Link href="/posts">
						<ArrowLeft className="mr-2 h-4 w-4" />
						{t("common.back")}
					</Link>
				</Button>
				<div>
					<h1 className="text-2xl font-bold tracking-tight">
						{t("dashboard.posts.new.title")}
					</h1>
					<p className="text-muted-foreground">
						{t(
							"dashboard.posts.new.description",
							"Créez une actualité, un événement ou un communiqué",
						)}
					</p>
				</div>
			</div>

			<form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
				{/* Main content */}
				<div className="lg:col-span-2 space-y-6">
					<FlatCard>
					<div className="p-3 lg:p-4 space-y-4">
						<div className="mb-2"><h3 className="text-sm font-bold">{t("dashboard.posts.form.content")}</h3></div>
							<div className="space-y-2">
								<Label htmlFor="title">
									{t("dashboard.posts.form.title")} *
								</Label>
								<Input
									id="title"
									value={title}
									onChange={(e) => handleTitleChange(e.target.value)}
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
										"Un court résumé qui apparaîtra dans les listes...",
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
							<div className="p-3 lg:p-4 space-y-4">
								<SectionHeader
									icon={<CalendarDays className="h-5 w-5" />}
									title={t(
										"dashboard.posts.form.eventDetails",
										"Détails de l'événement",
									)}
								/>
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
							<div className="p-3 lg:p-4">
								<SectionHeader
									icon={<Megaphone className="h-5 w-5" />}
									title={t(
										"dashboard.posts.form.communiqueDetails",
										"Document officiel",
									)}
								/>
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
						<div className="p-3 lg:p-4 space-y-4">
							<div className="mb-2"><h3 className="text-sm font-bold">{t("dashboard.posts.form.settings")}</h3></div>
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

							<div className="flex items-center justify-between">
								<Label htmlFor="publish">
									{t("dashboard.posts.form.publishNow")}
								</Label>
								<Switch
									id="publish"
									checked={publish}
									onCheckedChange={setPublish}
								/>
							</div>
						</div>
					</FlatCard>

					<Button type="submit" className="w-full active:scale-[0.97] transition-transform" disabled={isSubmitting}>
						{isSubmitting
							? t("common.saving")
							: publish
								? t("dashboard.posts.form.publish")
								: t(
										"dashboard.posts.form.saveDraft",
										"Enregistrer le brouillon",
									)}
					</Button>
				</div>
			</form>
		</div>
	);
}
