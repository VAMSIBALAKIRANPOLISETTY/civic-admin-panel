// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// PASTE YOUR CONFIG OBJECT HERE
const firebaseConfig = {
  apiKey: "AIzaSyCxTLwDnBie4PhrqKDw71MFutsAa9BLkos",
  authDomain: "civic-issue-app-ecab1.firebaseapp.com",
  projectId: "civic-issue-app-ecab1",
  storageBucket: "civic-issue-app-ecab1.firebasestorage.app",
  messagingSenderId: "1053710416602",
  appId: "1:1053710416602:web:7acdadc11d08aacc9203e3",
  measurementId: "G-WPNHW3ZYKQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
const db = getFirestore(app); // For the Database
const auth = getAuth(app);    // For Login

// Export them so other files can use them
export { db, auth };