"use client";

export const runtime = "edge";

import { useParams } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase";
import { chatIdToUserIds } from "@/lib/models/chat";
import { createChatDocument, ensureUserHasChatKeys, getChatDocument, type MessageWithId, sendMessage, subscribeToKeyChanges, subscribeToMessages } from "@/lib/models/message";
import { getUserData, type UserWithId } from "@/lib/models/user";
import { getPasswordHash } from "@/lib/password-hash";
import { AuthenticatedLayout } from "../../_components/authenticated-layout";

const MessageLength = 1000;
export default function MessagesPage() {
	const params = useParams();
	const chatID = params.chatID as string;

	const [messages, setMessages] = useState<MessageWithId[]>([]);
	const [newMessage, setNewMessage] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentUser, setCurrentUser] = useState<UserWithId | null>(null);
	const [friendUser, setFriendUser] = useState<UserWithId | null>(null);
	const [bothUsersHaveKeys, setBothUsersHaveKeys] = useState<boolean>(true);

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
					getUserData(userId1).then((data) => (data ? { id: userId1, ...data } : null)),
					getUserData(userId2).then((data) => (data ? { id: userId2, ...data } : null)),
				]);

				const passwordHash = getPasswordHash();
				if (!passwordHash) {
					setError("Password hash not found. Please log in again.");
					return;
				}

				let unsubscribeKeys: (() => void) | null = null;

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
						await createChatDocument(chatID, userId1, userId2, passwordHash);
					} else {
						await ensureUserHasChatKeys(chatID, currentFirebaseUser.uid, passwordHash);
					}

					unsubscribeKeys = subscribeToKeyChanges(
						chatID,
						(keyStatus) => {
							setBothUsersHaveKeys(keyStatus.bothHaveKeys);
						},
						(err) => {
							console.error("Error in key subscription:", err);
						},
					);
				} else {
					setError("Could not find users for this chat");
					return;
				}

				const unsubscribe = subscribeToMessages(
					chatID,
					currentFirebaseUser.uid,
					passwordHash,
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

				return () => {
					unsubscribe();
					unsubscribeKeys?.();
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

	const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
		const msg = e.target.value;
		if (msg.length <= MessageLength) {
			setNewMessage(msg);
			setError("Max message length reached.");
		}
	};
	const handleSendMessage = async (e: React.FormEvent) => {
		e.preventDefault();
		if (newMessage.trim() && currentUser && friendUser) {
			try {
				const passwordHash = getPasswordHash();
				if (!passwordHash) {
					setError("Password hash not found. Please log in again.");
					return;
				}
				await sendMessage(newMessage, currentUser.id, chatID, passwordHash);
				setNewMessage("");
			} catch (err) {
				console.error("Error sending message:", err);
				setError("Failed to send message");
			}
		}
	};

	if (loading) {
		return (
			<AuthenticatedLayout title="Loading..." showBackButton backHref="/friendPage">
				<div>
					<p>Loading messages...</p>
				</div>
			</AuthenticatedLayout>
		);
	}

	if (error) {
		return (
			<AuthenticatedLayout title="Error" showBackButton backHref="/friendPage">
				<div>
					<p style={{ color: "red" }}>{error}</p>
					<button type="button" onClick={() => window.location.reload()}>
						Retry
					</button>
				</div>
			</AuthenticatedLayout>
		);
	}

	if (!currentUser || !friendUser) {
		return (
			<AuthenticatedLayout title="Chat Not Found" showBackButton backHref="/friendPage">
				<div>
					<p>This chat could not be found or you don't have permission to view it.</p>
				</div>
			</AuthenticatedLayout>
		);
	}

	return (
		<>
			<AuthenticatedLayout title={friendUser.username} showBackButton backHref="/friendPage">
				<div>
					{friendUser.deletedAt && (
						<div
							style={{
								backgroundColor: "#fee2e2",
								border: "1px solid #fecaca",
								borderRadius: "4px",
								padding: "12px",
								marginBottom: "16px",
								color: "#991b1b",
							}}
						>
							<p>
								<strong>Account deleted</strong>
							</p>
							<p>This user deleted their account on {friendUser.deletedAt?.toDate?.()?.toLocaleDateString() || "unknown date"}. Some older messages may be undecryptable.</p>
						</div>
					)}
					{!bothUsersHaveKeys && (
						<div
							style={{
								backgroundColor: "#fff3cd",
								border: "1px solid #ffeaa7",
								borderRadius: "4px",
								padding: "12px",
								marginBottom: "16px",
								color: "#856404",
							}}
						>
							<p>
								<strong>⚠️ Waiting for {friendUser.username}</strong>
							</p>
							<p>End-to-end encryption is not yet available. {friendUser.username} needs to open this chat to generate their encryption keys.</p>
						</div>
					)}

					{messages.length === 0 && bothUsersHaveKeys ? (
						<p>No messages yet. Start the conversation!</p>
					) : messages.length > 0 ? (
						messages.map((message) => (
							<div key={message.id} className={`message ${message.fromUserId === currentUser.id ? "message-me" : "message-them"}`}>
								<div>
									<span className="sender-name">{message.fromUserId === currentUser.id ? currentUser.username : friendUser.username}:</span>
									<span> {message.text} </span>
									<span className="timestamp">{message.timestamp?.toDate?.()?.toLocaleTimeString() || "Unknown time"}</span>
								</div>
							</div>
						))
					) : null}
				</div>

				{bothUsersHaveKeys && (
					<form onSubmit={handleSendMessage}>
						<input type="text" value={newMessage} onChange={handleTyping/*(e) => setNewMessage(e.target.value)*/} placeholder="Type a message..." />
						<button type="submit">Send</button>
					</form>
				)}
			</AuthenticatedLayout>
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
		</>
	);
}
