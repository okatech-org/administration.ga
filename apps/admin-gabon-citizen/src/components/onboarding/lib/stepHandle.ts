/**
 * Imperative handle exposed by a step component so the shell can trigger
 * validation + state propagation from its own "Next" button without
 * duplicating nav UI inside each step.
 */
export type StepHandle = {
	/**
	 * Validate the step's form. Returns true if valid (and state was already
	 * propagated via the step's own updateData call). Returns false if
	 * invalid — the shell should not advance.
	 */
	validateAndNext: () => Promise<boolean>;
};
