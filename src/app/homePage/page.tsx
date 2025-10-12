"use client";

import Link from 'next/link';
import React, { useState } from 'react';

const name = "Ryan Mckee"; //placeholder will come from backend

export default function HomePage() {
    const [showDeleteAccount, setShowDeleteAccount] = useState(false);

    const handleDeleteAccount = () => {
        console.log("Delete account requested");
    };

    return (
        <div>
            <h1>SecureDove Messaging App</h1>
            <h2>Signed In As: {name}</h2>
            <nav>
                <Link href="/friendPage">Go to Friends</Link>
            </nav>
            
            <div>
                <h3>Account Settings</h3>
                <button onClick={() => setShowDeleteAccount(!showDeleteAccount)} >
                    Delete Account
                </button>
                
                {showDeleteAccount && (
                    <div>
                        <p>Are you sure you want to delete your account?</p>
                        <div >
                            <button onClick={handleDeleteAccount}>Yes/</button>
                            <button onClick={() => setShowDeleteAccount(false)} >No</button>
                        </div>
                    </div>
                )}
            </div>
            
          
        </div>
    );
}