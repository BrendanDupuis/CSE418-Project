"use client";

import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { runTransaction, doc, serverTimestamp, setDoc, type Timestamp } from "firebase/firestore";
import type React from "react";
import { useState } from "react";
import { firebaseAuth, firebaseDb } from "@/lib/firebase";
import type { UserData } from "@/lib/models/user";
import { storePasswordHash } from "@/lib/password-hash";
import { validatePassword } from "@/lib/password-validation";

export function SingUpFrom() {
	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [password2, setPassword2] = useState("");

	const [show, setShow] = useState(false);
	const [err, setErr] = useState<string | null>(null);
	const [ok, setOk] = useState<string | null>(null);

	async function handleSubmit(e: React.FormEvent) {
	e.preventDefault();
	setErr(null);
	setOk(null);

	if (!username || !email || !password || !password2) {
		setErr("Email, Password, and Confirm Password are required.");
		return;
	}

	const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailPattern.test(email)) {
		setErr("Please enter a valid email address");
		return;
	}

	if (password !== password2) {
		setErr("Passwords do not match");
		return;
	}

	const passwordError = validatePassword(password);
	if (passwordError) {
		setErr(passwordError);
		return;
	}

	try {
		const userCredentials = await createUserWithEmailAndPassword(firebaseAuth, email, password);
		const { uid } = userCredentials.user;

		await storePasswordHash(password);

		await runTransaction(firebaseDb, async (tx) => {
			const ref = doc(firebaseDb, "usernames", username);
			const snap = await tx.get(ref);
			if (snap.exists()) {
				throw new Error("Username is already taken.");
			}
			tx.set(ref, { uid });
		});

		const userData: UserData = {
			username,
			email,
			createdAt: serverTimestamp() as Timestamp,
		};
		await setDoc(doc(firebaseDb, "users", uid), userData);

		// Send email verification
		await sendEmailVerification(userCredentials.user);

		// Reset form
		setUsername("");
		setEmail("");
		setPassword("");
		setPassword2("");
		setOk("Sign up complete! Please check your email to verify your account.");
		} catch (e: unknown) {
			if (e instanceof Error && e.message === "Username is already taken.") {
				setErr("Username is taken, choose another.");
				
			}
			else{
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
				case "auth/email-already-in-use":
					message = "An account with this email already exists. Please sign in instead.";
					break;
				case "auth/password-does-not-meet-requirements": {
					message =
						"Missing password requirements: [Password must contain at least 8 characters, Password must contain an upper case character, Password must contain a numeric character, Password must contain a non-alphanumeric character]";
					break;
				}
			}

			setErr(message);
		}
		}
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
				<label htmlFor="username" style={{ display: "block", marginBottom: 6 }}>
					Username
				</label>
				<input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle} required />
				<div
					style={{
						marginTop: "0.5rem",
						padding: "0.5rem",
						backgroundColor: "#fef3c7",
						border: "1px solid #f59e0b",
						borderRadius: "4px",
						fontSize: "0.9rem",
					}}
				>
					<strong>Note:</strong> Your username cannot be changed after account creation.
				</div>
			</div>

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
			</div>

			<div style={{ marginTop: 12 }}>
				<label htmlFor="confirm_password" style={{ display: "block", marginBottom: 6 }}>
					Confirm password
				</label>
				<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
					<input
						id="confirm_password"
						type={show ? "text" : "password"}
						autoComplete="confirm-current-password"
						value={password2}
						onChange={(e) => setPassword2(e.target.value)}
						style={{ ...inputStyle, flex: 1 }}
						required
						minLength={8}
					/>
				</div>
				<div style={{ color: "#b91c1c", minHeight: 20, marginTop: 4 }}>{err}</div>
			</div>

			<div style={{ display: "flex", gap: 8, marginTop: 8 }}>
				<button type="submit" style={primaryButton}>
					Sign up
				</button>
			</div>

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