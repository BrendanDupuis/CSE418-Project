"use client";

import Link from 'next/link';
import React from 'react';

//placeholder data will come from backend
const friends = [
    { id: 1, name: "Friend1" },
    { id: 2, name: "Friend2"},
    { id: 3, name: "Friend3" },
    { id: 4, name: "Friend4"}
];

export default function FriendsPage() {
    return (
        <div>
            <header>
                <h1>My Messages</h1>
                <Link href="/homePage">Home</Link>
            </header>
            
            <div >
                {friends.map((friend) => (
                    <Link href={`/messagePage/${friend.id}`} key={friend.id}>
                        <div>
                            <h3>{friend.name}</h3>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}