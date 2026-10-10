import { httpClient } from "@/httpClient/HttpClient";
import { AdminContactMessage, ContactMessageList, ContactMessagePatch, ContactTopic, TicketStatus } from "@/types/support.type";

/** `/admin/contact-messages*` (ADMIN, SUPPORT) — the contact form's tickets. */
export const ContactEndpoints = {
	getMessages: async (status: TicketStatus | "", topic: ContactTopic | "", page: number, size: number) => {
		const res = await httpClient.call<ContactMessageList>({ method: "GET", url: "admin/contact-messages", params: { status: status || undefined, topic: topic || undefined, page, size } });
		return res.data;
	},

	/** Status, internal note, and a reply that goes out by SMS or email. */
	update: async (ticketCode: string, patch: ContactMessagePatch) => {
		const res = await httpClient.call<AdminContactMessage>({ method: "PATCH", url: `admin/contact-messages/${encodeURIComponent(ticketCode)}`, data: patch });
		return res.data;
	},
};
