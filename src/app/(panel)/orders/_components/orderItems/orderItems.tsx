import classNames from "classnames";
import { Icon } from "@/app/_components/icon/icons";
import { STORE_URL } from "@/config/global";
import { OrderItem } from "@/types/order.type";
import { toPersianDigits } from "@/utils/digits";
import { formatPrice } from "@/utils/format";

type OrderItemsProps = {
	items: OrderItem[];
	/** The item the shopper asked to change (`feedback.orderItemId`) — highlighted. */
	flaggedItemId?: number | null;
};

/** `.it-row`s — what was bought: the snapshot name, colour, SKU, quantity and prices at purchase time. */
export default function OrderItems({ items, flaggedItemId }: OrderItemsProps) {
	return (
		<section className="icard">
			<h3>
				<Icon name="bag" /> کالاها
				<span className="muted" style={{ fontSize: 12.5, fontWeight: 500 }}>
					({toPersianDigits(items.reduce((s, i) => s + i.quantity, 0))} عدد)
				</span>
			</h3>
			<div>
				{items.map((it) => (
					<div key={it.id} className={classNames("it-row", { flag: it.id === flaggedItemId })}>
						<span className="th">
							{/* eslint-disable-next-line @next/next/no-img-element -- API image URL */}
							{it.image ? <img src={it.image} alt={it.name} /> : null}
						</span>
						<span className="nm">
							<b>
								{it.slug ? (
									<a href={`${STORE_URL}/product/${it.slug}?color=${it.color.key}`} target="_blank" rel="noreferrer">
										{it.name}
									</a>
								) : (
									it.name
								)}
							</b>
							<small>
								<span className="swatch-dot" style={{ background: it.color.hex }} />
								{it.color.name}
								{it.sku && <span className="ltr">· {it.sku}</span>}
								<span>· {toPersianDigits(it.quantity)} عدد</span>
							</small>
						</span>
						<span className="p">
							{it.unitCompareAtPrice && it.unitCompareAtPrice > it.unitPrice && <s>{formatPrice(it.unitCompareAtPrice * it.quantity)}</s>}
							{formatPrice(it.lineTotal)} <small className="muted">تومان</small>
						</span>
					</div>
				))}
			</div>
		</section>
	);
}
