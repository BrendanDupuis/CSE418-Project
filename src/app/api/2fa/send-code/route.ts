import { NextResponse } from "next/server";
import {
	storeVerificationCode,
	generateVerificationCode,
} from "@/lib/models/verificationCode";
import { sendVerificationCodeEmail } from "@/lib/email";

/**
 * POST /api/2fa/send-code
 * Generate and send 2FA verification code (using Firebase Firestore)
 */
export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { userId, email } = body;

		if (!userId || !email) {
			return NextResponse.json(
				{ error: "Missing userId or email" },
				{ status: 400 },
			);
		}

		// Generate verification code using crypto
		const code = generateVerificationCode();

		// Store code in Firestore with expiration
		await storeVerificationCode(userId, code, 10); // 10 minutes expiration

		// Send email using Resend
		const emailSent = await sendVerificationCodeEmail(email, code);

		if (!emailSent) {
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

		return NextResponse.json({
			success: true,
			message: "Verification code sent successfully",
		});
	} catch (error: any) {
		console.error("Error in send-code API:", error);
		return NextResponse.json(
			{ error: error.message || "Internal server error" },
			{ status: 500 },
		);
	}
}
