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
		const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
			const isTwoFactorPending =
				typeof window !== "undefined" &&
				window.sessionStorage.getItem("twoFactorPending") === "true";
			const clientSideProtectedRoutes = [
				"/messagePage",
				"/friendPage",
				"/homePage",
			];
			const isProtectedRoute = clientSideProtectedRoutes.some((route) =>
				pathname?.startsWith(route),
			);

			if (user && !isTwoFactorPending) {
				const isEmailVerified = user.emailVerified;

				if (pathname === "/" && isEmailVerified) {
					// Redirect authenticated and verified users to home
					router.replace("/homePage");
				} else if (isProtectedRoute && isEmailVerified === false) {
					// Authenticated but not verified, send back to landing
					router.replace("/");
				}
			} else if (!user) {
				// Clear any stale 2FA flag when the user is signed out
				if (typeof window !== "undefined") {
					window.sessionStorage.removeItem("twoFactorPending");
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
