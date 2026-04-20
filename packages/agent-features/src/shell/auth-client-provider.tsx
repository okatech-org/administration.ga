"use client"

import { createContext, useContext, type ReactNode } from "react"

/**
 * Minimal typed surface for the shared `authClient` instance consumed by
 * migrated features (settings page, etc.). Each host app (agent-web,
 * agent-desktop) constructs a full better-auth client with its own plugin
 * set and exposes it through <AuthClientProvider>.
 *
 * The page-level code inside @workspace/agent-features uses this context
 * (via `useAuthClient()`) instead of importing a per-app `authClient`
 * module directly — which would not resolve from the shared package.
 */
export interface SharedAuthClient {
	useSession: () => { data: { user?: { email?: string; name?: string } } | null }
	emailOtp: {
		sendVerificationOtp: (args: {
			email: string
			type: string
		}) => Promise<{ error: { message?: string } | null }>
		resetPassword: (args: {
			email: string
			otp: string
			password: string
		}) => Promise<{ error: { message?: string } | null }>
	}
	signOut: () => Promise<unknown>
	// The real authClient exposes many more fields. We intentionally keep
	// the shared surface minimal so migrated pages can depend on it without
	// every host app having to implement every plugin.
	[key: string]: unknown
}

const AuthClientContext = createContext<SharedAuthClient | null>(null)

interface AuthClientProviderProps {
	value: SharedAuthClient
	children: ReactNode
}

export function AuthClientProvider({ value, children }: AuthClientProviderProps) {
	return (
		<AuthClientContext.Provider value={value}>{children}</AuthClientContext.Provider>
	)
}

export function useAuthClient(): SharedAuthClient {
	const ctx = useContext(AuthClientContext)
	if (!ctx) {
		throw new Error(
			"useAuthClient() must be called inside <AuthClientProvider>. Wrap your app root with the provider and pass your host-specific authClient.",
		)
	}
	return ctx
}
