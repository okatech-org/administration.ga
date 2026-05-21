/**
 * Hook centralisateur pour le tracking PostHog du wizard d'inscription consulaire.
 *
 * Utilisé par CitizenRegistrationForm (long_stay / short_stay) et
 * ForeignerRegistrationForm (foreigner). Émet :
 *
 * - `registration_started` au mount
 * - `registration_step_viewed` à chaque changement de step
 * - `registration_step_completed` (avec `time_on_step_ms`) sur appel manuel
 * - `registration_step_back` sur navigation arrière
 * - `registration_validation_error` sur échec de validation
 * - `registration_document_uploaded` sur upload réussi
 * - `registration_ai_scan_used` / `registration_ai_scan_failed` pour le scan IA
 * - `registration_submitted` (avec `total_time_ms`) sur soumission
 * - `registration_abandoned` (best-effort) sur fermeture d'onglet sans soumission
 *
 * Voir `apps/citizen-web/docs/registration-tracking.md` pour la liste des
 * Funnel Insights PostHog construits sur ces events.
 */

import type { FieldErrors } from "react-hook-form";
import { useCallback, useEffect, useRef } from "react";

import {
	type AnalyticsEvents,
	type RegistrationFlowType,
	captureEvent,
	captureEventInstant,
} from "@/lib/analytics";

interface UseRegistrationAnalyticsArgs {
	flowType: RegistrationFlowType;
	step: number;
	steps: { stepId: string }[];
}

interface UseRegistrationAnalyticsReturn {
	trackStepCompleted: () => void;
	trackStepBack: (toStepIndex: number) => void;
	trackValidationError: (fieldPaths: string[]) => void;
	trackDocumentUploaded: (documentType: string) => void;
	trackAiScanUsed: (
		props: Omit<AnalyticsEvents["registration_ai_scan_used"], "flow_type">,
	) => void;
	trackAiScanFailed: (
		props: Omit<AnalyticsEvents["registration_ai_scan_failed"], "flow_type">,
	) => void;
	trackSubmitted: (
		props: Omit<AnalyticsEvents["registration_submitted"], "flow_type" | "total_time_ms">,
	) => void;
}

/**
 * Aplatit les erreurs react-hook-form en chemins de champs dot-notation,
 * ex: `{ basicInfo: { firstName: { message: "..." } } }` → `["basicInfo.firstName"]`.
 * Limité à 20 entrées pour éviter de polluer PostHog si le form en a beaucoup.
 */
export function getInvalidFieldPaths(errors: FieldErrors): string[] {
	const paths: string[] = [];
	const visit = (node: unknown, prefix: string) => {
		if (paths.length >= 20) return;
		if (!node || typeof node !== "object") return;
		// react-hook-form ajoute `message`/`type`/`ref` sur les nœuds feuille
		if ("message" in (node as Record<string, unknown>)) {
			paths.push(prefix);
			return;
		}
		for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
			if (key === "ref" || key === "type" || key === "message") continue;
			visit(child, prefix ? `${prefix}.${key}` : key);
		}
	};
	visit(errors, "");
	return paths;
}

