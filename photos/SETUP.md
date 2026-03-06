# unisam photos — setup guide

## How the system works

```
/photos/
  manifest.json          ← auto-generated index of all images
  saigon/
    img001.jpg
    img002.jpg
  new-zealand/
    img003.jpg
  pinhole/
    img004.jpg
```

1. **You add photos** to subfolders inside `/photos/`
2. **Run `node generate-manifest.js`** — this scans all subfolders and updates `manifest.json`
3. **Commit and push** both the images and `manifest.json`
4. **The page loads `manifest.json`**, then fetches metadata from Firebase Firestore
5. **Anything in the manifest but not in Firestore** appears with a green "New" badge
6. **You click the lock icon**, sign in, enter admin mode, click untagged photos, fill in metadata, save — it goes straight to Firestore

---

## Firebase setup (one-time)

1. Go to [firebase.google.com](https://firebase.google.com) → create a project
2. Enable **Firestore Database** (start in test mode, then lock down later)
3. Enable **Authentication** → Email/Password provider → add yourself as a user
4. Go to Project Settings → Your apps → add a Web app → copy the config
5. Paste the config into `photos.html` where it says `REPLACE_WITH_YOUR_...`

### Firestore security rules (paste into Firebase console)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Anyone can read photo metadata (it's a public gallery)
    match /photo_metadata/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

---

## Adding new photos — workflow

```bash
# 1. Drop your scans into the right subfolder
cp ~/scans/saigon-roll-12/*.jpg photos/saigon/

# 2. Regenerate the manifest
node generate-manifest.js

# 3. Commit everything
git add photos/
git commit -m "add: saigon roll 12"
git push
```

Then open the site, click the lock, sign in, filter by "Untagged", and tag away.

---

## Automating the manifest with GitHub Actions (optional)

Add this file to `.github/workflows/manifest.yml` and you never need to run 
`generate-manifest.js` manually — it runs automatically whenever you push new photos:

```yaml
name: Update photo manifest
on:
  push:
    paths:
      - 'photos/**'
jobs:
  manifest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: node generate-manifest.js
      - run: |
          git config user.email "actions@github.com"
          git config user.name  "GitHub Actions"
          git add photos/manifest.json
          git diff --staged --quiet || git commit -m "chore: update photo manifest"
          git push
```

---

## File structure in your repo

```
samsmasm.github.io/
├── index.html
├── generate-manifest.js    ← run from here: node generate-manifest.js
├── photos/
│   ├── index.html          ← the photos page
│   ├── manifest.json       ← auto-generated, commit this
│   └── store/              ← drop all photos in here (flat, no subfolders needed)
│       ├── img001.jpg
│       └── img002.jpg
└── about/
    └── index.html
```

GitHub Pages serves `photos/index.html` at `unisam.nz/photos` automatically.
