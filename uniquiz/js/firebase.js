import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// Firestore must be enabled in the Firebase console for project "dowserboard"
// Security rules: allow read/write for sessions, quizzes, config, studentAnswers
const firebaseConfig = {
  apiKey: "AIzaSyBGdNJgl1PG0IueYQk_jjn4cOg-sMFbHe0",
  authDomain: "dowserboard.firebaseapp.com",
  projectId: "dowserboard",
  storageBucket: "dowserboard.firebasestorage.app",
  messagingSenderId: "1032600748722",
  appId: "1:1032600748722:web:1584c7508fbbca617cbfab"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
