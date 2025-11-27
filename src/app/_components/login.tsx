"use client";

import { sendEmailVerification, signInWithEmailAndPassword, signOut } from "firebase/auth";
import type React from "react";
import { useState } from "react";
import { firebaseAuth } from "@/lib/firebase";
import { storePasswordHash } from "@/lib/password-hash";
import { sendVerificationCode } from "@/lib/twoFactorAuth";
import { TwoFactorVerification } from "./two-factor-verification";

type Props = {
	onSuccess?: () => void;
};

export function LoginForm({ onSuccess }: Props) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [show, setShow] = useState(false);
	const [err, setErr] = useState<string | null>(null);
	const [ok, setOk] = useState<string | null>(null);
	const [showResend, setShowResend] = useState(false);

	//2FA related states
	const [needs2FA, setNeeds2FA] = useState(false);
	const [userId, setUserId] = useState<string | null>(null);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setErr(null);
		setOk(null);

		if (!email || !password) {
			setErr("Email and password are required.");
			return;
		}
		if (password.length < 8) {
			setErr("Password must be at least 8 characters.");
			return;
		}

		try {
			if (typeof window !== "undefined") {
				window.sessionStorage.setItem("twoFactorPending", "true");
			}

			const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);

			const user = userCredential.user;

			await storePasswordHash(password);

			if (!user.emailVerified) {
				await signOut(firebaseAuth);
				setShowResend(true);
				setErr("Please verify your email address before signing in. Check your inbox for a verification email.");
				setNeeds2FA(false);
				setUserId(null);
				if (typeof window !== "undefined") {
					window.sessionStorage.removeItem("twoFactorPending");
				}
				return;
			}

			await sendVerificationCode(user.uid, user.email || email);

			setUserId(user.uid);
			setNeeds2FA(true);
			setOk("Verification code sent! Check your email.");

			await firebaseAuth.signOut();
		} catch (e: unknown) {
			if (typeof window !== "undefined") {
				window.sessionStorage.removeItem("twoFactorPending");
			}
			await firebaseAuth.signOut().catch(() => undefined);

			let message = "Something went wrong.";
			let code: string | undefined;
			if (typeof e === "object" && e !== null && "message" in e && "code" in e) {
				const errObj = e as { message?: string; code?: string };
				message = errObj.message ?? message;
				code = errObj.code;
			}
			switch (code) {
				case "auth/invalid-credential":
					message = "Invalid email or password";
					break;
				case "auth/invalid-email":
					message = "Invalid email";
					break;
			}

			setErr(message);
		}
	}

	async function handleResendVerification() {
		try {
			//First sign in to get the user, then send verification
			const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
			await sendEmailVerification(userCredential.user);
			await signOut(firebaseAuth);
			setOk("Verification email sent! Please check your inbox. (Check your spam)");
			setShowResend(false);
		} catch {
			setErr("Failed to send verification email. Please try again.");
		}
	}

	async function handleResendCode() {
		if (!userId) return;

		try {
			await sendVerificationCode(userId, email);
			setOk("New verification code sent!");
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Failed to resend code";
			setErr(message);
		}
	}

	async function handle2FASuccess() {
		if (typeof window !== "undefined") {
			window.sessionStorage.removeItem("twoFactorPending");
			// Store the login time for 2FA expiration check
			window.sessionStorage.setItem("twoFactorLoginTime", Date.now().toString());
		}

		// User is now signed in with custom token containing 2FA claims
		setNeeds2FA(false);
		setUserId(null);
		onSuccess?.();
	}

	//If 2FA is needed, show 2FA component
	if (needs2FA && userId) {
		return <TwoFactorVerification userId={userId} email={email} onSuccess={handle2FASuccess} onResend={handleResendCode} />;
	}

	return (
		<form
			onSubmit={handleSubmit}
			style={{
				width: "100%",
				maxWidth: 420,
				border: "1px solid rgba(0,0,0,.15)",
				borderRadius: 12,
				padding: 20,
			}}
			noValidate
		>
			<p style={{ marginTop: 6, color: "gray" }}>Use your email and password to sign in.</p>

			<div style={{ marginTop: 12 }}>
				<label htmlFor="email" style={{ display: "block", marginBottom: 6 }}>
					Email
				</label>
				<input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} required />
			</div>

			<div style={{ marginTop: 12 }}>
				<label htmlFor="password" style={{ display: "block", marginBottom: 6 }}>
					Password
				</label>
				<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
					<input
						id="password"
						type={show ? "text" : "password"}
						autoComplete="current-password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						style={{ ...inputStyle, flex: 1 }}
						required
						minLength={8}
					/>
					<button type="button" onClick={() => setShow((s) => !s)} style={linkButton} aria-pressed={show}>
						{show ? "Hide" : "Show"}
					</button>
				</div>
				<div style={{ color: "#b91c1c", minHeight: 20, marginTop: 4 }}>{err}</div>
			</div>

			<div style={{ display: "flex", gap: 8, marginTop: 8 }}>
				<button type="submit" style={primaryButton}>
					Sign in
				</button>
			</div>

			{showResend && (
				<div style={{ marginTop: 8 }}>
					<button type="button" onClick={handleResendVerification} style={linkButton}>
						Resend verification email
					</button>
				</div>
			)}

			<div style={{ color: "#047857", minHeight: 20, marginTop: 8 }}>{ok}</div>
		</form>
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
