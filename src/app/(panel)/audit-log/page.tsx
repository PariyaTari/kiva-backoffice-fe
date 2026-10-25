import type { Metadata } from "next";
import AuditLogView from "./_components/auditLogView/auditLogView";

export const metadata: Metadata = { title: "لاگ تغییرات" };

/** `/audit-log` — who changed what in the panel, and when (ADMIN only). */
export default function AuditLogPage() {
	return <AuditLogView />;
}
