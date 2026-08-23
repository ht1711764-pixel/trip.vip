// firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc, onSnapshot, addDoc, orderBy, deleteDoc, increment, limit } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDm1FBPzFsnYsdgwlK6WNWFz3POuOL-pHs",
    authDomain: "tiktok-shop2026.firebaseapp.com",
    projectId: "tiktok-shop2026",
    storageBucket: "tiktok-shop2026.firebasestorage.app",
    messagingSenderId: "319316492310",
    appId: "1:319316492310:web:b6b4969543d00b993eb537"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { 
    db, auth, googleProvider,
    collection, doc, setDoc, getDoc, getDocs,
    query, where, updateDoc, onSnapshot,
    addDoc, orderBy, deleteDoc, increment, limit,
    signInWithPopup, onAuthStateChanged, firebaseSignOut
};