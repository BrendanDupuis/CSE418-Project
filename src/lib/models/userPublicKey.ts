import { getDatabase } from "@/lib/mongodb";

/**
 * User public key schema for MongoDB
 */
export interface UserPublicKey {
	userName: string; // Primary identifier
	publicKey: JsonWebKey; // Public key in JWK format
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Store a user's public key in MongoDB
 */
export async function storePublicKey(
	userName: string,
	publicKey: JsonWebKey,
): Promise<void> {
	const db = await getDatabase();
	const collection = db.collection<UserPublicKey>("user_public_keys");

	const now = new Date();

	await collection.updateOne(
		{ userName },
		{
			$set: {
				publicKey,
				updatedAt: now,
			},
			$setOnInsert: {
				createdAt: now,
			},
		},
		{ upsert: true },
	);
}

/**
 * Get a user's public key from MongoDB
 */
export async function getPublicKeyFromDB(
	userName: string,
): Promise<JsonWebKey | null> {
	const db = await getDatabase();
	const collection = db.collection<UserPublicKey>("user_public_keys");

	const result = await collection.findOne({ userName });

	if (!result) {
		return null;
	}

	return result.publicKey;
}

/**
 * Delete a user's public key
 */
export async function deletePublicKey(userName: string): Promise<boolean> {
	const db = await getDatabase();
	const collection = db.collection<UserPublicKey>("user_public_keys");

	const result = await collection.deleteOne({ userName });
	return result.deletedCount > 0;
}

/**
 * Check if a user has a public key registered
 */
export async function hasPublicKey(userName: string): Promise<boolean> {
	const db = await getDatabase();
	const collection = db.collection<UserPublicKey>("user_public_keys");

	const count = await collection.countDocuments({ userName });
	return count > 0;
}

/**
 * Get all users with public keys (for admin purposes)
 */
export async function getAllUsersWithKeys(): Promise<string[]> {
	const db = await getDatabase();
	const collection = db.collection<UserPublicKey>("user_public_keys");

	const users = await collection.find({}, { projection: { userName: 1 } }).toArray();
	return users.map((u) => u.userName);
}
