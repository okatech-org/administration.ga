import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/** Skeleton for FlatCard-based dashboard widgets */
export function FlatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl bg-card p-5 border flat-card-border space-y-3", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}

/** Skeleton for the profile hero section (avatar + name + details) */
export function ProfileHeroSkeleton() {
  return (
    <div className="rounded-xl bg-card p-5 border flat-card-border space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  )
}

/** Skeleton for a grid of cards */
export function CardGridSkeleton({
  cols = 3,
  count = 3,
  className,
}: {
  cols?: number
  count?: number
  className?: string
}) {
  return (
    <div className={cn(
      "grid gap-4",
      cols === 2 && "grid-cols-1 md:grid-cols-2",
      cols === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
      className,
    )}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  )
}

/** Skeleton for list items (appointments, requests, tickets) */
export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border bg-card p-4">
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  )
}

/** Skeleton for content detail pages (articles, service details, etc.) */
export function ContentDetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-9 w-32" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  )
}

/** Skeleton that fills the my-space content area (used in layout auth gate) */
export function MySpaceContentSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32 rounded-full" />
          <Skeleton className="h-9 w-36 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>
      {/* Dashboard skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-3 space-y-4">
          <ProfileHeroSkeleton />
          <FlatCardSkeleton />
        </div>
        <div className="md:col-span-5 space-y-4">
          <FlatCardSkeleton />
          <FlatCardSkeleton />
        </div>
        <div className="md:col-span-4 space-y-4">
          <FlatCardSkeleton />
          <FlatCardSkeleton />
        </div>
      </div>
    </div>
  )
}
