import type { FieldValue, Timestamp } from "firebase/firestore";
import {
	addDoc,
	collection,
	doc,
	getDoc,
	getDocs,
	limit,
	onSnapshot,
	orderBy,
	query,
	serverTimestamp,
	setDoc,
} from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase";

export interface Message {
	text: string;
	fromUserId: string;
	timestamp: Timestamp;
}

export interface MessageWithId extends Message {
	id: string;
}

export interface ChatDocument {
	user1: string;
	user2: string;
	createdAt: Timestamp | FieldValue;
}

export async function sendMessage(
	text: string,
	fromUserId: string,
	chatId: string,
): Promise<string> {
	try {
		const chatDoc = await getChatDocument(chatId);
		if (!chatDoc) {
			throw new Error("Chat not found");
		}

		if (![chatDoc.user1, chatDoc.user2].includes(fromUserId)) {
			throw new Error("User not authorized to send messages to this chat");
		}

		const messagesCollection = collection(
			firebaseDb,
			"chat",
			chatId,
			"messages",
		);
		const messageData = {
			text,
			fromUserId,
			timestamp: serverTimestamp(),
		};

		const docRef = await addDoc(messagesCollection, messageData);

		return docRef.id;
	} catch (error) {
		console.error("Error sending message:", error);
		throw error;
	}
}

export async function getChatDocument(
	chatId: string,
): Promise<ChatDocument | null> {
	try {
		const chatDoc = await getDoc(doc(firebaseDb, "chat", chatId));
		if (chatDoc.exists()) {
			return chatDoc.data() as ChatDocument;
		}
		return null;
	} catch (error) {
		console.error("Error getting chat document:", error);
		return null;
	}
}

export async function createChatDocument(
	chatId: string,
	user1: string,
	user2: string,
): Promise<void> {
	try {
		const chatDocRef = doc(firebaseDb, "chat", chatId);
		const chatData: ChatDocument = {
			user1,
			user2,
			createdAt: serverTimestamp(),
		};
		await setDoc(chatDocRef, chatData);
	} catch (error) {
		console.error("Error creating chat document:", error);
		throw error;
	}
}

export function subscribeToMessages(
	chatId: string,
	onUpdate: (messages: MessageWithId[]) => void,
	onError?: (error: Error) => void,
): () => void {
	const messagesCollection = collection(firebaseDb, "chat", chatId, "messages");
	const messagesQuery = query(
		messagesCollection,
		orderBy("timestamp", "asc"),
		limit(100),
	);

	return onSnapshot(
		messagesQuery,
		(messagesSnapshot) => {
			const messages: MessageWithId[] = [];
			messagesSnapshot.forEach((doc) => {
				messages.push({
					id: doc.id,
					...(doc.data() as Message),
				});
			});
			onUpdate(messages);
		},
		(error) => {
			console.error("Error in messages subscription:", error);
			onError?.(error);
		},
	);
}

export async function getMessages(chatId: string): Promise<MessageWithId[]> {
	try {
		const messagesCollection = collection(
			firebaseDb,
			"chat",
			chatId,
			"messages",
		);
		const messagesQuery = query(
			messagesCollection,
			orderBy("timestamp", "asc"),
			limit(100),
		);

		const messagesSnapshot = await getDocs(messagesQuery);
		const messages: MessageWithId[] = [];

		messagesSnapshot.forEach((doc) => {
			messages.push({
				id: doc.id,
				...(doc.data() as Message),
			});
		});

		return messages;
	} catch (error) {
		console.error("Error fetching messages:", error);
		throw error;
	}
}
