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
            <style jsx>{`
              *{
              text-align: center;
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
                button{
                
                  align-items: center;
                  color: red;
                  font-size: 2rem;
                }
                
                
            `}</style>
          
        </div>
    );
}