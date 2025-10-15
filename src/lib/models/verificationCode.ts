import "server-only";

import { getAdminFirestore } from "@/lib/firebase-admin";

export interface VerificationCode {
	userId: string;
	codeHash: string;
	expiresAt: string;
	createdAt: string;
}

const COLLECTION_NAME = "verification_codes";

/**
 * Generate a secure random 6-digit verification code using Web Crypto API
 */
export function generateVerificationCode(): string {
	// Generate 3 random bytes (24 bits) and convert to a 6-digit number
	const array = new Uint8Array(3);
	crypto.getRandomValues(array);

	// Convert bytes to number (big-endian)
	const num = (array[0] << 16) | (array[1] << 8) | array[2];
	// Ensure it's 6 digits (100000-999999)
	const code = (num % 900000) + 100000;
	return code.toString();
}

/**
 * Hash a verification code using SHA-256
 */
export async function hashVerificationCode(code: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(code);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
	return hashHex;
}

export async function storeVerificationCode(userId: string, code: string, expirationMinutes = 10): Promise<void> {
	const db = await getAdminFirestore();
	const now = new Date();
	const expiresAt = new Date(now.getTime() + expirationMinutes * 60 * 1000);
	const codeHash = await hashVerificationCode(code);

	const docRef = db.doc(`${COLLECTION_NAME}/${userId}`);
	const response = await docRef.set({
		userId,
		codeHash,
		expiresAt: expiresAt.toISOString(),
		createdAt: now.toISOString(),
	});

	if (response.error) {
		throw new Error(`Failed to store verification code: ${response.error}`);
	}

	console.log(`[Firestore VerificationStore] Stored code hash for user ${userId}`);
}

export async function getVerificationCode(userId: string): Promise<VerificationCode | null> {
	const db = await getAdminFirestore();
	const docRef = db.doc(`${COLLECTION_NAME}/${userId}`);
	const response = await docRef.get();

	if (response.error) {
		console.error(`[Firestore VerificationStore] Error retrieving code for user ${userId}:`, response.error);
		return null;
	}

	if (!response.exists()) {
		console.log(`[Firestore VerificationStore] Retrieved code for user ${userId}: not found`);
		return null;
	}

	console.log(`[Firestore VerificationStore] Retrieved code for user ${userId}: found`);
	return response.data() as VerificationCode;
}

export async function deleteVerificationCode(userId: string): Promise<boolean> {
	try {
		const db = await getAdminFirestore();
		const docRef = db.doc(`${COLLECTION_NAME}/${userId}`);
		const response = await docRef.delete();

		if (response.error) {
			console.error(`[Firestore VerificationStore] Error deleting code for user ${userId}:`, response.error);
			return false;
		}

		console.log(`[Firestore VerificationStore] Deleted code for user ${userId}: true`);
		return true;
	} catch (error) {
		console.error(`[Firestore VerificationStore] Error deleting code for user ${userId}:`, error);
		return false;
	}
}

export async function verifyCode(userId: string, code: string): Promise<boolean> {
	const stored = await getVerificationCode(userId);

	if (!stored) {
		return false;
	}

	const now = new Date();
	const expiresAt = new Date(stored.expiresAt);
	if (expiresAt < now) {
		await deleteVerificationCode(userId);
		return false;
	}

	const inputCodeHash = await hashVerificationCode(code);
	return stored.codeHash === inputCodeHash;
}

export async function cleanupExpiredCodes(): Promise<number> {
	const db = await getAdminFirestore();
	const collectionRef = db.collection(COLLECTION_NAME);
	const now = new Date().toISOString();
	const querySnapshot = await collectionRef.where("expiresAt", "<", now).get();

	if (querySnapshot.error) {
		console.error(`[Firestore VerificationStore] Error querying expired codes:`, querySnapshot.error);
		return 0;
	}

	let deletedCount = 0;

	for (const document of querySnapshot.docs) {
		const docRef = db.doc(`${COLLECTION_NAME}/${document.id}`);
		const deleteResponse = await docRef.delete();

		if (deleteResponse.error) {
			console.error(`[Firestore VerificationStore] Error deleting expired code ${document.id}:`, deleteResponse.error);
		} else {
			deletedCount++;
		}
	}

	console.log(`[Firestore VerificationStore] Cleaned up ${deletedCount} expired codes`);

	return deletedCount;
}
