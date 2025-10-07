"use client";

import { confirmPasswordReset } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase";
import { validatePassword } from "@/lib/password-validation";

export default function ResetPasswordPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [show, setShow] = useState(false);
	const [err, setErr] = useState<string | null>(null);
	const [ok, setOk] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [oobCode, setOobCode] = useState<string | null>(null);

	useEffect(() => {
		const code = searchParams.get("oobCode");
		if (!code) {
			setErr(
				"Invalid or missing reset code. Please request a new password reset.",
			);
			return;
		}
		setOobCode(code);
	}, [searchParams]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setErr(null);
		setOk(null);

		if (!oobCode) {
			setErr("Invalid reset code.");
			return;
		}

		if (!password || !confirmPassword) {
			setErr("Password and confirm password are required.");
			return;
		}

		if (password !== confirmPassword) {
			setErr("Passwords do not match");
			return;
		}

		const passwordError = validatePassword(password);
		if (passwordError) {
			setErr(passwordError);
			return;
		}

		setLoading(true);
		try {
			await confirmPasswordReset(firebaseAuth, oobCode, password);
			setOk(
				"Password reset successful! You can now sign in with your new password.",
			);
		} catch (e: unknown) {
			let message = "Failed to reset password.";
			if (typeof e === "object" && e !== null && "code" in e) {
				const errObj = e as { code?: string };
				switch (errObj.code) {
					case "auth/expired-action-code":
						message =
							"Reset code has expired. Please request a new password reset.";
						break;
					case "auth/invalid-action-code":
						message =
							"Invalid reset code. Please request a new password reset.";
						break;
					case "auth/weak-password":
						message =
							"Password is too weak. Please choose a stronger password.";
						break;
				}
			}
			setErr(message);
		} finally {
			setLoading(false);
		}
	}

	if (!oobCode && !err) {
		return (
			<div
				style={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					height: "100vh",
				}}
			>
				<div>Loading...</div>
			</div>
		);
	}

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
				<form
					onSubmit={handleSubmit}
					style={{
						width: "100%",
						border: "1px solid rgba(0,0,0,.15)",
						borderRadius: 12,
						padding: 20,
					}}
					noValidate
				>
					<h1 style={{ margin: 0, fontSize: "1.25rem" }}>Reset Password</h1>
					<p style={{ marginTop: 6, color: "gray" }}>
						Enter your new password below.
					</p>

					<div style={{ marginTop: 12 }}>
						<label
							htmlFor="password"
							style={{ display: "block", marginBottom: 6 }}
						>
							New Password
						</label>
						<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
							<input
								id="password"
								type={show ? "text" : "password"}
								autoComplete="new-password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								style={{ ...inputStyle, flex: 1 }}
								required
								minLength={8}
							/>
							<button
								type="button"
								onClick={() => setShow((s) => !s)}
								style={linkButton}
								aria-pressed={show}
							>
								{show ? "Hide" : "Show"}
							</button>
						</div>
					</div>

					<div style={{ marginTop: 12 }}>
						<label
							htmlFor="confirm_password"
							style={{ display: "block", marginBottom: 6 }}
						>
							Confirm New Password
						</label>
						<input
							id="confirm_password"
							type={show ? "text" : "password"}
							autoComplete="new-password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							style={inputStyle}
							required
							minLength={8}
						/>
						<div style={{ color: "#b91c1c", minHeight: 20, marginTop: 4 }}>
							{err}
						</div>
					</div>

					<div style={{ display: "flex", gap: 8, marginTop: 8 }}>
						<button type="submit" disabled={loading} style={primaryButton}>
							{loading ? "Resetting..." : "Reset Password"}
						</button>
						<button
							type="button"
							onClick={() => router.push("/")}
							style={linkButton}
						>
							Back to Sign In
						</button>
					</div>

					<div style={{ color: "#047857", minHeight: 20, marginTop: 8 }}>
						{ok}
					</div>
				</form>
			</div>
		</div>
	);
}

const inputStyle: React.CSSProperties = {
	width: "90%",
	padding: "10px 12px",
	borderRadius: 8,
	border: "1px solid rgba(0,0,0,.15)",
	font: "inherit",
};

const primaryButton: React.CSSProperties = {
	padding: "10px 14px",
	borderRadius: 8,
	border: 0,
	background: "#2563eb",
	color: "white",
	font: "inherit",
	cursor: "pointer",
};

const linkButton: React.CSSProperties = {
	background: "transparent",
	color: "#2563eb",
	border: 0,
	padding: 0,
	font: "inherit",
	cursor: "pointer",
};
