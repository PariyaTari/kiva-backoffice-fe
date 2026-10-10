"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/app/_components/common/logo/logo";
import { useAuthStore } from "@/store/auth.store";
import { AuthResponse } from "@/types/user.type";
import AuthArt from "../_components/authArt/authArt";
import { SentCode } from "../_types/auth.type";
import OtpStep from "./_components/otpStep/otpStep";
import PhoneStep from "./_components/phoneStep/phoneStep";

type LoginStep = "phone" | "otp";

/** Only same-site paths — `?next=//evil.com` must never become an open redirect. */
const safeNext = (value: string | null) => (value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/login") ? value : "/");

/**
 * `/login?next=…` — phone → OTP, then back to `next`. No name step: panel accounts are existing ones; a number
 * without a panel role lands on the shell's «دسترسی نداری».
 */
export default function LoginPage() {
	const router = useRouter();
	const next = safeNext(useSearchParams().get("next"));
	const hydrated = useAuthStore((s) => s.hydrated);
	const signedIn = useAuthStore((s) => !!s.accessToken);
	const setSession = useAuthStore((s) => s.setSession);

	const [step, setStep] = useState<LoginStep>("phone");
	const [phone, setPhone] = useState("");
	const [sent, setSent] = useState<SentCode | null>(null);

	// already signed in → straight on (only before this visit's own login started)
	useEffect(() => {
		if (hydrated && signedIn && step === "phone") router.replace(next);
	}, [hydrated, signedIn, step, next, router]);

	const verified = (res: AuthResponse) => {
		setSession(res.accessToken, res.user);
		setTimeout(() => router.replace(next), 450);
	};

	return (
		<main className="auth">
			<div className="container auth-grid">
				<AuthArt />
				<div className="auth-card">
					<Logo className="logo" />
					{step === "phone" && (
						<PhoneStep
							initialPhone={phone}
							onSent={(value, res) => {
								setPhone(value);
								setSent(res);
								setStep("otp");
							}}
						/>
					)}
					{step === "otp" && sent && <OtpStep phone={phone} sent={sent} onEdit={() => setStep("phone")} onVerified={verified} />}
				</div>
			</div>
		</main>
	);
}
