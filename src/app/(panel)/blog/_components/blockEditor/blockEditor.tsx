"use client";

import { Icon } from "@/app/_components/icon/icons";
import ProductPicker from "@/app/_components/panel/productPicker/productPicker";
import SingleMediaField from "@/app/_components/panel/singleMediaField/singleMediaField";
import Input from "@/app/_components/ui/input/input";
import Textarea from "@/app/_components/ui/textarea/textarea";
import { BlogBlockInput, BlogBlockType } from "@/types/content.type";
import { BLOG_BLOCK, optionsOf } from "@/utils/labels";

/** A block while editing: the request's fields plus a stable key and the image's URL for the preview. */
export type EditableBlock = BlogBlockInput & { key: string; imageUrl?: string | null };

const ICON: Record<BlogBlockType, string> = { HEADING: "edit", PARAGRAPH: "file", QUOTE: "quote", TIP: "sparkle", PRODUCT: "bag", IMAGE: "image", LIST: "menu" };

let seq = 0;
export const newBlock = (type: BlogBlockType): EditableBlock => ({ key: `b${(seq += 1)}`, type, text: "", html: "", title: type === "TIP" ? "نکته کیوا" : "", items: [], productId: null, imageMediaId: null });

type BlockEditorProps = {
	blocks: EditableBlock[];
	onChange: (blocks: EditableBlock[]) => void;
	/** Server errors keyed `blocks[i].field`. */
	errors: Record<string, string>;
};

/** The post body as ordered blocks (FEATURES §2.11): add, reorder, remove; each type has its own fields. */
export default function BlockEditor({ blocks, onChange, errors }: BlockEditorProps) {
	const patch = (i: number, change: Partial<EditableBlock>) => onChange(blocks.map((b, k) => (k === i ? { ...b, ...change } : b)));
	const move = (i: number, by: number) => {
		const next = [...blocks];
		const [row] = next.splice(i, 1);
		next.splice(i + by, 0, row);
		onChange(next);
	};
	const err = (i: number, field: string) => errors[`blocks[${i}].${field}`];

	return (
		<div className="rows">
			{blocks.map((b, i) => (
				<div key={b.key} className="row-card">
					<div className="rh">
						<span className="tag">
							<Icon name={ICON[b.type]} />
							{BLOG_BLOCK[b.type]}
						</span>
						<span className="acts">
							<button type="button" className="icon-btn" aria-label="بالاتر" disabled={!i} onClick={() => move(i, -1)}>
								<Icon name="up" />
							</button>
							<button type="button" className="icon-btn" aria-label="پایین‌تر" disabled={i === blocks.length - 1} onClick={() => move(i, 1)}>
								<Icon name="down" />
							</button>
							<button type="button" className="icon-btn del" aria-label="حذف بلوک" onClick={() => onChange(blocks.filter((_, k) => k !== i))}>
								<Icon name="trash" />
							</button>
						</span>
					</div>

					{b.type === "HEADING" && <Input aria-label="تیتر" value={b.text ?? ""} onChange={(e) => patch(i, { text: e.target.value })} placeholder="تیتر بخش (در فهرست مطالب هم می‌آید)" error={err(i, "text")} />}
					{b.type === "PARAGRAPH" && (
						<Textarea aria-label="پاراگراف" className="code" value={b.html ?? ""} onChange={(e) => patch(i, { html: e.target.value })} placeholder="<p>…</p>" error={err(i, "html")} style={{ minHeight: 110 }} />
					)}
					{b.type === "QUOTE" && <Textarea aria-label="نقل‌قول" value={b.text ?? ""} onChange={(e) => patch(i, { text: e.target.value })} error={err(i, "text")} style={{ minHeight: 70 }} />}
					{b.type === "TIP" && (
						<>
							<Input aria-label="عنوان نکته" value={b.title ?? ""} onChange={(e) => patch(i, { title: e.target.value })} />
							<Textarea aria-label="متن نکته" className="code" value={b.html ?? ""} onChange={(e) => patch(i, { html: e.target.value })} error={err(i, "html")} style={{ minHeight: 80 }} />
						</>
					)}
					{b.type === "PRODUCT" && <ProductPicker single value={b.productId ? [b.productId] : []} onChange={(ids) => patch(i, { productId: ids[0] ?? null })} error={err(i, "productId")} />}
					{b.type === "IMAGE" && (
						<>
							<SingleMediaField
								label="عکس"
								purpose="BLOG"
								value={b.imageMediaId && b.imageUrl ? { id: b.imageMediaId, url: b.imageUrl } : null}
								onChange={(m) => patch(i, { imageMediaId: m?.id ?? null, imageUrl: m?.url ?? null })}
								error={err(i, "imageMediaId")}
							/>
							<Input aria-label="زیرنویس عکس" value={b.text ?? ""} onChange={(e) => patch(i, { text: e.target.value })} placeholder="زیرنویس (اختیاری)" />
						</>
					)}
					{b.type === "LIST" && (
						<Textarea
							aria-label="موارد لیست"
							hint="هر خط یک مورد"
							value={(b.items ?? []).join("\n")}
							onChange={(e) => patch(i, { items: e.target.value.split("\n") })}
							error={err(i, "items")}
							style={{ minHeight: 90 }}
						/>
					)}
				</div>
			))}
			<div className="chip-row">
				{optionsOf(BLOG_BLOCK).map((o) => (
					<button key={o.value} type="button" className="btn btn-soft btn-sm" onClick={() => onChange([...blocks, newBlock(o.value)])}>
						<Icon name={ICON[o.value]} /> {o.label}
					</button>
				))}
			</div>
		</div>
	);
}