export function useRegistrationAnalytics({
	flowType,
	step,
	steps,
}: UseRegistrationAnalyticsArgs): UseRegistrationAnalyticsReturn {
	const totalSteps = steps.length;
	const currentStepId = steps[step]?.stepId ?? "unknown";

	// Refs pour le timing
	const formStartedAtRef = useRef<number>(Date.now());
	const stepEnteredAtRef = useRef<number>(Date.now());
	const submittedRef = useRef<boolean>(false);
	const startedRef = useRef<boolean>(false);

	// Snapshot du step courant pour les handlers d'abandon
	const lastStepRef = useRef<{
		index: number;
		id: string;
		total: number;
		flowType: RegistrationFlowType;
	}>({
		index: step,
		id: currentStepId,
		total: totalSteps,
		flowType,
	});

	useEffect(() => {
		lastStepRef.current = {
			index: step,
			id: currentStepId,
			total: totalSteps,
			flowType,
		};
	}, [step, currentStepId, totalSteps, flowType]);

	// Émission de `registration_started` une seule fois au mount
	useEffect(() => {
		if (startedRef.current) return;
		if (totalSteps === 0) return; // attend que `steps` soit prêt
		startedRef.current = true;
		formStartedAtRef.current = Date.now();
		stepEnteredAtRef.current = Date.now();
		captureEvent("registration_started", {
			flow_type: flowType,
			total_steps: totalSteps,
		});
	}, [flowType, totalSteps]);

	// Émission de `registration_step_viewed` à chaque changement de step
	useEffect(() => {
		if (!currentStepId || currentStepId === "unknown") return;
		stepEnteredAtRef.current = Date.now();
		captureEvent("registration_step_viewed", {
			flow_type: flowType,
			step_name: currentStepId,
			step_index: step,
			total_steps: totalSteps,
		});
	}, [step, currentStepId, flowType, totalSteps]);

	// Best-effort : émettre `registration_abandoned` si l'utilisateur quitte sans soumettre.
	useEffect(() => {
		const emitAbandon = () => {
			if (submittedRef.current) return;
			if (!startedRef.current) return;
			const snap = lastStepRef.current;
			const completionPct =
				snap.total > 0 ? Math.round((snap.index / snap.total) * 100) : 0;
			captureEventInstant("registration_abandoned", {
				flow_type: snap.flowType,
				last_step: snap.id,
				last_step_index: snap.index,
				total_steps: snap.total,
				completion_pct: completionPct,
				time_in_form_ms: Date.now() - formStartedAtRef.current,
			});
		};

		const onBeforeUnload = () => emitAbandon();
		const onVisibilityChange = () => {
			if (document.visibilityState === "hidden") emitAbandon();
		};

		window.addEventListener("beforeunload", onBeforeUnload);
		document.addEventListener("visibilitychange", onVisibilityChange);
		return () => {
			window.removeEventListener("beforeunload", onBeforeUnload);
			document.removeEventListener("visibilitychange", onVisibilityChange);
		};
	}, []);

	const trackStepCompleted = useCallback(() => {
		if (!currentStepId || currentStepId === "unknown") return;
		const timeOnStepMs = Date.now() - stepEnteredAtRef.current;
		captureEvent("registration_step_completed", {
			flow_type: flowType,
			step_name: currentStepId,
			step_index: step,
			total_steps: totalSteps,
			time_on_step_ms: timeOnStepMs,
		});
	}, [flowType, currentStepId, step, totalSteps]);

	const trackStepBack = useCallback(
		(toStepIndex: number) => {
			const fromId = currentStepId;
			const toId = steps[toStepIndex]?.stepId ?? "unknown";
			captureEvent("registration_step_back", {
				flow_type: flowType,
				from_step: fromId,
				to_step: toId,
				from_step_index: step,
			});
		},
		[flowType, currentStepId, steps, step],
	);

	const trackValidationError = useCallback(
		(fieldPaths: string[]) => {
			captureEvent("registration_validation_error", {
				flow_type: flowType,
				step_name: currentStepId,
				step_index: step,
				field_paths: fieldPaths,
				error_count: fieldPaths.length,
			});
		},
		[flowType, currentStepId, step],
	);

	const trackDocumentUploaded = useCallback(
		(documentType: string) => {
			captureEvent("registration_document_uploaded", {
				flow_type: flowType,
				document_type: documentType,
			});
		},
		[flowType],
	);

	const trackAiScanUsed = useCallback(
		(props: Omit<AnalyticsEvents["registration_ai_scan_used"], "flow_type">) => {
			captureEvent("registration_ai_scan_used", {
				flow_type: flowType,
				...props,
			});
		},
		[flowType],
	);

	const trackAiScanFailed = useCallback(
		(props: Omit<AnalyticsEvents["registration_ai_scan_failed"], "flow_type">) => {
			captureEvent("registration_ai_scan_failed", {
				flow_type: flowType,
				...props,
			});
		},
		[flowType],
	);

	const trackSubmitted = useCallback(
		(
			props: Omit<
				AnalyticsEvents["registration_submitted"],
				"flow_type" | "total_time_ms"
			>,
		) => {
			submittedRef.current = true;
			captureEvent("registration_submitted", {
				flow_type: flowType,
				total_time_ms: Date.now() - formStartedAtRef.current,
				...props,
			});
		},
		[flowType],
	);

	return {
		trackStepCompleted,
		trackStepBack,
		trackValidationError,
		trackDocumentUploaded,
		trackAiScanUsed,
		trackAiScanFailed,
		trackSubmitted,
	};
}
