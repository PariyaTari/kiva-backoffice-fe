import { CSSProperties, InputHTMLAttributes, ReactNode } from "react";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
	label: ReactNode;
	labelStyle?: CSSProperties;
};

/** Design-system `.check`. */
export default function Checkbox({ label, labelStyle, ...rest }: CheckboxProps) {
	return (
		<label className="check" style={labelStyle}>
			<input type="checkbox" {...rest} /> {label}
		</label>
	);
}
