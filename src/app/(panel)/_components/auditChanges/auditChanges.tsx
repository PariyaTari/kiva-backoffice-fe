import { AuditLogEntry } from "@/types/audit.type";

/** «فیلد: از ← به» of one change-log row; nothing for actions without fields (a delete, an SMS sent). */
export default function AuditChanges({ changes }: { changes: AuditLogEntry["changes"] }) {
	if (!changes?.length) return null;
	return (
		<div className="chg">
			{changes.map((c) => (
				<span key={c.field}>
					<span className="f ltr">{c.field}</span>
					{c.from != null && <span className="v old">{c.from}</span>}
					<span aria-hidden>←</span>
					<span className="v">{c.to ?? "—"}</span>
				</span>
			))}
		</div>
	);
}
