"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ModalHead from "@/app/_components/panel/modalHead/modalHead";
import Button from "@/app/_components/ui/button/button";
import Checkbox from "@/app/_components/ui/checkbox/checkbox";
import Modal from "@/app/_components/ui/modal/modal";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "@/store/notification.store";
import { AdminCustomer } from "@/types/support.type";
import { PanelRole } from "@/types/user.type";
import { formatPhone } from "@/utils/format";
import { PANEL_ROLES, ROLE_LABEL } from "@/utils/roles";
import { withMappedError } from "@/utils/withMappedError";
import { CustomersEndpoints } from "../../_api/customersEndpoints";

/** What each panel role opens — shown in the roles modal. */
const ROLE_SCOPE: Record<PanelRole, string> = {
	ADMIN: "همه‌ی بخش‌ها، استرداد، تخفیف، تنظیمات، گزارش، نقش‌ها، خبرنامه و لاگ تغییرات",
	CATALOG_MANAGER: "محصول، رنگ، موجودی، دسته، متریال، «موجود شد خبرم کن»",
	OPERATOR: "سفارش‌ها، عکس قبل از ارسال، ارسال، مرجوعی",
	CONTENT_EDITOR: "کمپین، بنر، اطلاعیه، پیام رضایت، بلاگ، FAQ، صفحات",
	SUPPORT: "نظرات، پیام‌های تماس، مشتریان",
};

type RolesModalProps = { customer: AdminCustomer | null; onClose: () => void };

/** `PUT /admin/customers/{id}/roles` (ADMIN) — the person's panel roles; their sessions end so the new roles apply at once. */
export default function RolesModal({ customer, onClose }: RolesModalProps) {
	return (
		<Modal open={!!customer} onClose={onClose} width={520}>
			{customer && <RolesForm key={customer.id} customer={customer} onClose={onClose} />}
		</Modal>
	);
}

function RolesForm({ customer, onClose }: { customer: AdminCustomer; onClose: () => void }) {
	const queryClient = useQueryClient();
	const myId = useAuthStore((s) => s.user?.id);
	const self = customer.id === myId;
	const [roles, setRoles] = useState<PanelRole[]>(customer.roles.filter((r): r is PanelRole => r !== "CUSTOMER"));

	const save = useMutation({
		mutationFn: () => withMappedError(() => CustomersEndpoints.setRoles(customer.id, roles)),
		// the toast carries the server's reason, e.g. the last ADMIN (`ROLE_CHANGE_NOT_ALLOWED`, `meta.reason = LAST_ADMIN`)
		meta: { showNotification: true },
		onSuccess: (c) => {
			toast(`نقش‌های ${c.fullName || formatPhone(c.phone)} ذخیره شد؛ باید دوباره وارد شود`, { icon: "shield" });
			queryClient.invalidateQueries({ queryKey: ["customers"] });
			onClose();
		},
	});

	return (
		<>
			<ModalHead icon="shield" title="نقش‌های پنل" subtitle={`${customer.fullName || "بدون نام"} · ${formatPhone(customer.phone)}`} />
			<div className="m-body">
				{self ? (
					<p className="note danger">نقش‌های خودت را نمی‌توانی عوض کنی؛ از مدیر کل دیگری بخواه.</p>
				) : (
					<p className="note cream">
						با ذخیره، همه‌ی نشست‌های این شخص بسته می‌شود تا با نقش‌های تازه دوباره وارد شود. نقش «مشتری» همیشه می‌ماند. آخرین مدیر کل نقشش را از دست نمی‌دهد.
					</p>
				)}
				<div className="stack" style={{ gap: 10 }}>
					{PANEL_ROLES.map((r) => (
						<div key={r}>
							<Checkbox
								label={<b>{ROLE_LABEL[r]}</b>}
								disabled={self}
								checked={roles.includes(r)}
								onChange={(e) => setRoles((list) => (e.target.checked ? [...list, r] : list.filter((x) => x !== r)))}
							/>
							<small className="muted" style={{ display: "block", marginInlineStart: 30 }}>
								{ROLE_SCOPE[r]}
							</small>
						</div>
					))}
				</div>
			</div>
			<div className="m-foot">
				<Button variant="white" onClick={onClose} disabled={save.isPending}>
					انصراف
				</Button>
				<Button onClick={() => save.mutate()} isLoading={save.isPending} disabled={self}>
					ذخیره‌ی نقش‌ها
				</Button>
			</div>
		</>
	);
}
