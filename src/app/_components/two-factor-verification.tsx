"use client";

import { signInWithCustomToken } from "firebase/auth";
import type React from "react";
import { useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase";
import { verifyCode } from "@/lib/twoFactorAuth";

type Props = {
	userId: string;
	email: string;
	onSuccess: () => void;
	onResend?: () => void;
};

export function TwoFactorVerification({ userId, email, onSuccess, onResend }: Props) {
	const [code, setCode] = useState(["", "", "", "", "", ""]);
	const [err, setErr] = useState<string | null>(null);
	const [isVerifying, setIsVerifying] = useState(false);

	useEffect(() => {
		const firstInput = document.getElementById("code-0");
		firstInput?.focus();
	}, []);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setErr(null);

		const fullCode = code.join("");
		if (fullCode.length !== 6) {
			setErr("Please enter the complete 6-digit code");
			return;
		}

		setIsVerifying(true);
		try {
			const result = await verifyCode(userId, fullCode);
			if (result.valid && result.customToken) {
				// Sign in with the custom token that contains 2FA claims
				await signInWithCustomToken(firebaseAuth, result.customToken);
				onSuccess();
			} else {
				setErr("Invalid or expired verification code");
			}
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : "Verification failed";
			setErr(errorMessage);
		} finally {
			setIsVerifying(false);
		}
	}

	function handleInputChange(index: number, value: string) {
		// Only allow digits
		if (value && !/^\d$/.test(value)) return;

		const newCode = [...code];
		newCode[index] = value;
		setCode(newCode);

		// Auto-focus next input
		if (value && index < 5) {
			const nextInput = document.getElementById(`code-${index + 1}`);
			nextInput?.focus();
		}
	}

	function handleKeyDown(index: number, e: React.KeyboardEvent) {
		if (e.key === "Backspace" && !code[index] && index > 0) {
			const prevInput = document.getElementById(`code-${index - 1}`);
			prevInput?.focus();
		}
	}

	function handlePaste(e: React.ClipboardEvent) {
		e.preventDefault();
		const pastedData = e.clipboardData.getData("text").slice(0, 6);
		if (!/^\d+$/.test(pastedData)) return;

		const newCode = [...code];
		for (let i = 0; i < pastedData.length; i++) {
			newCode[i] = pastedData[i];
		}
		setCode(newCode);

		// Focus the next empty input or last input
		const nextEmptyIndex = newCode.findIndex((c) => !c);
		const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;
		const input = document.getElementById(`code-${focusIndex}`);
		input?.focus();
	}

	return (
		<div
			style={{
				width: "100%",
				maxWidth: 420,
				border: "1px solid rgba(0,0,0,.15)",
				borderRadius: 12,
				padding: 20,
			}}
		>
			<h2 style={{ marginTop: 0 }}>Two-Factor Verification</h2>
			<p style={{ color: "gray" }}>A 6-digit verification code has been sent to {email}. Please enter it below.</p>

			<form onSubmit={handleSubmit}>
				<div
					style={{
						display: "flex",
						gap: 8,
						justifyContent: "center",
						marginTop: 20,
					}}
				>
					{code.map((digit, index) => (
						<input
							key={`verification-code-${index}-${digit}`}
							id={`code-${index}`}
							type="text"
							maxLength={1}
							value={digit}
							onChange={(e) => handleInputChange(index, e.target.value)}
							onKeyDown={(e) => handleKeyDown(index, e)}
							onPaste={index === 0 ? handlePaste : undefined}
							style={{
								width: 50,
								height: 50,
								textAlign: "center",
								fontSize: "1.5rem",
								border: "2px solid rgba(0,0,0,.15)",
								borderRadius: 8,
								outline: "none",
							}}
							disabled={isVerifying}
						/>
					))}
				</div>

				{err && (
					<div
						style={{
							color: "#b91c1c",
							marginTop: 12,
							textAlign: "center",
						}}
					>
						{err}
					</div>
				)}

				<div style={{ marginTop: 20 }}>
					<button
						type="submit"
						disabled={isVerifying || code.some((c) => !c)}
						style={{
							width: "100%",
							padding: "10px 14px",
							borderRadius: 8,
							border: 0,
							background: isVerifying || code.some((c) => !c) ? "#9ca3af" : "#2563eb",
							color: "white",
							font: "inherit",
							cursor: isVerifying || code.some((c) => !c) ? "not-allowed" : "pointer",
						}}
					>
						{isVerifying ? "Verifying..." : "Verify"}
					</button>
				</div>

				{onResend && (
					<div style={{ marginTop: 12, textAlign: "center" }}>
						<button
							type="button"
							onClick={onResend}
							disabled={isVerifying}
							style={{
								background: "transparent",
								color: "#2563eb",
								border: 0,
								padding: 0,
								font: "inherit",
								cursor: isVerifying ? "not-allowed" : "pointer",
								textDecoration: "underline",
							}}
						>
							Resend code
						</button>
					</div>
				)}
			</form>
		</div>
	);
}
