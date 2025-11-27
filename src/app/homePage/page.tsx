"use client";

import { deleteUser, signOut } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChangePassword } from "@/app/_components/change-password";
import { firebaseAuth } from "@/lib/firebase";
import { deleteAllUserChats } from "@/lib/models/chat";
import { getUserData, markUserAsDeleted, type UserData } from "@/lib/models/user";
import { AuthenticatedLayout } from "../_components/authenticated-layout";

export default function HomePage() {
	const router = useRouter();

	const [showDeleteAccount, setShowDeleteAccount] = useState(false);
	const [userData, setUserData] = useState<UserData | null>(null);
	const [loading, setLoading] = useState(true);

	const handleDeleteAccount = async () => {
		try {
			const user = firebaseAuth.currentUser;
			if (!user || !user.email) {
				alert("No user logged in");
				return;
			}

			// Check if 2FA login is still valid (within 2 minutes)
			if (typeof window !== "undefined") {
				const loginTimeStr = window.sessionStorage.getItem("twoFactorLoginTime");
				if (loginTimeStr) {
					const loginTime = parseInt(loginTimeStr, 10);
					const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
					if (loginTime < twoMinutesAgo) {
						alert("Your 2FA session has expired. Please log in again and complete 2FA before deleting your account.");
						window.sessionStorage.removeItem("twoFactorLoginTime");
						await signOut(firebaseAuth);
						router.replace("/");
						return;
					}
				} else {
					alert("Unable to verify 2FA status. Please log in again.");
					await signOut(firebaseAuth);
					router.replace("/");
					return;
				}
			}

			console.log("Deleting user chats...");
			await deleteAllUserChats(user.uid);
			console.log("User chats deleted successfully");

			console.log("Marking user as deleted...");
			await markUserAsDeleted(user.uid);
			console.log("User marked as deleted successfully");

			console.log("Deleting Firebase user...");
			await deleteUser(user);
			console.log("Firebase user deleted successfully");

			// Sign out the user after successful deletion
			console.log("Signing out user...");
			await signOut(firebaseAuth);
			console.log("User signed out successfully");

			router.replace("/");
		} catch (error: unknown) {
			console.error("Error deleting account:", error);
			if (error && typeof error === "object" && "code" in error) {
				const firebaseError = error as { code: string };
				if (firebaseError.code === "auth/wrong-password") {
					alert("Incorrect password. Please try again.");
				} else if (firebaseError.code === "auth/too-many-requests") {
					alert("Too many failed attempts. Please try again later.");
				} else {
					alert("Failed to delete account. Please try again.");
				}
			} else {
				alert("Failed to delete account. Please try again.");
			}
		}
	};

	useEffect(() => {
		const fetchUserData = async () => {
			const user = firebaseAuth.currentUser;
			if (user) {
				const data = await getUserData(user.uid);
				setUserData(data);
			}
			setLoading(false);
		};

		fetchUserData();
	}, []);

	if (loading) {
		return (
			<div>
				<h1>SecureDove Messaging App</h1>
				<p>Loading...</p>
			</div>
		);
	}

	if (!userData) {
		router.replace("/");
		return;
	}

	return (
		<>
			<AuthenticatedLayout title="SecureDove Messaging App">
				<h2>Signed In As: {userData.username}</h2>
				{userData && (
					<div style={{ marginBottom: "1rem", color: "#666" }}>
						<p>Email: {userData.email}</p>
						<p>Member since: {userData.createdAt?.toDate?.()?.toLocaleDateString() || "Unknown"}</p>
						{userData.deletedAt && <p style={{ color: "#dc2626", fontWeight: "bold" }}>Account deleted on: {userData.deletedAt?.toDate?.()?.toLocaleDateString() || "Unknown"}</p>}
					</div>
				)}
				<nav>
					<Link href="/friendPage">Go to Friends</Link>
				</nav>

				<div>
					<h3>Account Settings</h3>
					<div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
						<ChangePassword />
						<button type="button" onClick={() => setShowDeleteAccount(!showDeleteAccount)}>
							Delete Account
						</button>
					</div>

					{showDeleteAccount && (
						<div>
							<p>Are you sure you want to delete your account?</p>
							<div>
								<button type="button" onClick={handleDeleteAccount}>
									Yes
								</button>
								<button type="button" onClick={() => setShowDeleteAccount(false)}>
									No
								</button>
							</div>
						</div>
					)}
				</div>
			</AuthenticatedLayout>
			<style jsx>{`
              *{
              text-align: center;
              }
                h1 {
                
                    font-size: 4rem;
                    margin-bottom: 1rem;
                }
                h2 {
                
                    font-size: 2rem;
                    margin-bottom: 2rem;              
                }
                    nav {
                    text-align: center;
                    font-size: 2rem;
                    margin-bottom: 2rem;      
                }
                h3 {
                
                    font-size: 2rem;
                }
                button{
                
                  align-items: center;
                  color: red;
                  font-size: 2rem;
                }
                
                
            `}</style>
		</>
	);
}
