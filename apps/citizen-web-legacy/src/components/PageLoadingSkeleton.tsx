import { Skeleton } from "@/components/ui/skeleton";

/**
 * Full-page loading skeleton shown by TanStack Router while routes load
 * in SPA mode. This gives users an immediate sense of the page structure
 * instead of a blank white screen.
 */
export function PageLoadingSkeleton() {
	return (
		<div className="min-h-screen bg-background">
			{/* Hero Skeleton */}
			<section className="relative min-h-[80vh] flex items-center justify-center bg-muted/30 overflow-hidden">
				{/* Shimmer background */}
				<div className="absolute inset-0 bg-gradient-to-br from-muted/50 via-muted/30 to-muted/50 animate-pulse" />

				<div className="relative z-10 max-w-6xl mx-auto text-center px-4 lg:px-8 py-16 space-y-6">
					{/* Badge */}
					<div className="flex justify-center">
						<Skeleton className="h-8 w-64 rounded-full" />
					</div>

					{/* Title */}
					<div className="space-y-3">
						<div className="flex justify-center">
							<Skeleton className="h-12 w-[500px] max-w-full rounded-lg" />
						</div>
						<div className="flex justify-center">
							<Skeleton className="h-12 w-[400px] max-w-full rounded-lg" />
						</div>
					</div>

					{/* Subtitle */}
					<div className="flex justify-center">
						<Skeleton className="h-5 w-[450px] max-w-full rounded" />
					</div>

					{/* CTA buttons */}
					<div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
						<Skeleton className="h-14 w-52 rounded-lg" />
						<Skeleton className="h-14 w-44 rounded-lg" />
					</div>

					{/* Stats */}
					<div className="flex flex-wrap justify-center gap-8 pt-8">
						<Skeleton className="h-5 w-36 rounded" />
						<Skeleton className="h-5 w-28 rounded" />
					</div>
				</div>
			</section>

			{/* Profiles Section Skeleton */}
			<section className="py-16 px-4 lg:px-8 bg-muted/30">
				<div className="max-w-6xl mx-auto">
					<div className="text-center mb-10 space-y-3">
						<Skeleton className="h-8 w-64 mx-auto rounded" />
						<Skeleton className="h-5 w-96 max-w-full mx-auto rounded" />
					</div>
					<div className="grid md:grid-cols-3 gap-6">
						{[0, 1, 2].map((i) => (
							<div
								key={i}
								className="rounded-xl border bg-card overflow-hidden"
							>
								<Skeleton className="h-48 w-full" />
								<div className="p-6 space-y-3">
									<Skeleton className="h-5 w-3/4 rounded" />
									<Skeleton className="h-4 w-1/2 rounded" />
									<Skeleton className="h-4 w-full rounded" />
									<Skeleton className="h-4 w-5/6 rounded" />
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Services Section Skeleton */}
			<section className="py-16 px-6 bg-secondary/30">
				<div className="max-w-7xl mx-auto">
					<div className="text-center mb-12 space-y-3">
						<Skeleton className="h-6 w-32 mx-auto rounded-full" />
						<Skeleton className="h-8 w-80 mx-auto rounded" />
						<Skeleton className="h-5 w-96 max-w-full mx-auto rounded" />
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{[0, 1, 2, 3, 4, 5].map((i) => (
							<div key={i} className="rounded-xl border bg-card p-6 space-y-4">
								<Skeleton className="h-12 w-12 rounded-xl" />
								<Skeleton className="h-5 w-3/4 rounded" />
								<Skeleton className="h-4 w-full rounded" />
								<Skeleton className="h-4 w-2/3 rounded" />
							</div>
						))}
					</div>
				</div>
			</section>
		</div>
	);
}
