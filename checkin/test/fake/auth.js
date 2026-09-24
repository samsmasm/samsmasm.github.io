export function getAuth() { return { fake: true }; }
export function GoogleAuthProvider() { this.setCustomParameters = () => {}; }
export function signInWithPopup() { return Promise.resolve(); }
export function signOut() { return Promise.resolve(); }

// Who the fakes sign you in as. A test that wants to be somebody else sets this
// before importing the page's module.
export const FAKE_USER = {
  current: { uid: 'teacher1', displayName: 'Teacher One', email: 't@example.com' }
};

export function onAuthStateChanged(auth, cb) {
  setTimeout(() => cb(FAKE_USER.current), 0);
  return () => {};
}

// A one off test is answered by someone with no account, so the real thing hands
// back a user with a uid and nothing else. The fake does the same.
export function signInAnonymously() {
  const user = { uid: 'anon-' + Math.random().toString(36).slice(2, 8), displayName: null, email: null, isAnonymous: true };
  FAKE_USER.current = user;
  return Promise.resolve({ user });
}
