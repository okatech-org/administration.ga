import { api } from "@convex/_generated/api";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import profilePassage from "@/assets/profile-passage-new.png";
import profileResident from "@/assets/profile-resident-new.png";
import profileVisitor from "@/assets/profile-visitor-new.png";
import { useConvexQuery } from "@/integrations/convex/hooks";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function ProfilesSection() {
	const { t } = useTranslation();
	const { data: session } = authClient.useSession();
	const isSignedIn = !!session;

	const { data: profileResult } = useConvexQuery(
		api.functions.profiles.getMyProfileSafe,
		isSignedIn ? {} : "skip",
	);
	const hasProfile = !!profileResult?.profile;

	const profiles = [
		{
			image: profileResident,
			titleKey: "profiles.resident.title",
			subtitleKey: "profiles.resident.subtitle",
			descriptionKey: "profiles.resident.description",
			color: "green" as const,
			to: hasProfile ? "/my-space" : "/register?type=long_stay",
			delay: 0,
		},
		{
			image: profilePassage,
			titleKey: "profiles.passage.title",
			subtitleKey: "profiles.passage.subtitle",
			descriptionKey: "profiles.passage.description",
			color: "yellow" as const,
			to: hasProfile ? "/my-space" : "/register?type=short_stay",
			delay: 0.1,
		},
		{
			image: profileVisitor,
			titleKey: "profiles.visitor.title",
			subtitleKey: "profiles.visitor.subtitle",
			descriptionKey: "profiles.visitor.description",
			color: "blue" as const,
			to: hasProfile ? "/my-space" : "/register?type=visa_tourism",
			delay: 0.2,
		},
	];

	const ctaText = t("heroCore.cta.mySpace");

	return (
		<section className="relative z-10 py-16 px-4 lg:px-8 bg-muted/30">
			<div className="max-w-6xl mx-auto">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					className="text-center mb-10"
				>
					<h2 className="text-3xl font-bold mb-3">{t("profiles.title")}</h2>
					<p className="text-muted-foreground max-w-xl mx-auto">
						{t("profiles.subtitle")}
					</p>
				</motion.div>

				<div className="grid md:grid-cols-3 gap-6">
					{profiles.map((profile) => (
						<ProfileCard
							key={profile.titleKey}
							image={profile.image}
							title={t(profile.titleKey)}
							subtitle={t(profile.subtitleKey)}
							description={t(profile.descriptionKey)}
							color={profile.color}
							to={profile.to}
							delay={profile.delay}
							ctaText={ctaText}
						/>
					))}
				</div>
			</div>
		</section>
	);
}

interface ProfileCardProps {
	image: { src: string };
	title: string;
	subtitle: string;
	description: string;
	color: "green" | "yellow" | "blue";
	to: string;
	delay: number;
	ctaText: string;
}

function ProfileCard({
	image,
	title,
	subtitle,
	description,
	color,
	to,
	delay,
	ctaText,
}: ProfileCardProps) {
	const borderTopColors = {
		green: "oklch(0.685 0.169 237.323)",
		yellow: "oklch(0.685 0.169 237.323)",
		blue: "oklch(0.685 0.169 237.323)",
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true }}
			transition={{ delay, ease: "easeOut" }}
		>
			<Link href={to}>
				<Card
					className="py-0 cursor-pointer border border-border bg-card shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden h-full"
					style={{ borderTop: `3px solid ${borderTopColors[color]}` }}
				>
					<div className="h-48 w-full overflow-hidden">
						<img
							src={image.src}
							alt={title}
							className="w-full h-full object-cover object-top transition-transform duration-500 hover:scale-110"
						/>
					</div>
					<CardContent className="p-6 space-y-4">
						<div>
							<h3 className="text-lg font-bold">{title}</h3>
							<p className="text-sm text-muted-foreground">{subtitle}</p>
						</div>
						<p className="text-sm text-muted-foreground leading-relaxed">
							{description}
						</p>
						<Button
							variant="ghost"
							size="sm"
							className="gap-1 p-0 h-auto text-primary"
						>
							{ctaText} <ChevronRight className="w-4 h-4" />
						</Button>
					</CardContent>
				</Card>
			</Link>
		</motion.div>
	);
}

export default ProfilesSection;
