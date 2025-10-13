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
                <Link href="/homePage">Home</Link>
                <h1>My Messages</h1>
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
            <style jsx>{`
              *{
              text-align: center;
              }
            header{
            font-size: 2rem;
            }

                h1 {
                
                    font-size: 4rem;
                    margin-bottom: 1rem;
                }
                h2 {
                
                    font-size: 2rem;
                    margin-bottom: 2rem;              
                }
                    nav {
                    text-align: center;
                    font-size: 2rem;
                    margin-bottom: 2rem;      
                }
                h3 {
                
                    font-size: 2rem;
                }
              
            `}</style>
        </div>
    );
}