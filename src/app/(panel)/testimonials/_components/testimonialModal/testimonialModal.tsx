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
import { toast } from "@/store/notification.store";
import { SocialChannel } from "@/types/common.type";
import { Testimonial, TestimonialUpsertRequest } from "@/types/marketing.type";
import { toPersianDigits } from "@/utils/digits";
import { fieldErrorsOf } from "@/utils/fieldErrors";
import { optionsOf, SOCIAL_CHANNEL } from "@/utils/labels";
import { withMappedError } from "@/utils/withMappedError";
import { TestimonialsEndpoints } from "../../_api/testimonialsEndpoints";

/** The screenshot the testimonial already has — kept unless replaced or removed (the response has its URL, not its id). */
const CURRENT = "__current";

type TestimonialModalProps = { testimonial: Testimonial | null; open: boolean; onClose: () => void };

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
	const [shot, setShot] = useState<PickedMedia>(t?.screenshotUrl ? { id: CURRENT, url: t.screenshotUrl } : null);
	const [published, setPublished] = useState(t?.isPublished ?? true);
	const [sortOrder, setSortOrder] = useState<number | null>(t?.sortOrder ?? null);
	const [touched, setTouched] = useState(false);

	const colors = useQuery({
		queryKey: ["taxonomy", "colors"],
		queryFn: () => withMappedError(() => TaxonomyEndpoints.getColors()),
		meta: { showNotification: true },
	});

	const payload = (): TestimonialUpsertRequest => ({
		customerName: name.trim(),
		city: city.trim(),
		source,
		message: message.trim(),
		messageTime: messageTime || undefined,
		receivedAt: receivedAt ?? undefined,
		rating: rating ?? 5,
		productId: productId[0],
		colorKey: colorKey || undefined,
		...(shot?.id === CURRENT ? {} : { screenshotMediaId: shot?.id ?? null }),
		isPublished: published,
		...(sortOrder != null ? { sortOrder } : {}),
	});

	const save = useMutation({
		mutationFn: () => withMappedError(() => (t ? TestimonialsEndpoints.update(t.id, payload()) : TestimonialsEndpoints.create(payload()))),
		meta: { showNotification: true },
		onSuccess: () => {
			toast(published ? "پیام رضایت ذخیره شد" : "پیام رضایت ذخیره شد (منتشرنشده — در فهرست دیده نمی‌شود)", { icon: "check" });
			queryClient.invalidateQueries({ queryKey: ["testimonials"] });
			onClose();
		},
	});

	const local: Record<string, string | null> = {
		customerName: !name.trim() ? "نام را بنویس." : null,
		message: !message.trim() ? "متن پیام را بنویس." : null,
		productId: !productId.length ? "محصول را انتخاب کن." : null,
		messageTime: messageTime && !/^\d{1,2}:\d{2}$/.test(messageTime) ? "مثل 11:17" : null,
	};
	const server = fieldErrorsOf(save.error);
	const err = (k: string) => (touched && local[k]) || server[k] || null;

	return (
		<>
			<ModalHead icon="smile" title={t ? `پیام ${t.customerName}` : "پیام رضایت جدید"} subtitle="«مشتری‌ها چی می‌گن» صفحه‌ی اصلی" />
			<div className="m-body">
				<div className="form-grid g3">
					<Input label="نام مشتری" value={name} onChange={(e) => setName(e.target.value)} error={err("customerName")} placeholder="مریم" />
					<Input label="شهر" value={city} onChange={(e) => setCity(e.target.value)} placeholder="اصفهان" />
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
					<div className="field" style={{ gridColumn: "span 2" }}>
						<label>تاریخ دریافت</label>
						<JalaliDateTimeInput value={receivedAt} onChange={setReceivedAt} ariaLabel="تاریخ دریافت" />
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
					<Select label="رنگ" placeholder="—" value={colorKey} onChange={(e) => setColorKey(e.target.value)} options={(colors.data ?? []).map((c) => ({ value: c.key, label: c.name }))} error={err("colorKey")} />
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
