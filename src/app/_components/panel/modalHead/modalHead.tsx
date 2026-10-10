import { ReactNode } from "react";
import classNames from "classnames";
import { Icon } from "@/app/_components/icon/icons";

type ModalHeadProps = {
	icon: string;
	title: ReactNode;
	subtitle?: ReactNode;
	tone?: "default" | "danger";
};

/** `.m-head` — the icon tile, title and one line of context at the top of every panel modal (account order modals). */
export default function ModalHead({ icon, title, subtitle, tone = "default" }: ModalHeadProps) {
	return (
		<div className="m-head">
			<span className={classNames("mi", { danger: tone === "danger" })}>
				<Icon name={icon} />
			</span>
			<div>
				<h3>{title}</h3>
				{subtitle && <p>{subtitle}</p>}
			</div>
		</div>
	);
}
