"use client";

import { api } from "@convex/_generated/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, LifeBuoy, Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PageHeader } from "@/components/my-space/page-header";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/my-space/flat-card";
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

type TicketCategory =
	| "technical"
	| "service"
	| "information"
	| "feedback"
	| "other";

export default function NewTicketPage() {
	const { t } = useTranslation();
	const router = useRouter();

	const [subject, setSubject] = useState("");
	const [category, setCategory] = useState<TicketCategory>("information");
	const [description, setDescription] = useState("");

	const { mutateAsync: createTicket, isPending } = useConvexMutationQuery(
		api.functions.tickets.create,
	);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (subject.trim().length < 3) {
			toast.error("Le sujet est trop court (min 3 caracteres)");
			return;
		}
		if (description.trim().length < 10) {
			toast.error("Le message est trop court (min 10 caracteres)");
			return;
		}

		try {
			await createTicket({
				subject: subject.trim(),
				category: category as any,
				description: description.trim(),
			});
			toast.success(t("support.tickets.created", "Ticket cree avec succes"));
			router.push("/my-space/support");
		} catch (error) {
			console.error("Failed to create ticket", error);
			toast.error(
				t(
					"support.tickets.createError",
					"Erreur lors de la creation du ticket",
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
				<Link href="/my-space/support">
					<ChevronLeft className="mr-2 h-4 w-4" />
					Retour
				</Link>
			</Button>

			<PageHeader
				title={t("support.tickets.form.title")}
				subtitle={t("support.tickets.form.description")}
				icon={<LifeBuoy className="h-6 w-6 text-primary" />}
			/>

			<FlatCard>
				<div className="p-3 lg:p-4 pt-6">
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
								<Link href="/my-space/support">
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
				</div>
			</FlatCard>
		</div>
	);
}
