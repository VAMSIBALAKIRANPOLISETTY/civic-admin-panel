// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// PASTE YOUR CONFIG OBJECT HERE
const firebaseConfig = {
  apiKey: "AIzaSyCAQA3ry7KPeoLNa4r_P1GoG2EbopCq8-o",
  authDomain: "civic-issue-app-d4d2c.firebaseapp.com",
  projectId: "civic-issue-app-d4d2c",
  storageBucket: "civic-issue-app-d4d2c.firebasestorage.app",
  messagingSenderId: "150533476958",
  appId: "1:150533476958:web:02180da77c734aea401acf",
  measurementId: "G-T3TTJBBYVR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
const db = getFirestore(app); // For the Database
const auth = getAuth(app);    // For Login

// --- SECONDARY INSTANCE (For creating Supervisors silently) ---
const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
export const secondaryAuth = getAuth(secondaryApp);

// Export them so other files can use them
export { db, auth };