"use client";

import { FormEvent, useEffect, useState } from "react";
import classNames from "classnames";
import { useMutation } from "@tanstack/react-query";
import { Icon } from "@/app/_components/icon/icons";
import OtpInput from "@/app/_components/ui/otpInput/otpInput";
import { toast } from "@/store/notification.store";
import { AuthResponse } from "@/types/user.type";
import { toPersianDigits } from "@/utils/digits";
import { formatPhone, pad2 } from "@/utils/format";
import { isDeadOtpError, isResendTooSoonError, otpErrorText, retryAfterOf } from "@/utils/otp";
import { withMappedError } from "@/utils/withMappedError";
import { AuthEndpoints } from "../../../_api/authEndpoints";
import { SentCode } from "../../../_types/auth.type";

/** Testers are told how the mock backend answers — true for the mock only. */
const SHOW_DEMO_NOTE = process.env.NODE_ENV !== "production";
const RING = 2 * Math.PI * 10;
/** A full ring — the resend cooldown; a timer resumed after `OTP_RESEND_TOO_SOON` starts part-way. */
const COOLDOWN_S = 120;

type OtpStepProps = {
	phone: string;
	sent: SentCode;
	onEdit: () => void;
	onVerified: (res: AuthResponse) => void;
};

const timerFor = (seconds: number) => ({ endsAt: Date.now() + seconds * 1000, total: Math.max(1, seconds, COOLDOWN_S) });

/** Step ۲ «کد تأیید رو وارد کن» — the storefront's code boxes, circular resend timer and «تأیید و ورود». */
export default function OtpStep({ phone, sent, onEdit, onVerified }: OtpStepProps) {
	const [timer, setTimer] = useState(() => timerFor(sent.resendAvailableInSeconds));
	const [now, setNow] = useState(() => Date.now());
	const [code, setCode] = useState("");
	const [shake, setShake] = useState(0);
	const [ok, setOk] = useState(false);
	/** Expired, used or tried 5 times — only a new code helps (`OTP_EXPIRED` / `OTP_TOO_MANY_ATTEMPTS`). */
	const [dead, setDead] = useState(false);
	const length = sent.codeLength || 5;
	const left = Math.max(0, Math.ceil((timer.endsAt - now) / 1000));

	// ticks once a second while the resend countdown runs (freezes once verified)
	useEffect(() => {
		if (ok || left <= 0) return;
		const tick = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(tick);
	}, [ok, left]);

	const restartTimer = (seconds: number) => {
		setTimer(timerFor(seconds));
		setNow(Date.now());
	};

	const resend = useMutation({
		mutationFn: () => withMappedError(() => AuthEndpoints.sendOtp(phone)),
		onSuccess: (res) => {
			restartTimer(res.resendAvailableInSeconds);
			setDead(false);
			setCode("");
			toast("کد جدید پیامک شد", { icon: "mail" });
		},
		onError: (e) => {
			const wait = retryAfterOf(e);
			if (isResendTooSoonError(e) && wait) restartTimer(wait);
			toast(otpErrorText(e), { type: isResendTooSoonError(e) ? "info" : "error" });
		},
	});

	const verify = useMutation({
		mutationFn: (value: string) => withMappedError(() => AuthEndpoints.verifyOtp({ phone, code: value })),
		onSuccess: (res) => {
			setOk(true);
			onVerified(res);
		},
		// wrong / dead code: the boxes shake and empty for a new try; the text says how many tries are left or what to do
		onError: (e) => {
			setCode("");
			setShake((n) => n + 1);
			if (isDeadOtpError(e)) setDead(true);
			const field = e.errorDetails?.find((d) => d.field === "code");
			toast(field?.message ?? otpErrorText(e), { type: "error" });
		},
	});

	const submit = (value = code) => {
		if (verify.isPending || ok || dead) return;
		if (!new RegExp(`^\\d{${length}}$`).test(value)) return setShake((n) => n + 1);
		verify.mutate(value);
	};

	return (
		<form
			className="astep on"
			id="s2"
			noValidate
			onSubmit={(e: FormEvent<HTMLFormElement>) => {
				e.preventDefault();
				submit();
			}}
		>
			<h1>کد تأیید رو وارد کن</h1>
			<p>کد {toPersianDigits(length)} رقمی که برات پیامک شد رو بنویس.</p>
			<div className="sent-to">
				<span>
					ارسال شده به <b id="sentTo">{formatPhone(phone)}</b>
				</span>
				<button type="button" id="editPh" onClick={onEdit}>
					<Icon name="edit" />
					ویرایش
				</button>
			</div>
			<OtpInput
				id="otp"
				label="کد تأیید"
				length={length}
				value={code}
				onChange={(next) => {
					setCode(next);
					setShake(0);
				}}
				onComplete={submit}
				error={shake > 0}
				errorKey={shake}
				ok={ok}
				disabled={dead}
				autoFocus
			/>
			<div className="timer" id="timer">
				{left > 0 ? (
					<>
						<svg className="ring" viewBox="0 0 24 24">
							<circle cx="12" cy="12" r="10" fill="none" stroke="#E4D9F3" strokeWidth="2.5" />
							<circle
								cx="12"
								cy="12"
								r="10"
								fill="none"
								stroke="#5B3E8C"
								strokeWidth="2.5"
								strokeLinecap="round"
								strokeDasharray={RING}
								strokeDashoffset={RING * (1 - left / timer.total)}
								transform="rotate(-90 12 12)"
							/>
						</svg>{" "}
						{dead ? "کد جدید تا" : "ارسال مجدد تا"}{" "}
						<b>
							{pad2(Math.floor(left / 60))}:{pad2(left % 60)}
						</b>
					</>
				) : ok ? null : (
					<>
						{dead ? "این کد دیگه کار نمی‌کنه." : "کد رو دریافت نکردی؟"}{" "}
						<button type="button" id="resend" disabled={resend.isPending} onClick={() => resend.mutate()}>
							{dead ? "دریافت کد جدید" : "ارسال مجدد کد"}
						</button>
					</>
				)}
			</div>
			<button type="submit" className={classNames("btn btn-primary btn-lg btn-block", { loading: verify.isPending })} id="verifyBtn" disabled={dead}>
				تأیید و ورود
			</button>
			{SHOW_DEMO_NOTE && <p className="demo">بک‌اند آزمایشی: هر کد ۵ رقمی پذیرفته می‌شه (۰۰۰۰۰ اشتباه، ۱۱۱۱۱ منقضی).</p>}
		</form>
	);
}
