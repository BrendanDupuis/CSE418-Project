import Link from 'next/link';
import React from 'react';

export default function HomePage() {
	return  (
	<div>
	<p>TEST PAGE</p>
	<div>
		<Link href= "/homePage" > Home</Link>
		<Link href= "/friendPage" > Friend</Link>
		<Link href= "/MessagePage" > Message</Link>
	</div>
	</div>
	);
}
