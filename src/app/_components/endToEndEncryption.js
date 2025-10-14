/*
For our end to end encryption, we are using a signal protocol such as one that would be used on whatsapp. Each user during enrollment
is given a public and private key. The public key is something that can be accessed by anyone anytime, which will be important
in deriving shared keys. The private key is only accessible by a person on their device, it cannot be retreived by anyone else
and is stored securly in AES-GCM encryption style. When two people want to communicate, I take the receivers public key, along with
the senders private key to create a shared key. With this signal protocol, this is done with eliptical math, but in javascript
the built in function crypto.subtle.deriveKey. This will be the same for decryption, and thanks to elliptical math, it makes
it easy for us to encrypt and decrypt, but near impossible for others to decrypt without access to ones private key.

Messages are now stored in MongoDB for persistence and security.
*/
import { getPublicKey, getPrivateKey } from './keyGen.js';
import { storeEncryptedMessage } from '@/lib/models/encryptedMessage';

export { getConversation, getMessagesForUser, getUnreadCount, markMessageAsRead, deleteMessage } from '@/lib/models/encryptedMessage';



async function makeSharedKey(myPrivateKey,theirPublicKey){
    const findSharedBits = await crypto.subtle.deriveBits({ name: "ECDH", public: theirPublicKey },myPrivateKey,256);
    const makeSharedKey = await crypto.subtle.importKey("raw",findSharedBits,{ name: "AES-GCM" },false,["encrypt", "decrypt"]);
    return makeSharedKey;
    //This shared key is the same as myPublicKey, theirPrivateKey by using this function 
}

export async function encryptMessages(sendersUserName,receiversUserName, messageToEncrypt, password) {
    //Pass in their public key so I know where its going, and I can access my private key
    const myPrivateKey = await getPrivateKey(sendersUserName,password);
    const receiversPublicKey = await getPublicKey(receiversUserName);
    const sharedKey = await makeSharedKey(myPrivateKey,receiversPublicKey);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(messageToEncrypt);
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv },sharedKey,encoded);
    const ivArray = Array.from(iv); //iv as an array instead of Uint8Array
    const ciphertextArray = Array.from(new Uint8Array(ciphertext)); //ciphertext into an array
    const encryptedObject = {iv: ivArray,ciphertext: ciphertextArray};

    // Store the encrypted message in MongoDB
    await storeEncryptedMessage(sendersUserName, receiversUserName, encryptedObject);

    return encryptedObject;
}

export async function decryptMessages(sendersUserName,receiversUserName, messageToDecrypt,password) {
    //decrypt using the key provided and the encrypted message
    const myPrivateKey = await getPrivateKey(receiversUserName,password);
    const sendersPublicKey = await getPublicKey(sendersUserName);
    const sharedKey = await makeSharedKey(myPrivateKey,sendersPublicKey);
    const iv = new Uint8Array(messageToDecrypt.iv);
    const ciphertext = new Uint8Array(messageToDecrypt.ciphertext);
    const decryptedEncoded = await crypto.subtle.decrypt({ name: "AES-GCM", iv },sharedKey,ciphertext.buffer);
    const decodedMessage = new TextDecoder().decode(decryptedEncoded);
    return decodedMessage;
}