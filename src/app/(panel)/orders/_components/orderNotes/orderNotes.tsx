"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/app/_components/icon/icons";
import Button from "@/app/_components/ui/button/button";
import { toast } from "@/store/notification.store";
import { AdminNote } from "@/types/order.type";
import { toPersianDigits } from "@/utils/digits";
import { formatDateTime } from "@/utils/format";
import { withMappedError } from "@/utils/withMappedError";
import { OrdersEndpoints } from "../../_api/ordersEndpoints";

const MAX = 1000;

/** Internal notes (`POST /admin/orders/{code}/notes`) — the team's log on an order; shoppers never see them. */
export default function OrderNotes({ code, notes }: { code: string; notes: AdminNote[] }) {
	const queryClient = useQueryClient();
	const [text, setText] = useState("");

	const add = useMutation({
		mutationFn: (value: string) => withMappedError(() => OrdersEndpoints.addNote(code, value)),
		meta: { showNotification: true },
		onSuccess: () => {
			setText("");
			toast("یادداشت ثبت شد", { icon: "check" });
			queryClient.invalidateQueries({ queryKey: ["orders", "detail", code] });
		},
	});

	const submit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const value = text.trim();
		if (value) add.mutate(value);
	};

	return (
		<section className="icard">
			<h3>
				<Icon name="edit" /> یادداشت داخلی
			</h3>
			{!!notes.length && (
				<ul className="note-list" style={{ marginBottom: 12 }}>
					{[...notes].reverse().map((n) => (
						<li key={n.id}>
							{n.text}
							<small>
								{n.author} · {formatDateTime(n.createdAt)}
							</small>
						</li>
					))}
				</ul>
			)}
			<form onSubmit={submit} className="stack" style={{ gap: 8 }}>
				<textarea
					className="textarea"
					style={{ minHeight: 80 }}
					aria-label="یادداشت جدید"
					placeholder="مثلاً: مشتری تماس گرفت، ارسال فوری خواست."
					maxLength={MAX}
					value={text}
					onChange={(e) => setText(e.target.value)}
				/>
				<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
					<small className="muted">
						{toPersianDigits(text.length)} / {toPersianDigits(MAX)}
					</small>
					<Button type="submit" size="sm" variant="soft" isLoading={add.isPending} disabled={!text.trim()} style={{ marginInlineStart: "auto" }}>
						ثبت یادداشت
					</Button>
				</div>
			</form>
		</section>
	);
}
