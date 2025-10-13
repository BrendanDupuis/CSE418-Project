import { getAuth } from "firebase/admin/auth";
import { initializeApp, getApps, cert } from "firebase/admin/app";
import { NextResponse } from "next/server";

// Initialize Firebase Admin (only once)
if (getApps().length === 0) {
	// For development: use the same project with reduced permissions
	initializeApp({
		projectId: "cse418-software-sec",
	});
}

/**
 * POST /api/admin/verify-email
 * Manually verify a user's email (for testing only)
 */
export async function POST(request: Request) {
	try {
		const { email } = await request.json();

		if (!email) {
			return NextResponse.json({ error: "Email is required" }, { status: 400 });
		}

		const auth = getAuth();

		// Get user by email
		const user = await auth.getUserByEmail(email);

		// Update email verification status
		await auth.updateUser(user.uid, {
			emailVerified: true,
		});

		return NextResponse.json({
			success: true,
			message: `Email ${email} has been verified`,
			uid: user.uid,
		});
	} catch (error: any) {
		console.error("Error verifying email:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to verify email" },
			{ status: 500 },
		);
	}
}
