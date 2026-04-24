import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

const firebaseConfig = {
  apiKey: "AIzaSyBGdNJgl1PG0IueYQk_jjn4cOg-sMFbHe0",
  authDomain: "dowserboard.firebaseapp.com",
  projectId: "dowserboard",
  databaseURL: "https://dowserboard-default-rtdb.firebaseio.com",
  storageBucket: "dowserboard.firebasestorage.app",
  messagingSenderId: "1032600748722",
  appId: "1:1032600748722:web:1584c7508fbbca617cbfab"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
