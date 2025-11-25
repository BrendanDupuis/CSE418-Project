"use client";

import { confirmPasswordReset, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { reencryptAllChatKeys } from "@/app/_components/keyGen";
import { firebaseAuth } from "@/lib/firebase";
import { validatePassword } from "@/lib/password-validation";

interface Props {
	oobCode: string;
}

export function PasswordReset({ oobCode }: Props) {
	const router = useRouter();
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [oldPassword, setOldPassword] = useState("");
	const [email, setEmail] = useState("");
	const [show, setShow] = useState(false);
	const [showOldPassword, setShowOldPassword] = useState(false);
	const [err, setErr] = useState<string | null>(null);
	const [ok, setOk] = useState<string | null>(null);
	const [reencrypting, setReencrypting] = useState(false);

	async function handlePasswordReset(e: React.FormEvent) {
		e.preventDefault();
		setErr(null);
		setOk(null);
		setReencrypting(false);

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

		// If old password is provided, email is required for re-encryption
		if (oldPassword && !email) {
			setErr("Email is required to update your chat keys. Please provide your email address.");
			return;
		}

		try {
			// Reset the password
			await confirmPasswordReset(firebaseAuth, oobCode, password);

			// If old password is provided, re-encrypt all chat keys
			if (oldPassword && email) {
				setReencrypting(true);
				try {
					// Sign in with the new password to get user ID
					const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
					const userId = userCredential.user.uid;

					// Re-encrypt all chat keys
					const result = await reencryptAllChatKeys(userId, oldPassword, password);

					// Sign out after re-encryption
					await signOut(firebaseAuth);

					if (result.failed === 0) {
						setOk(`Password reset successful! All ${result.success} chat key(s) have been updated. You can now sign in with your new password.`);
					} else if (result.success > 0) {
						setOk(`Password reset successful! ${result.success} chat key(s) updated, but ${result.failed} failed. You can now sign in with your new password.`);
						console.error("Some keys failed to re-encrypt:", result.errors);
					} else {
						setErr(`Password reset successful, but failed to update chat keys. You may need to contact support. Errors: ${result.errors.join(", ")}`);
					}
				} catch (reencryptError) {
					// Sign out if we signed in
					try {
						await signOut(firebaseAuth);
					} catch {}

					let reencryptMessage = "Password reset successful, but failed to update chat keys.";
					if (typeof reencryptError === "object" && reencryptError !== null && "code" in reencryptError) {
						const errObj = reencryptError as { code?: string; message?: string };
						if (errObj.code === "auth/invalid-credential" || errObj.code === "auth/user-not-found") {
							reencryptMessage = "Password reset successful, but could not sign in to update keys. Please verify your email address.";
						} else {
							reencryptMessage = `Password reset successful, but failed to update chat keys: ${errObj.message || "Unknown error"}`;
						}
					}
					setErr(reencryptMessage);
					console.error("Failed to re-encrypt keys:", reencryptError);
				} finally {
					setReencrypting(false);
				}
			} else {
				setOk("Password reset successful! Note: Your chat keys are still encrypted with your old password. You'll need to provide your old password on next login to update them.");
			}
		} catch (e: unknown) {
			let message = "Failed to reset password.";
			if (typeof e === "object" && e !== null && "code" in e) {
				const errObj = e as { code?: string };
				switch (errObj.code) {
					case "auth/expired-action-code":
						message = "Reset code has expired. Please request a new password reset.";
						break;
					case "auth/invalid-action-code":
						message = "Invalid reset code. Please request a new password reset.";
						break;
					case "auth/weak-password":
						message = "Password is too weak. Please choose a stronger password.";
						break;
				}
			}
			setErr(message);
		}
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
					onSubmit={handlePasswordReset}
					style={{
						width: "100%",
						border: "1px solid rgba(0,0,0,.15)",
						borderRadius: 12,
						padding: 20,
					}}
					noValidate
				>
					<h1 style={{ margin: 0, fontSize: "1.25rem" }}>Reset Password</h1>
					<p style={{ marginTop: 6, color: "gray" }}>Enter your new password below. To update your chat encryption keys, provide your old password and email.</p>

					{oldPassword && (
						<div style={{ marginTop: 12 }}>
							<label htmlFor="email" style={{ display: "block", marginBottom: 6 }}>
								Email Address
							</label>
							<input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} required={!!oldPassword} />
							<p style={{ marginTop: 4, fontSize: "0.875rem", color: "gray" }}>Required to update your chat keys</p>
						</div>
					)}

					<div style={{ marginTop: 12 }}>
						<label htmlFor="old_password" style={{ display: "block", marginBottom: 6 }}>
							Old Password <span style={{ color: "gray", fontWeight: "normal" }}>(Optional)</span>
						</label>
						<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
							<input
								id="old_password"
								type={showOldPassword ? "text" : "password"}
								autoComplete="current-password"
								value={oldPassword}
								onChange={(e) => setOldPassword(e.target.value)}
								style={{ ...inputStyle, flex: 1 }}
							/>
							<button type="button" onClick={() => setShowOldPassword((s) => !s)} style={linkButton} aria-pressed={showOldPassword}>
								{showOldPassword ? "Hide" : "Show"}
							</button>
						</div>
						<p style={{ marginTop: 4, fontSize: "0.875rem", color: "gray" }}>Provide your old password to automatically update your chat encryption keys</p>
					</div>

					<div style={{ marginTop: 12 }}>
						<label htmlFor="password" style={{ display: "block", marginBottom: 6 }}>
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
							<button type="button" onClick={() => setShow((s) => !s)} style={linkButton} aria-pressed={show}>
								{show ? "Hide" : "Show"}
							</button>
						</div>
					</div>

					<div style={{ marginTop: 12 }}>
						<label htmlFor="confirm_password" style={{ display: "block", marginBottom: 6 }}>
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
						<div style={{ color: "#b91c1c", minHeight: 20, marginTop: 4 }}>{err}</div>
					</div>

					<div style={{ display: "flex", gap: 8, marginTop: 8 }}>
						<button type="submit" style={reencrypting ? primaryButtonDisabled : primaryButton} disabled={reencrypting}>
							{reencrypting ? "Updating Keys..." : "Reset Password"}
						</button>
						<button
							type="button"
							onClick={() => router.push("/")}
							style={reencrypting ? { ...linkButton, opacity: 0.6, cursor: "not-allowed" } : linkButton}
							disabled={reencrypting}
						>
							Back to Sign In
						</button>
					</div>

					<div style={{ color: "#047857", minHeight: 20, marginTop: 8 }}>{ok}</div>
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

const primaryButtonDisabled: React.CSSProperties = {
	...primaryButton,
	background: "#9ca3af",
	cursor: "not-allowed",
	opacity: 0.6,
};

const linkButton: React.CSSProperties = {
	background: "transparent",
	color: "#2563eb",
	border: 0,
	padding: 0,
	font: "inherit",
	cursor: "pointer",
};
