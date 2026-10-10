import { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/app/_components/icon/icons";

type PageHeadProps = {
	title: ReactNode;
	subtitle?: ReactNode;
	/** Buttons on the left (RTL end) of the head. */
	actions?: ReactNode;
	/** «بازگشت به …» link above the title. */
	back?: { href: string; label: string };
};

/** `.bo-head` — a page's title, one line of context and its main actions. */
export default function PageHead({ title, subtitle, actions, back }: PageHeadProps) {
	return (
		<div className="bo-head">
			<div>
				{back && (
					<Link href={back.href} className="bo-back">
						<Icon name="arrowR" />
						{back.label}
					</Link>
				)}
				<h1>{title}</h1>
				{subtitle && <p>{subtitle}</p>}
			</div>
			{actions && <div className="acts">{actions}</div>}
		</div>
	);
}
