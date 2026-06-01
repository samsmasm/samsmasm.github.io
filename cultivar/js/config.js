// Replace these values with your Firebase project config:
// Firebase Console → Project Settings → Your apps → SDK setup → Config
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyBdT5SsKRuUFXvhf-8I_MJQWGSfzfuQ1eo",
  authDomain: "cultivar-d3add.firebaseapp.com",
  projectId: "cultivar-d3add",
  storageBucket: "cultivar-d3add.firebasestorage.app",
  messagingSenderId: "868864633895",
  appId: "1:868864633895:web:e2cee6294c8ea3ce637202"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
