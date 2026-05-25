import type { FieldCondition } from "@/components/admin/FormBuilder";

/**
 * Evaluate a condition against form data
 * Returns true if the condition is met (field/section should be visible)
 * Returns true if no condition is provided (unconditionally visible)
 */
export function evaluateCondition(
	condition: FieldCondition | undefined,
	formData: Record<string, unknown>,
): boolean {
	// No condition = always visible
	if (!condition) return true;

	const { fieldPath, operator, value } = condition;

	// Get the field value from form data using path (e.g., "sectionId.fieldId")
	const fieldValue = getValueByPath(formData, fieldPath);

	switch (operator) {
		case "equals":
			return fieldValue === value;

		case "notEquals":
			return fieldValue !== value;

		case "contains":
			if (typeof fieldValue === "string" && typeof value === "string") {
				return fieldValue.toLowerCase().includes(value.toLowerCase());
			}
			if (Array.isArray(fieldValue)) {
				return fieldValue.includes(value);
			}
			return false;

		case "isEmpty":
			return (
				fieldValue === undefined ||
				fieldValue === null ||
				fieldValue === "" ||
				(Array.isArray(fieldValue) && fieldValue.length === 0)
			);

		case "isNotEmpty":
			return (
				fieldValue !== undefined &&
				fieldValue !== null &&
				fieldValue !== "" &&
				!(Array.isArray(fieldValue) && fieldValue.length === 0)
			);

		case "greaterThan":
			if (typeof fieldValue === "number" && typeof value === "number") {
				return fieldValue > value;
			}
			return false;

		case "lessThan":
			if (typeof fieldValue === "number" && typeof value === "number") {
				return fieldValue < value;
			}
			return false;

		default:
			return true;
	}
}

/**
 * Get a value from a nested object using a dot-separated path
 * e.g., getValueByPath({ a: { b: 1 } }, "a.b") => 1
 */
function getValueByPath(obj: Record<string, unknown>, path: string): unknown {
	const keys = path.split(".");
	let current: unknown = obj;

	for (const key of keys) {
		if (current === null || current === undefined) {
			return undefined;
		}
		if (typeof current !== "object") {
			return undefined;
		}
		current = (current as Record<string, unknown>)[key];
	}

	return current;
}

/**
 * Filter visible sections based on conditions
 */
export function getVisibleSections<T extends { condition?: FieldCondition }>(
	sections: T[],
	formData: Record<string, unknown>,
): T[] {
	return sections.filter((section) =>
		evaluateCondition(section.condition, formData),
	);
}

/**
 * Filter visible fields based on conditions
 */
export function getVisibleFields<T extends { condition?: FieldCondition }>(
	fields: T[],
	formData: Record<string, unknown>,
): T[] {
	return fields.filter((field) => evaluateCondition(field.condition, formData));
}
