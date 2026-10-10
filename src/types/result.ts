export type ResultError = {
	success: false;
	description: string;
	code: "NOT_FOUND" | "SERVICE_UNAVAILABLE" | "UNKNOWN_ERROR" | "TIMEOUT" | "NETWORK_ERROR" | "APP_ERROR" | string;
	statusCode: number;
	errorDetails: ErrorDetail[] | null;
	/** Error-specific data from the problem body (`retryAfterSeconds`, `minSubtotal`, ...). */
	meta: Record<string, unknown> | null;
};

export type ResultSuccess<T> = {
	success: true;
	data: T;
};

export type Result<T> = ResultSuccess<T> | ResultError;

export type ErrorDetail = { field: string | null; code: string | null; message: string };
