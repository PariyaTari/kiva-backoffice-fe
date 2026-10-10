import classNames from "classnames";
import { Icon } from "@/app/_components/icon/icons";
import { AdminOrder } from "@/types/order.type";
import { formatDateTime } from "@/utils/format";

/** The design's 4-step `.stepper` (ثبت ← عکس ← ارسال ← تحویل) from the server's `progress`, with the date of each step. */
export default function OrderProgress({ progress }: { progress: AdminOrder["progress"] }) {
	return (
		<div className="stepper">
			{progress.steps.map((s) => (
				<div key={s.key} className={classNames("step", { done: s.state === "DONE", cur: s.state === "CURRENT" })}>
					<span className="dot">
						<Icon name={s.icon || "check"} />
					</span>
					{s.label}
					<small>{s.at ? formatDateTime(s.at) : "—"}</small>
				</div>
			))}
		</div>
	);
}
