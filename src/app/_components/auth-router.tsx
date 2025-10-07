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
			if (user && pathname === "/") {
				router.replace("/home");
			} else if (!user) {
				router.replace("/");
			}
			setChecked(true);
		});
		return () => unsubscribe();
	}, [router, pathname]);

	if (!checked) return null;
	return <>{children}</>;
}
