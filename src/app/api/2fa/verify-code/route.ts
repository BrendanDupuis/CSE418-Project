import { NextResponse } from "next/server";
import { verificationStore } from "@/lib/verificationStore";

/**
 * POST /api/2fa/verify-code
 * Verify the 2FA code entered by the user (using shared in-memory storage for testing)
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

		// Get stored code from shared memory
		const storedData = verificationStore.get(userId);

		if (!storedData) {
			console.log(
				`[verify-code] Code not found for user ${userId}. Store size: ${verificationStore.size()}`,
			);
			return NextResponse.json(
				{ error: "Verification code not found or expired", valid: false },
				{ status: 404 },
			);
		}

		const expiresAt = new Date(storedData.expiresAt);

		// Check if code is expired
		if (expiresAt < new Date()) {
			verificationStore.delete(userId); // Clean up expired code
			return NextResponse.json(
				{ error: "Verification code has expired", valid: false },
				{ status: 400 },
			);
		}

		// Check if code matches
		if (storedData.code !== code) {
			console.log(
				`[verify-code] Code mismatch for user ${userId}. Expected: ${storedData.code}, Got: ${code}`,
			);
			return NextResponse.json(
				{ error: "Invalid verification code", valid: false },
				{ status: 400 },
			);
		}

		// Code is valid, delete it to prevent reuse
		verificationStore.delete(userId);

		console.log(`✅ 2FA verification successful for user: ${userId}`);

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
