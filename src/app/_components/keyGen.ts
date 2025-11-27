import { getChatPrivateKey as getChatPrivateKeyFromDB, getChatPublicKey as getChatPublicKeyFromDB, storeChatPrivateKey, storeChatPublicKey } from "@/lib/models/chatKey";
import { getUserChatIds } from "@/lib/models/user";
import { hashPassword } from "@/lib/password-hash";

interface ChatKeys {
	privateKey: CryptoKey;
	publicKey: CryptoKey;
	publicKeyJWK: JsonWebKey;
	encryptedPrivateKey: ArrayBuffer;
}

export async function generateChatKeys(chatId: string, password: string): Promise<ChatKeys> {
	const keyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey", "deriveBits"]);

	const publicKeyJWK = (await crypto.subtle.exportKey("jwk", keyPair.publicKey)) as JsonWebKey;

	const encryptedPrivateKey = await encryptPrivateKeyWithAES(keyPair.privateKey, password, chatId);

	return {
		privateKey: keyPair.privateKey,
		publicKey: keyPair.publicKey,
		publicKeyJWK,
		encryptedPrivateKey,
	};
}

async function encryptPrivateKeyWithAES(privateKey: CryptoKey, password: string, chatId: string): Promise<ArrayBuffer> {
	const encoder = new TextEncoder();

	const salt = encoder.encode(`chat-salt-${chatId}`);
	const passwordKey = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
	const derivedBits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, passwordKey, 256);

	const aesKey = await crypto.subtle.importKey("raw", derivedBits, "AES-GCM", false, ["encrypt"]);

	const privateKeyJWK = await crypto.subtle.exportKey("jwk", privateKey);
	const privateKeyString = JSON.stringify(privateKeyJWK);
	const privateKeyData = encoder.encode(privateKeyString);

	const iv = crypto.getRandomValues(new Uint8Array(12));

	const encryptedData = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, privateKeyData);

	const result = new Uint8Array(iv.length + encryptedData.byteLength);
	result.set(iv, 0);
	result.set(new Uint8Array(encryptedData), iv.length);

	return result.buffer;
}

async function decryptPrivateKeyWithAES(encryptedData: ArrayBuffer, password: string, chatId: string): Promise<JsonWebKey> {
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();

	const salt = encoder.encode(`chat-salt-${chatId}`);
	const passwordKey = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
	const derivedBits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, passwordKey, 256);

	const aesKey = await crypto.subtle.importKey("raw", derivedBits, "AES-GCM", false, ["decrypt"]);

	const dataView = new Uint8Array(encryptedData);
	const iv = dataView.slice(0, 12);
	const encrypted = dataView.slice(12);

	const decryptedData = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, aesKey, encrypted);

	const privateKeyString = decoder.decode(decryptedData);
	return JSON.parse(privateKeyString) as JsonWebKey;
}

export async function storeChatKeys(chatId: string, userId: string, chatKeys: ChatKeys): Promise<void> {
	const base64EncryptedPrivateKey = btoa(String.fromCharCode(...new Uint8Array(chatKeys.encryptedPrivateKey)));

	try {
		await storeChatPrivateKey(chatId, userId, base64EncryptedPrivateKey);
	} catch (error) {
		console.error("Failed to store private key for user:", userId, error);
		throw new Error(`Failed to store private key: ${error}`);
	}

	try {
		await storeChatPublicKey(chatId, userId, chatKeys.publicKeyJWK);
	} catch (error) {
		console.error("Failed to store public key for user:", userId, error);
		throw new Error(`Failed to store public key: ${error}`);
	}
}

export async function getChatPublicKey(chatId: string, userId: string): Promise<CryptoKey | null> {
	try {
		const publicKeyJWK = await getChatPublicKeyFromDB(chatId, userId);
		if (!publicKeyJWK) {
			return null;
		}
		return await crypto.subtle.importKey("jwk", publicKeyJWK, { name: "ECDH", namedCurve: "P-256" }, true, []);
	} catch (error) {
		console.error("Failed to get chat public key:", error);
		return null;
	}
}

