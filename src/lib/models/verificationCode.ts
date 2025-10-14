import { Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { randomBytes } from "crypto";

/**
 * 2FA verification code data structure
 */
export interface VerificationCode {
	userId: string; // Primary identifier
	code: string;
	expiresAt: Timestamp;
	createdAt: Timestamp;
}

const COLLECTION_NAME = "verification_codes";

function getCollection() {
	return getAdminFirestore().collection(COLLECTION_NAME);
}

/**
 * Generate a secure random 6-digit verification code using Node.js crypto
 */
export function generateVerificationCode(): string {
	// Generate 3 random bytes (24 bits) and convert to a 6-digit number
	const bytes = randomBytes(3);
	const num = bytes.readUIntBE(0, 3);
	// Ensure it's 6 digits (100000-999999)
	const code = (num % 900000) + 100000;
	return code.toString();
}

/**
 * Store verification code in Firestore
 */
export async function storeVerificationCode(
	userId: string,
	code: string,
	expirationMinutes = 10,
): Promise<void> {
	const collectionRef = getCollection();
	const now = Timestamp.now();
	const expiresAt = Timestamp.fromMillis(
		now.toMillis() + expirationMinutes * 60 * 1000,
	);

	await collectionRef.doc(userId).set({
		userId,
		code,
		expiresAt,
		createdAt: now,
	});

	console.log(`[Firestore VerificationStore] Stored code for user ${userId}`);
}

/**
 * Get verification code from Firestore
 */
export async function getVerificationCode(
	userId: string,
): Promise<VerificationCode | null> {
	const docSnap = await getCollection().doc(userId).get();

	if (!docSnap.exists) {
		console.log(
			`[Firestore VerificationStore] Retrieved code for user ${userId}: not found`,
		);
		return null;
	}

	console.log(
		`[Firestore VerificationStore] Retrieved code for user ${userId}: found`,
	);
	return docSnap.data() as VerificationCode;
}

/**
 * Delete verification code from Firestore
 */
export async function deleteVerificationCode(userId: string): Promise<boolean> {
	try {
		await getCollection().doc(userId).delete();
		console.log(
			`[Firestore VerificationStore] Deleted code for user ${userId}: true`,
		);
		return true;
	} catch (error) {
		console.error(
			`[Firestore VerificationStore] Error deleting code for user ${userId}:`,
			error,
		);
		return false;
	}
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
	const now = Timestamp.now();
	if (stored.expiresAt.toMillis() < now.toMillis()) {
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
	const now = Timestamp.now();
	const querySnapshot = await getCollection()
		.where("expiresAt", "<", now)
		.get();
	let deletedCount = 0;

	for (const document of querySnapshot.docs) {
		await document.ref.delete();
		deletedCount++;
	}

	console.log(
		`[Firestore VerificationStore] Cleaned up ${deletedCount} expired codes`,
	);

	return deletedCount;
}
