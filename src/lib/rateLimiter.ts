import "server-only";
import { clearFirestoreCache, getAdminFirestore } from "@/lib/firebase-admin";

interface RateLimitEntry {
	count: number;
	resetTime: string;
	lastAttempt: string;
}

interface RateLimitConfig {
	maxAttempts: number;
	windowMs: number;
}

// Rate limit configurations
export const RATE_LIMITS = {
	SEND_CODE: {
		maxAttempts: 15,
		windowMs: 60 * 60 * 1000, // 1 hour
	},

	VERIFY_CODE: {
		maxAttempts: 25,
		windowMs: 15 * 60 * 1000,
	},
} as const;

/**
 * Check rate limit using Firestore as storage
 * This works on Cloudflare Edge because it uses server-side Firestore access
 */
export async function checkRateLimit(key: string, config: RateLimitConfig): Promise<{ isAllowed: boolean; remaining: number; resetTime: number }> {
	const db = await getAdminFirestore();
	const now = Date.now();
	const resetTime = now + config.windowMs;

	try {
		const docRef = db.doc(`rate_limits/${key}`);
		// biome-ignore lint/suspicious/noExplicitAny: Firebase REST API response type
		const docSnap: any = await docRef.get();

		if (!docSnap || !docSnap.exists()) {
			const entry: RateLimitEntry = {
				count: 1,
				resetTime: new Date(resetTime).toISOString(),
				lastAttempt: new Date(now).toISOString(),
			};

			try {
				await docRef.set(entry);
				return {
					isAllowed: true,
					remaining: config.maxAttempts - 1,
					resetTime,
				};
			} catch (setError) {
				console.error("Failed to set rate limit entry:", setError);
				return {
					isAllowed: true,
					remaining: config.maxAttempts,
					resetTime: now + config.windowMs,
				};
			}
		}

		const data = docSnap?.data() as RateLimitEntry;
		if (!data) {
			// Data is null/undefined, treat as new entry
			const entry: RateLimitEntry = {
				count: 1,
				resetTime: new Date(resetTime).toISOString(),
				lastAttempt: new Date(now).toISOString(),
			};

			try {
				await docRef.set(entry);
				return {
					isAllowed: true,
					remaining: config.maxAttempts - 1,
					resetTime,
				};
			} catch (setError) {
				console.error("Failed to set rate limit entry:", setError);
				return {
					isAllowed: true,
					remaining: config.maxAttempts,
					resetTime: now + config.windowMs,
				};
			}
		}

		const storedResetTime = new Date(data.resetTime).getTime();

		if (now > storedResetTime) {
			try {
				await docRef.set({
					count: 1,
					resetTime: new Date(resetTime).toISOString(),
					lastAttempt: new Date(now).toISOString(),
				});

				return {
					isAllowed: true,
					remaining: config.maxAttempts - 1,
					resetTime,
				};
			} catch (setError) {
				console.error("Failed to reset rate limit entry:", setError);
				return {
					isAllowed: true,
					remaining: config.maxAttempts,
					resetTime: now + config.windowMs,
				};
			}
		}

		if (data.count >= config.maxAttempts) {
			return {
				isAllowed: false,
				remaining: 0,
				resetTime: storedResetTime,
			};
		}

		try {
			await docRef.update({
				count: data.count + 1,
				lastAttempt: new Date(now).toISOString(),
			});

			return {
				isAllowed: true,
				remaining: config.maxAttempts - (data.count + 1),
				resetTime: storedResetTime,
			};
		} catch (updateError) {
			console.error("Failed to update rate limit entry:", updateError);
			return {
				isAllowed: true,
				remaining: config.maxAttempts,
				resetTime: now + config.windowMs,
			};
		}
	} catch (error) {
		console.error("Rate limit check failed:", error);

		if (
			error instanceof Error &&
			(error.message.includes("authentication credentials") || error.message.includes("OAuth 2 access token") || error.message.includes("401") || error.message.includes("403"))
		) {
			console.log("Authentication error detected, clearing Firestore cache and retrying...");
			clearFirestoreCache();

			try {
				const db = await getAdminFirestore();
				const docRef = db.doc(`rate_limits/${key}`);
				// biome-ignore lint/suspicious/noExplicitAny: Firebase REST API response type
				const docSnap: any = await docRef.get();

				if (!docSnap || !docSnap.exists()) {
					const entry: RateLimitEntry = {
						count: 1,
						resetTime: new Date(now + config.windowMs).toISOString(),
						lastAttempt: new Date(now).toISOString(),
					};
					await docRef.set(entry);
					return {
						isAllowed: true,
						remaining: config.maxAttempts - 1,
						resetTime: now + config.windowMs,
					};
				}

				const data = docSnap?.data() as RateLimitEntry;
				if (!data) {
					const entry: RateLimitEntry = {
						count: 1,
						resetTime: new Date(now + config.windowMs).toISOString(),
						lastAttempt: new Date(now).toISOString(),
					};
					await docRef.set(entry);
					return {
						isAllowed: true,
						remaining: config.maxAttempts - 1,
						resetTime: now + config.windowMs,
					};
				}

				const storedResetTime = new Date(data.resetTime).getTime();
				if (now > storedResetTime) {
					await docRef.set({
						count: 1,
						resetTime: new Date(now + config.windowMs).toISOString(),
						lastAttempt: new Date(now).toISOString(),
					});
					return {
						isAllowed: true,
						remaining: config.maxAttempts - 1,
						resetTime: now + config.windowMs,
					};
				}

				if (data.count >= config.maxAttempts) {
					return {
						isAllowed: false,
						remaining: 0,
						resetTime: storedResetTime,
					};
				}

				await docRef.update({
					count: data.count + 1,
					lastAttempt: new Date(now).toISOString(),
				});

				return {
					isAllowed: true,
					remaining: config.maxAttempts - (data.count + 1),
					resetTime: storedResetTime,
				};
			} catch (retryError) {
				console.error("Retry after cache clear also failed:", retryError);
			}
		}

		return {
			isAllowed: true,
			remaining: config.maxAttempts,
			resetTime: now + config.windowMs,
		};
	}
}

