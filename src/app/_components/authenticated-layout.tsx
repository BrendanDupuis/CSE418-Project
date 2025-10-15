"use client";

import type { ReactNode } from "react";
import { usePasswordHashMonitor } from "@/lib/use-password-hash-monitor";
import { LogoutButton } from "./logout-button";

interface AuthenticatedLayoutProps {
	children: ReactNode;
	title: string;
	showBackButton?: boolean;
	backHref?: string;
}

export function AuthenticatedLayout({ children, title, showBackButton = false, backHref }: AuthenticatedLayoutProps) {
	usePasswordHashMonitor();

	return (
		<div>
			<header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
				<div>
					{showBackButton && backHref && (
						<a href={backHref} style={{ marginRight: "1rem", textDecoration: "none", color: "#2563eb" }}>
							Back
						</a>
					)}
					<h1>{title}</h1>
				</div>
				<LogoutButton />
			</header>
			{children}
		</div>
	);
}
