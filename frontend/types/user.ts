import { Thread } from "./thread";

export type User = {
	_id: string;
	userId: string;
	name: string;
	threads: Thread[];
	createdAt: Date;
};
