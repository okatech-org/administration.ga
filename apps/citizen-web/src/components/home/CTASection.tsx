"use client";

import { motion } from "motion/react";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MotionDiv = motion.div as any;
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import communityHero from "@/assets/community-hero.jpg";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import Image from "next/image";
import Link from "next/link";

export function CTASection() {
	const { t } = useTranslation();
	const { data: session } = authClient.useSession();
	const isSignedIn = !!session;

	// Hide section if user is logged in
	if (isSignedIn) return null;

	return (
		<section className="relative z-10 min-h-[50vh] flex items-center justify-center overflow-hidden">
			{/* Background Image - Full Width */}
			<Image
				src={communityHero}
				alt="Communauté"
				fill
				className="object-cover"
			/>
			<div className="absolute inset-0 bg-linear-to-r from-green-900/50 via-black/40 to-green-900/50" />

			{/* Content */}
			<MotionDiv
				initial={{ opacity: 0, y: 20 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true }}
				className="relative z-10 text-center text-white px-4 py-16 space-y-6 max-w-3xl mx-auto"
			>
				<h2 className="text-3xl lg:text-5xl font-bold tracking-tight">
					{t("cta.title")}
				</h2>
				<p className="text-white/90 text-lg leading-relaxed">
					{t("cta.subtitle")}
				</p>
				<Button
					asChild
					size="lg"
					className="h-16 px-10 text-lg bg-(--gabon-yellow) hover:brightness-110 text-black font-bold shadow-xl hover:scale-105 transition-all"
				>
					<Link href="/register">
						{t("cta.button")}
						<ChevronRight className="w-6 h-6 ml-2" />
					</Link>
				</Button>
			</MotionDiv>
		</section>
	);
}
