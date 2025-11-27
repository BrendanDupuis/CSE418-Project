"use client";

import { updatePassword } from "firebase/auth";
import type React from "react";
import { useState } from "react";
import { reencryptAllChatKeys } from "@/app/_components/keyGen";
import { firebaseAuth } from "@/lib/firebase";
import { storePasswordHash, verifyPassword } from "@/lib/password-hash";
import { validatePassword } from "@/lib/password-validation";

export function ChangePassword() {
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showCurrentPassword, setShowCurrentPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [passwordErr, setPasswordErr] = useState<string | null>(null);
	const [passwordOk, setPasswordOk] = useState<string | null>(null);
	const [isChangingPassword, setIsChangingPassword] = useState(false);
	const [showForm, setShowForm] = useState(false);

	const handleChangePassword = async (e: React.FormEvent) => {
		e.preventDefault();
		setPasswordErr(null);
		setPasswordOk(null);

		if (!currentPassword || !newPassword || !confirmPassword) {
			setPasswordErr("All fields are required.");
			return;
		}

		if (newPassword !== confirmPassword) {
			setPasswordErr("New passwords do not match.");
			return;
		}

		const passwordError = validatePassword(newPassword);
		if (passwordError) {
			setPasswordErr(passwordError);
			return;
		}

		const user = firebaseAuth.currentUser;
		if (!user || !user.email) {
			setPasswordErr("No user logged in.");
			return;
		}

		// Verify the current password against the stored hash
		try {
			const isCurrentPasswordValid = await verifyPassword(currentPassword);
			if (!isCurrentPasswordValid) {
				setPasswordErr("Current password is incorrect.");
				return;
			}
		} catch (verifyError) {
			const errorMessage = verifyError instanceof Error ? verifyError.message : "Password verification failed. Please log out and log back in.";
			setPasswordErr(errorMessage);
			return;
		}

		setIsChangingPassword(true);

		try {
			// Re-encrypt all chat keys with the new password
			let result: { success: number; failed: number; errors: string[]; skipped: number };
			try {
				result = await reencryptAllChatKeys(user.uid, currentPassword, newPassword);
			} catch (reencryptError) {
				// Handle errors from reencryptAllChatKeys (like permissions errors)
				const errorMessage = reencryptError instanceof Error ? reencryptError.message : String(reencryptError);
				if (errorMessage.includes("Failed to get user chat IDs") || errorMessage.includes("permissions") || errorMessage.includes("Permission denied")) {
					setPasswordErr(
						"Unable to access your chat list due to authentication issues. Please log out and log back in to refresh your authentication token, then try changing your password again.",
					);
				} else {
					setPasswordErr(`Failed to update chat keys: ${errorMessage}`);
				}
				setIsChangingPassword(false);
				return;
			}

			// Check if we got a permissions error in the result
			if (result.errors.length > 0 && result.errors.some((err) => err.includes("Permission denied") || err.includes("permissions"))) {
				setPasswordErr(
					"Unable to access your chat list due to authentication issues. Please log out and log back in to refresh your authentication token, then try changing your password again.",
				);
				setIsChangingPassword(false);
				return;
			}

			// Only proceed with password update if re-encryption was successful (or had no keys to update)
			// If there were failures, we still want to update the password if at least some keys succeeded
			const shouldUpdatePassword = result.failed === 0 || result.success > 0;

			if (shouldUpdatePassword) {
				try {
					// Update Firebase password
					await updatePassword(user, newPassword);

					// Update password hash in localStorage
					await storePasswordHash(newPassword);
				} catch (updateError) {
					// Handle Firebase password update errors
					let message = "Failed to update password in Firebase.";
					if (typeof updateError === "object" && updateError !== null && "code" in updateError) {
						const errObj = updateError as { code?: string; message?: string };
						switch (errObj.code) {
							case "auth/weak-password":
								message = "New password is too weak.";
								break;
							case "auth/requires-recent-login":
								message = "Please log out and log back in before changing your password.";
								break;
							case "auth/user-mismatch":
								message = "The provided credentials do not match the current user.";
								break;
							case "auth/user-not-found":
								message = "User account not found.";
								break;
							case "auth/invalid-email":
								message = "Invalid email address.";
								break;
							default:
								message = errObj.message || message;
						}
					}
					setPasswordErr(message);
					setIsChangingPassword(false);
					return;
				}
			}

			// Clear form
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");

			const totalChats = result.success + result.failed + (result.skipped || 0);

			if (result.failed === 0) {
				if (totalChats === 0) {
					setPasswordOk("Password changed successfully! You don't have any chats yet, so no keys needed to be updated.");
				} else if (result.success === 0 && (result.skipped || 0) > 0) {
					setPasswordOk(`Password changed successfully! You have ${result.skipped} chat(s), but no encryption keys were found to update.`);
				} else {
					setPasswordOk(`Password changed successfully! All ${result.success} chat key(s) have been updated.`);
				}
			} else if (result.success > 0) {
				setPasswordOk(`Password changed successfully! ${result.success} chat key(s) updated, but ${result.failed} failed.`);
				console.error("Some keys failed to re-encrypt:", result.errors);
			} else if (result.success === 0 && result.errors.length > 0) {
				setPasswordErr(`Password changed, but failed to update chat keys. Errors: ${result.errors.join(", ")}`);
			} else {
				setPasswordErr(`Password changed, but failed to update chat keys. Errors: ${result.errors.join(", ")}`);
			}
		} catch (error: unknown) {
			let message = "Failed to change password.";
			if (typeof error === "object" && error !== null && "code" in error) {
				const errObj = error as { code?: string; message?: string };
				switch (errObj.code) {
					case "auth/wrong-password":
					case "auth/invalid-credential":
						message = "Current password is incorrect.";
						break;
					case "auth/weak-password":
						message = "New password is too weak.";
						break;
					case "auth/requires-recent-login":
						message = "Please log out and log back in before changing your password.";
						break;
					case "auth/user-mismatch":
						message = "The provided credentials do not match the current user.";
						break;
					case "auth/user-not-found":
						message = "User account not found.";
						break;
					case "auth/invalid-email":
						message = "Invalid email address.";
						break;
					default:
						message = errObj.message || message;
				}
			}
			setPasswordErr(message);
			console.error("Failed to change password:", error);
		} finally {
			setIsChangingPassword(false);
		}
	};

	const handleCancel = () => {
		setShowForm(false);
		setCurrentPassword("");
		setNewPassword("");
		setConfirmPassword("");
		setPasswordErr(null);
		setPasswordOk(null);
	};

	return (
		<div>
			<button type="button" onClick={() => setShowForm(!showForm)}>
				Change Password
			</button>

			{showForm && (
				<div style={{ marginTop: "1rem", padding: "1rem", border: "1px solid #e5e7eb", borderRadius: 8, maxWidth: 420, margin: "1rem auto" }}>
					<form onSubmit={handleChangePassword}>
						<h4 style={{ marginTop: 0 }}>Change Password</h4>
						<p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>
							Enter your current password and choose a new one. Your chat keys will be automatically updated.
						</p>

						<div style={{ marginBottom: "0.75rem" }}>
							<label htmlFor="current-password" style={{ display: "block", marginBottom: 6 }}>
								Current Password
							</label>
							<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
								<input
									id="current-password"
									type={showCurrentPassword ? "text" : "password"}
									autoComplete="current-password"
									value={currentPassword}
									onChange={(e) => setCurrentPassword(e.target.value)}
									style={{ ...passwordInputStyle, flex: 1 }}
									required
								/>
								<button type="button" onClick={() => setShowCurrentPassword((s) => !s)} style={passwordLinkButton}>
									{showCurrentPassword ? "Hide" : "Show"}
								</button>
							</div>
						</div>

						<div style={{ marginBottom: "0.75rem" }}>
							<label htmlFor="new-password" style={{ display: "block", marginBottom: 6 }}>
								New Password
							</label>
							<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
								<input
									id="new-password"
									type={showNewPassword ? "text" : "password"}
									autoComplete="new-password"
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									style={{ ...passwordInputStyle, flex: 1 }}
									required
									minLength={8}
								/>
								<button type="button" onClick={() => setShowNewPassword((s) => !s)} style={passwordLinkButton}>
									{showNewPassword ? "Hide" : "Show"}
								</button>
							</div>
						</div>

						<div style={{ marginBottom: "0.75rem" }}>
							<label htmlFor="confirm-password" style={{ display: "block", marginBottom: 6 }}>
								Confirm New Password
							</label>
							<input
								id="confirm-password"
								type={showNewPassword ? "text" : "password"}
								autoComplete="new-password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								style={passwordInputStyle}
								required
								minLength={8}
							/>
						</div>

						<div style={{ color: "#b91c1c", minHeight: 20, marginBottom: "0.5rem" }}>{passwordErr}</div>
						<div style={{ color: "#047857", minHeight: 20, marginBottom: "0.5rem" }}>{passwordOk}</div>

						<div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
							<button type="button" onClick={handleCancel} style={passwordLinkButton} disabled={isChangingPassword}>
								Cancel
							</button>
							<button type="submit" style={isChangingPassword ? passwordButtonDisabled : passwordButton} disabled={isChangingPassword}>
								{isChangingPassword ? "Updating..." : "Change Password"}
							</button>
						</div>
					</form>
				</div>
			)}
		</div>
	);
}

const passwordInputStyle: React.CSSProperties = {
	width: "90%",
	padding: "10px 12px",
	borderRadius: 8,
	border: "1px solid rgba(0,0,0,.15)",
	font: "inherit",
};

const passwordButton: React.CSSProperties = {
	padding: "10px 14px",
	borderRadius: 8,
	border: 0,
	background: "#2563eb",
	color: "white",
	font: "inherit",
	cursor: "pointer",
};

const passwordButtonDisabled: React.CSSProperties = {
	...passwordButton,
	background: "#9ca3af",
	cursor: "not-allowed",
	opacity: 0.6,
};

const passwordLinkButton: React.CSSProperties = {
	background: "transparent",
	color: "#2563eb",
	border: 0,
	padding: 0,
	font: "inherit",
	cursor: "pointer",
};
