"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase";
import { generateChatId } from "@/lib/models/chat";
import { subscribeToUsers, type UserWithId } from "@/lib/models/user";
import { AuthenticatedLayout } from "../_components/authenticated-layout";

export default function FriendsPage() {
	const [users, setUsers] = useState<UserWithId[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);

	useEffect(() => {
		// Get current user ID
		const currentUser = firebaseAuth.currentUser;
		if (currentUser) {
			setCurrentUserId(currentUser.uid);
		}

		// Set up real-time subscription to users
		const unsubscribe = subscribeToUsers(
			(usersData) => {
				const otherUsers = usersData.filter((user) => user.id !== currentUserId);
				setUsers(otherUsers);
				setLoading(false);
				setError(null);
			},
			(err) => {
				console.error("Error in users subscription:", err);
				setError("Failed to load users. Please try again.");
				setLoading(false);
			},
		);

		// Cleanup subscription on unmount
		return () => {
			unsubscribe();
		};
	}, [currentUserId]);

	if (loading) {
		return (
			<AuthenticatedLayout title="My Messages" showBackButton backHref="/homePage">
				<div>
					<p>Loading users...</p>
				</div>
			</AuthenticatedLayout>
		);
	}

	if (error || !currentUserId) {
		return (
			<AuthenticatedLayout title="My Messages" showBackButton backHref="/homePage">
				<div>
					<p style={{ color: "red" }}>{error}</p>
					<button type="button" onClick={() => window.location.reload()}>
						Retry
					</button>
				</div>
			</AuthenticatedLayout>
		);
	}

	return (
		<>
			<AuthenticatedLayout title="Users" showBackButton backHref="/homePage">
				<div>
					{users.length === 0 ? (
						<p>No users found.</p>
					) : (
						users.map((user) => (
							<Link href={`/messagePage/${generateChatId(currentUserId, user.id)}`} key={user.id}>
								<div>
									<h3>
										{user.username} ({user.email})
									</h3>
								</div>
							</Link>
						))
					)}
				</div>
			</AuthenticatedLayout>
			<style jsx>{`
              *{
              text-align: center;
              }
            header{
            font-size: 2rem;
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
              
            `}</style>
		</>
	);
}
