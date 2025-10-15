import type { pki } from "node-forge";
import { getChatPublicKey as getChatPublicKeyFromFirebase, storeChatPublicKey } from "@/lib/models/chatKey";

export async function storeUserChatPublicKey(chatId: string, userId: string, publicKey: pki.rsa.PublicKey): Promise<void> {
	const publicKeyJWK = await crypto.subtle.exportKey("jwk", publicKey);
	await storeChatPublicKey(chatId, userId, publicKeyJWK);
}

export async function getChatPublicKey(chatId: string, userId: string): Promise<CryptoKey | null> {
	try {
		const publicKeyJWK = await getChatPublicKeyFromFirebase(chatId, userId);

		if (!publicKeyJWK) {
			return null;
		}

		return crypto.subtle.importKey("jwk", publicKeyJWK, { name: "ECDH", namedCurve: "P-256" }, true, []);
	} catch (error) {
		console.error("Failed to get chat public key:", error);
		return null;
	}
}

export async function hasChatKeys(chatId: string): Promise<boolean> {
	try {
		const { getChatUsersWithKeys } = await import("@/lib/models/chatKey");
		const users = await getChatUsersWithKeys(chatId);
		return users.length > 0;
	} catch (error) {
		console.error("Failed to check if chat has keys:", error);
		return false;
	}
}
