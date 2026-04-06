import { api } from "@convex/_generated/api";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, LifeBuoy, Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PageHeader } from "@/components/my-space/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useConvexMutationQuery } from "@/integrations/convex/hooks";

export const Route = createFileRoute("/my-space/support/new")({
	component: NewTicketPage,
});

type TicketCategory =
	| "technical"
	| "service"
	| "information"
	| "feedback"
	| "other";

function NewTicketPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const [subject, setSubject] = useState("");
	const [category, setCategory] = useState<TicketCategory>("information");
	const [description, setDescription] = useState("");

	const { mutateAsync: createTicket, isPending } = useConvexMutationQuery(
		api.functions.tickets.create,
	);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (subject.trim().length < 3) {
			toast.error("Le sujet est trop court (min 3 caractères)");
			return;
		}
		if (description.trim().length < 10) {
			toast.error("Le message est trop court (min 10 caractères)");
			return;
		}

		try {
			await createTicket({
				subject: subject.trim(),
				category,
				description: description.trim(),
			});
			toast.success(t("support.tickets.created", "Ticket créé avec succès"));
			navigate({ to: "/my-space/support" });
		} catch (error) {
			console.error("Failed to create ticket", error);
			toast.error(
				t(
					"support.tickets.createError",
					"Erreur lors de la création du ticket",
				),
			);
		}
	};

	return (
		<div className="space-y-6 max-w-3xl mx-auto">
			<Button
				variant="ghost"
				asChild
				className="mb-2 -ml-4 text-muted-foreground hover:text-foreground"
			>
				<Link to="/my-space/support">
					<ChevronLeft className="mr-2 h-4 w-4" />
					Retour
				</Link>
			</Button>

			<PageHeader
				title={t("support.tickets.form.title")}
				subtitle={t("support.tickets.form.description")}
				icon={<LifeBuoy className="h-6 w-6 text-primary" />}
			/>

			<Card>
				<CardContent className="pt-6">
					<form onSubmit={handleSubmit} className="space-y-6">
						<div className="space-y-2">
							<Label htmlFor="subject">
								{t("support.tickets.form.subject")}
							</Label>
							<Input
								id="subject"
								placeholder={t("support.tickets.form.subjectPlaceholder")}
								value={subject}
								onChange={(e) => setSubject(e.target.value)}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="category">
								{t("support.tickets.form.category")}
							</Label>
							<Select
								value={category}
								onValueChange={(val) => setCategory(val as TicketCategory)}
							>
								<SelectTrigger id="category">
									<SelectValue
										placeholder={t("support.tickets.form.category")}
									/>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="technical">
										{t("support.ticketCategory.technical")}
									</SelectItem>
									<SelectItem value="service">
										{t("support.ticketCategory.service")}
									</SelectItem>
									<SelectItem value="information">
										{t("support.ticketCategory.information")}
									</SelectItem>
									<SelectItem value="feedback">
										{t("support.ticketCategory.feedback")}
									</SelectItem>
									<SelectItem value="other">
										{t("support.ticketCategory.other")}
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="description">
								{t("support.tickets.form.message")}
							</Label>
							<Textarea
								id="description"
								placeholder={t("support.tickets.form.messagePlaceholder")}
								className="min-h-[150px] resize-none"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
							/>
						</div>

						<div className="flex gap-4 justify-end pt-4">
							<Button type="button" variant="outline" asChild>
								<Link to="/my-space/support">
									{t("support.tickets.form.cancel")}
								</Link>
							</Button>
							<Button type="submit" disabled={isPending}>
								{isPending ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : null}
								{t("support.tickets.form.submit")}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
