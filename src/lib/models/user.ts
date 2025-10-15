import type { Timestamp } from "firebase/firestore";
import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase";

export interface UserData {
	username: string;
	email: string;
	createdAt: Timestamp;
	deletedAt?: Timestamp;
}

export interface UserWithId extends UserData {
	id: string;
}

export async function getUserData(userId: string): Promise<UserData | null> {
	try {
		const userDoc = await getDoc(doc(firebaseDb, "users", userId));

		if (userDoc.exists()) {
			return userDoc.data() as UserData;
		}

		return null;
	} catch (error) {
		console.error("Error fetching user data:", error);
		return null;
	}
}

export async function markUserAsDeleted(userId: string): Promise<void> {
	try {
		const userRef = doc(firebaseDb, "users", userId);
		await updateDoc(userRef, {
			deletedAt: serverTimestamp(),
		});
	} catch (error) {
		console.error("Error marking user as deleted:", error);
		throw error;
	}
}

export async function getUserChatIds(userId: string): Promise<string[]> {
	try {
		const userChatsRef = collection(firebaseDb, "users", userId, "chats");
		const userChatsSnapshot = await getDocs(userChatsRef);

		const chatIds: string[] = [];
		userChatsSnapshot.docs.forEach((doc) => {
			chatIds.push(doc.id);
		});

		return chatIds;
	} catch (error) {
		console.error("Error getting user chat IDs:", error);
		return [];
	}
}

export async function getAllUsers(): Promise<UserWithId[]> {
	try {
		const usersCollection = collection(firebaseDb, "users");
		const usersQuery = query(usersCollection, orderBy("createdAt", "desc"));
		const usersSnapshot = await getDocs(usersQuery);

		const users: UserWithId[] = [];
		usersSnapshot.forEach((doc) => {
			users.push({
				id: doc.id,
				...(doc.data() as UserData),
			});
		});

		return users;
	} catch (error) {
		console.error("Error fetching all users:", error);
		return [];
	}
}

export function subscribeToUsers(onUpdate: (users: UserWithId[]) => void, onError?: (error: Error) => void): () => void {
	const usersCollection = collection(firebaseDb, "users");
	const usersQuery = query(usersCollection, orderBy("createdAt", "desc"));

	return onSnapshot(
		usersQuery,
		(usersSnapshot) => {
			const users: UserWithId[] = [];
			usersSnapshot.forEach((doc) => {
				users.push({
					id: doc.id,
					...(doc.data() as UserData),
				});
			});
			onUpdate(users);
		},
		(error) => {
			console.error("Error in users subscription:", error);
			onError?.(error);
		},
	);
}
