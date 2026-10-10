export type MultiSelectOption = {
	value: string;
	label: string;
	/** Count shown at the end of the option (`.cnt`). */
	count?: number;
	/** Colour swatch before the label. */
	swatch?: string | null;
};

export type MultiSelectProps = {
	options: MultiSelectOption[];
	value: string[];
	onChange: (value: string[]) => void;
	placeholder?: string;
	id?: string;
};
