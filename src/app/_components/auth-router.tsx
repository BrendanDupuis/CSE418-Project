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
			// Define protected routes that require authentication and email verification
			const clientSideProtectedRoutes = [
				"/home",
				"/messagePage",
				"/friendPage",
				"/homePage",
			];
			const isProtectedRoute = clientSideProtectedRoutes.some((route) =>
				pathname?.startsWith(route),
			);

			if (user && pathname === "/") {
				// Check if email is verified before redirecting to home
				if (user.emailVerified) {
					router.replace("/home");
				} else {
					// User is authenticated but email not verified, stay on landing page
					// The login form will handle showing verification message
				}
			} else if (!user && isProtectedRoute) {
				// User not authenticated, redirect to landing
				router.replace("/");
			} else if (user && isProtectedRoute && !user.emailVerified) {
				// User authenticated but email not verified, redirect to landing
				router.replace("/");
			}
			setChecked(true);
		});
		return () => unsubscribe();
	}, [router, pathname]);

	if (!checked) return null;
	return <>{children}</>;
}
