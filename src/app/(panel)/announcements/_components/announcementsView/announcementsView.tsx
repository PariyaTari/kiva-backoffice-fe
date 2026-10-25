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
import UnsavedGuard from "@/app/_components/panel/unsavedGuard/unsavedGuard";
import Badge from "@/app/_components/ui/badge/badge";
import Button from "@/app/_components/ui/button/button";
import Input from "@/app/_components/ui/input/input";
import { toast } from "@/store/notification.store";
import { Announcement, AnnouncementInput } from "@/types/marketing.type";
import { toErrorView } from "@/utils/apiError";
import { toPersianDigits } from "@/utils/digits";
import { fieldErrorsOf } from "@/utils/fieldErrors";
import { PERIOD_LABEL, PERIOD_TONE, periodState } from "@/utils/period";
import { withMappedError } from "@/utils/withMappedError";
import { AnnouncementsEndpoints } from "../../_api/announcementsEndpoints";

/** `PUT /admin/announcements` takes at most this many messages (`TOO_MANY_ITEMS`). */
const MAX_MESSAGES = 10;

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const blank = (): AnnouncementInput => ({ id: null, icon: "info", text: "", url: null, startsAt: null, endsAt: null });
/** What the form edits of a saved message — its place is the array order, so `sortOrder` is not kept. */
const toInput = (a: Announcement): AnnouncementInput => ({ id: a.id, icon: a.icon, text: a.text, url: a.url, startsAt: a.startsAt, endsAt: a.endsAt });

