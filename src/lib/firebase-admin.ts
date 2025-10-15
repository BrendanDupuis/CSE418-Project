import "server-only";

import { type FirestoreOperations, initFirebaseRest } from "@/lib/firebase-npm";

let cachedFirestore: FirestoreOperations | null = null;
let tokenExpiryTime: number | null = null;

export async function getAdminFirestore() {
	const now = Date.now();

	if (cachedFirestore && tokenExpiryTime && now < tokenExpiryTime - 60000) {
		return cachedFirestore;
	}

	const SERVICE_ACCOUNT = process.env["SERVICE_ACCOUNT"];
	if (!SERVICE_ACCOUNT) {
		throw new Error("SERVICE_ACCOUNT env not found");
	}

	const serviceAccount = JSON.parse(SERVICE_ACCOUNT);

	const firebase = initFirebaseRest({
		serviceAccount: serviceAccount,
	});

	cachedFirestore = await firebase.firestore();
	tokenExpiryTime = now + 3600000;

	return cachedFirestore;
}

export function clearFirestoreCache() {
	cachedFirestore = null;
	tokenExpiryTime = null;
	console.log("[Firebase Admin] Cleared Firestore cache");
}
