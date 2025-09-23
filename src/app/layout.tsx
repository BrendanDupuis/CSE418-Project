import type { ReactNode } from "react";

interface Props {
	children: ReactNode;
}

export default function RootLayout(props: Readonly<Props>) {
	return (
		<html lang="en">
			<body className="flex min-h-dvh flex-col p-0">{props.children}</body>
		</html>
	);
}
