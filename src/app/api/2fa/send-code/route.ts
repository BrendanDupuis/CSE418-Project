import { NextResponse } from "next/server";
import { IS_PREVIEW } from "@/app/cost";
import { sendVerificationCodeEmail } from "@/lib/email";
import { generateVerificationCode, storeVerificationCode } from "@/lib/models/verificationCode";
import { checkSendCodeLimit } from "@/lib/rateLimiter";

export const runtime = "edge";

/**
 * POST /api/2fa/send-code
 * Generate and send 2FA verification code (using Firebase Firestore)
 */
export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { userId, email } = body;

		if (!userId || !email) {
			return NextResponse.json({ error: "Missing userId or email" }, { status: 400 });
		}

		// Check rate limits
		const rateLimit = await checkSendCodeLimit(userId);
		if (!rateLimit.isAllowed) {
			const resetTime = new Date(rateLimit.resetTime).toISOString();
			return NextResponse.json(
				{
					error: "Too many requests. Please try again later.",
					retryAfter: resetTime,
					remaining: rateLimit.remaining,
				},
				{
					status: 429,
					headers: {
						"Retry-After": Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
						"X-RateLimit-Limit": "3",
						"X-RateLimit-Remaining": rateLimit.remaining.toString(),
						"X-RateLimit-Reset": resetTime,
					},
				},
			);
		}

		// Generate verification code using crypto
		const code = generateVerificationCode();

		// Store code in Firestore with expiration
		await storeVerificationCode(userId, code, 10); // 10 minutes expiration

		// Send email using Resend
		const emailSent = await sendVerificationCodeEmail(email, code);

		if (!emailSent) {
			if (!IS_PREVIEW) {
				throw new Error("Unable to send email");
			}

			console.warn("Failed to send email, but code was stored");
			// Development fallback: log code to console
			console.log(`
=================================
2FA Verification Code (Fallback)
=================================
Email: ${email}
User ID: ${userId}
Code: ${code}
Expires in: 10 minutes
=================================
			`);
		}

		return NextResponse.json(
			{
				success: true,
				message: "Verification code sent successfully",
				remaining: rateLimit.remaining,
			},
			{
				headers: {
					"X-RateLimit-Limit": "3",
					"X-RateLimit-Remaining": rateLimit.remaining.toString(),
					"X-RateLimit-Reset": new Date(rateLimit.resetTime).toISOString(),
				},
			},
		);
	} catch (error: unknown) {
		console.error("Error in send-code API:", error);
		const errorMessage = error instanceof Error ? error.message : "Internal server error";
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}
