"use client";

import { ReactNode, useEffect, useState } from "react";
import { Icon } from "@/app/_components/icon/icons";

type ModalProps = {
	open: boolean;
	onClose: () => void;
	children: ReactNode;
	/** Box width in px (`width:min(Wpx,100%)`); the design default is 520. */
	width?: number;
};

/** Exit transition length of `.modal-box` in the design. */
const LEAVE_MS = 400;

/** Design-system `.modal` — mounted on open, `.on` toggled a frame later so the CSS transition runs. */
export default function Modal({ open, onClose, children, width }: ModalProps) {
	const [mounted, setMounted] = useState(open);
	const [entered, setEntered] = useState(false);

	// sync during render: mount as soon as it opens, drop the "entered" flag as soon as it closes
	if (open && !mounted) setMounted(true);
	if (!open && entered) setEntered(false);

	useEffect(() => {
		if (open) {
			const frame = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
			return () => cancelAnimationFrame(frame);
		}
		const timer = setTimeout(() => setMounted(false), LEAVE_MS);
		return () => clearTimeout(timer);
	}, [open]);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	if (!mounted) return null;

	return (
		<div className={open && entered ? "modal on" : "modal"}>
			<div className="modal-bg" onClick={onClose} />
			<div className="modal-box" role="dialog" aria-modal="true" style={width ? { width: `min(${width}px,100%)` } : undefined}>
				<button type="button" className="icon-btn modal-x" onClick={onClose} aria-label="بستن">
					<Icon name="close" />
				</button>
				{children}
			</div>
		</div>
	);
}
