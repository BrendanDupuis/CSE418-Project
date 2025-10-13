import { Resend } from "resend";

/**
 * Create Resend client based on environment variables
 */
export function createResendClient() {
	const apiKey = process.env.RESEND_API_KEY;

	if (!apiKey) {
		console.warn("Resend API key not configured. Using fallback console logging.");
		return null;
	}

	return new Resend(apiKey);
}

/**
 * Send 2FA verification code email using Resend
 */
export async function sendVerificationCodeEmail(
	to: string,
	code: string,
): Promise<boolean> {
	try {
		const resend = createResendClient();

		if (!resend) {
			// Fallback: log to console for development
			console.log(`
=================================
2FA Verification Code
=================================
Email: ${to}
Code: ${code}
Expires in: 10 minutes
=================================
			`);
			return true;
		}

		const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

		const { data, error } = await resend.emails.send({
			from: fromEmail,
			to: [to],
			subject: "Your Two-Factor Authentication Code",
			html: `
				<!DOCTYPE html>
				<html>
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<title>2FA Verification Code</title>
				</head>
				<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
					<table role="presentation" style="width: 100%; border-collapse: collapse;">
						<tr>
							<td align="center" style="padding: 40px 0;">
								<table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
									<tr>
										<td style="padding: 40px 30px;">
											<h1 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Two-Factor Authentication</h1>
											<p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
												Your verification code is:
											</p>
											<div style="background-color: #f8f9fa; border: 2px solid #e9ecef; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
												<span style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px;">
													${code}
												</span>
											</div>
											<p style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.5;">
												This code will expire in <strong>10 minutes</strong>.
											</p>
											<p style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.5;">
												If you didn't request this code, please ignore this email or contact support if you have concerns.
											</p>
											<hr style="border: none; border-top: 1px solid #e9ecef; margin: 30px 0;">
											<p style="margin: 0; color: #999999; font-size: 12px;">
												This is an automated message, please do not reply to this email.
											</p>
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</body>
				</html>
			`,
			text: `Your two-factor authentication code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`,
		});

		if (error) {
			console.error("Error sending verification email with Resend:", error);
			return false;
		}

		console.log(`2FA verification email sent to ${to} (ID: ${data?.id})`);
		return true;
	} catch (error) {
		console.error("Error sending verification email:", error);
		return false;
	}
}
