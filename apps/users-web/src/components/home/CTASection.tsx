import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import communityHero from "@/assets/community-hero.jpg";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function CTASection() {
	const { t } = useTranslation();
	const { data: session } = authClient.useSession();
	const isSignedIn = !!session;

	// Hide section if user is logged in
	if (isSignedIn) return null;

	return (
		<section className="relative z-10 min-h-[50vh] flex items-center justify-center overflow-hidden">
			{/* Background Image - Full Width */}
			<img
				src={communityHero}
				alt="Communauté"
				className="absolute inset-0 w-full h-full object-cover"
			/>
			<div className="absolute inset-0 bg-gradient-to-r from-green-900/50 via-black/40 to-green-900/50" />

			{/* Content */}
			<motion.div
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
					className="h-16 px-10 text-lg bg-yellow-500 hover:bg-yellow-400 text-black font-bold shadow-xl hover:scale-105 transition-all"
				>
					<a href="/sign-up">
						{t("cta.button")}
						<ChevronRight className="w-6 h-6 ml-2" />
					</a>
				</Button>
			</motion.div>
		</section>
	);
}
