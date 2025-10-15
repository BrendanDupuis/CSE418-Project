import { getChatPrivateKey, getChatPublicKey } from "@/app/_components/keyGen";

async function makeSharedKey(myPrivateKey: CryptoKey, theirPublicKey: CryptoKey): Promise<CryptoKey> {
	const sharedKey = await crypto.subtle.deriveKey({ name: "ECDH", public: theirPublicKey }, myPrivateKey, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
	return sharedKey;
}

export async function encryptMessage(
	chatId: string,
	senderUserId: string,
	receiverUserId: string,
	messageToEncrypt: string,
	passwordHash: string,
): Promise<{ iv: number[]; ciphertext: number[] }> {
	const myPrivateKey = await getChatPrivateKey(chatId, senderUserId, passwordHash);
	const receiversPublicKey = await getChatPublicKey(chatId, receiverUserId);

	if (!myPrivateKey || !receiversPublicKey) {
		throw new Error("Keys not found");
	}

	const sharedKey = await makeSharedKey(myPrivateKey, receiversPublicKey);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const encoded = new TextEncoder().encode(messageToEncrypt);
	const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, sharedKey, encoded);
	const ivArray = Array.from(iv);
	const ciphertextArray = Array.from(new Uint8Array(ciphertext));
	const encryptedObject = { iv: ivArray, ciphertext: ciphertextArray };

	return encryptedObject;
}

export async function decryptMessage(
	chatId: string,
	senderUserId: string,
	receiverUserId: string,
	encryptedData: { iv: number[]; ciphertext: number[] },
	passwordHash: string,
): Promise<string> {
	const myPrivateKey = await getChatPrivateKey(chatId, receiverUserId, passwordHash);
	const sendersPublicKey = await getChatPublicKey(chatId, senderUserId);

	if (!myPrivateKey || !sendersPublicKey) {
		throw new Error("Keys not found - user may have been deleted");
	}

	const sharedKey = await makeSharedKey(myPrivateKey, sendersPublicKey);
	const iv = new Uint8Array(encryptedData.iv);
	const ciphertext = new Uint8Array(encryptedData.ciphertext);
	const decryptedEncoded = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, sharedKey, ciphertext.buffer);
	const decryptedText = new TextDecoder().decode(decryptedEncoded);
	return decryptedText;
}

export async function decryptMessageFromText(chatId: string, senderUserId: string, receiverUserId: string, encryptedText: string, passwordHash: string): Promise<string> {
	try {
		const encryptedData = JSON.parse(encryptedText);
		return await decryptMessage(chatId, senderUserId, receiverUserId, encryptedData, passwordHash);
	} catch (error) {
		console.error("Failed to decrypt message:", error);
		if (error instanceof Error && error.message.includes("user may have been deleted")) {
			return "[Message from deleted user - cannot decrypt]";
		}
		return "[Encrypted message - decryption failed]";
	}
}
