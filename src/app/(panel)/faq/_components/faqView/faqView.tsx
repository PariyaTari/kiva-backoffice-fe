"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PANEL_ERRORS as ERROR_BEHAVIOUR } from "@/app/(panel)/_utils/apiError";
import ErrorComponent from "@/app/_components/common/errorComponent2/errorComponent2";
import Loading from "@/app/_components/common/loading/loading";
import { Icon } from "@/app/_components/icon/icons";
import HtmlField from "@/app/_components/panel/htmlField/htmlField";
import IconSelect from "@/app/_components/panel/iconSelect/iconSelect";
import PageHead from "@/app/_components/panel/pageHead/pageHead";
import UnsavedGuard from "@/app/_components/panel/unsavedGuard/unsavedGuard";
import Button from "@/app/_components/ui/button/button";
import Input from "@/app/_components/ui/input/input";
import Switch from "@/app/_components/ui/switch/switch";
import { STORE_REFRESH_MINUTES } from "@/config/global";
import { toast } from "@/store/notification.store";
import { FaqGroup, FaqItem } from "@/types/content.type";
import { toErrorView } from "@/utils/apiError";
import { toPersianDigits } from "@/utils/digits";
import { onSiteWithin } from "@/utils/format";
import { fieldErrorsOf } from "@/utils/fieldErrors";
import { withMappedError } from "@/utils/withMappedError";
import { FaqEndpoints } from "../../_api/faqEndpoints";

/** Anchors the storefront and its footer link to — renaming them breaks those links (FEATURES §2.12). */
const LINKED_ANCHORS = ["reserve", "shipping", "return"];
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function moved<T>(list: T[], i: number, by: number): T[] {
	const next = [...list];
	const [row] = next.splice(i, 1);
	next.splice(i + by, 0, row);
	return next;
}

