"use client"

import { useEffect } from "react"

/**
 * Supprime le warning cosmétique de Recharts :
 *   "The width(-1) and height(-1) of chart should be greater than 0..."
 *
 * Ce warning est émis par `ResponsiveContainer` au tout premier render car
 * son `useState` interne initialise `containerWidth/Height` à `-1` avant
 * que le `ResizeObserver` n'ait mesuré le parent. Le chart s'affiche
 * correctement après la mesure — c'est purement cosmétique.
 *
 * Monté une seule fois via le layout root. Preserve tous les autres warns.
 */
export function SuppressRechartsWarning() {
	useEffect(() => {
		const originalWarn = console.warn
		console.warn = (...args: unknown[]) => {
			const first = args[0]
			if (
				typeof first === "string" &&
				first.includes("width(-1) and height(-1) of chart")
			) {
				return
			}
			originalWarn.apply(console, args as Parameters<typeof console.warn>)
		}
		return () => {
			console.warn = originalWarn
		}
	}, [])
	return null
}
