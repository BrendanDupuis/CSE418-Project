import {
	collection,
	deleteDoc,
	doc,
	getDocs,
	query,
	where,
} from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase";

const userid1_userid2_chatSeparator = "____";

export function generateChatId(userId1: string, userId2: string): string {
	const [first, second] = [userId1, userId2].sort();
	return `${first}${userid1_userid2_chatSeparator}${second}`;
}

export function chatIdToUserIds(chatId: string) {
	return chatId.split(userid1_userid2_chatSeparator) as [string, string];
}

export async function deleteAllUserChats(userId: string): Promise<void> {
	const chatsQuery = query(
		collection(firebaseDb, "chat"),
		where("user1", "==", userId),
	);
	const chatsQuery2 = query(
		collection(firebaseDb, "chat"),
		where("user2", "==", userId),
	);

	const [chatsSnapshot1, chatsSnapshot2] = await Promise.all([
		getDocs(chatsQuery),
		getDocs(chatsQuery2),
	]);

	const chatIds = new Set<string>();
	chatsSnapshot1.forEach((doc) => chatIds.add(doc.id));
	chatsSnapshot2.forEach((doc) => chatIds.add(doc.id));

	for (const chatId of chatIds) {
		const messagesQuery = query(
			collection(firebaseDb, "chat", chatId, "messages"),
			where("fromUserId", "==", userId),
		);
		const messagesSnapshot = await getDocs(messagesQuery);

		const deletePromises = messagesSnapshot.docs.map((messageDoc) =>
			deleteDoc(doc(firebaseDb, "chat", chatId, "messages", messageDoc.id)),
		);
		await Promise.all(deletePromises);

		await deleteDoc(doc(firebaseDb, "chat", chatId));
	}
}
