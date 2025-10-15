import type { pki } from "node-forge";
import { genUserKeys, getPrivateKey } from "@/app/_components/keyGen";

export interface ChatUserKeys {
	user1PublicKey: pki.rsa.PublicKey;
	user2PublicKey: pki.rsa.PublicKey;
}

export function generateUserChatKeys(chatId: string, userId: string, password: string): pki.rsa.PublicKey {
	const userChatId = `${userId}_${chatId}`;
	const keys = genUserKeys(userChatId, password);
	return keys.publicKey;
}

export async function getChatPrivateKey(chatId: string, userId: string, password: string): Promise<pki.rsa.PrivateKey> {
	const userChatId = `${userId}_${chatId}`;
	return getPrivateKey(userChatId, password);
}

export async function getChatPublicKey(chatId: string, userId: string, password: string): Promise<pki.rsa.PublicKey> {
	const userChatId = `${userId}_${chatId}`;
	const keys = await genUserKeys(userChatId, password);
	return keys.publicKey;
}

export async function generateAndStoreUserChatKeys(chatId: string, userId: string, password: string): Promise<pki.rsa.PublicKey> {
	const publicKey = await generateUserChatKeys(chatId, userId, password);
	const { storeUserChatPublicKey } = await import("@/lib/chat-key-storage");
	await storeUserChatPublicKey(chatId, userId, publicKey);
	return publicKey;
}

export async function getAllChatPublicKeys(chatId: string): Promise<Record<string, CryptoKey>> {
	const { getAllChatPublicKeys: getFirebaseKeys } = await import("@/lib/models/chatKey");
	const keysJWK = await getFirebaseKeys(chatId);

	const keys: Record<string, CryptoKey> = {};

	for (const [userId, publicKeyJWK] of Object.entries(keysJWK)) {
		try {
			keys[userId] = await crypto.subtle.importKey("jwk", publicKeyJWK, { name: "ECDH", namedCurve: "P-256" }, true, []);
		} catch (error) {
			console.error(`Failed to import public key for user ${userId}:`, error);
		}
	}

	return keys;
}
