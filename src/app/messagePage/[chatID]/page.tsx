"use client";

export const runtime = "edge";

import Link from "next/link";
import { useParams } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase";
import { chatIdToUserIds } from "@/lib/models/chat";
import {
	createChatDocument,
	getChatDocument,
	type MessageWithId,
	sendMessage,
	subscribeToMessages,
} from "@/lib/models/message";
import { getUserData, type UserWithId } from "@/lib/models/user";

export default function MessagesPage() {
	const params = useParams();
	const chatID = params.chatID as string;

	const [messages, setMessages] = useState<MessageWithId[]>([]);
	const [newMessage, setNewMessage] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentUser, setCurrentUser] = useState<UserWithId | null>(null);
	const [friendUser, setFriendUser] = useState<UserWithId | null>(null);

	useEffect(() => {
		const fetchUsersAndMessages = async () => {
			try {
				setLoading(true);
				setError(null);

				const currentFirebaseUser = firebaseAuth.currentUser;
				if (!currentFirebaseUser) {
					setError("User not authenticated");
					return;
				}

				const [userId1, userId2] = chatIdToUserIds(chatID);

				const [user1Data, user2Data] = await Promise.all([
					getUserData(userId1).then((data) =>
						data ? { id: userId1, ...data } : null,
					),
					getUserData(userId2).then((data) =>
						data ? { id: userId2, ...data } : null,
					),
				]);

				// Determine which user is current and which is friend
				if (user1Data && user2Data) {
					if (user1Data.id === currentFirebaseUser.uid) {
						setCurrentUser(user1Data);
						setFriendUser(user2Data);
					} else {
						setCurrentUser(user2Data);
						setFriendUser(user1Data);
					}

					const chatDoc = await getChatDocument(chatID);
					if (!chatDoc) {
						await createChatDocument(chatID, userId1, userId2);
					}
				} else {
					setError("Could not find users for this chat");
					return;
				}

				// Set up real-time message subscription
				const unsubscribe = subscribeToMessages(
					chatID,
					(messagesData) => {
						setMessages(messagesData);
						setLoading(false);
					},
					(err) => {
						console.error("Error in messages subscription:", err);
						setError("Failed to load messages");
						setLoading(false);
					},
				);

				// Cleanup subscription on unmount
				return () => {
					unsubscribe();
				};
			} catch (err) {
				console.error("Error fetching users and messages:", err);
				setError("Failed to load chat");
				setLoading(false);
			}
		};

		if (chatID) {
			fetchUsersAndMessages();
		}
	}, [chatID]);

	const handleSendMessage = async (e: React.FormEvent) => {
		e.preventDefault();
		if (newMessage.trim() && currentUser && friendUser) {
			try {
				await sendMessage(newMessage, currentUser.id, chatID);
				setNewMessage("");
			} catch (err) {
				console.error("Error sending message:", err);
				setError("Failed to send message");
			}
		}
	};

	if (loading) {
		return (
			<div>
				<header>
					<Link href="/friendPage">Back</Link>
					<h1>Loading...</h1>
					<div></div>
				</header>
				<div>
					<p>Loading messages...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div>
				<header>
					<Link href="/friendPage">Back</Link>
					<h1>Error</h1>
					<div></div>
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

	if (!currentUser || !friendUser) {
		return (
			<div>
				<header>
					<Link href="/friendPage">Back</Link>
					<h1>Chat Not Found</h1>
					<div></div>
				</header>
				<div>
					<p>
						This chat could not be found or you don't have permission to view
						it.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div>
			<header>
				<Link href="/friendPage">Back</Link>
				<h1>{friendUser.username}</h1>
				<div></div>
			</header>

			<div>
				{messages.length === 0 ? (
					<p>No messages yet. Start the conversation!</p>
				) : (
					messages.map((message) => (
						<div
							key={message.id}
							className={`message ${message.fromUserId === currentUser.id ? "message-me" : "message-them"}`}
						>
							<div>
								<span className="sender-name">
									{message.fromUserId === currentUser.id
										? currentUser.username
										: friendUser.username}
									:
								</span>
								<span>{message.text}</span>
								<span className="timestamp">
									{message.timestamp?.toDate?.()?.toLocaleTimeString() ||
										"Unknown time"}
								</span>
							</div>
						</div>
					))
				)}
			</div>

			<form onSubmit={handleSendMessage}>
				<input
					type="text"
					value={newMessage}
					onChange={(e) => setNewMessage(e.target.value)}
					placeholder="Type a message..."
				/>
				<button type="submit">Send</button>
			</form>
			<style jsx>{`
              *{
              text-align: center;
              }
              header{
              font-size: 2rem;
              }
              p {
                
                    font-size: 2rem;
                    margin-bottom: 1rem;
                }
                h1 {
                
                    font-size: 4rem;
                    margin-bottom: 1rem;
                }
                span{
                
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
                delButton{
                align-items: center;
                color:red;
                  font-size: 2rem;
                }
                button{
                
                  align-items: center;
                
                  font-size: 2rem;
                }           
            `}</style>
		</div>
	);
}
