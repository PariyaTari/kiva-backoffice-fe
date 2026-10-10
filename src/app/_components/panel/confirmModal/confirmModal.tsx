"use client";

import { ReactNode } from "react";
import Modal from "@/app/_components/ui/modal/modal";
import Button from "@/app/_components/ui/button/button";
import ModalHead from "../modalHead/modalHead";

type ConfirmModalProps = {
	open: boolean;
	onClose: () => void;
	title: string;
	text?: ReactNode;
	icon?: string;
	/** `danger` for archive / delete / reject. */
	tone?: "default" | "danger";
	confirmLabel: string;
	/** `isPending` of the mutation the confirm runs. */
	loading?: boolean;
	confirmDisabled?: boolean;
	onConfirm: () => void;
	/** Extra fields (a reason, a note) between the text and the buttons. */
	children?: ReactNode;
};

/**
 * «مطمئنی؟» — one question, one action. The caller owns the mutation: it closes the modal in `onSuccess`
 * (and invalidates its list); a failure stays here with its toast so the action can be tried again.
 */
export default function ConfirmModal({
	open,
	onClose,
	title,
	text,
	icon = "info",
	tone = "default",
	confirmLabel,
	loading = false,
	confirmDisabled = false,
	onConfirm,
	children,
}: ConfirmModalProps) {
	return (
		<Modal open={open} onClose={loading ? () => undefined : onClose} width={460}>
			<ModalHead icon={icon} title={title} tone={tone} />
			<div className="m-body">
				{text && <p style={{ color: "var(--ink-70)", fontSize: 14 }}>{text}</p>}
				{children}
			</div>
			<div className="m-foot">
				<Button variant="white" onClick={onClose} disabled={loading}>
					انصراف
				</Button>
				<Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} isLoading={loading} disabled={confirmDisabled}>
					{confirmLabel}
				</Button>
			</div>
		</Modal>
	);
}
