// =============================================
//  🔥 Firebase Configuration — Expensio
// =============================================
//  Replace the placeholder values below with
//  YOUR Firebase project config from:
//  https://console.firebase.google.com
//  → Project Settings → Your App → Config
// =============================================

const firebaseConfig = {

    apiKey: "AIzaSyAXDvJw4wqSbFPnaUfQPq-lTLPlLdfV71Y",
    authDomain: "expensio-c0cf3.firebaseapp.com",
    projectId: "expensio-c0cf3",
    storageBucket: "expensio-c0cf3.firebasestorage.app",
    messagingSenderId: "109096859189",
    appId: "1:109096859189:web:97ed2ff098f706ac24e37c",
    measurementId: "G-M6LCN4WR1V"
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
