import { type ReactNode } from "react"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export interface SettingsTab {
  id: string
  label: string
  icon?: React.ReactNode
  variant?: "default" | "destructive"
}

interface SettingsLayoutProps {
  title: string
  description?: string
  tabs: SettingsTab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  children: ReactNode
}

export function SettingsLayout({
  title,
  description,
  tabs,
  activeTab,
  onTabChange,
  children,
}: SettingsLayoutProps) {
  return (
    <div className="flex min-h-full w-full flex-1 flex-col overflow-auto p-3 md:p-6">
      <div className="mb-4 flex flex-col gap-1 md:mb-6">
        <h1 className="text-xl font-semibold tracking-tight md:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground md:text-base">
            {description}
          </p>
        )}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm md:flex-row">
        {/* Sidebar → horizontal scroll on mobile */}
        <aside className="flex w-full shrink-0 flex-row gap-1 overflow-x-auto border-b bg-muted/20 px-2 py-2 md:w-56 md:flex-col md:border-r md:border-b-0 md:p-4 lg:w-64">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm whitespace-nowrap transition-colors md:w-full md:shrink md:gap-3 md:px-4 md:py-2.5",
                  isActive
                    ? "bg-primary font-medium text-primary-foreground"
                    : tab.variant === "destructive"
                      ? "text-destructive hover:bg-destructive/10"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {tab.icon && <span className="shrink-0">{tab.icon}</span>}
                {tab.label}
              </button>
            )
          })}
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

export function SettingsSectionHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex items-start justify-between">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

export function SettingsRow({
  title,
  description,
  action,
  value,
  className,
}: {
  title: string | ReactNode
  description?: ReactNode
  action?: ReactNode
  value?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-3 border-b py-4 last:border-b-0 sm:flex-row sm:items-center",
        className
      )}
    >
      <div className="flex-1 space-y-0.5 pr-4">
        <div className="text-sm font-medium text-foreground">{title}</div>
        {description && (
          <div className="text-sm text-muted-foreground">{description}</div>
        )}
      </div>
      <div className="flex items-center gap-4 sm:shrink-0">
        {value && (
          <div className="max-w-[200px] truncate text-sm font-medium sm:max-w-[300px]">
            {value}
          </div>
        )}
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  )
}

/** A visual divider between sections inside a tab */
export function SettingsDivider() {
  return <Separator className="my-8" />
}
