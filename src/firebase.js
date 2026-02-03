// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// PASTE YOUR CONFIG OBJECT HERE
const firebaseConfig = {
  apiKey: "AIzaSyB2MQuWFr2yrWxfZBNVOm5U3XnI0D7zRGU",
  authDomain: "civic-pro-1547e.firebaseapp.com",
  projectId: "civic-pro-1547e",
  storageBucket: "civic-pro-1547e.firebasestorage.app",
  messagingSenderId: "379542394446",
  appId: "1:379542394446:web:06c4b8c96b286d4d30551f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
const db = getFirestore(app); // For the Database
const auth = getAuth(app);    // For Login

// Export them so other files can use them
export { db, auth };