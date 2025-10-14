import { NextResponse } from "next/server";
import {
	verifyCode,
	deleteVerificationCode,
} from "@/lib/models/verificationCode";

/**
 * POST /api/2fa/verify-code
 * Verify the 2FA code entered by the user (stored in Firestore)
 */
export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { userId, code } = body;

		if (!userId || !code) {
			return NextResponse.json(
				{ error: "Missing userId or code" },
				{ status: 400 },
			);
		}

		const isValid = await verifyCode(userId, code);

		if (!isValid) {
			console.log(`[verify-code] Invalid or expired code for user ${userId}`);
			return NextResponse.json(
				{ error: "Invalid or expired verification code", valid: false },
				{ status: 400 },
			);
		}

		await deleteVerificationCode(userId);

		console.log(`[verify-code] 2FA verification successful for user: ${userId}`);

		return NextResponse.json({
			valid: true,
			message: "Verification code is valid",
		});
	} catch (error: any) {
		console.error("Error in verify-code API:", error);
		return NextResponse.json(
			{ error: error.message || "Internal server error", valid: false },
			{ status: 500 },
		);
	}
}
