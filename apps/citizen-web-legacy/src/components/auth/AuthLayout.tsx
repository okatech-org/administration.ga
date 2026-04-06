import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface AuthLayoutProps {
	children: ReactNode;
	headerButton?: {
		label: string;
		to: string;
		search?: Record<string, unknown>;
	};
}

export function AuthLayout({ children, headerButton }: AuthLayoutProps) {
	const { t } = useTranslation();

	return (
		<div className="flex min-h-dvh bg-background">
			{/* Left side - Image & Text Overlay (Desktop Only) */}
			<div className="relative hidden w-1/2 lg:flex flex-col justify-end p-12 text-white">
				{/* Background Image */}
				<div className="absolute inset-0 z-0">
					<img
						loading="lazy"
						decoding="async"
						src="/auth-bg.jpeg"
						alt="Consulat Digital Gabon"
						className="h-full w-full object-cover"
					/>
					{/* Gradient Overlays for text readability */}
					<div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
					<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
				</div>

				{/* Content */}
				<div className="relative z-10 max-w-lg space-y-4">
					<h1 className="text-4xl font-bold tracking-tight sm:text-5xl leading-tight">
						{t("register.hero.title")}
					</h1>
					<p className="text-lg text-white/80">{t("register.hero.subtitle")}</p>

					{/* Dummy Carousel Indicators */}
					<div className="flex items-center gap-2 pt-6">
						<div className="h-1.5 w-8 rounded-full bg-white transition-all" />
						<div className="h-1.5 w-2 rounded-full bg-white/40 transition-all" />
						<div className="h-1.5 w-2 rounded-full bg-white/40 transition-all" />
					</div>
				</div>
			</div>

			{/* Right side - Form */}
			<div className="flex w-full flex-col lg:w-1/2">
				{/* Header with Switch Button */}
				<header className="flex h-24 items-center justify-end px-6 sm:px-12">
					{headerButton && (
						<Button variant="secondary" className="rounded-full px-6" asChild>
							<Link to={headerButton.to} search={headerButton.search}>
								{headerButton.label}
							</Link>
						</Button>
					)}
				</header>

				{/* Form Container */}
				<main className="flex flex-1 flex-col justify-center px-6 pb-24 sm:px-12 md:px-16 lg:px-24">
					<div className="w-full max-w-[440px] mx-auto">{children}</div>
				</main>
			</div>
		</div>
	);
}
