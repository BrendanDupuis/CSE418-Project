import type { FieldValue, Timestamp } from "firebase/firestore";
import { addDoc, collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { decryptMessageFromText, encryptMessage } from "@/app/_components/endToEndEncryption";
import { generateChatKeys, storeChatKeys } from "@/app/_components/keyGen";
import { firebaseDb } from "@/lib/firebase";
import { getChatUsersWithKeys, hasChatKeys } from "@/lib/models/chatKey";

export interface Message {
	senderEncryptedText: string;
	receiverEncryptedText: string;
	fromUserId: string;
	timestamp: Timestamp;
}

export interface MessageWithId extends Message {
	id: string;
	text: string;
}

export interface ChatDocument {
	user1: string;
	user2: string;
	createdAt: Timestamp | FieldValue;
}

export async function sendMessage(text: string, fromUserId: string, chatId: string, passwordHash: string): Promise<string> {
	try {
		const chatDoc = await getChatDocument(chatId);
		if (!chatDoc) {
			throw new Error("Chat not found");
		}

		if (![chatDoc.user1, chatDoc.user2].includes(fromUserId)) {
			throw new Error("User not authorized to send messages to this chat");
		}

		const receiverUserId = chatDoc.user1 === fromUserId ? chatDoc.user2 : chatDoc.user1;

		const senderEncryptedData = await encryptMessage(chatId, fromUserId, fromUserId, text, passwordHash);
		const receiverEncryptedData = await encryptMessage(chatId, fromUserId, receiverUserId, text, passwordHash);

		const messagesCollection = collection(firebaseDb, "chat", chatId, "messages");
		const messageData = {
			senderEncryptedText: JSON.stringify(senderEncryptedData),
			receiverEncryptedText: JSON.stringify(receiverEncryptedData),
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

export async function getChatDocument(chatId: string): Promise<ChatDocument | null> {
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

export async function ensureUserHasChatKeys(chatId: string, userId: string, passwordHash: string): Promise<void> {
	try {
		const userHasKeys = await hasChatKeys(chatId, userId);
		if (!userHasKeys) {
			const chatKeys = await generateChatKeys(chatId, passwordHash);
			await storeChatKeys(chatId, userId, chatKeys);
		}
	} catch (error) {
		console.error("Error ensuring user has chat keys:", error);
		throw error;
	}
}

export async function checkBothUsersHaveKeys(chatId: string): Promise<{ bothHaveKeys: boolean; missingUser?: string }> {
	try {
		const chatDoc = await getChatDocument(chatId);
		if (!chatDoc) {
			return { bothHaveKeys: false };
		}

		const usersWithKeys = await getChatUsersWithKeys(chatId);
		const allChatUsers = [chatDoc.user1, chatDoc.user2];

		const missingUsers = allChatUsers.filter((userId) => !usersWithKeys.includes(userId));

		if (missingUsers.length === 0) {
			return { bothHaveKeys: true };
		} else {
			return { bothHaveKeys: false, missingUser: missingUsers[0] };
		}
	} catch (error) {
		console.error("Error checking if both users have keys:", error);
		return { bothHaveKeys: false };
	}
}

export function subscribeToKeyChanges(
	chatId: string,
	onUpdate: (keyStatus: { bothHaveKeys: boolean; missingUser?: string }) => void,
	onError?: (error: Error) => void,
): () => void {
	const publicKeysCollection = collection(firebaseDb, "chat", chatId, "publicKeys");
	const privateKeysCollection = collection(firebaseDb, "chat", chatId, "privateKeys");

	let publicKeysUnsubscribe: (() => void) | null = null;
	let privateKeysUnsubscribe: (() => void) | null = null;

	const checkKeys = async () => {
		try {
			const keyStatus = await checkBothUsersHaveKeys(chatId);
			onUpdate(keyStatus);
		} catch (error) {
			console.error("Error in key check:", error);
			onError?.(error as Error);
		}
	};

	publicKeysUnsubscribe = onSnapshot(
		publicKeysCollection,
		() => {
			checkKeys();
		},
		(error) => {
			console.error("Error in public keys subscription:", error);
			onError?.(error);
		},
	);

	privateKeysUnsubscribe = onSnapshot(
		privateKeysCollection,
		() => {
			checkKeys();
		},
		(error) => {
			console.error("Error in private keys subscription:", error);
			onError?.(error);
		},
	);

	checkKeys();

	return () => {
		publicKeysUnsubscribe?.();
		privateKeysUnsubscribe?.();
	};
}

export async function createChatDocument(chatId: string, thisUser: string, user2: string, passwordHash: string): Promise<void> {
	try {
		const chatDocRef = doc(firebaseDb, "chat", chatId);
		const chatData: ChatDocument = {
			user1: thisUser,
			user2,
			createdAt: serverTimestamp(),
		};
		await setDoc(chatDocRef, chatData);

		const chatKeys = await generateChatKeys(chatId, passwordHash);
		await storeChatKeys(chatId, thisUser, chatKeys);
	} catch (error) {
		console.error("Error creating chat document:", error);
		throw error;
	}
}

export function subscribeToMessages(
	chatId: string,
	currentUserId: string,
	passwordHash: string,
	onUpdate: (messages: MessageWithId[]) => void,
	onError?: (error: Error) => void,
): () => void {
	const messagesCollection = collection(firebaseDb, "chat", chatId, "messages");
	const messagesQuery = query(messagesCollection, orderBy("timestamp", "asc"), limit(100));

	return onSnapshot(
		messagesQuery,
		async (messagesSnapshot) => {
			const decryptedMessages: MessageWithId[] = [];

			for (const doc of messagesSnapshot.docs) {
				const messageData = doc.data() as Message;
				let decryptedText: string;

				if (messageData.fromUserId === currentUserId) {
					// User is viewing their own sent message - use sender encrypted text
					// Decrypt using currentUserId's private key + receiver's public key
					const chatDoc = await getChatDocument(chatId);
					if (!chatDoc) {
						decryptedText = "[Message decryption failed - chat not found]";
					} else {
						// const receiverUserId = chatDoc.user1 === currentUserId ? chatDoc.user2 : chatDoc.user1;
						decryptedText = await decryptMessageFromText(chatId, currentUserId, currentUserId, messageData.senderEncryptedText, passwordHash);
					}
				} else {
					// User is viewing a message sent to them - use receiver encrypted text
					// Decrypt using currentUserId's private key + sender's public key
					decryptedText = await decryptMessageFromText(chatId, messageData.fromUserId, currentUserId, messageData.receiverEncryptedText, passwordHash);
				}

				decryptedMessages.push({
					id: doc.id,
					...messageData,
					text: decryptedText,
				});
			}

			onUpdate(decryptedMessages);
		},
		(error) => {
			console.error("Error in messages subscription:", error);
			onError?.(error);
		},
	);
}

export async function getMessages(chatId: string, currentUserId: string, passwordHash: string): Promise<MessageWithId[]> {
	try {
		const messagesCollection = collection(firebaseDb, "chat", chatId, "messages");
		const messagesQuery = query(messagesCollection, orderBy("timestamp", "asc"), limit(100));

		const messagesSnapshot = await getDocs(messagesQuery);
		const messages: MessageWithId[] = [];

		for (const doc of messagesSnapshot.docs) {
			const messageData = doc.data() as Message;
			let decryptedText: string;

			if (messageData.fromUserId === currentUserId) {
				// User is viewing their own sent message - use sender encrypted text
				// Decrypt using currentUserId's private key + receiver's public key
				const chatDoc = await getChatDocument(chatId);
				if (!chatDoc) {
					decryptedText = "[Message decryption failed - chat not found]";
				} else {
					const receiverUserId = chatDoc.user1 === currentUserId ? chatDoc.user2 : chatDoc.user1;
					decryptedText = await decryptMessageFromText(chatId, currentUserId, receiverUserId, messageData.senderEncryptedText, passwordHash);
				}
			} else {
				// User is viewing a message sent to them - use receiver encrypted text
				// Decrypt using currentUserId's private key + sender's public key
				decryptedText = await decryptMessageFromText(chatId, messageData.fromUserId, currentUserId, messageData.receiverEncryptedText, passwordHash);
			}

			messages.push({
				id: doc.id,
				...messageData,
				text: decryptedText,
			});
		}

		return messages;
	} catch (error) {
		console.error("Error fetching messages:", error);
		throw error;
	}
}