/** A message's own problems, said before saving (the server repeats them with the path `{index}.{field}`). */
function rowProblems(a: AnnouncementInput): Record<string, string> {
	const e: Record<string, string> = {};
	if (!a.text.trim()) e.text = "متن لازم است.";
	if (a.url && (a.url.length > 300 || !(/^https:\/\//.test(a.url) || /^\/(?![/\\])/.test(a.url)))) e.url = "آدرس کامل https:// یا مسیری که با / شروع می‌شود (مثل /faq#reserve).";
	if (a.startsAt && a.endsAt && Date.parse(a.endsAt) <= Date.parse(a.startsAt)) e.endsAt = "پایان باید بعد از شروع باشد.";
	return e;
}

/**
 * `/announcements` — the storefront's rotating top bar: every message (running, scheduled and ended, from
 * `GET /admin/announcements`), edit, reorder, add, remove, then save the whole list.
 */
export default function AnnouncementsView() {
	const queryClient = useQueryClient();
	const all = useQuery({
		queryKey: ["announcements", "list"],
		queryFn: () => withMappedError(() => AnnouncementsEndpoints.getAll()),
		select: (list) => list.map(toInput),
		meta: { showNotificationOnRefetch: true },
	});

	const [base, setBase] = useState<AnnouncementInput[] | null>(null);
	const [list, setList] = useState<AnnouncementInput[]>([]);
	const [touched, setTouched] = useState(false);
	const dirty = base !== null && !same(list, base);
	// the list arrived (or was read again) and nothing is being edited — show it
	if (all.data && !dirty && !same(all.data, base)) {
		setBase(all.data);
		setList(all.data);
	}

	const save = useMutation({
		mutationFn: () => withMappedError(() => AnnouncementsEndpoints.replaceAll(list.map((a) => ({ ...a, text: a.text.trim(), url: a.url?.trim() || null })))),
		meta: { showNotification: true },
		onSuccess: (saved) => {
			toast("نوار اطلاعیه ذخیره شد", { icon: "check" });
			const next = saved.map(toInput);
			setBase(next);
			setList(next);
			setTouched(false);
			queryClient.invalidateQueries({ queryKey: ["announcements"] });
		},
	});

	const patch = (i: number, change: Partial<AnnouncementInput>) => setList((l) => l.map((a, k) => (k === i ? { ...a, ...change } : a)));
	const move = (i: number, by: number) =>
		setList((l) => {
			const next = [...l];
			const [row] = next.splice(i, 1);
			next.splice(i + by, 0, row);
			return next;
		});
	const server = fieldErrorsOf(save.error);
	const local = list.map(rowProblems);
	const invalid = local.some((e) => Object.keys(e).length > 0);
	const err = (i: number, field: string) => (touched && local[i][field]) || server[`${i}.${field}`] || server[`announcements.${i}.${field}`] || null;
	const allError = toErrorView(ERROR_BEHAVIOUR, all.error, "دریافت نوار اطلاعیه با خطا مواجه شد.");

	return (
		<>
			<PageHead title="نوار اطلاعیه" subtitle={`پیام‌های چرخان بالای سایت، به همین ترتیب؛ حداکثر ${toPersianDigits(MAX_MESSAGES)} پیام. ذخیره کل لیست را جایگزین می‌کند و پیام حذف‌شده از بین می‌رود.`} />
			<p className="note cream" style={{ marginBottom: 14 }}>
				فروشگاه فعلاً نوار اطلاعیه را از تنظیمات ثابت خودش می‌خواند (FEATURES §۶)؛ تغییرات تا وصل شدن فرانت به `GET /config` در سایت دیده نمی‌شود.
			</p>

			{all.isLoading ? (
				<Loading />
			) : !!allError ? (
				<ErrorComponent retryable={allError.retryable} ticketAble={allError.ticketAble} errorText={allError.errorText} executeFunction={() => all.refetch()} loading={all.isFetching} />
			) : (
				<>
					<div className="rows">
						{list.map((a, i) => {
							const state = periodState(a.startsAt, a.endsAt);
							return (
								<div key={a.id ?? `new-${i}`} className="row-card">
									<div className="rh">
										<span className="tag">{toPersianDigits(i + 1)}</span>
										<b>{a.text || "پیام جدید"}</b>
										<Badge tone={PERIOD_TONE[state]}>{state === "always" ? "همیشه" : PERIOD_LABEL[state]}</Badge>
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
										<Input label="متن" maxLength={200} value={a.text} onChange={(e) => patch(i, { text: e.target.value })} error={err(i, "text")} wrapperClassName="full" />
										<Input
											label="لینک"
											labelNote="اختیاری"
											direction="ltr"
											maxLength={300}
											value={a.url ?? ""}
											onChange={(e) => patch(i, { url: e.target.value || null })}
											placeholder="/faq#reserve"
											error={err(i, "url")}
										/>
										<div className={`field${err(i, "endsAt") ? " error" : ""}`}>
											<label>نمایش از / تا</label>
											<div style={{ display: "grid", gap: 6 }}>
												<JalaliDateTimeInput value={a.startsAt ?? null} onChange={(d) => patch(i, { startsAt: d })} ariaLabel="نمایش از" />
												<JalaliDateTimeInput value={a.endsAt ?? null} onChange={(d) => patch(i, { endsAt: d })} defaultTime="23:59" ariaLabel="نمایش تا" />
											</div>
											{err(i, "endsAt") && <span className="err">{err(i, "endsAt")}</span>}
										</div>
									</div>
									<IconSelect value={a.icon ?? null} onChange={(icon) => patch(i, { icon })} />
								</div>
							);
						})}
						<button type="button" className="add-row" disabled={list.length >= MAX_MESSAGES} onClick={() => setList((l) => [...l, blank()])}>
							<Icon name="plus" /> {list.length >= MAX_MESSAGES ? `حداکثر ${toPersianDigits(MAX_MESSAGES)} پیام` : "افزودن پیام"}
						</button>
					</div>
					<UnsavedGuard dirty={dirty} />
					<div className="savebar">
						<span className="msg">{dirty ? "تغییرات ذخیره‌نشده داری." : "همه‌چیز ذخیره است."}</span>
						{dirty && (
							<Button variant="white" size="sm" onClick={() => base && setList(base)} disabled={save.isPending}>
								برگرداندن
							</Button>
						)}
						<Button
							size="sm"
							onClick={() => {
								setTouched(true);
								if (!invalid) save.mutate();
							}}
							isLoading={save.isPending}
							disabled={!dirty}
						>
							ذخیره‌ی لیست
						</Button>
					</div>
				</>
			)}
		</>
	);
}
