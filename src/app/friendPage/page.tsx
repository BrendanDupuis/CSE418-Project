"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase";
import { generateChatId } from "@/lib/models/chat";
import { getAllUsers, type UserWithId } from "@/lib/models/user";

export default function FriendsPage() {
	const [users, setUsers] = useState<UserWithId[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);

	useEffect(() => {
		const fetchUsers = async () => {
			try {
				setLoading(true);
				setError(null);

				// Get current user ID
				const currentUser = firebaseAuth.currentUser;
				if (currentUser) {
					setCurrentUserId(currentUser.uid);
				}

				const usersData = await getAllUsers();
				setUsers(usersData);
			} catch (err) {
				console.error("Error fetching users:", err);
				setError("Failed to load users. Please try again.");
			} finally {
				setLoading(false);
			}
		};

		fetchUsers();
	}, []);

	if (loading) {
		return (
			<div>
				<header>
					<Link href="/homePage">Home</Link>
					<h1>My Messages</h1>
				</header>
				<div>
					<p>Loading users...</p>
				</div>
			</div>
		);
	}

	if (error || !currentUserId) {
		return (
			<div>
				<header>
					<Link href="/homePage">Home</Link>
					<h1>My Messages</h1>
				</header>
				<div>
					<p style={{ color: "red" }}>{error}</p>
					<button type="button" onClick={() => window.location.reload()}>
						Retry
					</button>
				</div>
			</div>
		);
	}

	return (
		<div>
			<header>
				<Link href="/homePage">Home</Link>
				<h1>Users</h1>
			</header>

			<div>
				{users.length === 0 ? (
					<p>No users found.</p>
				) : (
					users.map((user) => (
						<Link
							href={`/messagePage/${generateChatId(currentUserId, user.id)}`}
							key={user.id}
						>
							<div>
								<h3>
									{user.username} ({user.email})
								</h3>
							</div>
						</Link>
					))
				)}
			</div>
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
		</div>
	);
}
