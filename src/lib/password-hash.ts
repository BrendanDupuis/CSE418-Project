const PASSWORD_HASH_KEY = "secure_password_hash";
const SALT_KEY = "password_salt";
const ITERATIONS = 100000;

export interface PasswordHashData {
	hash: string;
	salt: string;
	iterations: number;
	timestamp: number;
}

async function hashPassword(password: string, salt: string, iterations: number): Promise<string> {
	const encoder = new TextEncoder();
	const passwordBuffer = encoder.encode(password);
	const saltBuffer = encoder.encode(salt);

	const keyMaterial = await crypto.subtle.importKey("raw", passwordBuffer, "PBKDF2", false, ["deriveBits"]);

	const derivedBits = await crypto.subtle.deriveBits(
		{
			name: "PBKDF2",
			salt: saltBuffer,
			iterations: iterations,
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

	const salt = "STATIC SALT EVERY DEVICE THAT USER LOG-IN TO PAGE TO HAVE THE SAME ONE";
	const hash = await hashPassword(password, salt, ITERATIONS);

	const hashData: PasswordHashData = {
		hash,
		salt,
		iterations: ITERATIONS,
		timestamp: Date.now(),
	};

	try {
		localStorage.setItem(PASSWORD_HASH_KEY, JSON.stringify(hashData));
		localStorage.setItem(SALT_KEY, salt);
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
