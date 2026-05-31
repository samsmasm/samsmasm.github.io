# Cultivar — Setup Guide

## 1. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. **Add project** → name it (e.g. `cultivar`) → continue
3. Disable Google Analytics if you don't need it → **Create project**

---

## 2. Enable Google Sign-In

1. In your project: **Authentication** → **Get started**
2. **Sign-in method** tab → **Google** → Enable → set your support email → **Save**

---

## 3. Add your domain (unisam.nz) as an authorised domain

1. **Authentication** → **Settings** → **Authorised domains**
2. **Add domain** → `unisam.nz`

---

## 4. Create Firestore database

1. **Firestore Database** → **Create database**
2. Choose **Production mode** (we'll add rules next)
3. Pick a region close to your users (e.g. `australia-southeast1`)

---

## 5. Deploy Firestore security rules

1. Open **Firestore Database** → **Rules** tab
2. Replace the contents with everything in `firestore.rules`
3. Click **Publish**

---

## 6. Register a web app and copy config

1. **Project settings** (gear icon) → **Your apps** → **Add app** → Web (`</>`)
2. Name it (e.g. `cultivar-web`) → **Register app**
3. Copy the `firebaseConfig` object
4. Open `js/config.js` and replace every `"REPLACE_ME"` value with your real values

---

## 7. Make yourself an admin

After signing in once (so your user document is created in Firestore):

1. **Firestore Database** → `users` collection → find your document (it'll be your UID)
2. Click the document → **Edit** → add field `is_admin` → type **boolean** → value **true** → **Update**

You'll now see the ⚙️ Admin link on the home screen.

---

## 8. Deploy to GitHub Pages

Copy the `cultivar/` folder into your GitHub Pages repo (e.g. as a subfolder `/cultivar/`), commit, and push. The app will be live at `https://unisam.nz/cultivar/`.

> **Important:** GitHub Pages serves over HTTPS, which is required for Firebase Auth to work. Local `file://` URLs will not work — use a local server (`npx serve .`) for development.

---

## CSV format for importing words

```
vietnamese,english,example_vn,example_en,notes
xin chào,hello,Xin chào! Bạn khoẻ không?,Hello! How are you?,Common greeting
cảm ơn,thank you,Cảm ơn bạn nhiều!,Thank you very much!,
```

- Header row is optional (auto-detected and skipped)
- Last 3 columns are optional
- Works in both the Admin bulk-import and the personal Cards page

---

## Spaced repetition levels

| Level | Interval | Meaning |
|-------|----------|---------|
| 0 | same session | New or failed |
| 1 | 1 day | |
| 2 | 3 days | |
| 3 | 7 days | |
| 4 | 30 days | "Mastered" threshold |
| 5 | 90 days | |
| 6 | 365 days | Long-term memory |

Each word is tested in **both directions** (Vietnamese→English and English→Vietnamese) independently. Failed cards are retried within the same session until answered correctly.
