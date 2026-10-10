import { Icon } from "@/app/_components/icon/icons";
import { OrderEvent } from "@/types/order.type";
import { formatDateTime } from "@/utils/format";

/** `.tl` — every status the order went through, newest first, with the note each change carried. */
export default function OrderTimeline({ events }: { events: OrderEvent[] }) {
	const list = [...events].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
	return (
		<section className="icard">
			<h3>
				<Icon name="clock" /> تاریخچه
			</h3>
			{list.length ? (
				<ul className="tl">
					{list.map((e, i) => (
						<li key={`${e.status}${e.at}`} className={i === 0 ? "on" : undefined}>
							<b>{e.label}</b>
							<small>
								{formatDateTime(e.at)}
								{e.note ? ` · ${e.note}` : ""}
							</small>
						</li>
					))}
				</ul>
			) : (
				<p className="muted" style={{ fontSize: 13 }}>
					هنوز اتفاقی ثبت نشده.
				</p>
			)}
		</section>
	);
}
