import { ChangeEvent, FormEvent, useCallback, useMemo, useState } from "react";

export type ValidationSchema<T> = {
	[K in keyof T]?: (value: T[K], values: T) => string | undefined;
};

export type FormErrors<T> = Partial<Record<keyof T, string>>;

export type UseFormOptions<T> = {
	initialValues: T;
	validationSchema?: ValidationSchema<T>;
	onSubmit: (values: T) => void | Promise<void>;
};

export function useForm<T extends Record<string, unknown>>({
	initialValues,
	validationSchema,
	onSubmit,
}: UseFormOptions<T>) {
	const [values, setValues] = useState<T>(initialValues);
	const [hasSubmitted, setHasSubmitted] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const validate = useCallback(
		(vals: T): FormErrors<T> => {
			const result: FormErrors<T> = {};
			if (!validationSchema) return result;

			(Object.keys(validationSchema) as (keyof T)[]).forEach((key) => {
				const validator = validationSchema[key];
				const message = validator?.(vals[key], vals);
				if (message) result[key] = message;
			});

			return result;
		},
		[validationSchema],
	);

	const allErrors = useMemo(() => validate(values), [validate, values]);
	const isValid = useMemo(() => Object.keys(allErrors).length === 0, [allErrors]);

	const errors = useMemo<FormErrors<T>>(() => (hasSubmitted ? allErrors : {}), [hasSubmitted, allErrors]);

	const setFieldValue = useCallback(<K extends keyof T>(name: K, value: T[K]) => {
		setValues((prev) => ({ ...prev, [name]: value }));
	}, []);

	const handleChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		const { name, value, type } = e.target;
		const nextValue = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
		setValues((prev) => ({ ...prev, [name]: nextValue }));
	}, []);

	const handleSubmit = useCallback(
		async (e?: FormEvent<HTMLFormElement>) => {
			e?.preventDefault();
			setHasSubmitted(true);

			if (Object.keys(validate(values)).length > 0) return;

			try {
				setIsSubmitting(true);
				await onSubmit(values);
			} finally {
				setIsSubmitting(false);
			}
		},
		[validate, values, onSubmit],
	);

	const reset = useCallback(() => {
		setValues(initialValues);
		setHasSubmitted(false);
		setIsSubmitting(false);
	}, [initialValues]);

	const getFieldProps = useCallback(
		(name: keyof T) => ({
			name: name as string,
			value: (values[name] ?? "") as string,
			onChange: handleChange,
			error: errors[name],
		}),
		[values, handleChange, errors],
	);

	return {
		values,
		errors,
		isValid,
		isSubmitting,
		hasSubmitted,
		handleChange,
		handleSubmit,
		setFieldValue,
		getFieldProps,
		reset,
	};
}
