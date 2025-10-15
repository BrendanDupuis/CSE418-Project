import "server-only";

import { type FirestoreOperations, initFirebaseRest } from "@/lib/firebase-npm";

export async function getAdminFirestore(): Promise<FirestoreOperations> {
	const SERVICE_ACCOUNT = process.env["SERVICE_ACCOUNT"];
	if (!SERVICE_ACCOUNT) {
		throw new Error("SERVICE_ACCOUNT env not found");
	}

	const serviceAccount = JSON.parse(SERVICE_ACCOUNT);

	const firebase = initFirebaseRest({
		serviceAccount: serviceAccount,
	});

	return await firebase.firestore();
}
