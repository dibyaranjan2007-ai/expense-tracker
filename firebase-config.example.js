// =============================================
//  🔥 Firebase Configuration — Expensio
// =============================================
//  1. Copy this file as 'firebase-config.js'
//  2. Replace the placeholder values with YOUR
//     Firebase project config from:
//     https://console.firebase.google.com
//     → Project Settings → Your App → Config
// =============================================

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const db = firebase.firestore();
const auth = firebase.auth();

// Enable Firestore offline persistence
db.enablePersistence().catch(err => {
    if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence unavailable: multiple tabs open.');
    } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence not supported by this browser.');
    }
});

console.log('🔥 Firebase initialized');
