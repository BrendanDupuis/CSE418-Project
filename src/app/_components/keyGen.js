/*
Generating user keys which will be called during enrollment. We will store the public keys on the server so anyone can
access them. Then the privatekeys will be stored securly in an indexedDB, using the built in indexedDB API for javascript. 
This will keep it so only the designated person can access their own private key, which will be needed during encryption 
and decryption. I found sample code on the indexedDB Api from
https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB, and built off of that.
*/
async function openIndexedDB(){
    const request = indexedDB.open("privateKeyDatabase", 1);
     const db = await new Promise((resolve, reject) => {
    request.onupgradeneeded = (event) => {
    const db = event.target.result;
    // Create an object store if it doesn't exist yet
    if (!db.objectStoreNames.contains("keys")) {
        db.createObjectStore("keys", { keyPath: "userName" });
    }
    };
    //success
    request.onsuccess = (event) => {
      resolve(event.target.result); 
    };
    //error
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
  return db;

}
//Once this function is finished, the private key is stored locally into the indexeddb, while the publicKey is returned back
//to be stored to the database so anyone can access publickeys
async function genUserKeys(userName){
    const keys = await crypto.subtle.generateKey({name: "ECDH",namedCurve: "P-256", },true, ["deriveKey", "deriveBits"]);
    //Generate the private and public keys
    const publicKey = await crypto.subtle.exportKey("jwk", keys.publicKey);
    const privateKey = await crypto.subtle.exportKey("jwk", keys.privateKey);
    //storing private key into indexeddb
    const database = await openIndexedDB();
    const transaction = database.transaction("keys", "readwrite");
    const store = transaction.objectStore("keys");
    await new Promise((resolve, reject) => {
    const request = store.put({userName,privateKey});
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
  return publicKey;
}


async function getPrivateKey(userName){
    const db = await openIndexedDB(); 
    const transaction = db.transaction("keys", "readonly");
    const store = transaction.objectStore("keys");
    const keyEntry = await new Promise((resolve, reject) => {
    const request = store.get(userName);
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
    });
    if (!keyEntry || !keyEntry.privateKey) {
        throw new Error(`Private key not found for user: ${userName}`);
    }

    const privateKey = await crypto.subtle.importKey(
        "jwk",
        keyEntry.privateKey,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey", "deriveBits"]
    );

    return privateKey;
}

async function getPublicKey(userName){
    //Need to implement
}