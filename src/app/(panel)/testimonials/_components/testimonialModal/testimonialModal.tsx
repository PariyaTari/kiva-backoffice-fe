"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TaxonomyEndpoints } from "@/app/(panel)/_api/taxonomyEndpoints";
import { MessengerIcon } from "@/app/_components/icon/messengerIcon";
import JalaliDateTimeInput from "@/app/_components/panel/jalaliDateTimeInput/jalaliDateTimeInput";
import ModalHead from "@/app/_components/panel/modalHead/modalHead";
import NumberInput from "@/app/_components/panel/numberInput/numberInput";
import ProductPicker from "@/app/_components/panel/productPicker/productPicker";
import SingleMediaField, { PickedMedia } from "@/app/_components/panel/singleMediaField/singleMediaField";
import Button from "@/app/_components/ui/button/button";
import Input from "@/app/_components/ui/input/input";
import Modal from "@/app/_components/ui/modal/modal";
import Select from "@/app/_components/ui/select/select";
import Switch from "@/app/_components/ui/switch/switch";
import Textarea from "@/app/_components/ui/textarea/textarea";
import { STORE_REFRESH_MINUTES } from "@/config/global";
import { toast } from "@/store/notification.store";
import { SocialChannel } from "@/types/common.type";
import { AdminTestimonial, TestimonialUpsertRequest } from "@/types/marketing.type";
import { toPersianDigits } from "@/utils/digits";
import { fieldErrorsOf } from "@/utils/fieldErrors";
import { optionsOf, SOCIAL_CHANNEL } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { onSiteWithin } from "@/utils/format";
import { TestimonialsEndpoints } from "../../_api/testimonialsEndpoints";

type TestimonialModalProps = { testimonial: AdminTestimonial | null; open: boolean; onClose: () => void };

/** `TestimonialUpsertRequest` — a real message from a messenger: who, where, what, when, about which bag. */
export default function TestimonialModal({ testimonial, open, onClose }: TestimonialModalProps) {
	return (
		<Modal open={open} onClose={onClose} width={680}>
			<TestimonialForm testimonial={testimonial} onClose={onClose} />
		</Modal>
	);
}

