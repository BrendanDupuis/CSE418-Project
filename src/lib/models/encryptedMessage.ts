import {
	collection,
	addDoc,
	query,
	where,
	orderBy,
	limit,
	getDocs,
	doc,
	updateDoc,
	deleteDoc,
	Timestamp,
	or,
	and,
} from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase";

/**
 * Encrypted message schema for Firebase Firestore
 */
export interface EncryptedMessage {
	id?: string;
	senderId: string; // Username of sender
	receiverId: string; // Username of receiver
	encryptedContent: {
		iv: number[]; // Initialization vector as array
		ciphertext: number[]; // Encrypted message as array
	};
	timestamp: Timestamp;
	read: boolean;
}

const COLLECTION_NAME = "encrypted_messages";

/**
 * Store an encrypted message in Firestore
 */
export async function storeEncryptedMessage(
	senderId: string,
	receiverId: string,
	encryptedContent: { iv: number[]; ciphertext: number[] },
): Promise<string> {
	const messageData: Omit<EncryptedMessage, "id"> = {
		senderId,
		receiverId,
		encryptedContent,
		timestamp: Timestamp.now(),
		read: false,
	};

	const docRef = await addDoc(
		collection(firebaseDb, COLLECTION_NAME),
		messageData,
	);
	return docRef.id;
}

/**
 * Get messages for a user (received messages)
 */
export async function getMessagesForUser(
	userId: string,
	limitCount = 50,
): Promise<EncryptedMessage[]> {
	const q = query(
		collection(firebaseDb, COLLECTION_NAME),
		where("receiverId", "==", userId),
		orderBy("timestamp", "desc"),
		limit(limitCount),
	);

	const querySnapshot = await getDocs(q);
	return querySnapshot.docs.map((doc) => ({
		id: doc.id,
		...doc.data(),
	})) as EncryptedMessage[];
}

/**
 * Get conversation between two users
 */
export async function getConversation(
	user1: string,
	user2: string,
	limitCount = 100,
): Promise<EncryptedMessage[]> {
	const q = query(
		collection(firebaseDb, COLLECTION_NAME),
		or(
			and(where("senderId", "==", user1), where("receiverId", "==", user2)),
			and(where("senderId", "==", user2), where("receiverId", "==", user1)),
		),
		orderBy("timestamp", "asc"),
		limit(limitCount),
	);

	const querySnapshot = await getDocs(q);
	return querySnapshot.docs.map((doc) => ({
		id: doc.id,
		...doc.data(),
	})) as EncryptedMessage[];
}

/**
 * Mark message as read
 */
export async function markMessageAsRead(messageId: string): Promise<boolean> {
	try {
		const docRef = doc(firebaseDb, COLLECTION_NAME, messageId);
		await updateDoc(docRef, { read: true });
		return true;
	} catch (error) {
		console.error("Error marking message as read:", error);
		return false;
	}
}

/**
 * Delete a message
 */
export async function deleteMessage(messageId: string): Promise<boolean> {
	try {
		await deleteDoc(doc(firebaseDb, COLLECTION_NAME, messageId));
		return true;
	} catch (error) {
		console.error("Error deleting message:", error);
		return false;
	}
}

/**
 * Get unread message count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
	const q = query(
		collection(firebaseDb, COLLECTION_NAME),
		where("receiverId", "==", userId),
		where("read", "==", false),
	);

	const querySnapshot = await getDocs(q);
	return querySnapshot.size;
}
