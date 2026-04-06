import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useState,
} from "react";

/**
 * Form fill data structure
 * Used by AI assistant to pre-fill forms across the application
 */
export type FormFillData = {
	formId: string;
	fields: Record<string, unknown>;
	timestamp: number;
};

type FormFillContextType = {
	pendingFill: FormFillData | null;
	setFormFill: (data: FormFillData) => void;
	consumeFormFill: (formId: string) => FormFillData | null;
	clearFormFill: () => void;
};

const FormFillContext = createContext<FormFillContextType | null>(null);

export function FormFillProvider({ children }: { children: ReactNode }) {
	const [pendingFill, setPendingFill] = useState<FormFillData | null>(null);

	const setFormFill = useCallback((data: FormFillData) => {
		console.log("[FormFill] Setting fill data:", data);
		setPendingFill(data);
	}, []);

	const consumeFormFill = useCallback(
		(formId: string): FormFillData | null => {
			if (!pendingFill) return null;

			// Check if the formId matches (exact or parent match)
			// e.g., "profile.identity" matches "profile" and "profile.identity"
			if (
				pendingFill.formId === formId ||
				pendingFill.formId.startsWith(`${formId}.`)
			) {
				console.log("[FormFill] Consuming fill data for:", formId);
				const data = pendingFill;
				setPendingFill(null);
				return data;
			}

			return null;
		},
		[pendingFill],
	);

	const clearFormFill = useCallback(() => {
		setPendingFill(null);
	}, []);

	return (
		<FormFillContext.Provider
			value={{ pendingFill, setFormFill, consumeFormFill, clearFormFill }}
		>
			{children}
		</FormFillContext.Provider>
	);
}

export function useFormFill() {
	const context = useContext(FormFillContext);
	if (!context) {
		throw new Error("useFormFill must be used within a FormFillProvider");
	}
	return context;
}

/**
 * Optional hook that returns null if outside provider
 * Useful for components that may or may not be in the form fill context
 */
export function useFormFillOptional() {
	return useContext(FormFillContext);
}
