"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { PostCategory } from "@convex/lib/constants";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	CalendarDays,
	FileText,
	Megaphone,
	Newspaper,
	Upload,
} from "lucide-react";
import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";

export const Route = createFileRoute("/_app/posts/new")({
	component: AdminNewPostPage,
});

function slugify(text: string): string {
	return text
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
}

function AdminNewPostPage() {
	const navigate = useNavigate();
	const { t } = useTranslation();

	// Get list of orgs for selection
	const { data: orgs } = useAuthenticatedConvexQuery(api.functions.orgs.list);
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
	const [selectedOrgId, setSelectedOrgId] = useState<string>("");

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
			await create({
				title,
				slug,
				excerpt,
				content,
				category,
				coverImageStorageId,
				orgId: selectedOrgId ? (selectedOrgId as Id<"orgs">) : undefined,
				publish,
				eventStartAt: eventStartAt
					? new Date(eventStartAt).getTime()
					: undefined,
				eventEndAt: eventEndAt ? new Date(eventEndAt).getTime() : undefined,
				eventLocation: eventLocation || undefined,
				eventTicketUrl: eventTicketUrl || undefined,
				documentStorageId,
			});

			toast.success(publish ? "Article publié" : "Brouillon enregistré");
			navigate({ to: "/posts" });
		} catch (err: any) {
			toast.error(err.message || "Une erreur est survenue");
		} finally {
			setIsSubmitting(false);
		}
	};

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
				<div>
					<h1 className="text-2xl font-bold tracking-tight">
						Nouvelle publication
					</h1>
					<p className="text-muted-foreground">
						Créer une actualité globale ou pour une organisation
					</p>
				</div>
			</div>

			<form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
				{/* Main content */}
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
									onChange={(e) => handleTitleChange(e.target.value)}
									placeholder="Titre de l'article"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="slug">Slug (URL) *</Label>
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
								<Label htmlFor="excerpt">Résumé *</Label>
								<Textarea
									id="excerpt"
									value={excerpt}
									onChange={(e) => setExcerpt(e.target.value)}
									placeholder="Un court résumé..."
									rows={3}
								/>
							</div>

							<div className="space-y-2">
								<Label>Corps de l'article *</Label>
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
									Détails de l'événement
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid gap-4 sm:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="eventStartAt">Date de début</Label>
										<Input
											id="eventStartAt"
											type="datetime-local"
											value={eventStartAt}
											onChange={(e) => setEventStartAt(e.target.value)}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="eventEndAt">Date de fin</Label>
										<Input
											id="eventEndAt"
											type="datetime-local"
											value={eventEndAt}
											onChange={(e) => setEventEndAt(e.target.value)}
										/>
									</div>
								</div>
								<div className="space-y-2">
									<Label htmlFor="eventLocation">Lieu</Label>
									<Input
										id="eventLocation"
										value={eventLocation}
										onChange={(e) => setEventLocation(e.target.value)}
										placeholder="Adresse ou nom du lieu"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="eventTicketUrl">Lien billetterie</Label>
									<Input
										id="eventTicketUrl"
										type="url"
										value={eventTicketUrl}
										onChange={(e) => setEventTicketUrl(e.target.value)}
										placeholder="https://..."
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
									Document officiel
								</CardTitle>
								<CardDescription>
									PDF obligatoire pour les communiqués
								</CardDescription>
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
												Cliquez pour télécharger un PDF
											</p>
										</label>
									)}
								</div>
							</CardContent>
						</Card>
					)}
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Paramètres</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label>Représentation</Label>
								<Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
									<SelectTrigger>
										<SelectValue placeholder="Global (aucune)" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="">Global (aucune)</SelectItem>
										{orgs?.map((org) => (
											<SelectItem key={org._id} value={org._id}>
												{org.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

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
											<div className="flex items-center gap-2">
												<Newspaper className="h-4 w-4" />
												Actualité
											</div>
										</SelectItem>
										<SelectItem value={PostCategory.Event}>
											<div className="flex items-center gap-2">
												<CalendarDays className="h-4 w-4" />
												Événement
											</div>
										</SelectItem>
										<SelectItem value={PostCategory.Announcement}>
											<div className="flex items-center gap-2">
												<Megaphone className="h-4 w-4" />
												Communiqué officiel
											</div>
										</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label>Image de couverture</Label>
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

							<div className="flex items-center justify-between">
								<Label htmlFor="publish">Publier maintenant</Label>
								<Switch
									id="publish"
									checked={publish}
									onCheckedChange={setPublish}
								/>
							</div>
						</CardContent>
					</Card>

					<Button type="submit" className="w-full" disabled={isSubmitting}>
						{isSubmitting
							? "Enregistrement..."
							: publish
								? "Publier"
								: "Enregistrer le brouillon"}
					</Button>
				</div>
			</form>
		</div>
	);
}
