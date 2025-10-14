export function generateChatId(userId1: string, userId2: string): string {
	const [first, second] = [userId1, userId2].sort();
	return `${first}_${second}`;
}
