"use client"

import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react"
import { useAuthenticatedConvexQuery } from "@workspace/api/hooks"

interface OrgModuleConfigEntry {
	moduleCode: string
	enabled: boolean
	capabilities?: string[]
}

interface OrgContextType {
	activeOrgId: Id<"orgs"> | null
	activeMembershipId: Id<"memberships"> | null
	activePositionGrade: string | null
	activeOrgModules: string[]
	activeOrgModuleConfig: OrgModuleConfigEntry[] | null
	setActiveOrgId: (orgId: Id<"orgs">) => void
	isLoading: boolean
	// biome-ignore lint/suspicious/noExplicitAny: org shape varies by feature
	activeOrg: any | null
}

const OrgContext = createContext<OrgContextType | undefined>(undefined)

export function OrgProvider({ children }: { children: ReactNode }) {
	const [activeOrgId, setActiveOrgIdState] = useState<Id<"orgs"> | null>(null)
	const [isRestoring, setIsRestoring] = useState(true)

	const { data: memberships } = useAuthenticatedConvexQuery(
		api.functions.users.getOrgMemberships,
		{},
	)

	useEffect(() => {
		const storedOrgId =
			typeof window !== "undefined"
				? localStorage.getItem("consulat-active-org")
				: null

		if (storedOrgId) {
			setActiveOrgIdState(storedOrgId as Id<"orgs">)
		}

		setIsRestoring(false)
	}, [])

	useEffect(() => {
		if (!isRestoring && memberships !== undefined) {
			if (memberships.length === 0) {
				setActiveOrgIdState(null)
				localStorage.removeItem("consulat-active-org")
				return
			}

			const isValid = memberships.some((m) => m.orgId === activeOrgId)

			if (!activeOrgId || !isValid) {
				const firstOrg = memberships[0]
				if (firstOrg) {
					setActiveOrgIdState(firstOrg.orgId)
					localStorage.setItem("consulat-active-org", firstOrg.orgId)
				}
			}
		}
	}, [memberships, activeOrgId, isRestoring])

	const setActiveOrgId = (orgId: Id<"orgs">) => {
		setActiveOrgIdState(orgId)
		localStorage.setItem("consulat-active-org", orgId)
	}

	const hasLoadedOnce = useRef(false)
	if (memberships !== undefined) {
		hasLoadedOnce.current = true
	}

	const activeMember =
		memberships?.find((m) => m.orgId === activeOrgId) || null
	const activeMembershipId = (activeMember?._id as Id<"memberships">) || null
	// biome-ignore lint/suspicious/noExplicitAny: positionGrade not yet in canonical type
	const activePositionGrade = (activeMember as any)?.positionGrade || null
	const activeOrg = activeMember?.org || null
	// biome-ignore lint/suspicious/noExplicitAny: modules array not yet in canonical type
	const activeOrgModules: string[] = (activeMember?.org as any)?.modules ?? []
	const activeOrgModuleConfig: OrgModuleConfigEntry[] | null =
		// biome-ignore lint/suspicious/noExplicitAny: config shape not yet in canonical type
		(activeMember?.org as any)?.orgModuleConfig ?? null
	const isLoading =
		isRestoring || (!hasLoadedOnce.current && memberships === undefined)

	return (
		<OrgContext.Provider
			value={{
				activeOrgId,
				activeMembershipId,
				activePositionGrade,
				activeOrgModules,
				activeOrgModuleConfig,
				setActiveOrgId,
				isLoading,
				activeOrg,
			}}
		>
			{children}
		</OrgContext.Provider>
	)
}

export function useOrg() {
	const context = useContext(OrgContext)
	if (context === undefined) {
		throw new Error("useOrg must be used within an OrgProvider")
	}
	return context
}
