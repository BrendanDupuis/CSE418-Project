import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase";
import { getUserChatIds } from "./user";

const userid1_userid2_chatSeparator = "____";

export function generateChatId(userId1: string, userId2: string): string {
	const [first, second] = [userId1, userId2].sort();
	return `${first}${userid1_userid2_chatSeparator}${second}`;
}

export function chatIdToUserIds(chatId: string) {
	return chatId.split(userid1_userid2_chatSeparator) as [string, string];
}

export async function addUserToChat(userId: string, chatId: string): Promise<void> {
	try {
		const userChatRef = doc(firebaseDb, "users", userId, "chats", chatId);
		await setDoc(userChatRef, {
			chatId,
			addedAt: new Date(),
		});
	} catch (error) {
		console.error("Error adding user to chat:", error);
		throw error;
	}
}

export async function removeUserFromChat(userId: string, chatId: string): Promise<void> {
	try {
		const userChatRef = doc(firebaseDb, "users", userId, "chats", chatId);
		await deleteDoc(userChatRef);
	} catch (error) {
		console.error("Error removing user from chat:", error);
		throw error;
	}
}

export async function deleteAllUserChats(userId: string): Promise<void> {
	try {
		console.log("Getting user's chat IDs...");
		const userChatIds = await getUserChatIds(userId);
		console.log(`Found ${userChatIds.length} chats for user ${userId}`);

		for (const chatId of userChatIds) {
			console.log(`Processing chat ${chatId}...`);

			console.log(`Querying messages in chat ${chatId}...`);
			const messagesQuery = query(collection(firebaseDb, "chat", chatId, "messages"), where("fromUserId", "==", userId));
			const messagesSnapshot = await getDocs(messagesQuery);
			console.log(`Found ${messagesSnapshot.docs.length} messages to delete in chat ${chatId}`);

			console.log(`Deleting messages in chat ${chatId}...`);
			const deletePromises = messagesSnapshot.docs.map((messageDoc) => deleteDoc(doc(firebaseDb, "chat", chatId, "messages", messageDoc.id)));
			await Promise.all(deletePromises);
			console.log(`Messages deleted successfully in chat ${chatId}`);

			// Delete user's public and private keys from this chat
			console.log(`Deleting keys in chat ${chatId}...`);
			const publicKeyRef = doc(firebaseDb, "chat", chatId, "publicKeys", userId);
			const privateKeyRef = doc(firebaseDb, "chat", chatId, "privateKeys", userId);

			await Promise.all([
				deleteDoc(publicKeyRef).catch(() => {}), // Ignore if doesn't exist
				deleteDoc(privateKeyRef).catch(() => {}), // Ignore if doesn't exist
			]);
			console.log(`Keys deleted successfully in chat ${chatId}`);

			// Remove user from their chat tracking collection
			console.log(`Removing user from chat tracking...`);
			await removeUserFromChat(userId, chatId);
			console.log(`User removed from chat tracking for ${chatId}`);
		}
		console.log("All user chats processed successfully");
	} catch (error) {
		console.error("Error in deleteAllUserChats:", error);
		throw error;
	}
}
