/**
 * Client-side 2FA functions that call server-side APIs
 * This keeps sensitive operations (code generation, email sending) on the server
 */

/**
 * Request the server to generate and send a verification code
 */
export async function sendVerificationCode(
	userId: string,
	email: string,
): Promise<void> {
	const response = await fetch("/api/2fa/send-code", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ userId, email }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to send verification code");
	}

	const data = await response.json();
	console.log(data.message);
}

/**
 * Verify the code entered by the user
 */
export async function verifyCode(
	userId: string,
	code: string,
): Promise<boolean> {
	const response = await fetch("/api/2fa/verify-code", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ userId, code }),
	});

	const data = await response.json();

	if (!response.ok) {
		console.error(data.error);
		return false;
	}

	return data.valid;
}

// Backward compatibility exports (deprecated - use sendVerificationCode instead)
/**
 * @deprecated Use sendVerificationCode instead
 */
export function generateVerificationCode(): string {
	console.warn(
		"generateVerificationCode is deprecated. Code generation now happens server-side.",
	);
	return "000000"; // Dummy value
}

/**
 * @deprecated Use sendVerificationCode instead
 */
export async function storeVerificationCode(
	userId: string,
	code: string,
): Promise<void> {
	console.warn(
		"storeVerificationCode is deprecated. Storage now happens server-side via sendVerificationCode.",
	);
}

/**
 * @deprecated Use sendVerificationCode instead
 */
export async function sendVerificationEmail(
	email: string,
	code: string,
): Promise<void> {
	console.warn(
		"sendVerificationEmail is deprecated. Email sending now happens server-side via sendVerificationCode.",
	);
}
