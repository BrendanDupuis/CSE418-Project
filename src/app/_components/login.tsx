"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import type React from "react";
import { useState } from "react";
import { firebaseAuth } from "@/lib/firebase";

type Props = {
	onSuccess?: () => void;
};

export function LoginForm({ onSuccess }: Props) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [show, setShow] = useState(false);
	const [err, setErr] = useState<string | null>(null);
	const [ok, setOk] = useState<string | null>(null);

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
			await signInWithEmailAndPassword(firebaseAuth, email, password);

			setOk("Signed in!");
			onSuccess?.();
		} catch (e: any) {
			let message = e.message || "Something went wrong.";
			switch (e.code) {
				case "auth/invalid-credential":
					message = "Invalid email or password";
					break;
				case "auth/invalid-email":
					message = "Invalid email";
			}

			setErr(message);
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
			<p style={{ marginTop: 6, color: "gray" }}>
				Use your email and password to sign in.
			</p>

			<div style={{ marginTop: 12 }}>
				<label htmlFor="email" style={{ display: "block", marginBottom: 6 }}>
					Email
				</label>
				<input
					id="email"
					type="email"
					autoComplete="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					style={inputStyle}
					required
				/>
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
					<button
						type="button"
						onClick={() => setShow((s) => !s)}
						style={linkButton}
						aria-pressed={show}
					>
						{show ? "Hide" : "Show"}
					</button>
				</div>
				<div style={{ color: "#b91c1c", minHeight: 20, marginTop: 4 }}>
					{err}
				</div>
			</div>

			<div style={{ display: "flex", gap: 8, marginTop: 8 }}>
				<button type="submit" style={primaryButton}>
					Sign in
				</button>
				<button type="button" style={linkButton}>
					Forgot password?
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
