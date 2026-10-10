import Logo from "@/app/_components/common/logo/logo";
import { Icon } from "@/app/_components/icon/icons";
import { User } from "@/types/user.type";
import { formatPhone } from "@/utils/format";

type NoAccessProps = {
	user: User;
	onLogout: () => void;
	loggingOut: boolean;
};

/** Signed in, but the account has no panel role (FRONTEND_AUTH §7) — say so and offer to sign in with another number. */
export default function NoAccess({ user, onLogout, loggingOut }: NoAccessProps) {
	return (
		<main className="bo-gate">
			<div className="in">
				<Logo style={{ height: 30, marginBottom: 10 }} />
				<span className="gi">
					<Icon name="lock" />
				</span>
				<h2>به پنل مدیریت دسترسی نداری</h2>
				<p>
					حساب <b className="ltr">{formatPhone(user.phone)}</b> نقشی در پنل کیوا ندارد. اگر باید دسترسی داشته باشی، از مدیر کل بخواه برایت نقش تعیین کند و بعد دوباره وارد
					شو.
				</p>
				<button type="button" className={`btn btn-primary${loggingOut ? " loading" : ""}`} onClick={onLogout} disabled={loggingOut}>
					<Icon name="logout" /> ورود با شماره‌ی دیگر
				</button>
			</div>
		</main>
	);
}