function TestimonialForm({ testimonial: t, onClose }: Omit<TestimonialModalProps, "open">) {
	const queryClient = useQueryClient();
	const [name, setName] = useState(t?.customerName ?? "");
	const [city, setCity] = useState(t?.city ?? "");
	const [source, setSource] = useState<SocialChannel>(t?.source ?? "TELEGRAM");
	const [message, setMessage] = useState(t?.message ?? "");
	const [messageTime, setMessageTime] = useState(t?.messageTime ?? "");
	const [receivedAt, setReceivedAt] = useState<string | null>(t?.receivedAt ?? null);
	const [rating, setRating] = useState<number | null>(t?.rating ?? 5);
	const [productId, setProductId] = useState<number[]>(t?.product ? [t.product.id] : []);
	const [colorKey, setColorKey] = useState(t?.color?.key ?? "");
	// `AdminTestimonial.screenshotMediaId` — the current screenshot is kept by its id unless replaced or removed
	const [shot, setShot] = useState<PickedMedia>(t?.screenshotMediaId && t.screenshotUrl ? { id: t.screenshotMediaId, url: t.screenshotUrl } : null);
	const [published, setPublished] = useState(t?.isPublished ?? true);
	const [sortOrder, setSortOrder] = useState<number | null>(t?.sortOrder ?? null);
	const [touched, setTouched] = useState(false);
	// «not after now» (`DATE_IN_FUTURE`) is checked against when the form opened — render stays pure
	const [openedAt] = useState(() => Date.now());

	const colors = useQuery({
		queryKey: ["taxonomy", "colors"],
		queryFn: () => withMappedError(() => TaxonomyEndpoints.getColors()),
		meta: { showNotification: true },
	});
	// 1.21.0 — the colour must be one of the product's (`COLOR_NOT_FOUND`); same key as the picker's chip, so no extra request
	const productColors = useQuery({
		queryKey: ["store", "productsByIds", productId],
		queryFn: () => withMappedError(() => TaxonomyEndpoints.getProductsByIds(productId)),
		enabled: productId.length > 0,
		select: (list) => list[0]?.colors?.map((c) => c.color) ?? null,
		meta: { showNotification: true },
	});
	// an unpublished product isn't in the storefront list — then every colour is offered and the server checks
	const colorOptions = (productColors.data ?? colors.data ?? []).map((c) => ({ value: c.key, label: c.name }));

	// `PUT` replaces everything (1.21.0): an empty optional field goes as `null`
	const payload = (): TestimonialUpsertRequest => ({
		customerName: name.trim(),
		city: city.trim() || null,
		source,
		message: message.trim(),
		messageTime: messageTime || null,
		receivedAt,
		rating: rating ?? 5,
		productId: productId[0],
		colorKey: colorKey || null,
		screenshotMediaId: shot?.id ?? null,
		isPublished: published,
		sortOrder: sortOrder ?? 0,
	});

	const save = useMutation({
		mutationFn: () => withMappedError(() => (t ? TestimonialsEndpoints.update(t.id, payload()) : TestimonialsEndpoints.create(payload()))),
		meta: { showNotification: true },
		onSuccess: () => {
			toast(published ? `پیام رضایت ذخیره شد — ${onSiteWithin(STORE_REFRESH_MINUTES.home)}` : "پیام رضایت ذخیره شد (منتشرنشده — در سایت دیده نمی‌شود)", { icon: "check" });
			queryClient.invalidateQueries({ queryKey: ["testimonials"] });
			onClose();
		},
	});

	const local: Record<string, string | null> = {
		customerName: !name.trim() ? "نام را بنویس." : name.trim().length > 40 ? "حداکثر ۴۰ حرف." : null,
		city: city.trim().length > 40 ? "حداکثر ۴۰ حرف." : null,
		message: !message.trim() ? "متن پیام را بنویس." : null,
		productId: !productId.length ? "محصول را انتخاب کن." : null,
		messageTime: messageTime && !/^\d{2}:\d{2}$/.test(messageTime) ? "دو رقم و دو رقم، مثل 09:17" : null,
		receivedAt: receivedAt && Date.parse(receivedAt) > openedAt ? "تاریخ دریافت نمی‌تواند بعد از الان باشد." : null,
		colorKey: colorKey && productColors.data && !productColors.data.some((c) => c.key === colorKey) ? "این رنگ روی این کیف نیست." : null,
	};
	const server = fieldErrorsOf(save.error);
	const err = (k: string) => (touched && local[k]) || server[k] || null;

	return (
		<>
			<ModalHead icon="smile" title={t ? `پیام ${t.customerName}` : "پیام رضایت جدید"} subtitle="«مشتری‌ها چی می‌گن» صفحه‌ی اصلی" />
			<div className="m-body">
				<div className="form-grid g3">
					<Input label="نام مشتری" value={name} onChange={(e) => setName(e.target.value)} error={err("customerName")} placeholder="مریم" />
					<Input label="شهر" labelNote="اختیاری" maxLength={40} value={city} onChange={(e) => setCity(e.target.value)} placeholder="اصفهان" error={err("city")} />
					<Select label="منبع" value={source} onChange={(e) => setSource(e.target.value as SocialChannel)} options={optionsOf(SOCIAL_CHANNEL)} error={err("source")} />
				</div>
				<Textarea
					label={
						<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
							<MessengerIcon channel={source} width={18} height={18} /> متن پیام
						</span>
					}
					maxLength={500}
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					error={err("message")}
					footer={<small className="muted">{toPersianDigits(message.length)} / ۵۰۰</small>}
					style={{ minHeight: 90 }}
				/>
				<div className="form-grid g3">
					<Input label="ساعت پیام" direction="ltr" value={messageTime} onChange={(e) => setMessageTime(e.target.value)} placeholder="11:17" error={err("messageTime")} />
					<div className={`field${err("receivedAt") ? " error" : ""}`} style={{ gridColumn: "span 2" }}>
						<label>تاریخ دریافت</label>
						<JalaliDateTimeInput value={receivedAt} onChange={setReceivedAt} ariaLabel="تاریخ دریافت" />
						{err("receivedAt") && <span className="err">{err("receivedAt")}</span>}
					</div>
				</div>
				<ProductPicker
					label="کیف"
					single
					value={productId}
					onChange={(ids, picked) => {
						setProductId(ids);
						if (picked?.colors?.length && !picked.colors.some((c) => c.color.key === colorKey)) setColorKey(picked.colors[0].color.key);
					}}
					error={err("productId")}
				/>
				<div className="form-grid g3">
					<Select label="رنگ" placeholder="—" value={colorKey} onChange={(e) => setColorKey(e.target.value)} options={colorOptions} error={err("colorKey")} />
					<NumberInput label="امتیاز (۱ تا ۵)" value={rating} onChange={setRating} error={err("rating")} />
					<NumberInput label="ترتیب" labelNote="اختیاری" value={sortOrder} onChange={setSortOrder} />
				</div>
				<SingleMediaField label="اسکرین‌شات پیام" labelNote="اختیاری" purpose="TESTIMONIAL" value={shot} onChange={setShot} error={err("screenshotMediaId")} />
				<Switch label="منتشر شود" checked={published} onChange={(e) => setPublished(e.target.checked)} />
			</div>
			<div className="m-foot">
				<Button variant="white" onClick={onClose} disabled={save.isPending}>
					انصراف
				</Button>
				<Button
					onClick={() => {
						setTouched(true);
						if (!Object.values(local).some(Boolean)) save.mutate();
					}}
					isLoading={save.isPending}
				>
					ذخیره
				</Button>
			</div>
		</>
	);
}
