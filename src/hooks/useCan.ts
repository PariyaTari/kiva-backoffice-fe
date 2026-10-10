import { useAuthStore } from "@/store/auth.store";
import { canAccess, PanelSection } from "@/utils/roles";

/** `can("refunds")` — whether to draw a section or button for the signed-in person (display only; the server decides). */
export function useCan() {
	const roles = useAuthStore((s) => s.user?.roles);
	return (section: PanelSection) => canAccess(roles ?? [], section);
}
