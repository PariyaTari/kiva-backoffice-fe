/** Small collision-resistant id for client-only entities (toasts, form rows). */
export function generateID(): string {
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
