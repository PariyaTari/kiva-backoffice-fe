import { Icon } from "@/app/_components/icon/icons";

const BENEFITS = [
	{ icon: "box", title: "صف سفارش‌ها", text: "عکاسی، ارسال عکس به مشتری و ثبت کد رهگیری" },
	{ icon: "bag", title: "کاتالوگ و موجودی", text: "محصول، رنگ، عکس و شارژ انبار" },
	{ icon: "chat", title: "مشتری‌ها", text: "نظرات، پیام‌های تماس و مرجوعی‌ها" },
];

/** `.auth-art` — what the panel is for, beside the login card (hidden on small screens). */
export default function AuthArt() {
	return (
		<div className="auth-art">
			<h2>
				پنل مدیریت
				<br />
				<em>کیوا</em>
			</h2>
			<p>با همان شماره‌ای که در کیوا حساب داری وارد شو؛ بخش‌هایی را می‌بینی که نقشت اجازه می‌دهد.</p>
			<div className="benefits">
				{BENEFITS.map((b) => (
					<div key={b.title} className="benefit">
						<span className="bi">
							<Icon name={b.icon} />
						</span>
						<div>
							<b>{b.title}</b>
							<span>{b.text}</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
