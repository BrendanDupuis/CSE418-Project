import { getDatabase } from "@/lib/mongodb";

/**
 * 2FA verification code data structure
 */
export interface VerificationCode {
	userId: string; // Primary identifier
	code: string;
	expiresAt: Date;
	createdAt: Date;
}

/**
 * Store verification code in MongoDB
 */
export async function storeVerificationCode(
	userId: string,
	code: string,
	expirationMinutes = 10,
): Promise<void> {
	const db = await getDatabase();
	const collection = db.collection<VerificationCode>("verification_codes");

	const now = new Date();
	const expiresAt = new Date(now.getTime() + expirationMinutes * 60 * 1000);

	await collection.updateOne(
		{ userId },
		{
			$set: {
				code,
				expiresAt,
				createdAt: now,
			},
		},
		{ upsert: true },
	);

	console.log(`[MongoDB VerificationStore] Stored code for user ${userId}`);
}

/**
 * Get verification code from MongoDB
 */
export async function getVerificationCode(
	userId: string,
): Promise<VerificationCode | null> {
	const db = await getDatabase();
	const collection = db.collection<VerificationCode>("verification_codes");

	const result = await collection.findOne({ userId });

	console.log(
		`[MongoDB VerificationStore] Retrieved code for user ${userId}: ${result ? "found" : "not found"}`,
	);

	return result;
}

/**
 * Delete verification code from MongoDB
 */
export async function deleteVerificationCode(userId: string): Promise<boolean> {
	const db = await getDatabase();
	const collection = db.collection<VerificationCode>("verification_codes");

	const result = await collection.deleteOne({ userId });

	console.log(
		`[MongoDB VerificationStore] Deleted code for user ${userId}: ${result.deletedCount > 0}`,
	);

	return result.deletedCount > 0;
}

/**
 * Verify if the code is valid and not expired
 */
export async function verifyCode(userId: string, code: string): Promise<boolean> {
	const stored = await getVerificationCode(userId);

	if (!stored) {
		return false;
	}

	// Check if expired
	if (new Date() > stored.expiresAt) {
		await deleteVerificationCode(userId);
		return false;
	}

	// Check if code matches
	return stored.code === code;
}

/**
 * Clean up expired verification codes (run periodically)
 */
export async function cleanupExpiredCodes(): Promise<number> {
	const db = await getDatabase();
	const collection = db.collection<VerificationCode>("verification_codes");

	const result = await collection.deleteMany({
		expiresAt: { $lt: new Date() },
	});

	console.log(
		`[MongoDB VerificationStore] Cleaned up ${result.deletedCount} expired codes`,
	);

	return result.deletedCount;
}
