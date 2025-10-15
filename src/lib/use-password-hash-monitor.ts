import { signOut } from "firebase/auth";
import { useEffect } from "react";
import { firebaseAuth } from "@/lib/firebase";
import { monitorPasswordHash } from "@/lib/password-hash";

export function usePasswordHashMonitor() {
	useEffect(() => {
		const cleanup = monitorPasswordHash(
			() => {
				signOut(firebaseAuth).catch(() => {
					window.location.href = "/";
				});
			},
			() => {
				console.log("Password hash changed");
			},
		);

		return cleanup;
	}, []);
}
