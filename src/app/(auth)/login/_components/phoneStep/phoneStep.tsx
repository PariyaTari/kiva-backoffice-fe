"use client";

import { FormEvent, useState } from "react";
import classNames from "classnames";
import { useMutation } from "@tanstack/react-query";
import { Icon } from "@/app/_components/icon/icons";
import { toast } from "@/store/notification.store";
import { digitsOnly, toPersianDigits } from "@/utils/digits";
import { isResendTooSoonError, otpErrorText, retryAfterOf } from "@/utils/otp";
import { withMappedError } from "@/utils/withMappedError";
import { AuthEndpoints } from "../../../_api/authEndpoints";
import { SentCode } from "../../../_types/auth.type";

const PHONE = /^09\d{9}$/;
const PHONE_ERROR = "شماره موبایل باید ۱۱ رقم باشه و با ۰۹ شروع بشه";
/** The contract's code length — what the code step shows when it resumes after `OTP_RESEND_TOO_SOON`. */
const OTP_LENGTH = 5;

type PhoneStepProps = {
	/** Kept when the person comes back with «ویرایش». */
	initialPhone: string;
	onSent: (phone: string, sent: SentCode) => void;
};

/** Step ۱ «ورود به پنل» — mobile number → an SMS code (the storefront's login step). */
export default function PhoneStep({ initialPhone, onSent }: PhoneStepProps) {
	const [phone, setPhone] = useState(initialPhone);
	const [error, setError] = useState<string | null>(null);

	const send = useMutation({
		mutationFn: (value: string) => withMappedError(() => AuthEndpoints.sendOtp(value)),
		onSuccess: (res, value) => {
			toast("کد تأیید پیامک شد", { icon: "mail" });
			onSent(res.phone || value, res);
		},
		// a rejected number is an answer for the field; anything else (rate limit, network) is a toast
		onError: (e, value) => {
			const field = e.errorDetails?.find((d) => d.field === "phone");
			if (field || e.code === "PHONE_INVALID") return setError(field?.message ?? e.description);
			// a code went to this number moments ago (back from «ویرایش») — on to it, the resend timer running
			const wait = retryAfterOf(e);
			if (isResendTooSoonError(e) && wait) {
				toast(otpErrorText(e), { icon: "mail", type: "info" });
				return onSent(value, { codeLength: OTP_LENGTH, resendAvailableInSeconds: wait });
			}
			toast(otpErrorText(e), { type: "error" });
		},
	});

	const submit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!PHONE.test(phone)) {
			setError(PHONE_ERROR);
			document.getElementById("phone")?.focus();
			return;
		}
		send.mutate(phone);
	};

	return (
		<form className="astep on" id="s1" noValidate onSubmit={submit}>
			<h1>ورود به پنل</h1>
			<p>شماره موبایلت رو وارد کن؛ کد تأیید برات پیامک می‌شه.</p>
			<div className={classNames("field", { error: !!error })} id="phField">
				<label htmlFor="phone" className="sr-only">
					شماره موبایل
				</label>
				<div className="phone-in">
					<input
						className="input"
						id="phone"
						inputMode="numeric"
						autoComplete="tel"
						maxLength={11}
						placeholder="۰۹۱۲ ۳۴۵ ۶۷۸۹"
						autoFocus
						value={toPersianDigits(phone)}
						aria-invalid={!!error || undefined}
						onChange={(e) => {
							setPhone(digitsOnly(e.target.value, 11).en);
							setError(null);
						}}
					/>
					<span className="pre">
						<Icon name="phone" />
					</span>
				</div>
				<span className="err">{error ?? PHONE_ERROR}</span>
			</div>
			<button type="submit" className={classNames("btn btn-primary btn-lg btn-block", { loading: send.isPending })} style={{ marginTop: 18 }} id="sendBtn">
				دریافت کد تأیید <Icon name="arrow" />
			</button>
			<p className="terms">نشست پنل ۱۲ ساعت بعد از آخرین استفاده تمام می‌شود.</p>
		</form>
	);
}
