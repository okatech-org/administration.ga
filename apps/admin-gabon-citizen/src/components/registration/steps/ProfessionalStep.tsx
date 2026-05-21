import { WorkStatus } from "@convex/lib/constants";
import { type Control, Controller, type FieldErrors } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { ProfileFormValues } from "@/lib/validation/profile";

interface ProfessionalStepProps {
	control: Control<ProfileFormValues>;
	errors?: FieldErrors<ProfileFormValues>;
}

export function ProfessionalStep({ control }: ProfessionalStepProps) {
	const { t } = useTranslation();

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>{t("profile.profession.title")}</CardTitle>
					<CardDescription>
						{t("profile.profession.description")}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<FieldSet>
						<FieldGroup className="grid gap-4 md:grid-cols-2">
							<Controller
								name="profession.status"
								control={control}
								render={({ field }) => (
									<Field>
										<FieldLabel htmlFor="profession-status">
											{t("profile.profession.status")}
										</FieldLabel>
										<Select value={field.value} onValueChange={field.onChange}>
											<SelectTrigger id="profession-status">
												<SelectValue
													placeholder={t(
														"registration.labels.selectPlaceholder",
													)}
												/>
											</SelectTrigger>
											<SelectContent>
												<SelectItem value={WorkStatus.Employee}>
													{t("profile.profession.employee")}
												</SelectItem>
												<SelectItem value={WorkStatus.SelfEmployed}>
													{t("profile.profession.selfEmployed")}
												</SelectItem>
												<SelectItem value={WorkStatus.Entrepreneur}>
													{t("profile.profession.entrepreneur")}
												</SelectItem>
												<SelectItem value={WorkStatus.Student}>
													{t("profile.profession.student")}
												</SelectItem>
												<SelectItem value={WorkStatus.Retired}>
													{t("profile.profession.retired")}
												</SelectItem>
												<SelectItem value={WorkStatus.Unemployed}>
													{t("profile.profession.unemployed")}
												</SelectItem>
												<SelectItem value={WorkStatus.Other}>
													{t("profile.profession.other")}
												</SelectItem>
											</SelectContent>
										</Select>
									</Field>
								)}
							/>
							<Controller
								name="profession.title"
								control={control}
								render={({ field }) => (
									<Field>
										<FieldLabel htmlFor="profession-title">
											{t("profile.profession.jobTitle")}
										</FieldLabel>
										<Input
											id="profession-title"
											placeholder={t("profile.profession.jobTitlePlaceholder")}
											{...field}
										/>
									</Field>
								)}
							/>
							<Controller
								name="profession.employer"
								control={control}
								render={({ field }) => (
									<Field className="md:col-span-2">
										<FieldLabel htmlFor="profession-employer">
											{t("profile.profession.employer")}
										</FieldLabel>
										<Input
											id="profession-employer"
											placeholder={t("profile.profession.employerPlaceholder")}
											{...field}
										/>
									</Field>
								)}
							/>
						</FieldGroup>
					</FieldSet>
				</CardContent>
			</Card>
		</div>
	);
}