/**
 * Check rate limit for send code endpoint
 */
export async function checkSendCodeLimit(userId: string): Promise<{ isAllowed: boolean; remaining: number; resetTime: number }> {
	// Check only user-specific limits
	return await checkRateLimit(`send_code_user_${userId}`, RATE_LIMITS.SEND_CODE);
}

/**
 * Check rate limit for verify code endpoint
 */
export async function checkVerifyCodeLimit(userId: string): Promise<{ isAllowed: boolean; remaining: number; resetTime: number }> {
	// Check only user-specific limits
	return await checkRateLimit(`verify_code_user_${userId}`, RATE_LIMITS.VERIFY_CODE);
}

export async function resetUserLimits(userId: string): Promise<void> {
	const db = await getAdminFirestore();

	try {
		const sendCodeRef = db.doc(`rate_limits/send_code_user_${userId}`);
		const verifyCodeRef = db.doc(`rate_limits/verify_code_user_${userId}`);

		// Try to delete both documents, but don't fail if they don't exist
		const deletePromises = [
			sendCodeRef.delete().catch((error) => {
				console.log(`Send code rate limit for user ${userId} may not exist:`, error.message);
			}),
			verifyCodeRef.delete().catch((error) => {
				console.log(`Verify code rate limit for user ${userId} may not exist:`, error.message);
			}),
		];

		await Promise.all(deletePromises);
		console.log(`Reset rate limits for user ${userId}`);
	} catch (error) {
		console.error("Failed to reset user limits:", error);
	}
}

export async function cleanupExpiredRateLimits(): Promise<number> {
	const db = await getAdminFirestore();
	const now = new Date().toISOString();

	try {
		const collectionRef = db.collection("rate_limits");
		const querySnapshot = await collectionRef.where("resetTime", "<", now).get();

		if (querySnapshot.error) {
			console.error("Failed to query expired rate limits:", querySnapshot.error);
			return 0;
		}

		let deletedCount = 0;

		// Delete each expired document individually
		for (const doc of querySnapshot.docs) {
			const docRef = db.doc(`rate_limits/${doc.id}`);

			try {
				await docRef.delete();
				deletedCount++;
			} catch (deleteError) {
				console.error(`Failed to delete expired rate limit ${doc.id}:`, deleteError);
			}
		}

		console.log(`Cleaned up ${deletedCount} expired rate limit entries`);
		return deletedCount;
	} catch (error) {
		console.error("Failed to cleanup expired rate limits:", error);
		return 0;
	}
}
