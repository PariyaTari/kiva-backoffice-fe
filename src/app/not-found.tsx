import Button from "@/app/_components/ui/button/button";
import { Icon } from "@/app/_components/icon/icons";

/** Unknown address outside the panel shell. */
export default function NotFound() {
	return (
		<main className="bo-gate">
			<div className="in">
				<span className="gi">
					<Icon name="search" />
				</span>
				<h2>این صفحه پیدا نشد</h2>
				<p>آدرس اشتباه است.</p>
				<Button href="/" iconStart={<Icon name="grid" />}>
					پنل مدیریت
				</Button>
			</div>
		</main>
	);
}
