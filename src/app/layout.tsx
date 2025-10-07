import type { ReactNode } from "react";
import { AuthRouter } from "./_components/auth-router";

interface Props {
	children: ReactNode;
}

export default function RootLayout(props: Readonly<Props>) {
	return (
		<html lang="en">
			<body className="flex min-h-dvh flex-col p-0">
				<AuthRouter>{props.children}</AuthRouter>
			</body>
		</html>
	);
}
