import Link from 'next/link';
const name = "Ryan Mckee"; //placeholder til backend
export default function Home() {
    return(
    <div>
	<h1>SecureDove Messaging App</h1>
    <h2>Signed In As: {name}</h2>
		<div>
            <Link href= "/friendPage" > Message</Link>
		</div>
    </div>
)
}