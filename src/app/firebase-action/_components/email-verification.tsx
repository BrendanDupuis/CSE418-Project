"use client";

import { applyActionCode } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { firebaseAuth } from "@/lib/firebase";

interface Props {
	oobCode: string;
}

export function EmailVerification({ oobCode }: Props) {
	const router = useRouter();
	const [err, setErr] = useState<string | null>(null);
	const [ok, setOk] = useState<string | null>(null);
	const hasVerified = useRef(false);

	useEffect(() => {
		if (hasVerified.current) return;

		const handleEmailVerification = async (code: string) => {
			hasVerified.current = true;

			try {
				await applyActionCode(firebaseAuth, code);
				setOk(
					"Email verified successfully! You can now go to the sing in page.",
				);
			} catch (e: unknown) {
				let message = "Failed to verify email.";
				if (typeof e === "object" && e !== null && "code" in e) {
					const errObj = e as { code?: string };
					switch (errObj.code) {
						case "auth/expired-action-code":
							message =
								"Verification code has expired. Please request a new verification email.";
							break;
						case "auth/invalid-action-code":
							message =
								"Invalid verification code. Please request a new verification email.";
							break;
						case "auth/user-disabled":
							message = "This account has been disabled.";
							break;
						case "auth/user-not-found":
							message = "No account found with this email address.";
							break;
					}
				}
				setErr(message);
			}
		};

		handleEmailVerification(oobCode);
	}, [oobCode]);

	return (
		<div
			style={{
				display: "grid",
				placeItems: "center",
				minHeight: "100dvh",
				padding: 16,
			}}
		>
			<div style={{ width: "100%", maxWidth: 420 }}>
				<div
					style={{
						width: "100%",
						border: "1px solid rgba(0,0,0,.15)",
						borderRadius: 12,
						padding: 20,
						textAlign: "center",
					}}
				>
					<h1 style={{ margin: 0, fontSize: "1.25rem" }}>Email Verification</h1>
					{err && <div style={{ color: "#b91c1c", marginTop: 12 }}>{err}</div>}
					{ok && <div style={{ color: "#047857", marginTop: 12 }}>{ok}</div>}
					<div style={{ marginTop: 12 }}>
						<button
							type="button"
							onClick={() => router.push("/")}
							style={primaryButton}
						>
							Go to Sign In Page
						</button>
					</div>
				</div>
			</div>
		</div>
	);
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
