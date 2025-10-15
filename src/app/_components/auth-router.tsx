"use client";

import { onAuthStateChanged } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase";

interface Props {
	children: ReactNode;
}

export function AuthRouter({ children }: Props) {
	const router = useRouter();
	const pathname = usePathname();
	const [checked, setChecked] = useState(false);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
			const isTwoFactorPending = typeof window !== "undefined" && window.sessionStorage.getItem("twoFactorPending") === "true";
			const clientSideProtectedRoutes = ["/messagePage", "/friendPage", "/homePage"];
			const isProtectedRoute = clientSideProtectedRoutes.some((route) => pathname?.startsWith(route));

			if (user && !isTwoFactorPending) {
				const isEmailVerified = user.emailVerified;

				// Check if user has 2FA verification
				let isTwoFactorVerified = false;
				try {
					const tokenResult = await user.getIdTokenResult();
					isTwoFactorVerified = tokenResult.claims.twoFactorVerified === true;
				} catch (error) {
					console.error("Error getting token claims:", error);
				}

				if (pathname === "/" && isEmailVerified && isTwoFactorVerified) {
					// Redirect authenticated, verified, and 2FA verified users to home
					router.replace("/homePage");
				} else if (isProtectedRoute && (isEmailVerified === false || !isTwoFactorVerified)) {
					// Authenticated but not verified or not 2FA verified, send back to landing
					router.replace("/");
				}
			} else if (!user) {
				// Clear any stale 2FA flags when the user is signed out
				if (typeof window !== "undefined") {
					window.sessionStorage.removeItem("twoFactorPending");
					window.sessionStorage.removeItem("twoFactorLoginTime");
				}

				if (isProtectedRoute) {
					// User not authenticated, redirect to landing
					router.replace("/");
				}
			}
			setChecked(true);
		});
		return () => unsubscribe();
	}, [router, pathname]);

	if (!checked) return null;
	return <>{children}</>;
}
