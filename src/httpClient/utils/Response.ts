export class Response<T = unknown> {
	data: T;
	status: number;

	constructor(data: T, status: number) {
		this.data = data;
		this.status = status;
	}
}
