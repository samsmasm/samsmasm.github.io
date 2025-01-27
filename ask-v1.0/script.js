// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDgxJTS4pQ7zEy4okeoqEQExhNIY2MuSiE",
    authDomain: "teachingtool-fa692.firebaseapp.com",
    projectId: "teachingtool-fa692",
  // storageBucket and messagingSenderId are optional for this project
    appId: "1:929129664959:web:37b57efa01bb3bde55510a",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Reference to the comments collection
const commentsRef = db.collection('comments');

// DOM Elements
const commentForm = document.getElementById('comment-form');
const commentInput = document.getElementById('comment-input');
const commentsContainer = document.getElementById('comments-container');

const loginForm = document.getElementById('login-form');
const teacherEmail = document.getElementById('teacher-email');
const teacherPassword = document.getElementById('teacher-password');
const logoutButton = document.getElementById('logout-button');

// Current User
let currentUser = null;

// Listen for authentication state changes
auth.onAuthStateChanged(user => {
  currentUser = user;
  if (user) {
    // Show logout button and hide login form
    logoutButton.style.display = 'block';
    loginForm.style.display = 'none';
    // Show delete buttons
    document.querySelectorAll('.delete-button').forEach(btn => {
      btn.style.display = 'block';
    });
  } else {
    // Show login form and hide logout button
    logoutButton.style.display = 'none';
    loginForm.style.display = 'block';
    // Hide delete buttons
    document.querySelectorAll('.delete-button').forEach(btn => {
      btn.style.display = 'none';
    });
  }
});

// Handle form submission
commentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const text = commentInput.value.trim();
  if (text === "") return;
  
  // Create a timestamp and expiration time (24 hours later)
  const timestamp = firebase.firestore.FieldValue.serverTimestamp();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  // Add the comment to Firestore
  await commentsRef.add({
    text: text,
    createdAt: timestamp,
    expiresAt: expiresAt
  });
  
  // Clear the input
  commentInput.value = "";
});

// Listen for real-time updates
commentsRef.orderBy('createdAt', 'desc').onSnapshot(snapshot => {
  commentsContainer.innerHTML = ""; // Clear existing comments
  snapshot.forEach(doc => {
    const comment = doc.data();
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment';
    
    const commentText = document.createElement('p');
    commentText.textContent = comment.text;
    commentDiv.appendChild(commentText);
    
    // If user is the teacher, show delete button
    if (currentUser && currentUser.uid === "8yfD4wdnQAgwaapZfdm1dJrr3T72" || currentUser.uid === "CZo0yQoMTSVCnCQiXqvTZzB1u743") { // Replace with your UID
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-button';
      deleteBtn.innerHTML = '&times;';
      deleteBtn.addEventListener('click', () => {
        // Delete the comment
        commentsRef.doc(doc.id).delete().then(() => {
          console.log('Comment deleted');
        }).catch(error => {
          console.error('Error deleting comment:', error);
        });
      });
      commentDiv.appendChild(deleteBtn);
    }
    
    commentsContainer.appendChild(commentDiv);
  });
});

// Handle teacher login
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const email = teacherEmail.value;
  const password = teacherPassword.value;
  
  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      // Successful login
      teacherEmail.value = "";
      teacherPassword.value = "";
    })
    .catch(error => {
      alert("Login failed: " + error.message);
    });
});

// Handle logout
logoutButton.addEventListener('click', () => {
  auth.signOut().then(() => {
    console.log('User signed out');
  }).catch(error => {
    console.error('Sign out error:', error);
  });
});
