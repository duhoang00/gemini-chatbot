import { Message } from "./message";

export type Thread = {
	_id: string;
	userId: string;
	name: string;
	message: Message[];
	createdAt: Date;
};
