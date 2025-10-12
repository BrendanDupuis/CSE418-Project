import Link from 'next/link';
import React from 'react';

const friends = [{id: 1, name: "Friend1", lastMessage: "..."}, {id: 2, name: "Friend2", lastMessage: "..."} ];
export default function Friends() {
    return (
    <div>
	    <h1>My Messages</h1>
        <Link href= "/homePage" > Home</Link>    
	    <div>
                {friends.map((friend) => (
                    <Link 
                        href={`/messages/${friend.id}`} 
                        key={friend.id}
                        className="friend-item"
                    >
                        <div className="friend-info">
                            <h3>{friend.name}</h3>
                            <p>{friend.lastMessage}</p>
                        </div>
                    </Link>
                ))}
		    	
	    </div>
    </div>
    );
}
