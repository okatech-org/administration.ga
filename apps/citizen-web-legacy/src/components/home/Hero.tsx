import { api } from "@convex/_generated/api";
import { Link } from "@tanstack/react-router";
import { ChevronRight, FileText, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useConvexQuery } from "@/integrations/convex/hooks";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function Hero() {
	const { t } = useTranslation();
	const { data: session } = authClient.useSession();
	const isSignedIn = !!session;

	// Real data counts
	const { data: orgs } = useConvexQuery(api.functions.orgs.list, {});
	const { data: services } = useConvexQuery(
		api.functions.services.listCatalog,
		{},
	);

	// Check if user has a profile already
	const { data: profileResult } = useConvexQuery(
		api.functions.profiles.getMyProfileSafe,
		isSignedIn ? {} : "skip",
	);
	const hasProfile = !!profileResult?.profile;

	const orgCount = orgs?.length ?? 0;
	const serviceCount = services?.length ?? 0;

	// CTA destination & label
	const ctaTo = hasProfile ? "/my-space" : "/register";
	const ctaLabel = hasProfile
		? t("heroCore.cta.mySpace")
		: t("heroCore.cta.register");

	return (
		<section className="relative z-10 min-h-[80vh] flex items-center justify-center overflow-hidden">
			{/* Video Background */}
			<video
				autoPlay
				muted
				loop
				playsInline
				className="absolute inset-0 w-full h-full object-cover"
			>
				<source src="/videos/video_idn_ga.mp4" type="video/mp4" />
			</video>

			{/* Dark Overlay */}
			<div className="absolute inset-0 bg-black/60" />

			{/* Content */}
			<div className="relative z-10 max-w-6xl mx-auto text-center px-4 lg:px-8 py-16">
				<div className="space-y-6">
					{/* Badge */}
					<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary text-sm font-semibold border border-primary/30 backdrop-blur-sm">
						<span className="relative flex h-2 w-2">
							<span className="animate-ping absolute h-full w-full rounded-full bg-primary opacity-75" />
							<span className="relative rounded-full h-2 w-2 bg-primary" />
						</span>
						{t("heroCore.badge")}
					</div>

					{/* Title */}
					<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-white">
						{t("heroCore.title")} <br />
						<span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-yellow-400 to-green-500">
							{t("heroCore.titleHighlight")}
						</span>
					</h1>

					{/* Subtitle */}
					<p className="text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
						{t("heroCore.description")}
					</p>

					{/* CTAs */}
					<div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
						<Button
							asChild
							size="lg"
							className="h-14 px-8 text-base shadow-xl shadow-primary/30 hover:scale-105 transition-transform"
						>
							<Link to={ctaTo}>
								{ctaLabel}
								<ChevronRight className="w-5 h-5 ml-2" />
							</Link>
						</Button>
						<Button
							asChild
							variant="outline"
							size="lg"
							className="h-14 px-8 text-base bg-white/10 backdrop-blur-sm border-white/50 text-white hover:bg-white/20 hover:text-white"
						>
							<Link to="/services">{t("heroCore.cta.services")}</Link>
						</Button>
					</div>

					{/* Quick Stats */}
					<div className="flex flex-wrap justify-center gap-8 pt-8 text-sm text-white/90">
						<div className="flex items-center gap-2">
							<Globe className="w-5 h-5 text-primary" />
							<span>
								{orgs === undefined ? (
									<span className="inline-block h-4 w-8 rounded bg-white/20 animate-pulse align-middle" />
								) : (
									<strong>{orgCount}</strong>
								)}{" "}
								{t("heroCore.stats.representations")}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<FileText className="w-5 h-5 text-primary" />
							<span>
								{services === undefined ? (
									<span className="inline-block h-4 w-8 rounded bg-white/20 animate-pulse align-middle" />
								) : (
									<strong>{serviceCount}</strong>
								)}{" "}
								{t("heroCore.stats.services")}
							</span>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

export default Hero;
