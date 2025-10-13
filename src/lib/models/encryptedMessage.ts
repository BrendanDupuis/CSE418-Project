import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/**
 * Encrypted message schema for MongoDB
 */
export interface EncryptedMessage {
	_id?: ObjectId;
	senderId: string; // Username of sender
	receiverId: string; // Username of receiver
	encryptedContent: {
		iv: number[]; // Initialization vector as array
		ciphertext: number[]; // Encrypted message as array
	};
	timestamp: Date;
	read: boolean;
}

/**
 * Store an encrypted message in MongoDB
 */
export async function storeEncryptedMessage(
	senderId: string,
	receiverId: string,
	encryptedContent: { iv: number[]; ciphertext: number[] },
): Promise<ObjectId> {
	const db = await getDatabase();
	const collection = db.collection<EncryptedMessage>("encrypted_messages");

	const message: EncryptedMessage = {
		senderId,
		receiverId,
		encryptedContent,
		timestamp: new Date(),
		read: false,
	};

	const result = await collection.insertOne(message);
	return result.insertedId;
}

/**
 * Get messages for a user (received messages)
 */
export async function getMessagesForUser(
	userId: string,
	limit = 50,
): Promise<EncryptedMessage[]> {
	const db = await getDatabase();
	const collection = db.collection<EncryptedMessage>("encrypted_messages");

	return collection
		.find({ receiverId: userId })
		.sort({ timestamp: -1 })
		.limit(limit)
		.toArray();
}

/**
 * Get conversation between two users
 */
export async function getConversation(
	user1: string,
	user2: string,
	limit = 100,
): Promise<EncryptedMessage[]> {
	const db = await getDatabase();
	const collection = db.collection<EncryptedMessage>("encrypted_messages");

	return collection
		.find({
			$or: [
				{ senderId: user1, receiverId: user2 },
				{ senderId: user2, receiverId: user1 },
			],
		})
		.sort({ timestamp: 1 })
		.limit(limit)
		.toArray();
}

/**
 * Mark message as read
 */
export async function markMessageAsRead(messageId: ObjectId): Promise<boolean> {
	const db = await getDatabase();
	const collection = db.collection<EncryptedMessage>("encrypted_messages");

	const result = await collection.updateOne(
		{ _id: messageId },
		{ $set: { read: true } },
	);

	return result.modifiedCount > 0;
}

/**
 * Delete a message
 */
export async function deleteMessage(messageId: ObjectId): Promise<boolean> {
	const db = await getDatabase();
	const collection = db.collection<EncryptedMessage>("encrypted_messages");

	const result = await collection.deleteOne({ _id: messageId });
	return result.deletedCount > 0;
}

/**
 * Get unread message count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
	const db = await getDatabase();
	const collection = db.collection<EncryptedMessage>("encrypted_messages");

	return collection.countDocuments({
		receiverId: userId,
		read: false,
	});
}
