import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { firebaseDb } from "./firebase";

/**
 * Generate a random 6-digit verification code
 */
export function generateVerificationCode(): string {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Store the verification code in Firestore with expiration time
 */
export async function storeVerificationCode(
	userId: string,
	code: string,
): Promise<void> {
	const expiresAt = new Date();
	expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Code expires in 10 minutes

	await setDoc(doc(firebaseDb, "verificationCodes", userId), {
		code,
		expiresAt: expiresAt.toISOString(),
		createdAt: new Date().toISOString(),
	});
}

/**
 * Verify the code entered by the user
 */
export async function verifyCode(
	userId: string,
	inputCode: string,
): Promise<boolean> {
	const docRef = doc(firebaseDb, "verificationCodes", userId);
	const docSnap = await getDoc(docRef);

	if (!docSnap.exists()) {
		return false;
	}

	const data = docSnap.data();
	const expiresAt = new Date(data.expiresAt);

	// Check if code is expired
	if (expiresAt < new Date()) {
		await deleteDoc(docRef); // Clean up expired code
		return false;
	}

	// Check if code matches
	if (data.code === inputCode) {
		await deleteDoc(docRef); // Delete code after successful verification
		return true;
	}

	return false;
}

/**
 * Send verification code via email (console log for now, can be replaced with actual email service)
 */
export async function sendVerificationEmail(
	email: string,
	code: string,
): Promise<void> {
	// For now, just log to console
	// In production, you would use a service like SendGrid, AWS SES, or Nodemailer
	console.log(`
=================================
2FA Verification Code
=================================
Email: ${email}
Code: ${code}
Expires in: 10 minutes
=================================
	`);

	// TODO: Implement actual email sending
	// Example with SendGrid:
	// await sendEmail({
	//   to: email,
	//   subject: "Your Verification Code",
	//   text: `Your verification code is: ${code}. It expires in 10 minutes.`
	// });
}
