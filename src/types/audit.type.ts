/** The panel's change log (kiva-openapi.yml 1.21.0 · `GET /admin/audit-log`, ADMIN only). */
import { PageMeta } from "./pageinate";

/** What changed. `MEDIA` is never used — uploads aren't logged. */
export type AuditEntityType =
	| "PRODUCT"
	| "VARIANT"
	| "INVENTORY"
	| "MEDIA"
	| "CATEGORY"
	| "COLOR"
	| "MATERIAL"
	| "ORDER"
	| "RETURN"
	| "REFUND"
	| "DISCOUNT_CODE"
	| "CAMPAIGN"
	| "BANNER"
	| "ANNOUNCEMENT"
	| "TESTIMONIAL"
	| "FAQ"
	| "PAGE"
	| "SETTINGS"
	| "REVIEW"
	| "CONTACT_MESSAGE"
	| "USER"
	| "BLOG_POST";

/** One successful write under `/admin/*` — append-only, kept 90 days. */
export type AuditLogEntry = {
	id: number;
	at: string;
	/** Read from the person's **current** account (full mobile — only ADMIN sees this). */
	actor: { id: number; fullName: string | null; phone: string };
	/** Machine code of the action (an open list — `summary` is enough to show it). */
	action: string;
	entityType: AuditEntityType;
	/** The id or code of the thing (`12`, `KV-218340`, `lilac`, `terms`). */
	entityId: string;
	/** Its name at the time of the change. */
	entityLabel: string | null;
	/** A ready Persian sentence. */
	summary: string;
	/** The fields that changed; `null` for actions without a «from → to» (a delete, an SMS sent). */
	changes: { field: string; from: string | null; to: string | null }[] | null;
	ip: string | null;
};

export type AuditLogList = { items: AuditLogEntry[]; meta: PageMeta };

/** `from` / `to` are Tehran days, both included (`YYYY-MM-DD`). `entityId` works without `entityType` too. */
export type AuditLogFilters = { entityType?: AuditEntityType; entityId?: string; actorId?: number; from?: string; to?: string };
