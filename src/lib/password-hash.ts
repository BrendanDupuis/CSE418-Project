const PASSWORD_HASH_KEY = "secure_password_hash";
const SALT_KEY = "password_salt";
const ITERATIONS = 100000;
const STATIC_SALT = "STATIC SALT EVERY DEVICE THAT USER LOG-IN TO PAGE TO HAVE THE SAME ONE";

export interface PasswordHashData {
	hash: string;
	salt: string;
	iterations: number;
	timestamp: number;
}

export async function hashPassword(password: string): Promise<string> {
	const encoder = new TextEncoder();
	const passwordBuffer = encoder.encode(password);
	const saltBuffer = encoder.encode(STATIC_SALT);

	const keyMaterial = await crypto.subtle.importKey("raw", passwordBuffer, "PBKDF2", false, ["deriveBits"]);

	const derivedBits = await crypto.subtle.deriveBits(
		{
			name: "PBKDF2",
			salt: saltBuffer,
			iterations: ITERATIONS,
			hash: "SHA-256",
		},
		keyMaterial,
		256,
	);

	return Array.from(new Uint8Array(derivedBits), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function storePasswordHash(password: string): Promise<void> {
	if (typeof window === "undefined") {
		throw new Error("localStorage is not available");
	}

	const hash = await hashPassword(password);

	const hashData: PasswordHashData = {
		hash,
		salt: STATIC_SALT,
		iterations: ITERATIONS,
		timestamp: Date.now(),
	};

	try {
		localStorage.setItem(PASSWORD_HASH_KEY, JSON.stringify(hashData));
		localStorage.setItem(SALT_KEY, STATIC_SALT);
	} catch (error) {
		console.error("Failed to store password hash:", error);
		throw new Error("Failed to store password hash in localStorage");
	}
}

export function hasPasswordHash(): boolean {
	if (typeof window === "undefined") {
		return false;
	}

	return localStorage.getItem(PASSWORD_HASH_KEY) !== null;
}

export function getPasswordHash(): string | null {
	if (typeof window === "undefined") {
		return null;
	}

	try {
		const storedData = localStorage.getItem(PASSWORD_HASH_KEY);
		if (!storedData) {
			return null;
		}

		const hashData: PasswordHashData = JSON.parse(storedData);
		return hashData.hash;
	} catch (error) {
		console.error("Failed to get password hash:", error);
		return null;
	}
}

export function clearPasswordHash(): void {
	if (typeof window === "undefined") {
		return;
	}

	localStorage.removeItem(PASSWORD_HASH_KEY);
	localStorage.removeItem(SALT_KEY);
}

export async function verifyPassword(password: string): Promise<boolean> {
	if (typeof window === "undefined") {
		throw new Error("Password verification is not available. Please log out and log back in.");
	}

	try {
		const storedData = localStorage.getItem(PASSWORD_HASH_KEY);
		if (!storedData) {
			throw new Error("Password hash not found. Please log out and log back in.");
		}

		const hashData: PasswordHashData = JSON.parse(storedData);
		const providedHash = await hashPassword(password);
		return providedHash === hashData.hash;
	} catch (error) {
		// If it's already an Error with our message, re-throw it
		if (error instanceof Error && (error.message.includes("log out") || error.message.includes("log back in"))) {
			throw error;
		}
		console.error("Failed to verify password:", error);
		throw new Error("Failed to verify password. Please log out and log back in.");
	}
}

export function monitorPasswordHash(onHashDeleted: () => void, onHashChanged: () => void): () => void {
	if (typeof window === "undefined") {
		return () => {};
	}

	const handleStorageChange = (event: StorageEvent) => {
		if (event.key === PASSWORD_HASH_KEY) {
			if (event.newValue === null) {
				onHashDeleted();
			} else if (event.newValue !== event.oldValue) {
				onHashChanged();
			}
		}
	};

	window.addEventListener("storage", handleStorageChange);

	const intervalId = setInterval(() => {
		if (!hasPasswordHash()) {
			onHashDeleted();
		}
	}, 1000);

	return () => {
		window.removeEventListener("storage", handleStorageChange);
		clearInterval(intervalId);
	};
}
