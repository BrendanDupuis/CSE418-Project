
"use client";

import Link from 'next/link';
import React, { useState } from 'react';
import { useParams } from 'next/navigation';

//placeholder data will come from backend 
interface Message {
    id: number;
    text: string;
    fromMe: boolean;
    status?: 'sent' | 'delivered' | 'read';
    isOffline?: boolean;
}

//placeholder messages for testing
const placeholderMessages: Message[] = [
    { id: 1, text: "Message1", fromMe: false},
    { id: 2, text: "Message2", fromMe: true,  status: "read" },
    { id: 3, text: "Message3", fromMe: false,  },
    { id: 4, text: "Message4", fromMe: true, status: "delivered" },
    { id: 5, text: "Message5", fromMe: false,  },
    { id: 6, text: "Message6", fromMe: true, status: "sent", isOffline: true },
];

export default function MessagesPage() {
    const params = useParams();
    const friendId = params.friendId as string;
    
    //placeholder til backend. Based on friendId and acccount name
    const friendName = `Friend${friendId || '1'}`;
    const myName = "Ryan Mckee"

    const [messages, setMessages] = useState<Message[]>(placeholderMessages);
    const [newMessage, setNewMessage] = useState('');

    const handleDeleteMessage = (messageId: number) => {
        //only allow deletion of offline messages
        setMessages(messages.filter(msg => msg.id !== messageId));
        //send delete request to backend
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim()) {
            const message: Message = {
                id: messages.length + 1,
                text: newMessage,
                fromMe: true,
                
                status: 'sent',
                isOffline: false
            };
            setMessages([...messages, message]);
            setNewMessage('');
            //send to backend 
        }
    };

    return (
        <div>
            <header>
                <Link href="/friendPage">Back</Link>
                <h1>{friendName}</h1>
                <div></div>
            </header>

            <div>
                {messages.map((message) => (
                    <div 
                        key={message.id} 
                        className={`message ${message.fromMe ? 'message-me' : 'message-them'}`}>
                        <div>
                            <span className="sender-name">
                                {message.fromMe ? myName : friendName}:
                            </span>
                            <span>{message.text}</span>
                            
                                
                                {message.fromMe && message.status && (
                                    <span>(
                                        {message.status === 'read' && 'Read'}
                                        {message.status === 'delivered' && 'Delivered'}
                                        {message.status === 'sent' && 'Sent'}
                                    )</span>
                                )}
                            {message.fromMe && message.isOffline && (
                            <button onClick={() => handleDeleteMessage(message.id)}>
                                (Delete Message)
                            </button>
                        )}
                        </div>
                    </div>
                ))}
            </div>

            <form onSubmit={handleSendMessage}>
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..."/>
                <button>Send</button>
            </form>      
            <style jsx>{`
              *{
              text-align: center;
              }
              header{
              font-size: 2rem;
              }
              p {
                
                    font-size: 2rem;
                    margin-bottom: 1rem;
                }
                h1 {
                
                    font-size: 4rem;
                    margin-bottom: 1rem;
                }
                span{
                
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
                delButton{
                align-items: center;
                color:red;
                  font-size: 2rem;
                }
                button{
                
                  align-items: center;
                
                  font-size: 2rem;
                }           
            `}</style>
        </div>
    );
}