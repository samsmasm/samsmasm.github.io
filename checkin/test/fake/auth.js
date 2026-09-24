export function getAuth() { return { fake: true }; }
export function GoogleAuthProvider() { this.setCustomParameters = () => {}; }
export function signInWithPopup() { return Promise.resolve(); }
export function signOut() { return Promise.resolve(); }
export function onAuthStateChanged(auth, cb) {
  setTimeout(() => cb({ uid: 'teacher1', displayName: 'Teacher One', email: 't@example.com' }), 0);
  return () => {};
}
