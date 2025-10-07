"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { EmailVerification } from "./_components/email-verification";
import { PasswordReset } from "./_components/password-reset";

export default function FirebaseActionPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const oobCode = searchParams.get("oobCode");
	const mode = searchParams.get("mode");

	if (!oobCode) {
		return (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					alignItems: "center",
					height: "100vh",
					gap: 16,
				}}
			>
				<div>Invalid or missing action code. Please try again.</div>
				<button
					type="button"
					onClick={() => router.push("/")}
					style={primaryButton}
				>
					Go to Landing Page
				</button>
			</div>
		);
	}

	if (!mode) {
		return (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					alignItems: "center",
					height: "100vh",
					gap: 16,
				}}
			>
				<div>Invalid or missing action mode. Please try again.</div>
				<button
					type="button"
					onClick={() => router.push("/")}
					style={primaryButton}
				>
					Go to Landing Page
				</button>
			</div>
		);
	}

	switch (mode) {
		case "verifyEmail":
			return <EmailVerification oobCode={oobCode} />;
		case "resetPassword":
			return <PasswordReset oobCode={oobCode} />;
		default:
			return (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						justifyContent: "center",
						alignItems: "center",
						height: "100vh",
						gap: 16,
					}}
				>
					<div>Unknown action mode: {mode}</div>
					<button
						type="button"
						onClick={() => router.push("/")}
						style={primaryButton}
					>
						Go to Landing Page
					</button>
				</div>
			);
	}
}

const primaryButton: React.CSSProperties = {
	padding: "10px 14px",
	borderRadius: 8,
	border: 0,
	background: "#2563eb",
	color: "white",
	font: "inherit",
	cursor: "pointer",
};
