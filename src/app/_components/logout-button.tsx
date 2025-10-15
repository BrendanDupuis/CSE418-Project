"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { firebaseAuth } from "@/lib/firebase";
import { clearPasswordHash } from "@/lib/password-hash";

interface LogoutButtonProps {
	className?: string;
	style?: React.CSSProperties;
}

export function LogoutButton({ className, style }: LogoutButtonProps) {
	const router = useRouter();

	const handleLogout = async () => {
		try {
			await signOut(firebaseAuth);
			clearPasswordHash();
			if (typeof window !== "undefined") {
				window.sessionStorage.removeItem("twoFactorPending");
			}
			router.replace("/");
		} catch (error) {
			console.error("Error signing out:", error);
			clearPasswordHash();
			router.replace("/");
		}
	};

	return (
		<button
			type="button"
			onClick={handleLogout}
			className={className}
			style={{
				background: "#dc2626",
				color: "white",
				border: "none",
				padding: "8px 16px",
				borderRadius: "6px",
				cursor: "pointer",
				fontSize: "1rem",
				...style,
			}}
		>
			Logout
		</button>
	);
}
