import { NextResponse } from "next/server";
import { createTwoFactorVerifiedToken } from "@/lib/custom-session-claims";
import { deleteVerificationCode, verifyCode } from "@/lib/models/verificationCode";
import { checkVerifyCodeLimit, cleanupExpiredRateLimits, resetUserLimits } from "@/lib/rateLimiter";

export const runtime = "edge";

/**
 * POST /api/2fa/verify-code
 * Verify the 2FA code entered by the user (stored in Firestore)
 */
export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { userId, code } = body;

		if (!userId || !code) {
			return NextResponse.json({ error: "Missing userId or code" }, { status: 400 });
		}

		// Check rate limits
		const rateLimit = await checkVerifyCodeLimit(userId);
		if (!rateLimit.isAllowed) {
			const resetTime = new Date(rateLimit.resetTime).toISOString();
			return NextResponse.json(
				{
					error: "Too many verification attempts. Please try again later.",
					retryAfter: resetTime,
					remaining: rateLimit.remaining,
				},
				{
					status: 429,
					headers: {
						"Retry-After": Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
						"X-RateLimit-Limit": "5",
						"X-RateLimit-Remaining": rateLimit.remaining.toString(),
						"X-RateLimit-Reset": resetTime,
					},
				},
			);
		}

		const isValid = await verifyCode(userId, code);

		if (!isValid) {
			console.log(`[verify-code] Invalid or expired code for user ${userId}`);
			return NextResponse.json({ error: "Invalid or expired verification code", valid: false }, { status: 400 });
		}

		await deleteVerificationCode(userId);
		await resetUserLimits(userId);
		await cleanupExpiredRateLimits();

		const customToken = await createTwoFactorVerifiedToken(userId);

		console.log(`[verify-code] 2FA verification successful for user: ${userId}`);

		return NextResponse.json(
			{
				valid: true,
				message: "Verification code is valid",
				customToken,
			},
			{
				headers: {
					"X-RateLimit-Limit": "5",
					"X-RateLimit-Remaining": "0",
					"X-RateLimit-Reset": new Date(rateLimit.resetTime).toISOString(),
				},
			},
		);
	} catch (error: unknown) {
		console.error("Error in verify-code API:", error);
		const errorMessage = error instanceof Error ? error.message : "Internal server error";
		return NextResponse.json({ error: errorMessage, valid: false }, { status: 500 });
	}
}
