import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { Firestore, getFirestore } from "firebase-admin/firestore";

let cachedDb: Firestore | null = null;

function buildCredentials() {
	const projectId = process.env.FIREBASE_PROJECT_ID;
	const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
	const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

	if (!projectId || !clientEmail || !privateKey) {
		throw new Error(
			"Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.",
		);
	}

	return {
		projectId,
		clientEmail,
		privateKey,
	};
}

export function getAdminFirestore(): Firestore {
	if (cachedDb) {
		return cachedDb;
	}

	const credentials = buildCredentials();
	const app =
		getApps()[0] ??
		initializeApp({
			credential: cert({
				projectId: credentials.projectId,
				clientEmail: credentials.clientEmail,
				privateKey: credentials.privateKey,
			}),
		});

	cachedDb = getFirestore(app);
	return cachedDb;
}
