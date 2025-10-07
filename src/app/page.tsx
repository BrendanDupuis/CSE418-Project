"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoginForm } from "./_components/login";
import { SingUpFrom } from "./_components/singup";

export default function Landing() {
	const [mode, setMode] = useState<"signin" | "signup">("signin");
	const router = useRouter();

	return (
		<div
			style={{
				display: "grid",
				placeItems: "center",
				minHeight: "100dvh",
				padding: 16,
			}}
		>
			<div style={{ width: "100%", maxWidth: 480 }}>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: 12,
					}}
				>
					<h2 style={{ margin: 0 }}>
						{mode === "signin" ? "Sign in" : "Sign up"}
					</h2>
					<button
						type="button"
						onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
						style={{
							background: "transparent",
							color: "#2563eb",
							border: 0,
							padding: 0,
							cursor: "pointer",
						}}
					>
						{mode === "signin"
							? "Create an account"
							: "Have an account? Sign in"}
					</button>
				</div>

				{mode === "signin" ? (
					<LoginForm onSuccess={() => router.push("/home")} />
				) : (
					<SingUpFrom />
				)}
			</div>
		</div>
	);
}
