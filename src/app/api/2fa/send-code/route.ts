import { NextResponse } from "next/server";
import { verificationStore } from "@/lib/verificationStore";

/**
 * Generate a random 6-digit verification code
 */
function generateVerificationCode(): string {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST /api/2fa/send-code
 * Generate and send 2FA verification code (using shared in-memory storage for testing)
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

		// Generate verification code
		const code = generateVerificationCode();

		// Store code in shared memory with expiration
		const expiresAt = new Date();
		expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Code expires in 10 minutes

		verificationStore.set(userId, {
			code,
			expiresAt: expiresAt.toISOString(),
			createdAt: new Date().toISOString(),
		});

		// Log to console for testing (since we don't have email configured)
		console.log(`
=================================
2FA Verification Code
=================================
Email: ${email}
User ID: ${userId}
Code: ${code}
Expires in: 10 minutes
Store size: ${verificationStore.size()}
=================================
		`);

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
