"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AuditEndpoints } from "@/app/(panel)/_api/auditEndpoints";
import { PANEL_ERRORS as ERROR_BEHAVIOUR } from "@/app/(panel)/_utils/apiError";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import { Icon } from "@/app/_components/icon/icons";
import { useCan } from "@/hooks/useCan";
import { AuditEntityType } from "@/types/audit.type";
import { toErrorView } from "@/utils/apiError";
import { formatDateTime, formatPhone, relativeTime } from "@/utils/format";
import { withMappedError } from "@/utils/withMappedError";
import AuditChanges from "../auditChanges/auditChanges";

const SIZE = 8;

type AuditHistoryProps = {
	entityType: AuditEntityType;
	entityId: string;
	/**
	 * The page's own detail key (`["orders", "detail", code]`) — the card's key sits under it, so whatever refreshes the
	 * page after a change refreshes its history too.
	 */
	parentKey: readonly unknown[];
};

/** «تاریخچه‌ی تغییرات» of one thing (ADMIN only — the change log shows everyone's phone): the last few rows, then a link to all. */
export default function AuditHistory({ entityType, entityId, parentKey }: AuditHistoryProps) {
	const can = useCan();
	const allowed = can("auditLog");

	const entries = useQuery({
		queryKey: [...parentKey, "audit"],
		queryFn: () => withMappedError(() => AuditEndpoints.getEntries({ entityType, entityId }, 1, SIZE)),
		enabled: allowed,
		meta: { showNotificationOnRefetch: true },
	});

	if (!allowed) return null;
	const entriesError = toErrorView(ERROR_BEHAVIOUR, entries.error, "دریافت تاریخچه‌ی تغییرات با خطا مواجه شد.");

	return (
		<section className="icard">
			<h3>
				<Icon name="receipt" /> تاریخچه‌ی تغییرات
				{!!entries.data?.meta.totalItems && (
					<span className="acts">
						<Link href={`/audit-log?entityType=${entityType}&entityId=${encodeURIComponent(entityId)}`} className="btn btn-link btn-sm">
							همه
						</Link>
					</span>
				)}
			</h3>
			{entries.isLoading ? (
				<p className="muted" style={{ fontSize: 13 }}>
					در حال دریافت…
				</p>
			) : !!entriesError ? (
				<ErrorComponent
					retryable={entriesError.retryable}
					ticketAble={entriesError.ticketAble}
					errorText={entriesError.errorText}
					executeFunction={() => entries.refetch()}
					variant="text"
					height={56}
					loading={entries.isFetching}
				/>
			) : !entries.error && !!entries.data ? (
				entries.data.items.length ? (
					<ul className="tl">
						{entries.data.items.map((e, i) => (
							<li key={e.id} className={i === 0 ? "on" : undefined}>
								<b>{e.summary}</b>
								<small title={formatDateTime(e.at)}>
									{relativeTime(e.at)} · {e.actor.fullName || <span className="ltr">{formatPhone(e.actor.phone)}</span>}
								</small>
								<AuditChanges changes={e.changes} />
							</li>
						))}
					</ul>
				) : (
					<p className="muted" style={{ fontSize: 13 }}>
						در ۹۰ روز گذشته کسی در پنل این را تغییر نداده.
					</p>
				)
			) : null}
		</section>
	);
}
