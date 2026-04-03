"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { PostCategory, PostStatus } from "@convex/lib/constants";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	CalendarDays,
	FileText,
	Loader2,
	Megaphone,
	Newspaper,
	Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/common/lazy-rich-text-editor";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";

export const Route = createFileRoute("/_app/posts/$postId/edit")({
	component: AdminEditPostPage,
});

function slugify(text: string): string {
	return text
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
}

function AdminEditPostPage() {
	const { postId } = Route.useParams();
	const navigate = useNavigate();
	const { t } = useTranslation();

	const { data: post } = useAuthenticatedConvexQuery(
		api.functions.posts.getById,
		{
			postId: postId as Id<"posts">,
		},
	);
	const { mutateAsync: update } = useConvexMutationQuery(
		api.functions.posts.update,
	);
	const { mutateAsync: setStatus } = useConvexMutationQuery(
		api.functions.posts.setStatus,
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

	const [coverImageStorageId, setCoverImageStorageId] = useState<
		Id<"_storage"> | undefined
	>();
	const [coverImagePreview, setCoverImagePreview] = useState<string | null>(
		null,
	);

	const [eventStartAt, setEventStartAt] = useState("");
	const [eventEndAt, setEventEndAt] = useState("");
	const [eventLocation, setEventLocation] = useState("");
	const [eventTicketUrl, setEventTicketUrl] = useState("");

	const [documentStorageId, setDocumentStorageId] = useState<
		Id<"_storage"> | undefined
	>();
	const [documentName, setDocumentName] = useState<string | null>(null);

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
			if (post.documentUrl) setDocumentName("Document existant");

			if (post.eventStartAt)
				setEventStartAt(new Date(post.eventStartAt).toISOString().slice(0, 16));
			if (post.eventEndAt)
				setEventEndAt(new Date(post.eventEndAt).toISOString().slice(0, 16));
			if (post.eventLocation) setEventLocation(post.eventLocation);
			if (post.eventTicketUrl) setEventTicketUrl(post.eventTicketUrl);
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
			toast.success("Image téléchargée");
		} catch {
			toast.error("Erreur lors du téléchargement");
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
			toast.success("Document téléchargé");
		} catch {
			toast.error("Erreur lors du téléchargement");
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!title || !slug || !excerpt || !content) {
			toast.error("Veuillez remplir tous les champs obligatoires");
			return;
		}
		if (category === PostCategory.Announcement && !documentStorageId) {
			toast.error("Un document PDF est obligatoire pour les communiqués");
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
				eventStartAt: eventStartAt
					? new Date(eventStartAt).getTime()
					: undefined,
				eventEndAt: eventEndAt ? new Date(eventEndAt).getTime() : undefined,
				eventLocation: eventLocation || undefined,
				eventTicketUrl: eventTicketUrl || undefined,
				documentStorageId,
			});
			toast.success("Article mis à jour");
			navigate({ to: "/posts" });
		} catch (err: any) {
			toast.error(err.message || "Une erreur est survenue");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleTogglePublish = async () => {
		if (!post) return;
		const newStatus =
			post.status === PostStatus.Published
				? PostStatus.Draft
				: PostStatus.Published;
		try {
			await setStatus({ postId: postId as Id<"posts">, status: newStatus });
			toast.success(
				newStatus === PostStatus.Published
					? "Article publié"
					: "Article dépublié",
			);
		} catch (err: any) {
			toast.error(err.message || "Une erreur est survenue");
		}
	};

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
				<Button variant="ghost" size="sm" asChild>
					<Link to="/posts">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Retour
					</Link>
				</Button>
				<div className="flex-1">
					<h1 className="text-2xl font-bold tracking-tight">
						Modifier la publication
					</h1>
					<p className="text-muted-foreground line-clamp-1">{post.title}</p>
				</div>
				<Button
					variant={post.status === PostStatus.Published ? "outline" : "default"}
					onClick={handleTogglePublish}
				>
					{post.status === PostStatus.Published ? "Dépublier" : "Publier"}
				</Button>
			</div>

			<form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
				<div className="lg:col-span-2 space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Contenu</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="title">Titre *</Label>
								<Input
									id="title"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="slug">Slug *</Label>
								<div className="flex items-center gap-2">
									<span className="text-sm text-muted-foreground">/news/</span>
									<Input
										id="slug"
										value={slug}
										onChange={(e) => setSlug(slugify(e.target.value))}
									/>
								</div>
							</div>
							<div className="space-y-2">
								<Label htmlFor="excerpt">Résumé *</Label>
								<Textarea
									id="excerpt"
									value={excerpt}
									onChange={(e) => setExcerpt(e.target.value)}
									rows={3}
								/>
							</div>
							<div className="space-y-2">
								<Label>Corps *</Label>
								<RichTextEditor
									content={content}
									onChange={setContent}
									className="min-h-[300px]"
								/>
							</div>
						</CardContent>
					</Card>

					{isEvent && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<CalendarDays className="h-5 w-5" />
									Événement
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid gap-4 sm:grid-cols-2">
									<div className="space-y-2">
										<Label>Début</Label>
										<Input
											type="datetime-local"
											value={eventStartAt}
											onChange={(e) => setEventStartAt(e.target.value)}
										/>
									</div>
									<div className="space-y-2">
										<Label>Fin</Label>
										<Input
											type="datetime-local"
											value={eventEndAt}
											onChange={(e) => setEventEndAt(e.target.value)}
										/>
									</div>
								</div>
								<div className="space-y-2">
									<Label>Lieu</Label>
									<Input
										value={eventLocation}
										onChange={(e) => setEventLocation(e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label>Billetterie</Label>
									<Input
										type="url"
										value={eventTicketUrl}
										onChange={(e) => setEventTicketUrl(e.target.value)}
									/>
								</div>
							</CardContent>
						</Card>
					)}

					{isCommunique && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Megaphone className="h-5 w-5" />
									Document
								</CardTitle>
								<CardDescription>PDF obligatoire</CardDescription>
							</CardHeader>
							<CardContent>
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
													Changer
												</Button>
											</div>
										</div>
									) : (
										<label htmlFor="document-upload" className="cursor-pointer">
											<Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
											<p className="text-sm text-muted-foreground">
												Télécharger PDF
											</p>
										</label>
									)}
								</div>
							</CardContent>
						</Card>
					)}
				</div>

				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Paramètres</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label>Catégorie *</Label>
								<Select
									value={category}
									onValueChange={(v) => setCategory(v as any)}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={PostCategory.News}>
											<Newspaper className="inline mr-2 h-4 w-4" />
											Actualité
										</SelectItem>
										<SelectItem value={PostCategory.Event}>
											<CalendarDays className="inline mr-2 h-4 w-4" />
											Événement
										</SelectItem>
										<SelectItem value={PostCategory.Announcement}>
											<Megaphone className="inline mr-2 h-4 w-4" />
											Communiqué
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label>Image couverture</Label>
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
												alt=""
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
												Changer
											</Button>
										</div>
									) : (
										<label htmlFor="cover-upload" className="cursor-pointer">
											<Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
											<p className="text-xs text-muted-foreground">
												Télécharger
											</p>
										</label>
									)}
								</div>
							</div>
							<div className="p-3 bg-muted rounded-lg">
								<p className="text-sm">
									<span className="font-medium">Statut:</span>{" "}
									{post.status === PostStatus.Published ? (
										<span className="text-green-600">Publié</span>
									) : (
										<span className="text-muted-foreground">Brouillon</span>
									)}
								</p>
							</div>
						</CardContent>
					</Card>
					<Button type="submit" className="w-full" disabled={isSubmitting}>
						{isSubmitting ? "Enregistrement..." : "Enregistrer"}
					</Button>
				</div>
			</form>
		</div>
	);
}
