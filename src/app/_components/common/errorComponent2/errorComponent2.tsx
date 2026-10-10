"use client";

import classNames from "classnames";
import { Icon } from "@/app/_components/icon/icons";
import { copyText } from "@/utils/clipboard";
import { ErrorComponentProps } from "./errorComponent2.type";

const COMPACT_BELOW = 72;
const TICKET_LABEL = "کپی برای تیم فنی";

/**
 * Inline error block of a failed query (error-ui standard) — buttons come from `toErrorView`.
 * The panel has no ticket form: «ثبت تیکت» copies the message (with its «کد پیگیری» on server errors) for the tech team.
 */
export default function ErrorComponent2({
	retryable,
	ticketAble,
	errorText,
	executeFunction,
	variant = "bordered",
	height,
	loading = false,
}: ErrorComponentProps) {
	const copyForTicket = () => copyText(errorText, "متن خطا کپی شد");

	if (height !== undefined && height < COMPACT_BELOW) {
		return (
			<div className="kv-err bar" role="alert" style={{ minHeight: height }}>
				<span className="ei">
					<Icon name="info" />
				</span>
				<p>{errorText}</p>
				<span className="acts">
					{retryable && (
						<button type="button" className="icon-btn" onClick={executeFunction} disabled={loading} aria-label="تلاش مجدد" title="تلاش مجدد">
							<Icon name="refresh" />
						</button>
					)}
					{ticketAble && (
						<button type="button" className="icon-btn" onClick={copyForTicket} aria-label={TICKET_LABEL} title={TICKET_LABEL}>
							<Icon name="copy" />
						</button>
					)}
				</span>
			</div>
		);
	}

	return (
		<div className={classNames("kv-err", { bordered: variant === "bordered" })} role="alert" style={height ? { minHeight: height } : undefined}>
			<span className="ei">
				<Icon name="info" />
			</span>
			<p>{errorText}</p>
			{(retryable || ticketAble) && (
				<div className="acts">
					{retryable && (
						<button type="button" className={classNames("btn btn-primary btn-sm", { loading })} onClick={executeFunction} disabled={loading}>
							<Icon name="refresh" /> تلاش مجدد
						</button>
					)}
					{ticketAble && (
						<button type="button" className="btn btn-outline btn-sm" onClick={copyForTicket}>
							<Icon name="copy" /> {TICKET_LABEL}
						</button>
					)}
				</div>
			)}
		</div>
	);
}
