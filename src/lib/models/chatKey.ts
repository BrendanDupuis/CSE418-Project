import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase";

export interface ChatKey {
	userId: string;
	publicKey: JsonWebKey;
	createdAt: Timestamp;
	updatedAt: Timestamp;
}

export interface ChatPrivateKey {
	userId: string;
	encryptedPrivateKey: string;
	createdAt: Timestamp;
	updatedAt: Timestamp;
}

export async function storeChatPublicKey(chatId: string, userId: string, publicKey: JsonWebKey): Promise<void> {
	const now = Timestamp.now();
	const docRef = doc(firebaseDb, "chat", chatId, "publicKeys", userId);

	const docSnap = await getDoc(docRef);

	if (docSnap.exists()) {
		await setDoc(
			docRef,
			{
				publicKey,
				updatedAt: now,
			},
			{ merge: true },
		);
	} else {
		await setDoc(docRef, {
			userId,
			publicKey,
			createdAt: now,
			updatedAt: now,
		});
	}
}

export async function storeChatPrivateKey(chatId: string, userId: string, encryptedPrivateKey: string): Promise<void> {
	const now = Timestamp.now();
	const docRef = doc(firebaseDb, "chat", chatId, "privateKeys", userId);

	const docSnap = await getDoc(docRef);

	if (docSnap.exists()) {
		// Use updateDoc for existing documents to only update allowed fields
		// This ensures we don't violate the Firestore rule that requires hasOnly(['encryptedPrivateKey', 'updatedAt'])
		await updateDoc(docRef, {
			encryptedPrivateKey,
			updatedAt: now,
		});
	} else {
		await setDoc(docRef, {
			userId,
			encryptedPrivateKey,
			createdAt: now,
			updatedAt: now,
		});
	}
}

export async function getChatPublicKey(chatId: string, userId: string): Promise<JsonWebKey | null> {
	const docRef = doc(firebaseDb, "chat", chatId, "publicKeys", userId);
	const docSnap = await getDoc(docRef);

	if (!docSnap.exists()) {
		return null;
	}

	const data = docSnap.data() as ChatKey;
	return data.publicKey;
}

export async function getChatPrivateKey(chatId: string, userId: string): Promise<string | null> {
	const docRef = doc(firebaseDb, "chat", chatId, "privateKeys", userId);
	const docSnap = await getDoc(docRef);

	if (!docSnap.exists()) {
		return null;
	}

	const data = docSnap.data() as ChatPrivateKey;
	return data.encryptedPrivateKey;
}

export async function getAllChatPublicKeys(chatId: string): Promise<Record<string, JsonWebKey>> {
	const keysCollection = collection(firebaseDb, "chat", chatId, "publicKeys");
	const querySnapshot = await getDocs(keysCollection);

	const keys: Record<string, JsonWebKey> = {};
	querySnapshot.forEach((doc) => {
		const data = doc.data() as ChatKey;
		keys[data.userId] = data.publicKey;
	});

	return keys;
}

export async function deleteChatKeys(chatId: string, userId: string): Promise<boolean> {
	try {
		const publicKeyRef = doc(firebaseDb, "chat", chatId, "publicKeys", userId);
		const privateKeyRef = doc(firebaseDb, "chat", chatId, "privateKeys", userId);

		await deleteDoc(publicKeyRef);
		await deleteDoc(privateKeyRef);
		return true;
	} catch (error) {
		console.error("Error deleting chat keys:", error);
		return false;
	}
}

export async function hasChatKeys(chatId: string, userId: string): Promise<boolean> {
	try {
		const publicKeyRef = doc(firebaseDb, "chat", chatId, "publicKeys", userId);
		const privateKeyRef = doc(firebaseDb, "chat", chatId, "privateKeys", userId);

		const publicKeySnap = await getDoc(publicKeyRef);
		const privateKeySnap = await getDoc(privateKeyRef);

		return publicKeySnap.exists() && privateKeySnap.exists();
	} catch (error) {
		// If we can't read the keys due to permissions, assume they don't exist
		console.log("Cannot check if user has keys due to permissions, assuming they don't exist");
		return false;
	}
}

export async function getChatUsersWithKeys(chatId: string): Promise<string[]> {
	const publicKeysCollection = collection(firebaseDb, "chat", chatId, "publicKeys");
	const querySnapshot = await getDocs(publicKeysCollection);

	return querySnapshot.docs.map((doc) => doc.id);
}
