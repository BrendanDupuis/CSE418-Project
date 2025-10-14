"use client";

import { deleteUser } from "firebase/auth";
import { deleteDoc, doc } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { firebaseAuth, firebaseDb } from "@/lib/firebase";
import { deleteAllUserChats } from "@/lib/models/chat";
import { getUserData, type UserData } from "@/lib/models/user";

export default function HomePage() {
	const router = useRouter();

	const [showDeleteAccount, setShowDeleteAccount] = useState(false);
	const [userData, setUserData] = useState<UserData | null>(null);
	const [loading, setLoading] = useState(true);

	const handleDeleteAccount = async () => {
		try {
			const user = firebaseAuth.currentUser;
			if (!user) {
				alert("No user logged in");
				return;
			}

			await deleteAllUserChats(user.uid);
			await deleteDoc(doc(firebaseDb, "users", user.uid));
			await deleteUser(user);
			router.replace("/");
		} catch (error) {
			console.error("Error deleting account:", error);
			alert("Failed to delete account. Please try again.");
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
		<div>
			<h1>SecureDove Messaging App</h1>
			<h2>Signed In As: {userData.username}</h2>
			{userData && (
				<div style={{ marginBottom: "1rem", color: "#666" }}>
					<p>Email: {userData.email}</p>
					<p>
						Member since:{" "}
						{userData.createdAt?.toDate?.()?.toLocaleDateString() || "Unknown"}
					</p>
				</div>
			)}
			<nav>
				<Link href="/friendPage">Go to Friends</Link>
			</nav>

			<div>
				<h3>Account Settings</h3>
				<button
					type="button"
					onClick={() => setShowDeleteAccount(!showDeleteAccount)}
				>
					Delete Account
				</button>

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
		</div>
	);
}
