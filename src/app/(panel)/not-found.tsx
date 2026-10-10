import Button from "@/app/_components/ui/button/button";
import { Icon } from "@/app/_components/icon/icons";

/** A panel address that doesn't exist (or an entity `notFound()` couldn't find) — inside the shell. */
export default function PanelNotFound() {
	return (
		<div className="bo-gate">
			<div className="in">
				<span className="gi">
					<Icon name="search" />
				</span>
				<h2>این صفحه پیدا نشد</h2>
				<p>آدرس اشتباه است یا موردی که دنبالش بودی حذف شده.</p>
				<Button href="/" iconStart={<Icon name="grid" />}>
					برگشت به داشبورد
				</Button>
			</div>
		</div>
	);
}
