/*
Generating user keys which will be called during enrollment. We will store the public keys in firebase so anyone can
access them. Private keys will be derived from the users passwords so it can be easily stored and accessed on many
different devices, but will still be useless if retreived by an attacker without the users password.
*/

// Type definitions for the database functions
interface PublicKeyJWK {
	kty: string;
	crv: string;
	x: string;
	y: string;
	[key: string]: any;
}

interface UserKeys {
	privateKey: CryptoKey;
	publicKey: CryptoKey;
	publicKeyJWK: PublicKeyJWK;
}

// Database function declarations (to be implemented)
declare function storePublicKeyInDB(userName: string, publicKey: PublicKeyJWK): Promise<void>;
declare function getPublicKeyFromDB(userName: string): Promise<PublicKeyJWK | null>;

//Once this function is finished, the private key is stored locally into the indexeddb, while the publicKey is stored
//in MongoDB so anyone can access public keys
export async function genUserKeys(userName: string, password: string): Promise<UserKeys> {
	const encoder = new TextEncoder();
	const salt = `salt-${userName}`; // could be server-stored for more security

	//Generate a key from the users password, "PBKDF2" derives from password
	const encodePassKey = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
	//Key from salt + password
	const derivedBits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: encoder.encode(salt), iterations: 100000, hash: "SHA-256" }, encodePassKey, 256);
	//This is the final private key to be stored. Encrypted by the password so can stored without worrying of attackers being able to decrypt it
	const privateKey = await crypto.subtle.importKey("raw", derivedBits, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey", "deriveBits"]);

	//STORE PRIVATE KEY WHERE NEEDED

	//Generate publickey, doesn't need to be encrypted since everyone uses eachothers public key
	const keyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey", "deriveBits"]);

	const publicKeyJWK = (await crypto.subtle.exportKey("jwk", keyPair.publicKey)) as PublicKeyJWK;

	return {
		privateKey,
		publicKey: keyPair.publicKey,
		publicKeyJWK,
	};
}

//Everytime we generate the private key, it will be the same defined by these functions. As long as we have the same salt,
//and the password is correct, this will return the proper private key
export async function getPrivateKey(userName: string, password: string): Promise<CryptoKey> {
	const encoder = new TextEncoder();
	const salt = `salt-${userName}`; // could be server-stored for more security
	//Generate a key from the users password, "PBKDF2" derives from password
	const encodePassKey = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
	//Key from salt + password
	const derivedBits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: encoder.encode(salt), iterations: 100000, hash: "SHA-256" }, encodePassKey, 256);
	//This is the final private key to be stored. Encrypted by the password so can stored without worrying of attackers being able to decrypt it
	const privateKey = await crypto.subtle.importKey("raw", derivedBits, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey", "deriveBits"]);

	return privateKey;
}

export async function getPublicKey(userName: string): Promise<CryptoKey> {
	// Fetch public key from MongoDB
	const publicKeyJWK = await getPublicKeyFromDB(userName);

	if (!publicKeyJWK) {
		throw new Error(`Public key not found for user: ${userName}`);
	}

	// Import the JWK back into a CryptoKey object
	const publicKey = await crypto.subtle.importKey("jwk", publicKeyJWK, { name: "ECDH", namedCurve: "P-256" }, true, []);

	return publicKey;
}
