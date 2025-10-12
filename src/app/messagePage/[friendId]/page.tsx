
"use client";

import Link from 'next/link';
import React, { useState } from 'react';
import { useParams } from 'next/navigation';

//placeholder data will come from backend 
interface Message {
    id: number;
    text: string;
    fromMe: boolean;
    timestamp: string;
    status?: 'sent' | 'delivered' | 'read';
    isOffline?: boolean;
}

//placeholder messages for testing
const placeholderMessages: Message[] = [
    { id: 1, text: "Message1", fromMe: false, timestamp: "10:30 AM " },
    { id: 2, text: "Message2", fromMe: true, timestamp: "10:32 AM ", status: "read" },
    { id: 3, text: "Message3", fromMe: false, timestamp: "10:35 AM " },
    { id: 4, text: "Message4", fromMe: true, timestamp: "10:36 AM ", status: "delivered" },
    { id: 5, text: "Message5", fromMe: false, timestamp: "10:38 AM " },
    { id: 6, text: "Message6", fromMe: true, timestamp: "10:40 PM ", status: "sent", isOffline: true },
];

export default function MessagesPage() {
    const params = useParams();
    const friendId = params.friendId as string;
    
    //placeholder til backend. Based on friendId
    const friendName = `Friend${friendId || '1'}`;
    
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
                timestamp: new Date().toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit' 
                }),
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
                <Link href="/friendPage">← Back</Link>
                <h1>{friendName}</h1>
                <div></div>
            </header>

            <div>
                {messages.map((message) => (
                    <div 
                        key={message.id} 
                        className={`message ${message.fromMe ? 'message-me' : 'message-them'}`}
                    >
                        <div>
                            <p>{message.text}</p>
                            <div>
                                <span>{message.timestamp}</span>
                                {message.fromMe && message.status && (
                                    <span>
                                        {message.status === 'read' && 'Read'}
                                        {message.status === 'delivered' && 'Delivered'}
                                        {message.status === 'sent' && 'Sent'}
                                    </span>
                                )}
                            </div>
                        </div>
                        {message.fromMe && message.isOffline && (
                            <button 
                                onClick={() => handleDeleteMessage(message.id)}
                                title="Delete offline message"
                            >
                                Delete Message
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <form onSubmit={handleSendMessage}>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                />
                <button>Send</button>
            </form>

            
        </div>
    );
}