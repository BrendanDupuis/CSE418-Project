import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
	apiKey: "AIzaSyBi1SphhzJG0C17iJMOdPEEj2Vxu0F4ESU",
	authDomain: "cse418-software-sec.firebaseapp.com",
	projectId: "cse418-software-sec",
	storageBucket: "cse418-software-sec.firebasestorage.app",
	messagingSenderId: "713113847845",
	appId: "1:713113847845:web:2915abd798dbad183b97cc",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseDb = getFirestore(firebaseApp);
