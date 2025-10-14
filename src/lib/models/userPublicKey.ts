import {
	collection,
	doc,
	setDoc,
	getDoc,
	deleteDoc,
	getDocs,
	Timestamp,
} from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase";

/**
 * User public key schema for Firebase Firestore
 */
export interface UserPublicKey {
	userName: string; // Primary identifier
	publicKey: JsonWebKey; // Public key in JWK format
	createdAt: Timestamp;
	updatedAt: Timestamp;
}

const COLLECTION_NAME = "user_public_keys";

/**
 * Store a user's public key in Firestore
 */
export async function storePublicKey(
	userName: string,
	publicKey: JsonWebKey,
): Promise<void> {
	const now = Timestamp.now();
	const docRef = doc(firebaseDb, COLLECTION_NAME, userName);

	// Check if document exists
	const docSnap = await getDoc(docRef);

	if (docSnap.exists()) {
		// Update existing document
		await setDoc(
			docRef,
			{
				publicKey,
				updatedAt: now,
			},
			{ merge: true },
		);
	} else {
		// Create new document
		await setDoc(docRef, {
			userName,
			publicKey,
			createdAt: now,
			updatedAt: now,
		});
	}
}

/**
 * Get a user's public key from Firestore
 */
export async function getPublicKeyFromDB(
	userName: string,
): Promise<JsonWebKey | null> {
	const docRef = doc(firebaseDb, COLLECTION_NAME, userName);
	const docSnap = await getDoc(docRef);

	if (!docSnap.exists()) {
		return null;
	}

	const data = docSnap.data() as UserPublicKey;
	return data.publicKey;
}

/**
 * Delete a user's public key
 */
export async function deletePublicKey(userName: string): Promise<boolean> {
	try {
		await deleteDoc(doc(firebaseDb, COLLECTION_NAME, userName));
		return true;
	} catch (error) {
		console.error("Error deleting public key:", error);
		return false;
	}
}

/**
 * Check if a user has a public key registered
 */
export async function hasPublicKey(userName: string): Promise<boolean> {
	const docRef = doc(firebaseDb, COLLECTION_NAME, userName);
	const docSnap = await getDoc(docRef);
	return docSnap.exists();
}

/**
 * Get all users with public keys (for admin purposes)
 */
export async function getAllUsersWithKeys(): Promise<string[]> {
	const querySnapshot = await getDocs(
		collection(firebaseDb, COLLECTION_NAME),
	);
	return querySnapshot.docs.map((doc) => doc.id);
}
