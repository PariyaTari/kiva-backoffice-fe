"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PANEL_ERRORS as ERROR_BEHAVIOUR } from "@/app/(panel)/_utils/apiError";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import { Icon } from "@/app/_components/icon/icons";
import IconSelect from "@/app/_components/panel/iconSelect/iconSelect";
import JalaliDateTimeInput from "@/app/_components/panel/jalaliDateTimeInput/jalaliDateTimeInput";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import Button from "@/app/_components/ui/button/button";
import Input from "@/app/_components/ui/input/input";
import { toast } from "@/store/notification.store";
import { Announcement } from "@/types/marketing.type";
import { toErrorView } from "@/utils/apiError";
import { toPersianDigits } from "@/utils/digits";
import { fieldErrorsOf } from "@/utils/fieldErrors";
import { withMappedError } from "@/utils/withMappedError";
import { AnnouncementsEndpoints } from "../../_api/announcementsEndpoints";

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const blank = (): Announcement => ({ icon: "info", text: "", url: null, sortOrder: 0, startsAt: null, endsAt: null });

/** `/announcements` — the storefront's rotating top bar: edit, reorder, add, remove, then save the whole list. */
export default function AnnouncementsView() {
	const queryClient = useQueryClient();
	const current = useQuery({
		queryKey: ["announcements", "current"],
		queryFn: () => withMappedError(() => AnnouncementsEndpoints.getCurrent()),
		meta: { showNotificationOnRefetch: true },
	});

	const [base, setBase] = useState<Announcement[] | null>(null);
	const [list, setList] = useState<Announcement[]>([]);
	const dirty = base !== null && !same(list, base);
	// the list arrived (or was read again) and nothing is being edited — show it
	if (current.data && !dirty && !same(current.data, base)) {
		setBase(current.data);
		setList(current.data);
	}

	const save = useMutation({
		mutationFn: () => withMappedError(() => AnnouncementsEndpoints.replaceAll(list.map((a, i) => ({ ...a, text: a.text.trim(), sortOrder: i + 1 })))),
		meta: { showNotification: true },
		onSuccess: (saved) => {
			toast("نوار اطلاعیه ذخیره شد", { icon: "check" });
			setBase(saved);
			setList(saved);
			queryClient.invalidateQueries({ queryKey: ["announcements"] });
		},
	});

	const patch = (i: number, change: Partial<Announcement>) => setList((l) => l.map((a, k) => (k === i ? { ...a, ...change } : a)));
	const move = (i: number, by: number) =>
		setList((l) => {
			const next = [...l];
			const [row] = next.splice(i, 1);
			next.splice(i + by, 0, row);
			return next;
		});
	const errors = fieldErrorsOf(save.error);
	const emptyText = list.some((a) => !a.text.trim());
	const currentError = toErrorView(ERROR_BEHAVIOUR, current.error, "دریافت نوار اطلاعیه با خطا مواجه شد.");

	return (
		<>
			<PageHead title="نوار اطلاعیه" subtitle="پیام‌های چرخان بالای سایت، به همین ترتیب. ذخیره کل لیست را جایگزین می‌کند." />
			<p className="note cream" style={{ marginBottom: 8 }}>
				فروشگاه فعلاً نوار اطلاعیه را از تنظیمات ثابت خودش می‌خواند (FEATURES §۶)؛ تغییرات تا وصل شدن فرانت به `GET /config` در سایت دیده نمی‌شود.
			</p>
			<p className="note danger" style={{ marginBottom: 14 }}>
				این لیست از `GET /config` خوانده می‌شود که فقط پیام‌های «الان در حال نمایش» را دارد (خواندن ادمین در کانترکت نیست)؛ پیامی که زمانش نرسیده یا تمام شده این‌جا نیست و
				با ذخیره پاک می‌شود.
			</p>

			{current.isLoading ? (
				<Loading />
			) : !!currentError ? (
				<ErrorComponent retryable={currentError.retryable} ticketAble={currentError.ticketAble} errorText={currentError.errorText} executeFunction={() => current.refetch()} loading={current.isFetching} />
			) : (
				<>
					<div className="rows">
						{list.map((a, i) => (
							<div key={i} className="row-card">
								<div className="rh">
									<span className="tag">{toPersianDigits(i + 1)}</span>
									<b>{a.text || "پیام جدید"}</b>
									<span className="acts">
										<button type="button" className="icon-btn" aria-label="بالاتر" disabled={!i} onClick={() => move(i, -1)}>
											<Icon name="up" />
										</button>
										<button type="button" className="icon-btn" aria-label="پایین‌تر" disabled={i === list.length - 1} onClick={() => move(i, 1)}>
											<Icon name="down" />
										</button>
										<button type="button" className="icon-btn del" aria-label="حذف" onClick={() => setList((l) => l.filter((_, k) => k !== i))}>
											<Icon name="trash" />
										</button>
									</span>
								</div>
								<div className="form-grid">
									<Input label="متن" maxLength={200} value={a.text} onChange={(e) => patch(i, { text: e.target.value })} error={(!a.text.trim() && save.isError && "متن لازم است.") || errors[`[${i}].text`]} wrapperClassName="full" />
									<Input label="لینک" labelNote="اختیاری" direction="ltr" value={a.url ?? ""} onChange={(e) => patch(i, { url: e.target.value || null })} placeholder="/faq#reserve" />
									<div className="field">
										<label>نمایش از / تا</label>
										<div style={{ display: "grid", gap: 6 }}>
											<JalaliDateTimeInput value={a.startsAt} onChange={(d) => patch(i, { startsAt: d })} ariaLabel="نمایش از" />
											<JalaliDateTimeInput value={a.endsAt} onChange={(d) => patch(i, { endsAt: d })} defaultTime="23:59" ariaLabel="نمایش تا" />
										</div>
									</div>
								</div>
								<IconSelect value={a.icon} onChange={(icon) => patch(i, { icon: icon ?? "info" })} />
							</div>
						))}
						<button type="button" className="add-row" onClick={() => setList((l) => [...l, blank()])}>
							<Icon name="plus" /> افزودن پیام
						</button>
					</div>
					<div className="savebar">
						<span className="msg">{dirty ? "تغییرات ذخیره‌نشده داری." : "همه‌چیز ذخیره است."}</span>
						{dirty && (
							<Button variant="white" size="sm" onClick={() => base && setList(base)} disabled={save.isPending}>
								برگرداندن
							</Button>
						)}
						<Button size="sm" onClick={() => save.mutate()} isLoading={save.isPending} disabled={!dirty || emptyText}>
							ذخیره‌ی لیست
						</Button>
					</div>
				</>
			)}
		</>
	);
}