/** `/faq` — groups (anchor, name, icon, «امضای کیوا») and their questions, in order; saved as one list. */
export default function FaqView() {
	const queryClient = useQueryClient();
	const current = useQuery({
		queryKey: ["faq", "groups"],
		queryFn: () => withMappedError(() => FaqEndpoints.getGroups()),
		meta: { showNotificationOnRefetch: true },
	});

	const [base, setBase] = useState<FaqGroup[] | null>(null);
	const [groups, setGroups] = useState<FaqGroup[]>([]);
	const [openGroup, setOpenGroup] = useState<number | null>(0);
	const dirty = base !== null && !same(groups, base);
	if (current.data && !dirty && !same(current.data, base)) {
		setBase(current.data);
		setGroups(current.data);
	}

	const save = useMutation({
		mutationFn: () =>
			withMappedError(() =>
				FaqEndpoints.replaceAll(groups.map((g, i) => ({ ...g, sortOrder: i + 1, questions: g.questions.map((q, k) => ({ id: q.id, question: q.question.trim(), answer: q.answer, sortOrder: k + 1 })) }))),
			),
		meta: { showNotification: true },
		onSuccess: (saved) => {
			toast(`سوالات متداول ذخیره شد — ${onSiteWithin(STORE_REFRESH_MINUTES.faq)}`, { icon: "check" });
			setBase(saved);
			setGroups(saved);
			queryClient.invalidateQueries({ queryKey: ["faq"] });
		},
	});

	const patchGroup = (i: number, change: Partial<FaqGroup>) => setGroups((l) => l.map((g, k) => (k === i ? { ...g, ...change } : g)));
	const patchQuestion = (gi: number, qi: number, change: Partial<FaqItem>) =>
		setGroups((l) => l.map((g, k) => (k === gi ? { ...g, questions: g.questions.map((q, j) => (j === qi ? { ...q, ...change } : q)) } : g)));
	const errors = fieldErrorsOf(save.error);
	const currentError = toErrorView(ERROR_BEHAVIOUR, current.error, "دریافت سوالات متداول با خطا مواجه شد.");
	const renamed = (base ?? []).filter((g) => LINKED_ANCHORS.includes(g.id) && !groups.some((x) => x.id === g.id)).map((g) => g.id);

	if (current.isLoading) return <Loading />;
	if (currentError)
		return <ErrorComponent retryable={currentError.retryable} ticketAble={currentError.ticketAble} errorText={currentError.errorText} executeFunction={() => current.refetch()} loading={current.isFetching} />;

	return (
		<>
			<PageHead title="سوالات متداول" subtitle="گروه‌ها و سؤال‌ها به همین ترتیب در `/faq` نمایش داده می‌شوند؛ ذخیره کل لیست را جایگزین می‌کند." />
			<div className="rows">
				{groups.map((g, gi) => (
					<div key={gi} className="row-card">
						<div className="rh">
							<Icon name={g.icon || "info"} style={{ width: 20, height: 20, color: "var(--purple)" }} />
							<b>{g.name || "گروه جدید"}</b>
							<span className="tag ltr">#{g.id || "—"}</span>
							<span className="tag">{toPersianDigits(g.questions.length)} سؤال</span>
							{g.isSignature && <span className="tag tag-cream">امضای کیوا</span>}
							<span className="acts">
								<button type="button" className="icon-btn" aria-label={openGroup === gi ? "بستن" : "باز کردن"} onClick={() => setOpenGroup(openGroup === gi ? null : gi)}>
									<Icon name={openGroup === gi ? "up" : "down"} />
								</button>
								<button type="button" className="icon-btn" aria-label="گروه بالاتر" disabled={!gi} onClick={() => setGroups((l) => moved(l, gi, -1))}>
									<Icon name="right" />
								</button>
								<button type="button" className="icon-btn" aria-label="گروه پایین‌تر" disabled={gi === groups.length - 1} onClick={() => setGroups((l) => moved(l, gi, 1))}>
									<Icon name="left" />
								</button>
								<button type="button" className="icon-btn del" aria-label="حذف گروه" onClick={() => setGroups((l) => l.filter((_, k) => k !== gi))}>
									<Icon name="trash" />
								</button>
							</span>
						</div>
						{openGroup === gi && (
							<div className="stack">
								<div className="form-grid">
									<Input label="نام گروه" value={g.name} onChange={(e) => patchGroup(gi, { name: e.target.value })} error={errors[`[${gi}].name`]} />
									<Input
										label="شناسه (anchor)"
										direction="ltr"
										value={g.id}
										onChange={(e) => patchGroup(gi, { id: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
										error={errors[`[${gi}].id`]}
										hint={LINKED_ANCHORS.includes(base?.[gi]?.id ?? "") ? "سایت به این anchor لینک داده؛ عوضش نکن." : `/faq#${g.id}`}
									/>
								</div>
								<IconSelect value={g.icon} onChange={(icon) => patchGroup(gi, { icon: icon ?? "info" })} />
								<Switch label="تگ «امضای کیوا»" checked={g.isSignature} onChange={(e) => patchGroup(gi, { isSignature: e.target.checked })} />
								{g.questions.map((q, qi) => (
									<div key={qi} className="icard" style={{ padding: 14, display: "grid", gap: 10 }}>
										<div style={{ display: "flex", gap: 6, alignItems: "center" }}>
											<b style={{ fontSize: 13 }}>سؤال {toPersianDigits(qi + 1)}</b>
											<span style={{ marginInlineStart: "auto", display: "flex", gap: 2 }}>
												<button type="button" className="icon-btn" aria-label="بالاتر" disabled={!qi} onClick={() => patchGroup(gi, { questions: moved(g.questions, qi, -1) })}>
													<Icon name="up" />
												</button>
												<button
													type="button"
													className="icon-btn"
													aria-label="پایین‌تر"
													disabled={qi === g.questions.length - 1}
													onClick={() => patchGroup(gi, { questions: moved(g.questions, qi, 1) })}
												>
													<Icon name="down" />
												</button>
												<button type="button" className="icon-btn" aria-label="حذف سؤال" onClick={() => patchGroup(gi, { questions: g.questions.filter((_, j) => j !== qi) })}>
													<Icon name="trash" />
												</button>
											</span>
										</div>
										<Input aria-label="سؤال" value={q.question} onChange={(e) => patchQuestion(gi, qi, { question: e.target.value })} error={errors[`[${gi}].questions[${qi}].question`]} />
										<HtmlField
											aria-label="پاسخ (HTML)"
											value={q.answer}
											onChange={(e) => patchQuestion(gi, qi, { answer: e.target.value })}
											error={errors[`[${gi}].questions[${qi}].answer`]}
											style={{ minHeight: 80 }}
										/>
									</div>
								))}
								<button type="button" className="add-row" onClick={() => patchGroup(gi, { questions: [...g.questions, { question: "", answer: "<p></p>" }] })}>
									<Icon name="plus" /> افزودن سؤال
								</button>
							</div>
						)}
					</div>
				))}
				<button
					type="button"
					className="add-row"
					onClick={() => {
						setGroups((l) => [...l, { id: "", name: "", icon: "info", isSignature: false, questions: [] }]);
						setOpenGroup(groups.length);
					}}
				>
					<Icon name="plus" /> افزودن گروه
				</button>
			</div>
			{!!renamed.length && <p className="note danger" style={{ marginTop: 12 }}>anchorهای {renamed.join("، ")} که سایت به آن‌ها لینک داده دیگر در لیست نیستند.</p>}
			<UnsavedGuard dirty={dirty} />
			<div className="savebar">
				<span className="msg">{dirty ? "تغییرات ذخیره‌نشده داری." : "همه‌چیز ذخیره است."}</span>
				{dirty && (
					<Button variant="white" size="sm" onClick={() => base && setGroups(base)} disabled={save.isPending}>
						برگرداندن
					</Button>
				)}
				<Button size="sm" onClick={() => save.mutate()} isLoading={save.isPending} disabled={!dirty}>
					ذخیره‌ی سوالات
				</Button>
			</div>
		</>
	);
}