export async function getChatPrivateKey(chatId: string, userId: string, password: string): Promise<CryptoKey | null> {
	try {
		const encryptedPrivateKeyString = await getChatPrivateKeyFromDB(chatId, userId);
		if (!encryptedPrivateKeyString) {
			return null;
		}

		const binaryString = atob(encryptedPrivateKeyString);
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}
		const encryptedPrivateKeyBuffer = bytes.buffer;

		const privateKeyJWK = await decryptPrivateKeyWithAES(encryptedPrivateKeyBuffer, password, chatId);
		return await crypto.subtle.importKey("jwk", privateKeyJWK, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey", "deriveBits"]);
	} catch (error) {
		console.error("Failed to get chat private key:", error);
		return null;
	}
}

export async function reencryptAllChatKeys(
	userId: string,
	oldPassword: string,
	newPassword: string,
): Promise<{ success: number; failed: number; errors: string[]; skipped: number }> {
	// Hash passwords before using them (getChatPrivateKey and encryptPrivateKeyWithAES expect password hashes)
	const oldPasswordHash = await hashPassword(oldPassword);
	const newPasswordHash = await hashPassword(newPassword);

	let chatIds: string[] = [];
	try {
		chatIds = await getUserChatIds(userId);

		// If we got an empty array, that's fine - user just has no chats
		if (chatIds.length === 0) {
			return {
				success: 0,
				failed: 0,
				errors: [],
				skipped: 0,
			};
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error("Failed to get user chat IDs:", error);

		// Check if it's a permissions error
		if (errorMessage.includes("permission") || errorMessage.includes("Permission denied")) {
			// Return with a clear error message
			return {
				success: 0,
				failed: 0,
				errors: [
					`Permission denied: Unable to access your chat list. ` +
						`This may be because your authentication token doesn't have 2FA verification. ` +
						`Please try logging out and logging back in, then try changing your password again.`,
				],
				skipped: 0,
			};
		}

		// Return early with an error if we can't even get the chat list
		return {
			success: 0,
			failed: 0,
			errors: [`Failed to retrieve chat list: ${errorMessage}`],
			skipped: 0,
		};
	}

	let successCount = 0;
	let failedCount = 0;
	let skippedCount = 0;
	const errors: string[] = [];

	for (const chatId of chatIds) {
		try {
			// Use getChatPrivateKey to decrypt with old password hash (reuses existing logic)
			const privateKey = await getChatPrivateKey(chatId, userId, oldPasswordHash);

			if (!privateKey) {
				skippedCount++; // No key for this chat, skip but count it
				continue;
			}

			// Re-encrypt with new password hash
			const encryptedPrivateKey = await encryptPrivateKeyWithAES(privateKey, newPasswordHash, chatId);

			// Store updated encrypted private key - convert ArrayBuffer to base64
			const encryptedBytes = new Uint8Array(encryptedPrivateKey);
			let binary = "";
			for (let i = 0; i < encryptedBytes.length; i++) {
				binary += String.fromCharCode(encryptedBytes[i]);
			}
			const base64EncryptedPrivateKey = btoa(binary);
			await storeChatPrivateKey(chatId, userId, base64EncryptedPrivateKey);

			successCount++;
		} catch (error) {
			failedCount++;
			let errorMessage: string;
			if (error instanceof Error) {
				errorMessage = error.message;
			} else if (error instanceof DOMException) {
				errorMessage = `Decryption failed: ${error.name} - ${error.message || "The operation failed for an operation-specific reason"}`;
			} else {
				errorMessage = String(error);
			}
			errors.push(`Chat ${chatId}: ${errorMessage}`);
			console.error(`[reencryptAllChatKeys] Failed to re-encrypt keys for chat ${chatId}:`, error);
		}
	}

	return { success: successCount, failed: failedCount, errors, skipped: skippedCount };
}
