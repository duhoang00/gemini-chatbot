export type Message = {
	_id?: string;
	text: string;
	role: "user" | "bot";
	timestamp: Date;
};
