import "server-only";

import { type FirestoreOperations, initFirebaseRest } from "@/lib/firebase-npm";

let cachedFirestore: FirestoreOperations | null = null;

export async function getAdminFirestore() {
	if (cachedFirestore) {
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
	return cachedFirestore;
}
