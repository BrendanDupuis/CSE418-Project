import "server-only";

import { getFirebaseAuth } from "next-firebase-auth-edge";

export async function createTwoFactorVerifiedToken(userId: string): Promise<string> {
	try {
		const SERVICE_ACCOUNT = process.env["SERVICE_ACCOUNT"];

		if (!SERVICE_ACCOUNT) {
			throw new Error("Missing SERVICE_ACCOUNT environment variable");
		}

		const serviceAccount = JSON.parse(SERVICE_ACCOUNT);
		const auth = getFirebaseAuth({
			serviceAccount: {
				projectId: serviceAccount.project_id,
				privateKey: serviceAccount.private_key,
				clientEmail: serviceAccount.client_email,
			},
			apiKey: "dummy-api-key", // Not used for server-side operations
		});

		const customToken = await auth.createCustomToken(userId, {
			twoFactorVerified: true,
			twoFactorVerifiedAt: Date.now(),
		});

		console.log(`[Custom Claims] Created 2FA verified custom token for user: ${userId}`);
		return customToken;
	} catch (error) {
		console.error("Error creating 2FA custom token:", error);
		throw error;
	}
}
